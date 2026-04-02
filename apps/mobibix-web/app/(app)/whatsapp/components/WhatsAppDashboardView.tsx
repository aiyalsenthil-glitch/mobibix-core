import { WhatsAppDashboard, WhatsAppLog } from "@/services/whatsapp.api";
import WhatsAppPremiumPromoBanner from "./WhatsAppPremiumPromoBanner";
import { 
  Send, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Smartphone, 
  History, 
  Zap, 
  Clock,
  ArrowRight,
  RefreshCcw,
  BarChart3,
  ShieldCheck,
  Ban,
  Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  isPro?: boolean;
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
  isPro = false,
}: WhatsAppDashboardViewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!hasAddon && <WhatsAppPremiumPromoBanner />}
      
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-teal-500" />
            WhatsApp Dashboard
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            Real-time usage & delivery signals
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="rounded-xl border-none bg-muted/40 hover:bg-muted/60 transition-colors gap-2 text-xs font-black"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          SYNC LOGS
        </Button>
      </div>

      {/* ── Main Stats ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Sent Today" 
          value={dashboard.whatsappNumberStatus === 'CONNECTED' ? dashboard.messagesSentToday : 0} 
          icon={<Send className="w-4 h-4" />}
          color="teal"
        />
        <StatCard 
          label="Monthly Total" 
          value={dashboard.messagesSentThisMonth} 
          icon={<Calendar className="w-4 h-4" />}
          color="indigo"
        />
        <StatCard 
          label="Delivered" 
          value={dashboard.deliveredCount} 
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard 
          label="Failed" 
          value={dashboard.failedCount} 
          icon={<XCircle className="w-4 h-4" />}
          color="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        
        {/* Plan & Status */}
        <div className="lg:col-span-4 rounded-4xl border-none bg-card shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Plan</p>
                <p className="text-xl font-black text-foreground">{dashboard.planName}</p>
                <p className="text-[10px] text-muted-foreground font-bold mt-1">
                  EXPIRES: {dashboard.planExpiry ? new Date(dashboard.planExpiry).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Connection Status</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${dashboard.whatsappNumberStatus === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                <div className={`w-2 h-2 rounded-full ${dashboard.whatsappNumberStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-black uppercase tracking-wider">{dashboard.whatsappNumberStatus || 'DISCONNECTED'}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Live Campaigns</p>
              <p className="text-xl font-black text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                {dashboard.activeCampaignCount}
              </p>
            </div>
          </div>

          {dashboard.whatsappNumberStatus !== 'CONNECTED' && (
            <button 
              onClick={async () => {
                try {
                  const { connectWhatsApp } = await import("@/services/whatsapp.api");
                  const { url } = await connectWhatsApp();
                  window.location.href = url;
                } catch (err: any) {
                  alert(err.message || "Failed to connect");
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white p-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Sign In with Facebook
            </button>
          )}
        </div>

        {/* Quota & Usage */}
        <div className="lg:col-span-8 rounded-4xl border-none bg-card shadow-sm p-8 space-y-8 flex flex-col justify-center border-r-4 border-r-indigo-500/20">
          <div className="grid sm:grid-cols-3 gap-8">
            <QuotaDetail label="Monthly Quota" value={dashboard.monthlyQuota ?? "Unlimited"} />
            <QuotaDetail label="Used" value={dashboard.usedQuota} />
            <QuotaDetail label="Remaining" value={dashboard.remainingQuota ?? "Unlimited"} color="teal" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Bandwidth Usage</span>
              <span className="text-[10px] font-black text-indigo-500">{Math.round(quotaPercent)}%</span>
            </div>
            <div className="h-5 w-full rounded-full bg-muted/50 p-1">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 to-teal-400 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-1000"
                style={{ width: `${Math.min(100, quotaPercent)}%` }}
              />
            </div>
            {quotaExhausted && (
              <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                <Ban className="w-3 h-3" /> Monthly quota exhausted. Automations are paused.
              </p>
            )}
          </div>

          {/* Daily Reminder Quota Section */}
          <div className="pt-8 border-t border-border">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Daily Automated Limit</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-foreground">{dashboard.dailyReminderUsed}</span>
                  <span className="text-xs text-muted-foreground font-bold italic">OF {dashboard.dailyReminderQuota ?? "UNLIMITED"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Reset at Midnight</p>
                <div className="flex items-center gap-2 justify-end">
                   <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                   <span className="text-xs font-bold text-foreground">Next Cycle: 00:00 AM</span>
                </div>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all duration-1000"
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
          <div className="rounded-4xl border-none bg-card p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Manual Message</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Send approved templates</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Recipient Number</label>
                <input
                  className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="e.g., 919876543210"
                  value={sendForm.phone}
                  onChange={(e) =>
                    setSendForm((prev: any) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={quotaExhausted}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Template Label</label>
                  <input
                    className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="e.g. welcome_msg"
                    value={sendForm.templateId}
                    onChange={(e) =>
                      setSendForm((prev: any) => ({
                        ...prev,
                        templateId: e.target.value,
                      }))
                    }
                    disabled={quotaExhausted}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Variables</label>
                  <input
                    className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="var1, var2..."
                    value={sendForm.parameters}
                    onChange={(e) =>
                      setSendForm((prev: any) => ({
                        ...prev,
                        parameters: e.target.value,
                      }))
                    }
                    disabled={quotaExhausted}
                  />
                </div>
              </div>

              <Button
                onClick={onSend}
                disabled={sending || quotaExhausted || !isPro}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 bg-teal-600 hover:bg-teal-500 transition-all shadow-lg shadow-teal-500/20 active:scale-95"
              >
                {sending ? "TRANSMITTING..." : !isPro ? "PRO LICENSE REQUIRED" : <><Send className="w-3.5 h-3.5" /> BLAST MESSAGE</>}
              </Button>
            </div>
          </div>
        )}

        {featureFlags.bulkCampaign && (
          <div className="rounded-4xl border-none bg-card p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Campaign Builder</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Schedule massive broadcasts</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Campaign Identity</label>
                <input
                  className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. Diwali Sale 2024"
                  value={campaignForm.name}
                  onChange={(e) =>
                    setCampaignForm((prev: any) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={quotaExhausted}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Target Template</label>
                  <input
                    className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Template Name"
                    value={campaignForm.templateId}
                    onChange={(e) =>
                      setCampaignForm((prev: any) => ({
                        ...prev,
                        templateId: e.target.value,
                      }))
                    }
                    disabled={quotaExhausted}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Schedule Time</label>
                  <input
                    className="w-full rounded-2xl border-none bg-muted/40 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                </div>
              </div>

              <Button
                onClick={onCreateCampaign}
                disabled={campaigning || quotaExhausted || !isPro}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {campaigning ? "PREPARING..." : !isPro ? "PRO LICENSE REQUIRED" : <><Zap className="w-3.5 h-3.5" /> LAUNCH CAMPAIGN</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {featureFlags.reports && (
        <div className="rounded-4xl border-none bg-card p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Transmission Logs</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Verified Meta Delivery Status</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recipient</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Signal</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template Asset</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500">WA</div>
                         <span className="font-bold text-foreground">{log.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                         log.status === 'SENT' ? 'bg-blue-500/10 text-blue-500' :
                         log.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' :
                         log.status === 'READ' ? 'bg-indigo-500/10 text-indigo-500' :
                         'bg-rose-500/10 text-rose-500'
                       }`}>
                         {log.status === 'DELIVERED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                         {log.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap italic text-muted-foreground">
                      {String((log.metadata as any)?.templateName || log.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[10px] text-muted-foreground">
                      {new Date(log.sentAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-bold italic opacity-40">
                      No transmission signals recorded.
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


// ── Helper Components ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'teal' | 'indigo' | 'emerald' | 'rose' }) {
  const colorMap = {
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  const bgMap = {
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className={`group rounded-4xl border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${colorMap[color]} border-transparent`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        <div className={`p-2 rounded-xl text-white ${bgMap[color]} shadow-md`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function QuotaDetail({ label, value, color = 'indigo' }: { label: string; value: string | number; color?: 'indigo' | 'teal' }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mb-2">{label}</p>
      <p className={`text-2xl font-black ${color === 'teal' ? 'text-teal-500' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
