"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClipboardCheck,
  Microscope,
  Wrench,
  ShieldCheck,
  CheckCircle,
  PackageCheck,
  Smartphone,
  MessageCircle,
  MapPin,
  Lock,
  Camera,
  Box,
  Shield,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";

/**
 * ------------------------------------------------------------------
 * CONFIGURATION & TYPES
 * ------------------------------------------------------------------
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

type JobStatus =
  | "RECEIVED"
  | "ASSIGNED"
  | "DIAGNOSING"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "WAITING_FOR_PARTS"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

interface PublicJobDetails {
  jobNumber: string;
  status: JobStatus;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  updatedAt?: string;
  estimatedDelivery?: string;
}

/**
 * ------------------------------------------------------------------
 * TIMELINE LOGIC
 * ------------------------------------------------------------------
 */

const TIMELINE_STEPS = [
  {
    id: "received",
    label: "Received",
    icon: ClipboardCheck,
    color: "text-blue-400",
    glow: "shadow-[0_0_15px_rgba(96,165,250,0.5)]",
  },
  {
    id: "diagnosis",
    label: "Diagnosis",
    icon: Microscope,
    color: "text-purple-400",
    glow: "shadow-[0_0_15px_rgba(192,132,252,0.5)]",
  },
  {
    id: "repairing",
    label: "Repairing",
    icon: Wrench,
    color: "text-orange-400",
    glow: "shadow-[0_0_15px_rgba(251,146,60,0.5)]",
  },
  {
    id: "quality_check",
    label: "Quality Check",
    icon: ShieldCheck,
    color: "text-indigo-400",
    glow: "shadow-[0_0_15px_rgba(129,140,248,0.5)]",
  },
  {
    id: "ready",
    label: "Ready for Pickup",
    icon: CheckCircle,
    color: "text-emerald-400",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.5)]",
  },
  {
    id: "delivered",
    label: "Delivered",
    icon: PackageCheck,
    color: "text-teal-400",
    glow: "shadow-[0_0_15px_rgba(45,212,191,0.5)]",
  },
];

const getActiveStepIndex = (status: JobStatus): number => {
  switch (status) {
    case "RECEIVED":
    case "ASSIGNED":
      return 0; // Received
    case "DIAGNOSING":
    case "WAITING_APPROVAL":
    case "APPROVED":
    case "WAITING_FOR_PARTS":
      return 1; // Diagnosis
    case "IN_PROGRESS":
      return 2; // Repairing
    case "READY":
      return 4; // Ready (skips QC visual step to show both completed)
    case "DELIVERED":
      return 5; // Delivered
    case "CANCELLED":
    case "RETURNED":
      return -1; // Special case
    default:
      return 0;
  }
};

/**
 * ------------------------------------------------------------------
 * COMPONENT: PublicTrackPage (Premium Dark Mode)
 * ------------------------------------------------------------------
 */
export default function PublicTrackPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicJobDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.token) {
        setError("Missing token");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/public/job/${params.token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load status");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load status");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params?.token]);

  // Loading State - Premium
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-30 animate-pulse"></div>
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_30px_rgba(16,185,129,0.3)]"></div>
          <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs animate-pulse">
            Securely Fetching Status...
          </p>
        </div>
      </div>
    );
  }

  // Error State - Premium
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative">
        <div className="absolute inset-0 aurora-bg opacity-20"></div>
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-3xl relative z-10 animate-scale-in">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-red-500/20">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Record Unavailable
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            {error || "We couldn't locate the repair details. The link may have expired or is invalid."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/10"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const activeStep = getActiveStepIndex(data.status);
  const isTerminal = ["DELIVERED", "CANCELLED", "RETURNED"].includes(data.status);
  const isCancelled = ["CANCELLED", "RETURNED"].includes(data.status);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 pb-32 md:pb-12 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 aurora-bg opacity-30 dark:opacity-40 animate-[pulse_10s_ease_in_out_infinite]"></div>
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white dark:from-zinc-950 to-transparent z-0"></div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent z-0"></div>
      </div>

      <div className="relative max-w-md mx-auto flex flex-col z-10">
        {/* HEADER */}
        <header className="pt-10 px-6 pb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-black/20">
                <Wrench className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wide text-zinc-900 dark:text-white block leading-none">
                  {data.shop?.name || "MobiBix"}
                </span>
                <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Premium Repair</span>
              </div>
            </div>
            <div className="text-[10px] font-bold px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 tracking-wider shadow-sm">
              #{data.jobNumber}
            </div>
          </div>

          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:to-zinc-500 mb-2 tracking-tight">
              {isCancelled
                ? "Order Cancelled"
                : data.status === "DELIVERED"
                ? "Delivered"
                : activeStep === 4
                ? "Ready for Pickup"
                : "Repair in Progress"}
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-400 shadow-sm">
              <Clock className="w-3 h-3" />
              <span>Last updated {new Date(data.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="px-6 space-y-6 animate-fade-in-up delay-100">
          
          {/* 1. HERO DEVICE CARD */}
          <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
              <Smartphone className="w-48 h-48 rotate-12 translate-x-12 -translate-y-8 text-black dark:text-white" />
            </div>

            {/* Glowing Accent */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none ${
               isCancelled ? 'bg-red-500/10 dark:bg-red-500/20' : activeStep >= 4 ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : 'bg-indigo-500/10 dark:bg-indigo-500/20'
            }`}></div>

            <div className="relative z-10">
              <div className="flex items-start gap-5 mb-8">
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 dark:shadow-black/40">
                  <Smartphone className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-white tracking-tight mb-1">
                    {data.deviceModel}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400">
                      {data.deviceBrand}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400">
                      {data.deviceType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Status Bar */}
              <div
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md mb-2 transition-all duration-500 ${
                  isCancelled
                    ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
                    : activeStep >= 4
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)] dark:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    : "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.05)] dark:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                }`}
              >
                  {isCancelled ? (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  ) : activeStep >= 4 ? (
                    <CheckCircle className="w-5 h-5 shrink-0" />
                  ) : (
                    <div className="relative w-2.5 h-2.5">
                       <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                          activeStep >= 4 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-indigo-500 dark:bg-indigo-400'
                       }`}></span>
                       <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          activeStep >= 4 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                       }`}></span>
                    </div>
                  )}
                <span className="font-semibold text-sm tracking-wide">
                  {data.status.replace(/_/g, " ")}
                </span>
              </div>

               {data.estimatedDelivery && !isTerminal && (
                 <div className="flex justify-between items-center px-2 mt-4 text-xs">
                    <span className="text-zinc-500 dark:text-zinc-500">Estimated Completion</span>
                    <span className="text-zinc-900 dark:text-white font-medium bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-[11px] border border-zinc-200 dark:border-zinc-700">
                       {new Date(data.estimatedDelivery).toLocaleDateString()}
                    </span>
                 </div>
               )}
            </div>
          </div>

          {/* 2. PREMIUM TIMELINE */}
          {!isCancelled && (
            <div className="glass-card rounded-[2rem] p-8 border-t border-white/20 dark:border-white/10 relative overflow-hidden">
               {/* Ambient Glow */}
               <div className="absolute top-1/2 left-8 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none"></div>

              <div className="relative space-y-0">
                {/* Connecting Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-zinc-200 dark:bg-zinc-800 z-0"></div>
                {/* Progress Line */}
                <div 
                  className="absolute left-[27px] top-6 w-[2px] bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 z-0 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min((activeStep / (TIMELINE_STEPS.length - 1)) * 100, 100)}%` }}
                ></div>

                {TIMELINE_STEPS.map((step, index) => {
                  const isActive = index === activeStep;
                  const isCompleted = index < activeStep;
                  const visualState =
                    activeStep === 4 && index === 3 // If Ready, QC is done
                      ? "completed"
                      : isCompleted
                      ? "completed"
                      : isActive
                      ? "active"
                      : "pending";

                  return (
                    <div
                      key={step.id}
                      className={`relative flex items-center gap-5 py-4 group z-10 ${
                        visualState === "pending" ? "opacity-30 dark:opacity-30 blur-[0.5px] scale-95" : "opacity-100 scale-100"
                      } transition-all duration-500`}
                    >
                      {/* Timeline Dot/Icon */}
                      <div
                        className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 shrink-0 ${
                          visualState === "active"
                            ? `bg-white dark:bg-zinc-900 border-transparent ${step.glow} ring-1 ring-black/5 dark:ring-white/20 scale-110 shadow-lg` // Glowing Active
                            : visualState === "completed"
                            ? "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400" // Completed
                            : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800" // Pending
                        }`}
                      >
                         {/* Pulse Ring for Active */}
                         {visualState === "active" && (
                            <div className="absolute inset-0 rounded-2xl animate-pulse-ring opacity-50 bg-current"></div>
                         )}
                         
                        <step.icon
                          className={`w-6 h-6 transition-all duration-500 ${
                            visualState === "active"
                              ? step.color
                              : visualState === "completed"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <p
                          className={`font-bold text-base tracking-wide transition-colors ${
                             visualState === "active" ? "text-zinc-900 dark:text-white" : visualState === "completed" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-600"
                          }`}
                        >
                          {step.label}
                        </p>
                        {visualState === "active" && (
                          <p className={`text-xs font-medium animate-pulse mt-1 ${step.color.replace('text-', 'text-opacity-100 dark:text-opacity-80 text-')}`}>
                            Currently in progress...
                          </p>
                        )}
                      </div>
                      
                      {visualState === "completed" && (
                         <div className="w-6 h-6 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 dark:border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. TRUST & INFO GRID */}
          <div className="grid grid-cols-2 gap-4 pb-28">
             {[
                { icon: Lock, label: "Secure Locker", sub: "AES-256 Encrypted" },
                { icon: Camera, label: "Intake Verified", sub: "Photo Evidence" },
                { icon: Box, label: "Genuine Parts", sub: "OEM Grade" },
                { icon: Shield, label: "Warranty", sub: "30 Days Support" }
             ].map((item, idx) => (
                <div key={idx} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-default group shadow-sm shadow-black/[0.02] dark:shadow-none">
                   <item.icon className="w-5 h-5 text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors mb-2" />
                   <div className="text-zinc-800 dark:text-zinc-300 text-sm font-semibold">{item.label}</div>
                   <div className="text-zinc-500 dark:text-zinc-600 text-[10px] uppercase tracking-[0.05em] font-medium mt-0.5">{item.sub}</div>
                </div>
             ))}
          </div>
        </main>

        {/* 4. FLOATING ACTION BAR */}
        <div className="fixed bottom-8 left-0 right-0 px-6 max-w-md mx-auto z-50 animate-fade-in-up delay-200">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[2rem] p-2 shadow-2xl shadow-black/10 dark:shadow-black/50 flex gap-2">
            <a
              href={`https://wa.me/?text=Hi, asking about job ${data.jobNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-[1.5rem] flex items-center justify-center gap-2.5 font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/20 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <MessageCircle className="w-5 h-5 fill-white/20" />
              Chat on WhatsApp
            </a>
            <button
              className="w-16 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-[1.5rem] flex items-center justify-center transition-colors border border-black/5 dark:border-white/5 active:scale-95"
              title="Get Directions"
            >
              <MapPin className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
