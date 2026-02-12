import { WhatsAppDashboard, WhatsAppLog } from "@/services/whatsapp.api";
import WhatsAppPremiumPromoBanner from "./WhatsAppPremiumPromoBanner";

type WhatsAppDashboardViewProps = {
  dashboard: WhatsAppDashboard;
  logs: WhatsAppLog[];
  featureFlags: any;
  quotaExhausted: boolean;
  quotaPercent: number;
  sendForm: any;
  setSendForm: (val: any) => void;
  campaignForm: any;
  setCampaignForm: (val: any) => void;
  sending: boolean;
  campaigning: boolean;
  onSend: () => void;
  onCreateCampaign: () => void;
  onRefresh: () => void;
  hasAddon?: boolean;
};

export default function WhatsAppDashboardView({
  dashboard,
  logs,
  featureFlags,
  quotaExhausted,
  quotaPercent,
  sendForm,
  setSendForm,
  campaignForm,
  setCampaignForm,
  sending,
  campaigning,
  onSend,
  onCreateCampaign,
  onRefresh,
  hasAddon = false,
}: WhatsAppDashboardViewProps) {
  return (
    <div className="space-y-8">
      {!hasAddon && <WhatsAppPremiumPromoBanner />}
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
            {dashboard.whatsappNumberStatus === 'CONNECTED' ? dashboard.messagesSentToday : 0}
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
              Expires: {dashboard.planExpiry ? new Date(dashboard.planExpiry).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              WhatsApp Status
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold ${dashboard.whatsappNumberStatus === 'CONNECTED' ? 'text-emerald-600' : 'text-amber-500'}`}>
                {dashboard.whatsappNumberStatus || 'DISCONNECTED'}
              </p>
              {dashboard.whatsappNumberStatus !== 'CONNECTED' && (
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                 </span>
              )}
            </div>
          </div>
          {dashboard.whatsappNumberStatus !== 'CONNECTED' && (
            <div className="pt-2">
                <button 
                  onClick={async () => {
                    try {
                      const { connectWhatsApp } = await import("@/services/whatsapp.api");
                      const { url } = await connectWhatsApp();
                      window.location.href = url;
                    } catch (err: any) {
                      alert(err.message || "Failed to initiate connection");
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white px-4 py-2 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Connect Facebook
                </button>
            </div>
          )}
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
                  setSendForm((prev: any) => ({ ...prev, phone: e.target.value }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Template ID"
                value={sendForm.templateId}
                onChange={(e) =>
                  setSendForm((prev: any) => ({
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
                  setSendForm((prev: any) => ({
                    ...prev,
                    parameters: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <button
                onClick={onSend}
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
                  setCampaignForm((prev: any) => ({ ...prev, name: e.target.value }))
                }
                disabled={quotaExhausted}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Template ID"
                value={campaignForm.templateId}
                onChange={(e) =>
                  setCampaignForm((prev: any) => ({
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
                  setCampaignForm((prev: any) => ({
                    ...prev,
                    scheduledAt: e.target.value,
                  }))
                }
                disabled={quotaExhausted}
              />
              <button
                onClick={onCreateCampaign}
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
              onClick={onRefresh}
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
