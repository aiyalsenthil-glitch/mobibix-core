"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "REMOVED_AUTH_PROVIDER/auth";
import { auth, googleProvider } from "@/lib/REMOVED_AUTH_PROVIDER";
import { exchangeFirebaseToken } from "@/services/auth.api";
import { authenticatedFetch } from "@/services/auth.api";
import Link from "next/link";
import { Network, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Check } from "lucide-react";

type Step = "AUTH" | "PROFILE";

export default function DistributorSignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("AUTH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Profile fields
  const [brandName, setBrandName] = useState("");
  const [referralCode, setReferralCode] = useState("DIST-");

  // After Firebase auth, we hold the ID token to call the register endpoint
  const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      setError("Firebase not initialized.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      // Exchange token to establish session cookie
      await exchangeFirebaseToken(idToken);
      setPendingIdToken(idToken);
      setStep("PROFILE");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) { setError("Firebase not initialized."); return; }
    setLoading(true);
    setError(null);
    try {
      let REMOVED_AUTH_PROVIDERUser;
      try {
        // Try sign-in first
        const cred = await signInWithEmailAndPassword(auth, email, password);
        REMOVED_AUTH_PROVIDERUser = cred.user;
      } catch {
        // Account doesn't exist — create it
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        REMOVED_AUTH_PROVIDERUser = cred.user;
        if (fullName) await updateProfile(REMOVED_AUTH_PROVIDERUser, { displayName: fullName });
      }
      const idToken = await REMOVED_AUTH_PROVIDERUser.getIdToken();
      await exchangeFirebaseToken(idToken);
      setPendingIdToken(idToken);
      setStep("PROFILE");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) { setError("Brand name is required."); return; }
    const code = referralCode.trim().toUpperCase();
    if (!/^DIST-[A-Z0-9]{4,10}$/.test(code)) {
      setError("Referral code must be DIST- followed by 4–10 letters/numbers (e.g. DIST-ALPHA1).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/distributor/admin/register", {
        method: "POST",
        body: JSON.stringify({ name: brandName, referralCode: code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed.");
      }

      // Redirect to distributor hub
      window.location.href = "/distributor/dashboard";
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setLoading(false);
    }
  };

  const handleReferralCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    // Always keep the DIST- prefix
    if (!upper.startsWith("DIST-")) {
      setReferralCode("DIST-");
    } else {
      setReferralCode(upper);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/assets/mobibix-main-logo.png" alt="MobiBix" className="h-16 mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
            <Network className="w-4 h-4" />
            Distributor Network
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {step === "AUTH" ? "Create Distributor Account" : "Set Up Your Hub"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {step === "AUTH"
              ? "Join MobiBix as a distributor — free account, grow your retailer network"
              : "Choose your brand name and unique referral code"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-indigo-100 dark:border-indigo-900/20">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── STEP 1: Auth ── */}
          {step === "AUTH" && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all mb-5 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm mt-1 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Profile ── */}
          {step === "PROFILE" && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Brand / Business Name
                </label>
                <input
                  required
                  type="text"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  placeholder="e.g. Alpha Mobile Distributors"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Your Referral Code
                </label>
                <p className="text-xs text-slate-400 mb-2">Retailers use this code to auto-link to your network at signup.</p>
                <input
                  required
                  type="text"
                  value={referralCode}
                  onChange={e => handleReferralCodeChange(e.target.value)}
                  placeholder="DIST-ALPHA1"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono tracking-widest transition-all"
                />
                <p className="text-xs text-slate-400 mt-1.5">Format: DIST- followed by 4–10 letters or numbers</p>
              </div>

              {/* Free tier callout */}
              <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-sm">
                <Check className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">Free distributor account</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Manage retailers, share catalog, track orders. Upgrade to MobiBix ERP anytime to also run your own shop.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-60"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Network className="w-4 h-4" /><span>Launch My Distributor Hub</span></>}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500">
            Already a distributor?{" "}
            <Link href="/auth" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
            {" · "}
            <Link href="/partner/apply" className="text-slate-400 hover:text-slate-600 hover:underline">Become a Partner instead</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
