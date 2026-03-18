'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch, extractData } from '@/services/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface MetaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: string;
  language: string;
  components?: any[];
}

const STATUS_CONFIG = {
  APPROVED: { icon: CheckCircle2, class: 'bg-green-100 text-green-700', label: 'Approved' },
  PENDING:  { icon: Clock,         class: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  REJECTED: { icon: XCircle,       class: 'bg-red-100 text-red-700', label: 'Rejected' },
  PAUSED:   { icon: Clock,         class: 'bg-gray-100 text-gray-600', label: 'Paused' },
};

export default function MetaTemplateManager() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bodyText: '', footerText: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await authenticatedFetch('/whatsapp/meta-templates');
      if (resp.ok) {
        const data = await extractData(resp);
        setTemplates(data?.data ?? data ?? []);
      } else {
        setError('Failed to load templates');
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.bodyText.trim()) {
      setError('Template name and body are required');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const components: any[] = [
        { type: 'BODY', text: form.bodyText },
      ];
      if (form.footerText.trim()) {
        components.push({ type: 'FOOTER', text: form.footerText });
      }
      const resp = await authenticatedFetch('/whatsapp/meta-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.toLowerCase().replace(/\s+/g, '_'),
          language: 'en',
          category: 'UTILITY',
          components,
        }),
      });
      const result = await extractData(resp);
      if (resp.ok) {
        setSuccess(`Template submitted! Status: ${result.status ?? 'PENDING'}`);
        setForm({ name: '', bodyText: '', footerText: '' });
        setShowForm(false);
        await fetchTemplates();
      } else {
        setError((result as any)?.message || 'Failed to create template');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Message Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage approved templates via Meta WhatsApp Business API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-widest">Create Template</h3>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Template Name</label>
              <Input
                placeholder="e.g. service_ready_notification"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase, underscores only. Will be auto-formatted.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Message Body</label>
              <textarea
                placeholder="e.g. Dear {{1}}, your repair at {{2}} is ready. Job No: {{3}}."
                value={form.bodyText}
                onChange={(e) => setForm(p => ({ ...p, bodyText: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Use {`{{1}}`}, {`{{2}}`} etc. for variables. Variables cannot be at the start or end.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Footer (optional)</label>
              <Input
                placeholder="e.g. Thank you for choosing Mobibix"
                value={form.footerText}
                onChange={(e) => setForm(p => ({ ...p, footerText: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setShowForm(false); setError(''); }}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-xl bg-teal-600 hover:bg-teal-700" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Submit for Review
            </Button>
          </div>
        </div>
      )}

      {error && !showForm && <p className="text-sm text-red-600 font-medium">{error}</p>}

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          <span className="text-muted-foreground font-medium">Loading templates from Meta...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No templates found. Create your first template above.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            const bodyComp = t.components?.find((c: any) => c.type === 'BODY');
            return (
              <div key={t.id} className="rounded-2xl border bg-card p-4 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground font-mono">{t.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider rounded-full px-2">{t.category}</Badge>
                    <span className="text-[10px] text-muted-foreground">{t.language}</span>
                  </div>
                  {bodyComp && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{bodyComp.text}</p>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${cfg.class}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
