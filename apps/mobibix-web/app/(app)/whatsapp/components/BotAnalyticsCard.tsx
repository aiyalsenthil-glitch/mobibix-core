'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getBotAnalytics } from '@/services/whatsapp.api';
import { Loader2, Bot, Users, Headphones, TrendingUp, Hash } from 'lucide-react';

export default function BotAnalyticsCard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getBotAnalytics>> | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const load = async (d: number) => {
    setLoading(true);
    try {
      setData(await getBotAnalytics(d));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(days); }, [days]);

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-foreground">Bot Analytics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Automation performance overview</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="text-xs bg-muted border border-border rounded-xl px-3 py-1.5 font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
        </div>
      ) : data ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={<TrendingUp className="w-4 h-4 text-teal-500" />} label="Inbound" value={data.totalInbound} />
            <StatTile icon={<Bot className="w-4 h-4 text-violet-500" />} label="Bot Handled" value={data.botHandled} />
            <StatTile icon={<Headphones className="w-4 h-4 text-blue-500" />} label="Agent Handled" value={data.agentHandled} />
            <StatTile icon={<Users className="w-4 h-4 text-orange-500" />} label="Conversations" value={data.uniqueConversations} />
          </div>

          {/* Bot rate bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bot Rate</span>
              <span className="text-sm font-black text-foreground">{data.botRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${data.botRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Percentage of inbound messages handled automatically by the bot</p>
          </div>

          {/* Top keywords */}
          {data.topKeywords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Top Triggered Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.topKeywords.map(k => (
                  <div key={k.keyword} className="flex items-center gap-1.5 bg-muted/60 rounded-xl px-3 py-1">
                    <span className="text-xs font-bold text-foreground">{k.keyword}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">×{k.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No analytics data yet</p>
      )}
    </Card>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-2xl p-4 space-y-1">
      {icon}
      <p className="text-xl font-black text-foreground">{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}
