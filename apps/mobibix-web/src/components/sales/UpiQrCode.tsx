"use client";

import { QRCodeSVG } from "qrcode.react";
import { Smartphone, CheckCircle2 } from "lucide-react";

interface UpiQrCodeProps {
  upiId: string;
  amount: number;
  shopName: string;
}

export function UpiQrCode({ upiId, amount, shopName }: UpiQrCodeProps) {
  const note = `Invoice from ${shopName}`;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  return (
    <div className="mt-4 rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/5 to-transparent dark:from-violet-500/10 p-4 text-center animate-in fade-in duration-300">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400 mb-3">
        Scan to Pay via UPI
      </p>
      <div className="flex justify-center mb-3">
        <div className="relative p-3 bg-white rounded-2xl shadow-lg shadow-violet-400/20 inline-flex">
          <QRCodeSVG
            value={upiUrl}
            size={148}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
            imageSettings={{
              src: "/assets/features/upi-logo.png",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Smartphone className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
          {upiId}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-500">
        For ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {shopName}
      </p>
      <div className="mt-3 pt-3 border-t border-violet-400/10 flex items-center justify-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        <span>Amount auto-updates as items are added</span>
      </div>
    </div>
  );
}
