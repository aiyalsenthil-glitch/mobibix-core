"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Facebook, Smartphone, Cloud, RefreshCw } from "lucide-react";
import { metaExchange, getWhatsAppStatus } from "@/services/whatsapp.api";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const ALLOWED_ORIGINS = [
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://business.facebook.com"
];

type State = "idle" | "loading_sdk" | "mode_select" | "ready" | "connecting" | "success" | "error";
type Mode = "coexist" | "new_number";

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export default function MetaSetupForm({ onSuccess, onBack }: Props) {
  const [state, setState] = useState<State>("loading_sdk");
  const [mode, setMode] = useState<Mode>("coexist");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ phoneNumber: string; wabaId: string; tokenType: 'user' | 'system' } | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initFB = () => {
      if (window.FB) {
        window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: "v22.0" });
        setState("mode_select");
      }
    };

    if (window.FB) { 
      initFB(); 
    } else {
      window.fbAsyncInit = initFB;
      if (!document.getElementById("facebook-jssdk")) {
        const js = document.createElement("script");
        js.id = "facebook-jssdk";
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        js.async = true; js.defer = true;
        document.head.appendChild(js);
      } else {
        const poll = setInterval(() => {
          if (window.FB) { clearInterval(poll); initFB(); }
        }, 100);
        setTimeout(() => clearInterval(poll), 10000);
      }
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  // Use as fallback if the popup message is missed or origin is blocked
  async function checkManualStatus() {
    try {
      const status = await getWhatsAppStatus();
      if (status?.status === "ACTIVE" && status.phoneNumber) {
        setResult({ 
          phoneNumber: status.phoneNumber, 
          wabaId: status.wabaId || "Linked", 
          tokenType: 'system'
        });
        setState("success");
        if (pollInterval.current) clearInterval(pollInterval.current);
        return true;
      }
      // Not yet active — tell the user
      setError("Connection not confirmed yet. Please finish the steps in the Meta popup first, then try again.");
    } catch (err: any) {
      setError(err?.message || "Could not reach the server. Check your internet connection.");
    }
    return false;
  }

  // Start polling when state becomes "connecting"
  useEffect(() => {
    if (state === "connecting") {
      pollInterval.current = setInterval(async () => {
        const isReady = await checkManualStatus();
        if (isReady && pollInterval.current) clearInterval(pollInterval.current);
      }, 5000);
    } else {
      if (pollInterval.current) clearInterval(pollInterval.current);
    }
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [state]);

  function handleConnect() {
    if (!window.FB) { setError("Facebook SDK not loaded. Please refresh."); return; }

    setState("connecting");
    setError(null);

    let embeddedData: { waba_id?: string; phone_number_id?: string } = {};

    // ── Universal message listener — catches ALL formats Meta may send ────────
    const sessionListener = (event: MessageEvent) => {
      // Only process messages from Facebook domains
      if (!event.origin.includes("facebook.com")) return;

      console.log("[Meta Signup] postMessage received:", event.origin, event.data);

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        
        // Format 1: Standard WA_EMBEDDED_SIGNUP (v2 + v3)
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          const payload = data.data || data;
          const { waba_id, phone_number_id, code } = payload;
          
          if (code) {
            window.removeEventListener("message", sessionListener);
            void handleMetaExchange(code, waba_id || embeddedData.waba_id, phone_number_id || embeddedData.phone_number_id);
          } else if (waba_id || phone_number_id) {
            // Intermediate event with WABA info but no code yet — store it
            embeddedData = { waba_id, phone_number_id };
          }
        }
        
        // Format 2: Business Login callback (some Meta flows use this)
        if (data?.type === "FB_LOGIN" || data?.event === "FINISH") {
          const code = data?.data?.code || data?.code;
          const waba_id = data?.data?.waba_id || data?.waba_id || embeddedData.waba_id;
          const phone_number_id = data?.data?.phone_number_id || data?.phone_number_id || embeddedData.phone_number_id;
          if (code) {
            window.removeEventListener("message", sessionListener);
            void handleMetaExchange(code, waba_id, phone_number_id);
          }
        }
      } catch {
        // Non-JSON or irrelevant message — ignore
      }
    };

    window.addEventListener("message", sessionListener);

    // ── Primary path: Use FB SDK login with code response type ────────────────
    // This is more reliable than popup+postMessage for getting the auth code
    try {
      window.FB.login(
        (response: any) => {
          console.log("[Meta Signup] FB.login response:", response);
          if (response?.authResponse?.code) {
            window.removeEventListener("message", sessionListener);
            void handleMetaExchange(
              response.authResponse.code,
              embeddedData.waba_id,
              embeddedData.phone_number_id,
            );
          } else if (response?.status === "not_authorized" || response?.status === "unknown") {
            window.removeEventListener("message", sessionListener);
            setState("ready");
            setError("Meta login was cancelled or not authorized. Please try again.");
          }
          // If no code, postMessage listener above will handle it
        },
        {
          config_id: FB_CONFIG_ID,
          response_type: "code",
          override_default_response_type: true,
          extras: JSON.stringify({
            setup: {},
            featureType: mode === "coexist" ? "whatsapp_business_app_onboarding" : "new_number",
            sessionInfoVersion: "3",
          }),
        },
      );
    } catch (sdkErr) {
      console.warn("[Meta Signup] FB.login failed, falling back to popup:", sdkErr);
      
      // ── Fallback: direct URL popup ────────────────────────────────────────
      const extras = JSON.stringify({
        setup: {},
        featureType: mode === "coexist" ? "whatsapp_business_app_onboarding" : "new_number",
        sessionInfoVersion: "3",
      });
      const directUrl = new URL("https://business.facebook.com/messaging/whatsapp/onboard/");
      directUrl.searchParams.set("app_id", FB_APP_ID);
      directUrl.searchParams.set("config_id", FB_CONFIG_ID);
      directUrl.searchParams.set("extras", extras);
      directUrl.searchParams.set("scope", "whatsapp_business_management,whatsapp_business_messaging");
      directUrl.searchParams.set("response_type", "code");
      directUrl.searchParams.set("override_default_response_type", "true");
      window.open(directUrl.toString(), "fb_login", "width=600,height=700");
    }

    async function handleMetaExchange(authCode: string, wabaId?: string, phoneId?: string) {
      try {
        const res = await metaExchange({ code: authCode, wabaId, phoneNumberId: phoneId, mode, pin: pin || undefined });
        setResult({ phoneNumber: res.phoneNumber, wabaId: res.wabaId, tokenType: res.tokenType });
        setState("success");
      } catch (err: any) {
        setState("ready");
        setError(err.message || "Failed to connect Meta WhatsApp. Please try again.");
      }
    }
  }

  if (state === "success" && result) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-semibold">Meta WhatsApp Connected!</h3>
          <p className="text-sm text-muted-foreground">
            Phone: <span className="font-mono font-medium">+{result.phoneNumber}</span>
          </p>
          <p className="text-xs text-muted-foreground">WABA ID: {result.wabaId}</p>
          {result.tokenType === "user" && (
            <Alert className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Token expires in ~60 days.</strong> Ask your Admin to
                create a <strong>System User token</strong> for permanent access.
              </AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={onSuccess}>Open Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          Connect Meta WhatsApp Business
        </CardTitle>
        <CardDescription>
          Sign in with Facebook to link your WhatsApp Business Account (WABA).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {state !== "loading_sdk" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How do you want to connect?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={state === "connecting"}
                onClick={() => { setMode("coexist"); setState("ready"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === "coexist"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                } ${state === "connecting" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Smartphone className={`h-5 w-5 mb-1 ${mode === "coexist" ? "text-green-600" : "text-gray-400"}`} />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Coexistence</p>
                <p className="text-xs text-gray-500 mt-0.5">Keep app + API active</p>
              </button>
              <button
                disabled={state === "connecting"}
                onClick={() => { setMode("new_number"); setState("ready"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === "new_number"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                } ${state === "connecting" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Cloud className={`h-5 w-5 mb-1 ${mode === "new_number" ? "text-blue-600" : "text-gray-400"}`} />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Cloud API only</p>
                <p className="text-xs text-gray-500 mt-0.5">Full migration</p>
              </button>
            </div>

            {mode === "new_number" && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  2-Step Verification PIN (optional)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="6-digit PIN (leave blank if not set)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-background px-3 py-2 text-sm font-mono tracking-widest"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Required if your number has 2FA enabled in WhatsApp Business App.</p>
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
          onClick={handleConnect}
          disabled={state === "loading_sdk" || state === "connecting" || (state === "mode_select" && !mode)}
        >
          {state === "loading_sdk" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading SDK...</>
          ) : (state === "mode_select" || state === "ready") ? (
            <><Facebook className="h-4 w-4 mr-2" /> Continue with Facebook</>
          ) : state === "connecting" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Waiting for Meta...</>
          ) : (
            <><Facebook className="h-4 w-4 mr-2" /> Continue with Facebook</>
          )}
        </Button>

        {state === "connecting" && (
          <div className="space-y-3 pt-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground font-bold text-blue-500">Already Finished in Meta?</span></div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">If the Facebook window closed but this screen hasn't changed:</p>
            <Button variant="outline" size="sm" className="w-full text-xs border-blue-200 dark:border-blue-900" onClick={checkManualStatus}>
              <RefreshCw className="h-3 w-3 mr-2" /> Check Connection Status
            </Button>
          </div>
        )}

        {state !== "connecting" && (
          <Button variant="ghost" className="w-full" onClick={onBack}>
            Back to mode selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
