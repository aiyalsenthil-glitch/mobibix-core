"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createWhatsAppCampaign,
  getWhatsAppDashboard,
  getWhatsAppLogs,
  scheduleWhatsAppCampaign,
  sendWhatsAppMessage,
  WhatsAppDashboard,
  WhatsAppLog,
} from "@/services/whatsapp.api";
import { authenticatedFetch } from "@/services/auth.api";
import WhatsAppCrmPromo from "./WhatsAppCrmPromo";

interface CrmStatus {
  hasSubscription: boolean;
  isEnabled: boolean;
  hasPhoneNumber: boolean;
}

export default function WhatsAppPage() {
  const [crmStatus, setCrmStatus] = useState<CrmStatus | null>(null);
  const [dashboard, setDashboard] = useState<WhatsAppDashboard | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [campaigning, setCampaigning] = useState(false);

  const [sendForm, setSendForm] = useState({
    phone: "",
    templateId: "",
    parameters: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    templateId: "",
    scheduledAt: "",
  });

  const featureFlags = dashboard?.features ?? {};
  const quotaExhausted = Boolean(
    dashboard?.monthlyQuota && dashboard?.remainingQuota === 0,
  );

  const quotaPercent = useMemo(() => {
    if (!dashboard?.monthlyQuota || dashboard.monthlyQuota <= 0) return 0;
    return Math.min(
      100,
      Math.round((dashboard.usedQuota / dashboard.monthlyQuota) * 100),
    );
  }, [dashboard]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // First, check WhatsApp CRM subscription status
      const statusResponse = await authenticatedFetch(
        "/user/whatsapp-crm/status",
      );
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setCrmStatus(status);

        // ✅ Redirect Retail Demo users to new CRM
        if (status.moduleType === "MOBILE_SHOP") {
          window.location.href = "/whatsapp-crm"; // Hard redirect to ensure proper load
          return;
        }

        // If no subscription, show promo (return early)
        if (!status.hasSubscription) {
          setLoading(false);
          return;
        }
      }

      // If subscribed, load dashboard
      const dash = await getWhatsAppDashboard();
      setDashboard(dash);

      // If plan is required, show promo instead
      if (dash.planRequired) {
        setLoading(false);
        return;
      }

      if (dash.features?.reports) {
        const recentLogs = await getWhatsAppLogs({});
        setLogs(recentLogs.slice(0, 10));
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load WhatsApp dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSend = async () => {
    if (!sendForm.phone || !sendForm.templateId) {
      setError("Phone and template ID are required.");
      return;
    }

    try {
      setSending(true);
      setError(null);
      await sendWhatsAppMessage({
        phone: sendForm.phone,
        templateId: sendForm.templateId,
        parameters: sendForm.parameters
          ? sendForm.parameters.split(",").map((p) => p.trim())
          : undefined,
      });
      await loadDashboard();
      setSendForm({ phone: "", templateId: "", parameters: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.templateId) {
      setError("Campaign name and template ID are required.");
      return;
    }

    try {
      setCampaigning(true);
      setError(null);
      const campaign = await createWhatsAppCampaign({
        name: campaignForm.name,
        templateId: campaignForm.templateId,
      });

      if (campaignForm.scheduledAt) {
        await scheduleWhatsAppCampaign(campaign.id, {
          scheduledAt: campaignForm.scheduledAt,
        });
      }

      await loadDashboard();
      setCampaignForm({ name: "", templateId: "", scheduledAt: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to create campaign");
    } finally {
      setCampaigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">Loading WhatsApp...</p>
      </div>
    );
  }

  // Show promo if no subscription
  if (crmStatus && !crmStatus.hasSubscription) {
    return <WhatsAppCrmPromo />;
  }

  // Show promo if dashboard indicates plan is required
  if (dashboard && dashboard.planRequired) {
    return <WhatsAppCrmPromo />;
  }

  // Show setup instruction if subscribed but not enabled
  if (crmStatus && crmStatus.hasSubscription && !crmStatus.isEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 110 18 9 9 0 010-18z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Setup Needed
            </h2>
            <p className="text-gray-600">
              Your WhatsApp CRM subscription is active, but setup is needed.
            </p>
          </div>

          {!crmStatus.hasPhoneNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                📱 Verify WhatsApp Number
              </h3>
              <p className="text-blue-800 text-sm mb-3">
                Please contact our support team to verify and connect your
                WhatsApp Business number.
              </p>
              <a
                href="mailto:support@mobibix.com"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          )}

          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Next Steps</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Contact our support team to enable WhatsApp CRM</li>
              <li>Verify your WhatsApp Business number</li>
              <li>Configure your business profile</li>
              <li>Start managing customer conversations</li>
            </ol>
          </div>

          <div className="mt-8 text-center">
            <a
              href="tel:+918667551566"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium"
            >
              Call Us Now
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">WhatsApp Dashboard</h1>
        <p className="text-red-500">{error}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">WhatsApp Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor usage, plan limits, and campaigns for your tenant.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase text-muted-foreground">Sent Today</p>
          <p className="text-2xl font-semibold">
            {dashboard.messagesSentToday}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase text-muted-foreground">
            Sent This Month
          </p>
          <p className="text-2xl font-semibold">
            {dashboard.messagesSentThisMonth}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase text-muted-foreground">Delivered</p>
          <p className="text-2xl font-semibold">{dashboard.deliveredCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase text-muted-foreground">Failed</p>
          <p className="text-2xl font-semibold">{dashboard.failedCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Plan</p>
            <p className="text-lg font-semibold">{dashboard.planName}</p>
            <p className="text-sm text-muted-foreground">
              Expires: {new Date(dashboard.planExpiry).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              WhatsApp Status
            </p>
            <p className="text-sm font-semibold">
              {dashboard.whatsappNumberStatus}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Active Campaigns
            </p>
            <p className="text-lg font-semibold">
              {dashboard.activeCampaignCount}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Monthly Quota
              </p>
              <p className="text-lg font-semibold">
                {dashboard.monthlyQuota ?? "Unlimited"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Used</p>
              <p className="text-lg font-semibold">{dashboard.usedQuota}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Remaining
              </p>
              <p className="text-lg font-semibold">
                {dashboard.remainingQuota ?? "Unlimited"}
              </p>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          {quotaExhausted && (
            <p className="text-sm text-red-500">
              Monthly quota exhausted. Actions are disabled.
            </p>
          )}

          {/* Daily Reminder Quota Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Daily Reminders (Automated)
                </p>
                <p className="text-lg font-semibold">
                  {dashboard.dailyReminderQuota ?? "Unlimited"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Used Today
                </p>
                <p className="text-lg font-semibold">
                  {dashboard.dailyReminderUsed}
                </p>
              </div>
            </div>
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-blue-500"
                style={{
                  width: `${
                    dashboard.dailyReminderQuota &&
                    dashboard.dailyReminderQuota > 0
                      ? Math.min(
                          100,
                          (dashboard.dailyReminderUsed /
                            dashboard.dailyReminderQuota) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {featureFlags.manualMessaging && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Manual Message</h2>
              <p className="text-sm text-muted-foreground">
                Send a one-off approved template message.
              </p>
            </div>
            <div className="grid gap-3">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Phone (e.g., 9876543210)"
                value={sendForm.phone}
                onChange={(e) =>
                  setSendForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Template ID"
                value={sendForm.templateId}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    templateId: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Parameters (comma separated)"
                value={sendForm.parameters}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    parameters: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <button
                onClick={handleSend}
                disabled={sending || quotaExhausted}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        )}

        {featureFlags.bulkCampaign && (
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Campaigns</h2>
              <p className="text-sm text-muted-foreground">
                Create and schedule bulk campaigns.
              </p>
            </div>
            <div className="grid gap-3">
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Campaign name"
                value={campaignForm.name}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Template ID"
                value={campaignForm.templateId}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    templateId: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                type="datetime-local"
                value={campaignForm.scheduledAt}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    scheduledAt: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <button
                onClick={handleCreateCampaign}
                disabled={campaigning || quotaExhausted}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {campaigning ? "Saving..." : "Create Campaign"}
              </button>
            </div>
          </div>
        )}
      </div>

      {featureFlags.reports && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Logs</h2>
              <p className="text-sm text-muted-foreground">
                Latest WhatsApp delivery activity.
              </p>
            </div>
            <button
              onClick={() => loadDashboard()}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Template</th>
                  <th className="py-2">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="py-2">{log.phone}</td>
                    <td className="py-2">{log.status}</td>
                    <td className="py-2">
                      {log.metadata?.templateName || log.type}
                    </td>
                    <td className="py-2">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No logs available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
