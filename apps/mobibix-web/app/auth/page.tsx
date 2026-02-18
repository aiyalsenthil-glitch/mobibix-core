"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser 
} from "REMOVED_AUTH_PROVIDER/auth";
import { auth, googleProvider } from "@/lib/REMOVED_AUTH_PROVIDER";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRedirect } from "@/lib/auth-routes";
import { sendVerificationEmail } from "@/services/auth.api";
import { Eye, EyeOff, Loader2, Check, Mail, ArrowRight, AlertCircle } from "lucide-react";

interface AuthPageProps {
  mode?: "signin" | "signup";
}

export default function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    exchangeToken,
    authUser,
  } = useAuth();

  // State: 0=Landing, 1=LoginPass, 2=SignupPass, 3=Verify
  type Step = "LANDING" | "LOGIN_PASS" | "SIGNUP_PASS" | "VERIFY";
  
  const getInitialStep = (): Step => {
    if (mode === "signin") return "LOGIN_PASS";
    if (mode === "signup") return "SIGNUP_PASS";
    return "LANDING";
  };

  const [step, setStep] = useState<Step>(getInitialStep());
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [REMOVED_AUTH_PROVIDERUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && authUser) {
      const path = getRoleRedirect(authUser);
      router.replace(path);
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  // Clear error on step change
  useEffect(() => setError(null), [step]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Exchange token (backend handles verification check - Google is always verified)
      await exchangeToken(result.user);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      // Backend error code for blocked unverified emails
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setFirebaseUser(auth.currentUser);
        setStep("VERIFY");
      } else if (err?.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google");
      }
    } finally {
      if (!isAuthenticated) setLoading(false);
    }
  };

  const handleEmailNext = () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    // Optimistic flow: Assume login first. If user not found, we switch to signup.
    setStep("LOGIN_PASS");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Exchange token (backend enforces email verification)
      await exchangeToken(result.user);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("Account not found. Create one?");
        setStep("SIGNUP_PASS");
        setLoading(false);
        return;
      }
      
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setFirebaseUser(auth.currentUser);
        setStep("VERIFY");
      } else {
         setError(err.message || "Invalid credentials");
      }
      setLoading(false);
    }
  };

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName) {
        await updateProfile(res.user, { displayName: fullName });
      }
      
      // Send verification email
      await sendVerificationEmail(res.user);
      setFirebaseUser(res.user);
      setStep("VERIFY");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    if (!REMOVED_AUTH_PROVIDERUser) return;
    setLoading(true);
    try {
      await REMOVED_AUTH_PROVIDERUser.reload();
      if (REMOVED_AUTH_PROVIDERUser.emailVerified) {
         await exchangeToken(REMOVED_AUTH_PROVIDERUser);
         // Redirect handled by useEffect
      } else {
        setError("Email not verified yet. Please check your inbox.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const resendEmail = async () => {
    if (!REMOVED_AUTH_PROVIDERUser) return;
    try {
      await sendVerificationEmail(REMOVED_AUTH_PROVIDERUser);
      setError("Verification email sent!"); // using error state for success msg temporarily
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_0%,_#ffffff_100%] dark:bg-radial-[circle_at_center,_transparent_0%,_#09090b_100%] opacity-80 z-0"></div>
         <div className="absolute inset-0 aurora-bg opacity-30 dark:opacity-40 animate-[aurora-shift_30s_ease_in_out_infinite,_background-fade_1.5s_ease_forwards] z-10"></div>
         <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-30"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-card-entrance">
        <div className="glass-card p-10 rounded-[2.5rem] relative group border border-white/5 bg-black/40 backdrop-blur-xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <span className="text-xs font-bold tracking-[0.4em] uppercase text-zinc-500">MobiBix</span>
            </div>
            
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              {step === "SIGNUP_PASS" ? "Create Account" : step === "VERIFY" ? "Verify Email" : "Welcome Back"}
            </h1>
          </div>

          {/* Error Display */}
          {error && (
             <div className={`mb-6 p-4 rounded-2xl border text-[11px] font-bold uppercase tracking-wider flex items-start gap-3 animate-input-error ${error.includes("sent") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {error.includes("sent") ? <Check className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                {error}
             </div>
          )}

          {step === "LANDING" && (
            <div className="space-y-6">
               <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 px-4 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-3 relative group overflow-hidden"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/10"></div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">or use email</span>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>

              <div className="space-y-2">
                 <input
                  type="email"
                  placeholder="name@company.com"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailNext()}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:bg-white/10 transition-all font-medium"
                />
                <button
                  onClick={handleEmailNext}
                  className="w-full py-4 rounded-2xl bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "LOGIN_PASS" && (
             <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-zinc-500">{email}</span>
                 <button type="button" onClick={() => setStep("LANDING")} className="text-emerald-500 hover:text-emerald-400">Change</button>
               </div>
               
               <div className="relative">
                 <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:bg-white/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
                </button>
             </form>
          )}

          {step === "SIGNUP_PASS" && (
             <form onSubmit={handleSignup} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex justify-between items-center text-xs">
                 <span className="text-zinc-500">{email}</span>
                 <button type="button" onClick={() => setStep("LANDING")} className="text-emerald-500 hover:text-emerald-400">Change</button>
               </div>

               <div className="space-y-4">
                 <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:bg-white/10 transition-all font-medium"
                  />
                  
                  <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create Password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-zinc-600 focus:outline-none focus:bg-white/10 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                  </div>
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Create Account"}
                </button>
             </form>
          )}

          {step === "VERIFY" && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-300">
               <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <Mail className="w-10 h-10" />
               </div>
               
               <div className="space-y-2">
                 <h3 className="text-white font-bold text-lg">Check your inbox</h3>
                 <p className="text-zinc-500 text-sm">We sent a verification link to <br/><span className="text-zinc-300 font-medium">{email}</span></p>
               </div>

               <div className="space-y-4">
                  <button
                    onClick={checkVerification}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "I've Verified My Email"}
                  </button>
                  
                  <button onClick={resendEmail} className="text-xs text-zinc-600 hover:text-zinc-400 underline">
                    Resend Email
                  </button>
               </div>
            </div>
          )}

        </div>
        
        <div className="mt-8 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
           Secure Access • MobiBix OS
        </div>
      </div>
    </div>
  );
}
