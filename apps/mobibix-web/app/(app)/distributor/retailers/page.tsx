"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, ChevronRight, Package, Send, Loader2, Phone, Mail, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { distributorApi } from "@/services/distributor.api";
import { distributorLinkingApi } from "@/services/distributor-linking.api";
import { RetailerStockManager } from "@/components/distributor/RetailerStockManager";

interface Retailer {
  id: string;
  name: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate?: string;
}

export default function RetailersPage() {
  const { toast } = useToast();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);

  // Invite flow
  const [showInvite, setShowInvite] = useState(false);
  const [inviteBy, setInviteBy] = useState<"phone" | "email" | "code">("phone");
  const [inviteValue, setInviteValue] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await distributorApi.getRetailers();
      setRetailers(Array.isArray(data) ? data : []);
    } catch {
      setRetailers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!inviteValue.trim()) return;
    setInviting(true);
    try {
      await distributorLinkingApi.sendInvite({
        phone: inviteBy === "phone" ? inviteValue.trim() : undefined,
        email: inviteBy === "email" ? inviteValue.trim() : undefined,
        tenantCode: inviteBy === "code" ? inviteValue.trim() : undefined,
      });
      toast({ title: "Invite sent!", description: "The retailer will see it in their Distributor Network settings." });
      setInviteValue("");
      setShowInvite(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setInviting(false); }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-500" /> Your Retailers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage linked shops, view their inventory, and send restock suggestions.</p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)} className="bg-teal-600 hover:bg-teal-700 gap-2">
          <UserPlus className="w-4 h-4" /> Invite Retailer
        </Button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-teal-500" /> Send Link Invite
          </h3>
          <div className="flex gap-2">
            {(["phone", "email", "code"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setInviteBy(m); setInviteValue(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  inviteBy === m ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {m === "phone" ? <Phone className="w-3 h-3" /> : m === "email" ? <Mail className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                {m === "code" ? "Tenant Code" : m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inviteValue}
              onChange={e => setInviteValue(e.target.value)}
              placeholder={
                inviteBy === "phone" ? "e.g. 9876543210" :
                inviteBy === "email" ? "e.g. owner@shop.com" :
                "e.g. MOBI1234"
              }
              className="flex-1"
            />
            <Button onClick={sendInvite} disabled={inviting || !inviteValue.trim()} className="bg-teal-600 hover:bg-teal-700">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </Button>
          </div>
          <p className="text-xs text-slate-400">The retailer will see your invite in their Settings → Distributor Network page. No commission is earned for manual links — only for new signups via your referral code.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retailer list */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)
          ) : retailers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No retailers yet.</p>
              <p className="text-xs mt-1">Share your referral code or send an invite.</p>
            </div>
          ) : (
            retailers.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRetailer(r)}
                className={`w-full flex items-center justify-between rounded-xl border p-4 text-left transition ${
                  selectedRetailer?.id === r.id
                    ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-300"
                }`}
              >
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.totalOrders} orders · ₹{Number(r.totalRevenue).toLocaleString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))
          )}
        </div>

        {/* Stock + Refill panel */}
        <div className="lg:col-span-2">
          {!selectedRetailer ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Package className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">Select a retailer to view stock and send refill suggestions</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-4">{selectedRetailer.name}</h2>
              <RetailerStockManager
                retailerId={selectedRetailer.id}
                retailerLabel={selectedRetailer.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
