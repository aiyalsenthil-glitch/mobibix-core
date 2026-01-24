"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithPopup, signInWithEmailAndPassword } from "REMOVED_AUTH_PROVIDER/auth";
import { auth, googleProvider } from "@/lib/REMOVED_AUTH_PROVIDER";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRedirect } from "@/lib/auth-routes";

export default function AuthPage({
  mode = "signin",
}: {
  mode?: "signin" | "signup";
}) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    exchangeToken,
    error: authError,
    authUser,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && authUser) {
      const path = getRoleRedirect(authUser);
      router.replace(path);
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithPopup(auth, googleProvider);
      await exchangeToken(result.user);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(
        err.message || "Failed to sign in with Google. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      // Firebase email/password sign-in then backend exchange
      const result = await signInWithEmailAndPassword(auth, email, password);
      await exchangeToken(result.user);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black light-mode:bg-gradient-to-br light-mode:from-slate-50 light-mode:to-slate-100 overflow-hidden flex items-center justify-center">
      {/* Cinematic Background with Radial Glows */}
      <div className="fixed inset-0 z-0">
        {/* Dark Mode Background */}
        <div className="absolute inset-0 bg-black light-mode:hidden"></div>

        {/* Light Mode Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 hidden light-mode:block"></div>

        {/* Primary radial glow - dark mode blue center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-blue-500/5 to-transparent blur-[120px] pointer-events-none light-mode:hidden"></div>

        {/* Light Mode Primary glow - teal center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-teal-400/15 via-teal-400/5 to-transparent blur-[120px] pointer-events-none hidden light-mode:block"></div>

        {/* Secondary glow - accent from top-right (dark mode) */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-radial from-cyan-500/10 via-cyan-500/0 to-transparent blur-[100px] pointer-events-none light-mode:hidden"></div>

        {/* Secondary glow - accent from top-right (light mode) */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-radial from-teal-300/8 via-teal-300/0 to-transparent blur-[100px] pointer-events-none hidden light-mode:block"></div>

        {/* Tertiary glow - subtle from bottom-left (dark mode) */}
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-radial from-blue-600/5 via-blue-600/0 to-transparent blur-[100px] pointer-events-none light-mode:hidden"></div>

        {/* Tertiary glow - subtle from bottom-left (light mode) */}
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-radial from-teal-200/5 via-teal-200/0 to-transparent blur-[100px] pointer-events-none hidden light-mode:block"></div>

        {/* Fine noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015] light-mode:opacity-[0.03]"
          style={{
            backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')`,
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Soft glow behind the card - dark mode */}
        <div className="absolute -inset-8 bg-gradient-to-b from-blue-500/10 to-transparent blur-2xl rounded-3xl opacity-40 pointer-events-none light-mode:hidden"></div>

        {/* Soft glow behind the card - light mode */}
        <div className="absolute -inset-8 bg-gradient-to-b from-teal-400/8 to-transparent blur-2xl rounded-3xl opacity-30 pointer-events-none hidden light-mode:block"></div>

        {/* Main Card - Glassmorphism */}
        <div className="relative backdrop-blur-xl bg-white/[0.08] light-mode:bg-white/40 border border-white/10 light-mode:border-teal-200/30 rounded-2xl p-8 shadow-2xl light-mode:shadow-lg">
          {/* Subtle gradient border glow - dark mode */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none light-mode:hidden"></div>

          {/* Subtle gradient border glow - light mode */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none hidden light-mode:block"></div>

          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-2 h-2 bg-blue-400 light-mode:bg-teal-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 light-mode:text-teal-700">
                  MobiBix
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white light-mode:text-slate-900 mb-3">
                Welcome Back
              </h1>
              <p className="text-sm text-stone-400 light-mode:text-slate-600 leading-relaxed">
                {isSignUp
                  ? "Join thousands of businesses managing repairs efficiently"
                  : "Secure access to your repair shop management platform"}
              </p>
            </div>

            {/* Error Message */}
            {(error || authError) && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error || authError}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading || authLoading}
              className="w-full mb-6 px-4 py-3 rounded-lg border border-white/20 light-mode:border-teal-300/50 bg-white/5 light-mode:bg-white/60 hover:bg-white/10 light-mode:hover:bg-white/70 text-white light-mode:text-slate-900 font-medium transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>
                {loading || authLoading
                  ? "Signing in..."
                  : "Continue with Google"}
              </span>
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10 light-mode:border-teal-200/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-black light-mode:bg-white text-stone-500 light-mode:text-slate-600">
                  or
                </span>
              </div>
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-300 light-mode:text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 light-mode:bg-white/80 border border-white/10 light-mode:border-teal-300/30 text-white light-mode:text-slate-900 placeholder-stone-500 light-mode:placeholder-slate-500 focus:border-blue-500/50 light-mode:focus:border-teal-500/50 focus:bg-white/[0.08] light-mode:focus:bg-white focus:outline-none transition-all duration-300 text-sm"
              />
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-stone-300 light-mode:text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 light-mode:bg-white/80 border border-white/10 light-mode:border-teal-300/30 text-white light-mode:text-slate-900 placeholder-stone-500 light-mode:placeholder-slate-500 focus:border-blue-500/50 light-mode:focus:border-teal-500/50 focus:bg-white/[0.08] light-mode:focus:bg-white focus:outline-none transition-all duration-300 text-sm"
              />
            </div>

            {/* Sign In / Up Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 light-mode:from-teal-500 light-mode:to-teal-600 hover:from-blue-600 hover:to-blue-700 light-mode:hover:from-teal-600 light-mode:hover:to-teal-700 text-white font-semibold transition-all duration-300 disabled:opacity-50 mb-4 group"
            >
              {loading
                ? "Processing..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>

            {/* Toggle Sign In / Sign Up */}
            <p className="text-center text-xs text-stone-400 light-mode:text-slate-600">
              {isSignUp ? "Already have an account? " : "New to MobiBix? "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 light-mode:text-teal-600 hover:text-blue-300 light-mode:hover:text-teal-700 font-medium transition-colors"
              >
                {isSignUp ? "Sign In" : "Start Free Trial"}
              </button>
            </p>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-white/5 light-mode:border-teal-200/30 text-center text-xs text-stone-500 light-mode:text-slate-600 space-y-2">
              <div>
                <Link
                  href="/"
                  className="hover:text-stone-300 light-mode:hover:text-slate-900 transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="#"
                  className="hover:text-stone-300 light-mode:hover:text-slate-900 transition-colors"
                >
                  Privacy
                </Link>
                <span>•</span>
                <Link
                  href="#"
                  className="hover:text-stone-300 light-mode:hover:text-slate-900 transition-colors"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for radial gradient (since Tailwind doesn't have radial-gradient) */}
      <style>{`
        .bg-gradient-radial {
          background: radial-gradient(var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%);
        }
      `}</style>
    </div>
  );
}
