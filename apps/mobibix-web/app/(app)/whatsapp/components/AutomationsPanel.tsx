'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { authenticatedFetch, extractData } from '@/services/auth.api';
import {
  Wrench, ShoppingCart, Shuffle, Power, PowerOff,
  Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Save
} from 'lucide-react';

type BotMode = 'REPAIR' | 'SALES' | 'MIXED' | 'OFF';

interface BotConfig {
  mode: BotMode;
  botEnabled: boolean;
  welcomeMessage?: string;
  outOfHoursMsg?: string;
  businessHoursOn: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
}

interface AutoReplyRule {
  id: string;
  keyword: string;
  replyText: string;
  exactMatch: boolean;
  enabled: boolean;
  sortOrder: number;
}

const MODES: { value: Exclude<BotMode, 'OFF'>; label: string; desc: string; icon: any; color: string }[] = [
  { value: 'REPAIR', label: 'Repair Mode', desc: 'Job status, warranty, repair pricing keywords', icon: Wrench, color: 'border-orange-400 bg-orange-500/10 text-orange-400' },
  { value: 'SALES', label: 'Sales Mode', desc: 'Product pricing, offers, buy queries', icon: ShoppingCart, color: 'border-blue-400 bg-blue-500/10 text-blue-400' },
  { value: 'MIXED', label: 'Mixed Mode', desc: 'Repairs + Sales — best for single number shops', icon: Shuffle, color: 'border-teal-400 bg-teal-500/10 text-teal-400' },
];

export default function AutomationsPanel() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<BotMode | null>(null);
  const [newRule, setNewRule] = useState({ keyword: '', replyText: '', exactMatch: false });
  const [addingRule, setAddingRule] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, rulesRes] = await Promise.all([
        authenticatedFetch('/whatsapp/bot/config'),
        authenticatedFetch('/whatsapp/bot/rules'),
      ]);
      if (cfgRes.ok) setConfig(await extractData(cfgRes));
      if (rulesRes.ok) setRules(await extractData(rulesRes));
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (mode: Exclude<BotMode, 'OFF'>) => {
    setApplyingPreset(mode);
    try {
      await authenticatedFetch('/whatsapp/bot/preset', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      await loadAll();
    } finally {
      setApplyingPreset(null);
    }
  };

  const toggleBot = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch('/whatsapp/bot/config', {
        method: 'PATCH',
        body: JSON.stringify({ botEnabled: !config.botEnabled }),
      });
      if (res.ok) setConfig(await extractData(res));
    } finally {
      setSaving(false);
    }
  };

  const saveWelcome = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch('/whatsapp/bot/config', {
        method: 'PATCH',
        body: JSON.stringify({
          welcomeMessage: config.welcomeMessage,
          outOfHoursMsg: config.outOfHoursMsg,
          businessHoursOn: config.businessHoursOn,
          businessHoursStart: config.businessHoursStart,
          businessHoursEnd: config.businessHoursEnd,
        }),
      });
      if (res.ok) setConfig(await extractData(res));
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    if (!newRule.keyword.trim() || !newRule.replyText.trim()) return;
    setAddingRule(true);
    try {
      await authenticatedFetch('/whatsapp/bot/rules', {
        method: 'POST',
        body: JSON.stringify(newRule),
      });
      setNewRule({ keyword: '', replyText: '', exactMatch: false });
      setShowRuleForm(false);
      await loadAll();
    } finally {
      setAddingRule(false);
    }
  };

  const toggleRule = async (rule: AutoReplyRule) => {
    await authenticatedFetch(`/whatsapp/bot/rules/${rule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = async (id: string) => {
    await authenticatedFetch(`/whatsapp/bot/rules/${id}`, { method: 'DELETE' });
    setRules(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin h-6 w-6 text-teal-500" /></div>;
  }

  const currentMode = config?.mode || 'OFF';

  return (
    <div className="space-y-6">

      {/* ── Bot ON/OFF + Current Mode ─────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-foreground">Auto-Reply Bot</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically replies to customer messages with keyword-matched responses.</p>
          </div>
          <Button
            onClick={toggleBot}
            disabled={saving || currentMode === 'OFF'}
            variant={config?.botEnabled ? 'default' : 'outline'}
            className={`rounded-xl font-bold gap-2 ${config?.botEnabled ? 'bg-teal-600 hover:bg-teal-500' : ''}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : config?.botEnabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {config?.botEnabled ? 'Bot ON' : 'Bot OFF'}
          </Button>
        </div>

        {currentMode !== 'OFF' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider">
              {currentMode} MODE
            </Badge>
            <span className="text-xs text-muted-foreground">{rules.filter(r => r.enabled).length} active rules</span>
          </div>
        )}
      </Card>

      {/* ── Mode Selector (with preset apply) ───────────────────────────────── */}
      <div>
        <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Choose Mode & Apply Presets</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODES.map(({ value, label, desc, icon: Icon, color }) => {
            const isActive = currentMode === value;
            return (
              <Card
                key={value}
                className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${isActive ? color : 'border-border bg-card hover:border-muted-foreground/30'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon className={`w-5 h-5 ${isActive ? '' : 'text-muted-foreground'}`} />
                  {isActive && <Badge className="text-[9px] font-black uppercase tracking-wider bg-current/20">Active</Badge>}
                </div>
                <p className={`text-sm font-black mb-1 ${isActive ? '' : 'text-foreground'}`}>{label}</p>
                <p className="text-[11px] text-muted-foreground mb-3">{desc}</p>
                <Button
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className={`w-full rounded-xl text-xs font-bold ${isActive ? 'bg-teal-600 hover:bg-teal-500' : ''}`}
                  onClick={() => applyPreset(value)}
                  disabled={applyingPreset !== null}
                >
                  {applyingPreset === value ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" />Applying…</>
                  ) : isActive ? 'Re-apply Preset' : 'Apply Preset'}
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Applying a preset clears existing rules and seeds mode-specific defaults. You can edit them below.</p>
      </div>

      {/* ── Welcome Message ──────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
        <h4 className="text-sm font-black text-foreground">Default Reply</h4>
        <p className="text-xs text-muted-foreground -mt-2">Sent when no keyword is matched. Leave blank to stay silent.</p>
        <textarea
          value={config?.welcomeMessage || ''}
          onChange={e => setConfig(c => c ? { ...c, welcomeMessage: e.target.value } : c)}
          rows={3}
          placeholder="Hi! Thank you for contacting us…"
          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setConfig(c => c ? { ...c, businessHoursOn: !c.businessHoursOn } : c)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {config?.businessHoursOn ? <ToggleRight className="w-5 h-5 text-teal-500" /> : <ToggleLeft className="w-5 h-5" />}
            Business hours gate
          </button>
        </div>

        {config?.businessHoursOn && (
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">From</p>
              <Input
                type="time"
                value={config.businessHoursStart || '09:00'}
                onChange={e => setConfig(c => c ? { ...c, businessHoursStart: e.target.value } : c)}
                className="w-32 h-8 text-sm rounded-xl"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">To</p>
              <Input
                type="time"
                value={config.businessHoursEnd || '20:00'}
                onChange={e => setConfig(c => c ? { ...c, businessHoursEnd: e.target.value } : c)}
                className="w-32 h-8 text-sm rounded-xl"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Out-of-hours reply</p>
              <Input
                value={config.outOfHoursMsg || ''}
                onChange={e => setConfig(c => c ? { ...c, outOfHoursMsg: e.target.value } : c)}
                placeholder="We are closed, will reply tomorrow…"
                className="h-8 text-sm rounded-xl"
              />
            </div>
          </div>
        )}

        <Button onClick={saveWelcome} disabled={saving} size="sm" className="rounded-xl bg-teal-600 hover:bg-teal-500 font-bold gap-2">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Settings
        </Button>
      </Card>

      {/* ── Keyword Rules ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Keyword Rules ({rules.length})</h4>
          <Button size="sm" onClick={() => setShowRuleForm(v => !v)} variant="outline" className="rounded-xl font-bold text-xs gap-1">
            <Plus className="w-3 h-3" /> Add Rule
          </Button>
        </div>

        {showRuleForm && (
          <Card className="rounded-2xl border-none shadow-sm bg-card p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Keyword</p>
                <Input
                  placeholder="e.g. price"
                  value={newRule.keyword}
                  onChange={e => setNewRule(r => ({ ...r, keyword: e.target.value }))}
                  className="h-8 text-sm rounded-xl"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer pb-1">
                  <input
                    type="checkbox"
                    checked={newRule.exactMatch}
                    onChange={e => setNewRule(r => ({ ...r, exactMatch: e.target.checked }))}
                    className="rounded"
                  />
                  Exact match
                </label>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reply</p>
              <textarea
                placeholder="Auto-reply message…"
                value={newRule.replyText}
                onChange={e => setNewRule(r => ({ ...r, replyText: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRule} disabled={addingRule} className="rounded-xl bg-teal-600 hover:bg-teal-500 font-bold">
                {addingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRuleForm(false)} className="rounded-xl">Cancel</Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {rules.length === 0 ? (
            <Card className="rounded-2xl border-none bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">No keyword rules yet. Apply a preset or add your own.</p>
            </Card>
          ) : (
            rules.map(rule => (
              <Card key={rule.id} className={`rounded-2xl border border-border bg-card p-3 flex items-start gap-3 transition-opacity ${!rule.enabled ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-black text-foreground font-mono bg-muted px-2 py-0.5 rounded-md">{rule.keyword}</span>
                    {rule.exactMatch && <Badge variant="outline" className="text-[9px] uppercase tracking-wider">Exact</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rule.replyText}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleRule(rule)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {rule.enabled ? <ToggleRight className="w-4 h-4 text-teal-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
