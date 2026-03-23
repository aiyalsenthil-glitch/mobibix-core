"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Network, Link2, ShieldCheck, PackagePlus, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Loader2, Bell, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  retailerLinkingApi,
  stockVisibilityApi,
  refillApi,
  productMetaApi,
  LinkedDistributor,
  DistLinkInvite,
  RefillRequest,
} from "@/services/distributor-linking.api";

// ── Per-distributor visibility card ───────────────────────────────────────────
function DistributorVisibilityCard({ link, onUpdated, productMeta }: {
  link: LinkedDistributor;
  onUpdated: () => void;
  productMeta: { brands: string[]; categories: string[] };
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(link.stockVisibilityEnabled);
  const [allowAll, setAllowAll] = useState(link.stockVisibility?.allowAllProducts ?? false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(link.stockVisibility?.allowedBrands ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(link.stockVisibility?.allowedCategories ?? []);
  const [dirty, setDirty] = useState(false);

  const save = async (newEnabled: boolean, newAllowAll: boolean) => {
    setSaving(true);
    try {
      await stockVisibilityApi.updateSettings(link.distributor.id, {
        stockVisibilityEnabled: newEnabled,
        allowAllProducts: newAllowAll,
        allowedCategories: newAllowAll ? [] : selectedCategories,
        allowedBrands: newAllowAll ? [] : selectedBrands,
      });
      setEnabled(newEnabled);
      setAllowAll(newAllowAll);
      setDirty(false);
      toast({ title: "Saved", description: `Visibility updated for ${link.distributor.name}` });
      onUpdated();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{link.distributor.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Code: <span className="font-mono text-teal-600 dark:text-teal-400">{link.distributor.referralCode}</span>
            {link.distributor.phone && <> · {link.distributor.phone}</>}
          </p>
        </div>
        {/* Master toggle */}
        <button
          onClick={() => save(!enabled, allowAll)}
          disabled={saving}
          className={`w-12 h-6 rounded-full transition-colors ${enabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"}`}
          title={enabled ? "Disable stock visibility" : "Enable stock visibility"}
        >
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Detail — only shown when enabled */}
      {enabled && (
        <div className="px-5 py-4 space-y-4 bg-teal-50/30 dark:bg-teal-950/10">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-teal-500" />
            This distributor can see your stock levels. Choose what they can see:
          </p>

          {/* Allow all toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAll}
              onChange={e => { setAllowAll(e.target.checked); setDirty(true); }}
              className="w-4 h-4 rounded accent-teal-600"
            />
            <div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Allow all products</span>
              <p className="text-xs text-slate-400">Distributor sees your entire inventory</p>
            </div>
          </label>

          {/* Brand + Category checkboxes — only shown when not allowAll */}
          {!allowAll && (
            <div className="space-y-4">
              {/* Brands */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Brands</p>
                {productMeta.brands.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No brands set on your products yet. Add brand when creating products.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {productMeta.brands.map(brand => (
                      <label key={brand} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition ${selectedBrands.includes(brand) ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300"}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedBrands.includes(brand)}
                          onChange={e => {
                            setSelectedBrands(prev => e.target.checked ? [...prev, brand] : prev.filter(b => b !== brand));
                            setDirty(true);
                          }}
                        />
                        {brand}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</p>
                {productMeta.categories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No categories set on your products yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {productMeta.categories.map(cat => (
                      <label key={cat} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition ${selectedCategories.includes(cat) ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300"}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedCategories.includes(cat)}
                          onChange={e => {
                            setSelectedCategories(prev => e.target.checked ? [...prev, cat] : prev.filter(c => c !== cat));
                            setDirty(true);
                          }}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {dirty && (
            <Button
              size="sm"
              onClick={() => save(true, allowAll)}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          )}
        </div>
      )}

      {!enabled && (
        <div className="px-5 py-3 flex items-center gap-2 text-xs text-slate-400">
          <EyeOff className="w-3.5 h-3.5" />
          Hidden — {link.distributor.name} cannot see any of your stock
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DistributorSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"link" | "visibility" | "refills">("link");

  // Product meta (brands + categories for visibility checkboxes)
  const [productMeta, setProductMeta] = useState<{ brands: string[]; categories: string[] }>({ brands: [], categories: [] });

  // Linked distributors
  const [distributors, setDistributors] = useState<LinkedDistributor[]>([]);
  const [distLoading, setDistLoading] = useState(true);

  // Self-link
  const [referralCode, setReferralCode] = useState("");
  const [linking, setLinking] = useState(false);

  // Pending invites
  const [invites, setInvites] = useState<DistLinkInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(true);

  // Refill requests
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [refillLoading, setRefillLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadDistributors = useCallback(async () => {
    setDistLoading(true);
    try {
      const data = await retailerLinkingApi.listDistributors();
      setDistributors(Array.isArray(data) ? data : []);
    } catch { setDistributors([]); } finally { setDistLoading(false); }
  }, []);

  const loadInvites = useCallback(async () => {
    setInviteLoading(true);
    try {
      const data = await retailerLinkingApi.listInvites();
      setInvites(Array.isArray(data) ? data : []);
    } catch { setInvites([]); } finally { setInviteLoading(false); }
  }, []);

  const loadRefills = useCallback(async () => {
    setRefillLoading(true);
    try {
      const data = await refillApi.list();
      setRefills(Array.isArray(data) ? data : []);
    } catch { setRefills([]); } finally { setRefillLoading(false); }
  }, []);

  useEffect(() => {
    loadDistributors();
    loadInvites();
    loadRefills();
    productMetaApi.getMeta().then(m => setProductMeta(m)).catch(() => {});
  }, [loadDistributors, loadInvites, loadRefills]);

  const handleSelfLink = async () => {
    if (!referralCode.trim()) return;
    setLinking(true);
    try {
      await retailerLinkingApi.selfLink(referralCode.trim().toUpperCase());
      toast({ title: "Linked!", description: "You're now connected to the distributor network." });
      setReferralCode("");
      loadDistributors();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally { setLinking(false); }
  };

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    try {
      await retailerLinkingApi.respondToInvite(inviteId, accept);
      toast({ title: accept ? "Linked!" : "Declined", description: accept ? "Distributor link is now active." : "Invite declined." });
      loadInvites();
      if (accept) loadDistributors();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleRefillResponse = async (id: string, accept: boolean) => {
    try {
      await refillApi.respond(id, accept);
      toast({
        title: accept ? "Order Created" : "Declined",
        description: accept ? "A purchase order has been created from this refill." : "Refill suggestion declined.",
      });
      loadRefills();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const pendingRefills = refills.filter(r => r.status === "PENDING");

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Network className="w-6 h-6 text-teal-500" /> Distributor Network
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your distributor links, stock visibility permissions, and incoming restock suggestions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["link", "visibility", "refills"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              activeTab === tab
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "refills" ? (
              <span className="flex items-center gap-1.5">
                Refill Requests
                {pendingRefills.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {pendingRefills.length}
                  </span>
                )}
              </span>
            ) : tab === "link" ? (
              <span className="flex items-center gap-1.5">
                My Distributors
                {distributors.length > 0 && (
                  <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {distributors.length}
                  </span>
                )}
              </span>
            ) : "Stock Visibility"}
          </button>
        ))}
      </div>

      {/* TAB: LINK / MY DISTRIBUTORS */}
      {activeTab === "link" && (
        <div className="space-y-6">
          {/* Self-link */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-teal-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Connect to a Distributor</h2>
            </div>
            <p className="text-sm text-slate-500">
              Enter a distributor's referral code to manually link your shop. You can connect to multiple distributors — each can be given different visibility rules.
            </p>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. DIST-VIVO01"
                className="font-mono text-teal-600 dark:text-teal-400 font-bold uppercase"
              />
              <Button onClick={handleSelfLink} disabled={linking || !referralCode.trim()} className="bg-teal-600 hover:bg-teal-700 shrink-0">
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
              </Button>
            </div>
          </div>

          {/* Active links */}
          {distLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading distributors...</div>
          ) : distributors.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Links</p>
              {distributors.map(link => (
                <div key={link.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <Network className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.distributor.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{link.distributor.referralCode}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    link.stockVisibilityEnabled
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}>
                    {link.stockVisibilityEnabled ? "Visibility ON" : "Visibility OFF"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Pending invites */}
          {(inviteLoading || invites.length > 0) && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Pending Invitations</h2>
              </div>
              {inviteLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : (
                <div className="space-y-3">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{invite.distributor.name}</p>
                        <p className="text-xs text-slate-500">
                          Code: <span className="font-mono text-teal-600">{invite.distributor.referralCode}</span> · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleInviteResponse(invite.id, true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleInviteResponse(invite.id, false)} className="gap-1 text-red-500 border-red-200 hover:bg-red-50">
                          <XCircle className="w-3 h-3" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: STOCK VISIBILITY */}
      {activeTab === "visibility" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Stock Visibility Per Distributor</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each distributor is isolated — Vivo distributor sees only Vivo products, Oppo sees only Oppo, etc. Default is OFF for all.
              </p>
            </div>
          </div>

          {distLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your distributors...
            </div>
          ) : distributors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Network className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No distributors linked yet.</p>
              <p className="text-xs mt-1">Go to "My Distributors" tab to connect.</p>
            </div>
          ) : (
            distributors.map(link => (
              <DistributorVisibilityCard key={link.id} link={link} onUpdated={loadDistributors} productMeta={productMeta} />
            ))
          )}
        </div>
      )}

      {/* TAB: REFILL REQUESTS */}
      {activeTab === "refills" && (
        <div className="space-y-4">
          {refillLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : refills.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <PackagePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No refill suggestions yet from your distributors.</p>
            </div>
          ) : (
            refills.map(refill => (
              <div key={refill.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => setExpanded(expanded === refill.id ? null : refill.id)}
                >
                  <div className="flex items-center gap-3">
                    <PackagePlus className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">
                        Restock from {refill.link.distributor.name}
                      </p>
                      <p className="text-xs text-slate-500">{refill.items.length} items · {new Date(refill.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      refill.status === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                      refill.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-500 dark:bg-slate-800"
                    }`}>
                      {refill.status}
                    </span>
                    {expanded === refill.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {expanded === refill.id && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
                    {refill.notes && <p className="text-sm text-slate-500 italic">"{refill.notes}"</p>}
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400">
                        <tr>
                          <th className="text-left py-1">Product</th>
                          <th className="text-right py-1">Qty</th>
                          <th className="text-right py-1">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refill.items.map(item => (
                          <tr key={item.id} className="border-t border-slate-50 dark:border-slate-800/50">
                            <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                              {item.catalogItem.name}
                              {item.catalogItem.sku && <span className="ml-1 text-xs text-slate-400">({item.catalogItem.sku})</span>}
                            </td>
                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.suggestedQty}</td>
                            <td className="py-2 text-right text-slate-600 dark:text-slate-400">₹{Number(item.catalogItem.unitPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {refill.status === "PENDING" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => handleRefillResponse(refill.id, true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Accept & Create Order
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRefillResponse(refill.id, false)} className="gap-1 text-red-500 border-red-200 hover:bg-red-50">
                          <XCircle className="w-3 h-3" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
