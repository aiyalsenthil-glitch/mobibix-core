"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithPopup, signInWithEmailAndPassword } from "REMOVED_AUTH_PROVIDER/auth";
import { auth, googleProvider } from "@/lib/REMOVED_AUTH_PROVIDER";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRedirect } from "@/lib/auth-routes";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

// Convert Firebase error codes to user-friendly messages
function getAuthErrorMessage(error: any): string {
  const code = error?.code || "";

  const errorMessages: Record<string, string> = {
    "auth/popup-closed-by-user":
      "Sign-in cancelled. Please try again if you'd like to continue.",
    "auth/cancelled-popup-request": "Sign-in cancelled. Please try again.",
    "auth/popup-blocked":
      "Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.",
    "auth/network-request-failed":
      "Network error. Please check your internet connection and try again.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a moment and try again.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password":
      "Password is too weak. Please use at least 6 characters.",
    "auth/invalid-credential":
      "Invalid login credentials. Please check and try again.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email but different sign-in method.",
  };

  return (
    errorMessages[code] ||
    error?.message ||
    "An error occurred. Please try again."
  );
}

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && authUser) {
      setIsSuccess(true);
      setTimeout(() => {
        const path = getRoleRedirect(authUser);
        router.replace(path);
      }, 800);
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
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      if (!isAuthenticated) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      await exchangeToken(result.user);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      if (!isAuthenticated) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 
        PREMIUM BACKGROUND: 
        Aurora effects with ultra-slow 30s shift 
      */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Adaptive Vignette / Depth */}
         <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_0%,_#ffffff_100%] dark:bg-radial-[circle_at_center,_transparent_0%,_#09090b_100%] opacity-80 z-0"></div>

         {/* Aurora Mesh - Adaptive opacity */}
         <div className="absolute inset-0 aurora-bg opacity-30 dark:opacity-40 animate-[aurora-shift_30s_ease_in_out_infinite,_background-fade_1.5s_ease_forwards] z-10"></div>
         
         {/* Floating Orbs - Adaptive colors */}
         <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-pulse z-20"></div>
         <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-[100px] animate-pulse delay-1000 z-20"></div>
         
         {/* Noise Texture */}
         <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-30"></div>
      </div>
      <div className="relative z-10 w-full max-w-md px-6 animate-card-entrance">
        <div className="glass-card p-10 rounded-[2.5rem] relative group">
          
          <div className="relative z-10">
            {/* Logo Area Enhancement - "System Online" vibe */}
            <div className="text-center mb-10 animate-stagger-1">
              <div className="inline-flex items-center gap-2.5 mb-6 group/logo">
                <div className="relative flex">
                  <span className="animate-logo-status absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                </div>
                <span className="text-xs font-bold tracking-[0.4em] uppercase text-zinc-500 group-hover/logo:text-zinc-300 transition-colors duration-700">
                  MobiBix
                </span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent group-hover/logo:w-full transition-all duration-1000"></div>
              </div>

              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 tracking-tight leading-tight">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
              <p className="text-zinc-500 text-sm font-medium">
                {isSignUp
                  ? "Join the elite network of repair businesses"
                  : "Secure access to your repair shop management"}
              </p>
            </div>

            {/* Google Button Upgrade - Delayed Entrance */}
            <div className="animate-stagger-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || authLoading || isSuccess}
                className="w-full mb-8 py-4 px-4 rounded-2xl bg-white text-zinc-950 font-bold hover-lift flex items-center justify-center gap-3 shadow-xl relative overflow-hidden group/google disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-100 to-transparent translate-x-[-100%] group-hover/google:translate-x-[100%] transition-transform duration-1000"></div>
                {loading && !isAuthenticated ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                       <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                       <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                       <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                       <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider Animation */}
            <div className="relative mb-8 flex items-center gap-4 animate-stagger-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10 animate-divider-expand"></div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] whitespace-nowrap">
                or use email
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10 animate-divider-expand"></div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] font-bold uppercase tracking-wider flex items-start gap-3 animate-input-error">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0 animate-pulse"></div>
                 {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 animate-stagger-3">
                <label className="text-[10px] font-bold text-zinc-600 ml-1 uppercase tracking-[0.2em]">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`input-glass w-full px-5 py-4 rounded-2xl text-white placeholder-zinc-700 ${error ? 'animate-input-error' : ''}`}
                  required
                />
              </div>

              <div className="space-y-2 animate-stagger-3">
                <label className="text-[10px] font-bold text-zinc-600 ml-1 uppercase tracking-[0.2em]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`input-glass w-full px-5 py-4 rounded-2xl text-white placeholder-zinc-700 pr-14 ${error ? 'animate-input-error' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button Upgrade - Final Entrance */}
              <div className="animate-stagger-4 pt-2">
                <button
                  type="submit"
                  disabled={loading || isSuccess}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-700 relative overflow-hidden btn-futuristic ${
                     isSuccess 
                     ? 'bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-[1.02]' 
                     : ''
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                     {isSuccess ? (
                        <Check className="w-5 h-5 animate-scale-in" strokeWidth={3} />
                     ) : loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                     ) : isSignUp ? (
                        "Create Account"
                     ) : (
                        "Sign In"
                     )}
                     {isSuccess && <span className="animate-fade-in">Verified</span>}
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-8 text-center animate-stagger-4">
              <p className="text-sm text-zinc-600 font-medium">
                {isSignUp ? "Joined already?" : "Need an account?"}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-emerald-500 hover:text-emerald-400 font-bold ml-2 transition-colors hover:underline underline-offset-4"
                >
                  {isSignUp ? "Sign In" : "Start Free Trial"}
                </button>
              </p>
            </div>
            
             <div className="mt-10 flex justify-center gap-8 text-[11px] font-bold text-zinc-700 uppercase tracking-widest animate-stagger-4">
                <Link href="#" className="hover:text-zinc-500 transition-colors">Privacy</Link>
                <Link href="#" className="hover:text-zinc-500 transition-colors">Terms</Link>
                <Link href="/" className="hover:text-zinc-500 transition-colors">Home</Link>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}
