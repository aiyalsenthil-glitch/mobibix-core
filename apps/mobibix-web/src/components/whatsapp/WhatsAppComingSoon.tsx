"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft, Zap } from "lucide-react";

export default function WhatsAppComingSoon() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Animated Icon Container */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-teal-500/10 rounded-full animate-ping duration-[3000ms]"></div>
          <div className="relative flex items-center justify-center w-24 h-24 bg-teal-50 rounded-full border border-teal-100">
            <MessageSquare className="w-12 h-12 text-teal-600" />
            <Zap className="absolute -top-1 -right-1 w-8 h-8 text-amber-500 fill-amber-500 animate-bounce" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            WhatsApp CRM
            <br />
            <span className="text-teal-600">Coming Soon</span>
          </h1>
          <p className="text-gray-600 leading-relaxed">
            We're currently polishing the WhatsApp integration to ensure you get the best experience. Bulk campaigns, retail inbox, and automation are arriving shortly.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="pt-8 grid grid-cols-3 gap-4 opacity-50 grayscale select-none">
          <div className="space-y-1">
            <div className="h-1 bg-gray-200 rounded-full"></div>
            <p className="text-[10px] font-bold uppercase tracking-wider">Inbox</p>
          </div>
          <div className="space-y-1">
            <div className="h-1 bg-teal-500 rounded-full"></div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Campaigns</p>
          </div>
          <div className="space-y-1">
            <div className="h-1 bg-gray-200 rounded-full"></div>
            <p className="text-[10px] font-bold uppercase tracking-wider">Automation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
