"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  Network,
  Gift
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { distributorApi, DistAnalytics } from "@/services/distributor.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/gst.utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DistributorDashboard() {
  const [data, setData] = useState<DistAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotRegistered, setIsNotRegistered] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: "", code: "" });
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const result = await distributorApi.getOverview();
        setData(result);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setIsNotRegistered(true);
        }
        console.error("Failed to load distributor overview", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (isNotRegistered) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-indigo-100 dark:border-indigo-900/40 text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 dark:bg-indigo-950/50 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Network size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Enable Distributor Mode</h2>
            <p className="text-slate-500 dark:text-slate-400">Start your wholesale network and connect with retailers. Set up your brand identity below.</p>
          </div>
          <div className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400 ml-1">Distributor / Brand Name</label>
              <Input placeholder="e.g. Aiyal Wholesale" value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400 ml-1">Unique Referral Code</label>
              <Input placeholder="e.g. AIYAL-2024" value={registerForm.code} onChange={e => setRegisterForm({...registerForm, code: e.target.value.toUpperCase()})} />
              <p className="text-[10px] text-slate-400 italic">Retailers will use this code to link with you during signup.</p>
            </div>
          </div>
          <Button 
            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold" 
            disabled={isRegistering}
            onClick={async () => {
              if (!registerForm.name || !registerForm.code) {
                toast({ variant: "destructive", title: "Missing fields", description: "Please fill in both name and code." });
                return;
              }
              setIsRegistering(true);
              try {
                const res = await fetch('/api/distributor/admin/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: registerForm.name, referralCode: registerForm.code })
                });
                if (!res.ok) throw new Error("Registration failed");
                toast({ title: "Welcome Aboard! 🚀", description: "You are now a verified MobiBix Distributor." });
                window.location.reload();
              } catch (err) {
                toast({ variant: "destructive", title: "Registration failed", description: "Ensure the referral code is unique." });
              } finally {
                setIsRegistering(false);
              }
            }}
          >
            {isRegistering ? "Registering..." : "Activate Hub Now"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Distributor Backoffice
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Manage your retailer network and track wholesale sales performance.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Retailers" 
          value={data?.totalRetailers ?? 0} 
          icon={Users} 
          description="Linked businesses" 
          color="blue"
        />
        <StatCard 
          title="Total Orders" 
          value={data?.totalOrders ?? 0} 
          icon={ShoppingBag} 
          description="Purchase orders received" 
          color="indigo"
        />
        <StatCard 
          title="Monthly Revenue" 
          value={formatCurrency(data?.monthlyRevenue?.amount ?? 0)} 
          icon={TrendingUp} 
          description={`Sales in ${data?.currentMonth}`} 
          color="emerald"
          trend="+12% from last month"
          trendUp={true}
        />
        <StatCard 
          title="Units Sold" 
          value={data?.monthlyRevenue?.unitsSold ?? 0} 
          icon={Package} 
          description="Volume this month" 
          color="amber"
        />
      </div>

      {/* Partner Commissions Section */}
      {data?.partnerEarnings && (
        <div className="grid gap-6 md:grid-cols-1">
          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Network size={200} />
            </div>
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold opacity-90 uppercase tracking-wider">Partner Rewards</h3>
                </div>
                <div className="flex items-baseline gap-4">
                  <h2 className="text-5xl font-black">{formatCurrency(data.partnerEarnings.total)}</h2>
                  <p className="text-indigo-200 font-medium">Total Commission Earned</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-indigo-200 text-xs font-bold uppercase">Pending Payout</p>
                    <p className="text-xl font-bold">{formatCurrency(data.partnerEarnings.pending)}</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div>
                    <p className="text-indigo-200 text-xs font-bold uppercase">Paid via Bank/UPI</p>
                    <p className="text-xl font-bold">{formatCurrency(data.partnerEarnings.paid)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 space-y-4 w-full md:w-auto">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-indigo-200">Your Referral Code</p>
                  <p className="text-3xl font-black tracking-widest">{data.partnerEarnings.code}</p>
                </div>
                <p className="text-sm text-indigo-100 max-w-[240px]">Share this code to onboard retailers and earn <span className="font-bold">30% upfront + 10% recurring</span> commissions.</p>
                <Button className="w-full bg-white text-indigo-600 hover:bg-slate-100 font-bold rounded-xl" onClick={() => {
                   navigator.clipboard.writeText(data.partnerEarnings?.code || "");
                   toast({ title: "Code Copied!", description: "Share it with your prospective retailers." });
                }}>
                  Copy Referral Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Product Performance */}
        <Card className="col-span-4 border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Top Performing Products
            </CardTitle>
            <CardDescription>Highest volume items sold through your network this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data?.topProducts?.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{p.catalogItem?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-slate-500">{p.catalogItem?.brand} • {p.catalogItem?.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">{p._sum.quantitySold} units</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(p._sum.revenueAmount)}</p>
                  </div>
                </div>
              ))}
              {(!data?.topProducts || data.topProducts.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p>No sales data recorded yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Attribution Activity */}
        <Card className="col-span-3 border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Recent Sales Activity
            </CardTitle>
            <CardDescription>Live attribution from linked retailers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data?.recentAttributions?.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                      Retailer <span className="text-indigo-600 dark:text-indigo-400">#{log.retailerId.substring(0,6)}</span> sold {log.quantitySold} units
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.saleDate).toLocaleDateString()} • Attributed Revenue: {formatCurrency(log.revenueAmount)}
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.recentAttributions || data.recentAttributions.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                  <p>Waiting for sales events...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, color, trend, trendUp }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg transition-all hover:shadow-xl hover:-translate-y-1 border border-white/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className={`p-3 rounded-2xl ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
