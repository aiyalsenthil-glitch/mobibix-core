'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { authenticatedFetch, extractData } from '@/services/auth.api';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Edit2, Save,
  X, Loader2, ToggleLeft, ToggleRight, Bot, Sparkles,
} from 'lucide-react';

interface MenuNode {
  id: string;
  parentId: string | null;
  triggerKey: string;
  menuLabel: string;
  replyText: string | null;
  replyMode: 'STATIC' | 'AI';
  aiSystemPrompt: string | null;
  fallbackReply: string | null;
  isLeaf: boolean;
  sortOrder: number;
  enabled: boolean;
  children: MenuNode[];
}

interface MenuConfig {
  menuBotEnabled: boolean;
  aiReplyEnabled: boolean;
  welcomeMessage?: string;
}

interface NodeFormState {
  parentId: string | null;
  editId: string | null;
  triggerKey: string;
  menuLabel: string;
  isLeaf: boolean;
  replyMode: 'STATIC' | 'AI';
  replyText: string;
  aiSystemPrompt: string;
  fallbackReply: string;
}

const EMPTY_FORM: NodeFormState = {
  parentId: null,
  editId: null,
  triggerKey: '',
  menuLabel: '',
  isLeaf: false,
  replyMode: 'STATIC',
  replyText: '',
  aiSystemPrompt: '',
  fallbackReply: '',
};

export default function MenuBotPanel() {
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [config, setConfig] = useState<MenuConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NodeFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [treeRes, cfgRes] = await Promise.all([
        authenticatedFetch('/whatsapp/menu/tree'),
        authenticatedFetch('/whatsapp/menu/config'),
      ]);
      if (treeRes.ok) setTree(await extractData(treeRes));
      if (cfgRes.ok) {
        const cfg = await extractData(cfgRes);
        setConfig(cfg ?? { menuBotEnabled: false, aiReplyEnabled: false });
      } else {
        setConfig({ menuBotEnabled: false, aiReplyEnabled: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleConfig = async (key: 'menuBotEnabled' | 'aiReplyEnabled') => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch('/whatsapp/menu/config', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: !config[key] }),
      });
      if (res.ok) setConfig(await extractData(res));
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = (parentId: string | null) => {
    setForm({ ...EMPTY_FORM, parentId });
  };

  const openEditForm = (node: MenuNode) => {
    setForm({
      editId: node.id,
      parentId: node.parentId,
      triggerKey: node.triggerKey,
      menuLabel: node.menuLabel,
      isLeaf: node.isLeaf,
      replyMode: node.replyMode,
      replyText: node.replyText ?? '',
      aiSystemPrompt: node.aiSystemPrompt ?? '',
      fallbackReply: node.fallbackReply ?? '',
    });
  };

  const submitForm = async () => {
    if (!form) return;
    if (!form.triggerKey.trim() || !form.menuLabel.trim()) return;
    if (form.isLeaf && form.replyMode === 'STATIC' && !form.replyText.trim()) return;
    if (form.isLeaf && form.replyMode === 'AI' && !form.fallbackReply.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        parentId: form.parentId,
        triggerKey: form.triggerKey.trim(),
        menuLabel: form.menuLabel.trim(),
        isLeaf: form.isLeaf,
        replyMode: form.replyMode,
        replyText: form.replyText.trim() || null,
        aiSystemPrompt: form.aiSystemPrompt.trim() || null,
        fallbackReply: form.fallbackReply.trim() || null,
      };

      if (form.editId) {
        await authenticatedFetch(`/whatsapp/menu/nodes/${form.editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await authenticatedFetch('/whatsapp/menu/nodes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setForm(null);
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNode = async (id: string) => {
    await authenticatedFetch(`/whatsapp/menu/nodes/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin h-6 w-6 text-teal-500" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Master Toggles ─────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-foreground">Menu Bot</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Guided numbered menus — customer replies "1", "2" to navigate options.
            </p>
          </div>
          <Button
            onClick={() => toggleConfig('menuBotEnabled')}
            disabled={saving}
            variant={config?.menuBotEnabled ? 'default' : 'outline'}
            className={`rounded-xl font-bold gap-2 ${config?.menuBotEnabled ? 'bg-teal-600 hover:bg-teal-500' : ''}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {config?.menuBotEnabled ? 'Menu ON' : 'Menu OFF'}
          </Button>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => toggleConfig('aiReplyEnabled')}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {config?.aiReplyEnabled
              ? <ToggleRight className="w-5 h-5 text-teal-500" />
              : <ToggleLeft className="w-5 h-5" />}
            <Sparkles className="w-3.5 h-3.5" />
            AI Replies
          </button>
          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider text-purple-400 border-purple-400/30">
            Beta
          </Badge>
          <span className="text-[10px] text-muted-foreground mr-auto">
            Leaf nodes can use AI to generate contextual replies.
          </span>

          <div className="flex items-center gap-2">
            <Input
              value={config?.welcomeMessage || ''}
              onChange={(e) => setConfig(prev => prev ? { ...prev, welcomeMessage: e.target.value } : null)}
              placeholder="Home Menu Header..."
              className="h-8 text-[10px] w-48 rounded-xl font-bold"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setSaving(true);
                await authenticatedFetch('/whatsapp/menu/config', {
                  method: 'PATCH',
                  body: JSON.stringify({ welcomeMessage: config?.welcomeMessage }),
                });
                setSaving(false);
              }}
              disabled={saving}
              className="h-8 rounded-xl text-[10px] font-bold"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Guide & Layout ────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 border-l-4 border-l-teal-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-teal-500/10">
            <Sparkles className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Premium Experience</h3>
            <p className="text-[10px] text-muted-foreground">Modern features enabled for your WhatsApp Bot</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">1️⃣</span>
              Boxed Quick-Select
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Your menu now uses **Boxed Style (1️⃣, 2️⃣)** markers by default. This makes it easier for customers to identify selectable options at a glance.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono">*</span>
              Smart Navigation
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Customers can type <code className="bg-muted px-1 rounded text-teal-500">*</code> or <code className="bg-muted px-1 rounded text-teal-500">home</code> to jump back to root from any level deep. Use <code className="bg-muted px-1 rounded text-teal-500">0</code> for back.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Tree View ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Menu Tree</h4>
          <Button size="sm" onClick={() => openAddForm(null)} variant="outline" className="rounded-xl font-bold text-xs gap-1">
            <Plus className="w-3 h-3" /> Add Root Item
          </Button>
        </div>

        {tree.length === 0 ? (
          <Card className="rounded-2xl border-none bg-muted/30 p-8 text-center">
            <Bot className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No menu items yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add root items to build your menu tree.</p>
          </Card>
        ) : (
          <div className="space-y-1">
            {tree.map(node => (
              <NodeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onEdit={openEditForm}
                onDelete={deleteNode}
                onAddChild={openAddForm}
                aiEnabled={config?.aiReplyEnabled ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Node Form Modal ────────────────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="rounded-3xl bg-card p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-foreground">
                {form.editId ? 'Edit Node' : form.parentId ? 'Add Child Item' : 'Add Root Item'}
              </h4>
              <button onClick={() => setForm(null)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Trigger Key
                </p>
                <Input
                  placeholder="1, 2, repair…"
                  value={form.triggerKey}
                  onChange={e => setForm(f => f ? { ...f, triggerKey: e.target.value } : f)}
                  className="h-8 text-sm rounded-xl"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">What the user types to select this</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Menu Label
                </p>
                <Input
                  placeholder="1. Repair Services"
                  value={form.menuLabel}
                  onChange={e => setForm(f => f ? { ...f, menuLabel: e.target.value } : f)}
                  className="h-8 text-sm rounded-xl"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">Shown in the menu list</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <button
                onClick={() => setForm(f => f ? { ...f, isLeaf: !f.isLeaf } : f)}
                className="flex items-center gap-2 text-xs font-semibold text-foreground"
              >
                {form.isLeaf ? <ToggleRight className="w-5 h-5 text-teal-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                Final Reply (no sub-items)
              </button>
              <span className="text-[10px] text-muted-foreground">
                {form.isLeaf ? 'This node ends the conversation' : 'This node shows a sub-menu'}
              </span>
            </div>

            {form.isLeaf && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm(f => f ? { ...f, replyMode: 'STATIC' } : f)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.replyMode === 'STATIC' ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-border text-muted-foreground'}`}
                  >
                    Static Reply
                  </button>
                  <button
                    onClick={() => setForm(f => f ? { ...f, replyMode: 'AI' } : f)}
                    disabled={!config?.aiReplyEnabled}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all gap-1 flex items-center justify-center ${form.replyMode === 'AI' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-border text-muted-foreground'} disabled:opacity-40`}
                  >
                    <Sparkles className="w-3 h-3" /> AI Reply
                  </button>
                </div>

                {form.replyMode === 'STATIC' && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reply Text *</p>
                    <textarea
                      value={form.replyText}
                      onChange={e => setForm(f => f ? { ...f, replyText: e.target.value } : f)}
                      rows={3}
                      placeholder="Your reply message…"
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                )}

                {form.replyMode === 'AI' && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">AI System Prompt</p>
                      <textarea
                        value={form.aiSystemPrompt}
                        onChange={e => setForm(f => f ? { ...f, aiSystemPrompt: e.target.value } : f)}
                        rows={3}
                        placeholder="You are a repair shop assistant. Answer only repair-related questions. Keep replies under 3 sentences."
                        className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fallback Reply * <span className="normal-case font-normal">(if AI fails)</span></p>
                      <Input
                        value={form.fallbackReply}
                        onChange={e => setForm(f => f ? { ...f, fallbackReply: e.target.value } : f)}
                        placeholder="Please contact us directly at +91…"
                        className="h-8 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={submitForm}
                disabled={submitting}
                size="sm"
                className="rounded-xl bg-teal-600 hover:bg-teal-500 font-bold gap-2"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {form.editId ? 'Save Changes' : 'Add Node'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)} className="rounded-xl">Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Node Row ─────────────────────────────────────────────────────────────────

function NodeRow({
  node, depth, expanded, onToggleExpand, onEdit, onDelete, onAddChild, aiEnabled,
}: {
  node: MenuNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (node: MenuNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  aiEnabled: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <Card className={`rounded-2xl border border-border bg-card p-3 flex items-center gap-2 ${!node.enabled ? 'opacity-50' : ''}`}>
        {/* Expand toggle */}
        <button
          onClick={() => onToggleExpand(node.id)}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Trigger key */}
        <span className="text-xs font-black font-mono bg-muted px-2 py-0.5 rounded-md text-foreground shrink-0">
          {node.triggerKey}
        </span>

        {/* Label */}
        <span className="text-sm text-foreground flex-1 truncate">{node.menuLabel}</span>

        {/* Badges */}
        {node.isLeaf && node.replyMode === 'AI' && (
          <Badge variant="outline" className="text-[9px] shrink-0 text-purple-400 border-purple-400/30 gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </Badge>
        )}
        {node.isLeaf && node.replyMode === 'STATIC' && (
          <Badge variant="outline" className="text-[9px] shrink-0 text-muted-foreground">Reply</Badge>
        )}
        {!node.isLeaf && (
          <Badge variant="outline" className="text-[9px] shrink-0 text-teal-400 border-teal-400/30">
            {node.children.length} sub
          </Badge>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!node.isLeaf && (
            <button onClick={() => onAddChild(node.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-teal-400 transition-colors" title="Add child">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onEdit(node)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {/* Children */}
      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {node.children.map(child => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              aiEnabled={aiEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
