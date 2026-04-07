"use client";

import { useState, useEffect, Suspense } from "react";
import { Lock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Missing reset token. Please use the link from your email.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/partner/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Reset failed");
      setSuccess(true);
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
            Set New Password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Choose a strong password for your partner account.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-teal-100 dark:border-teal-900/20">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Password updated!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your password has been reset successfully.
              </p>
              <Link
                href="/partner/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-all mt-4"
              >
                Sign In to Partner Portal
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-red-600 font-medium">
                Invalid reset link. Please request a new one.
              </p>
              <Link
                href="/partner/forgot-password"
                className="text-sm font-bold text-teal-600 hover:underline"
              >
                Request new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> New Password
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Confirm Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Set New Password"
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
