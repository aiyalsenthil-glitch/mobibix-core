"use client";

import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/partner/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Request failed");
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <img
            src="/assets/mobibix-main-logo.png"
            alt="MobiBix"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Forgot Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Enter your partner email and we&apos;ll send a reset link.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-teal-100 dark:border-teal-900/20">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Check your inbox
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                If <strong>{email}</strong> is registered, you&apos;ll receive a
                password reset link within a few minutes. The link expires in{" "}
                <strong>1 hour</strong>.
              </p>
              <Link
                href="/partner/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors mt-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Partner Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <button
                disabled={loading}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-base mt-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/partner/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
