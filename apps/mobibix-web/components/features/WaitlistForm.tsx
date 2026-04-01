"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function WaitlistForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (joinedWaitlist) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 py-4"
      >
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 border border-green-500/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">You&apos;re on the list!</h4>
        <p className="text-muted-foreground font-bold">We&apos;ll notify you at {phoneNumber} as soon as we launch.</p>
      </motion.div>
    );
  }

  return (
    <>
      <p className="text-muted-foreground font-bold mb-8 max-w-xl mx-auto relative z-10">
        We be releasing this exact feature module to beta users very soon. Enter your shop&apos;s WhatsApp number to get priority access.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (phoneNumber.length >= 10) {
            setIsLoading(true);
            setErrorMsg("");
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/waitlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phoneNumber }),
              });
              if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to join waitlist");
              }
              setJoinedWaitlist(true);
            } catch (err: unknown) {
              setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }
        }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto relative z-10"
      >
        <input
          type="tel"
          placeholder="+91 Shop WhatsApp Number"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full sm:w-2/3 px-6 py-4 rounded-2xl border border-border bg-background/50 backdrop-blur-md text-foreground placeholder:text-muted-foreground font-bold focus:outline-none focus:border-green-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-1/3 px-6 py-4 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {errorMsg && <p className="text-red-500 text-sm font-bold mt-4 relative z-10">{errorMsg}</p>}
    </>
  );
}
