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
      if (status.status === "ACTIVE" && status.phoneNumber) {
        setResult({ 
          phoneNumber: status.phoneNumber, 
          wabaId: status.wabaId || "Linked", 
          tokenType: 'system' // Status API doesn't specify but ACTIVE means it's ready
        });
        setState("success");
        if (pollInterval.current) clearInterval(pollInterval.current);
        return true;
      }
    } catch (err) {
      console.error("Status check failed", err);
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
    if (window.location.protocol !== "https:") {
      setError("Facebook login requires HTTPS."); return;
    }

    setState("connecting");
    setError(null);

    let embeddedData: { waba_id?: string; phone_number_id?: string } = {};

    const sessionListener = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          const { waba_id, phone_number_id, code } = data.data || {};
          
          if (code) {
            window.removeEventListener("message", sessionListener);
            void handleMetaExchange(code, waba_id, phone_number_id);
          } else {
            embeddedData = { waba_id, phone_number_id };
          }
        }
      } catch (err) {
        // Silent catch for foreign messages
      }
    };

    window.addEventListener("message", sessionListener);

    const extras = JSON.stringify({ 
      setup: {},
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3" 
    });
    const scopes = "whatsapp_business_management,whatsapp_business_messaging";
    
    const directUrl = new URL("https://business.facebook.com/messaging/whatsapp/onboard/");
    directUrl.searchParams.set("app_id", FB_APP_ID);
    directUrl.searchParams.set("config_id", FB_CONFIG_ID);
    directUrl.searchParams.set("extras", extras);
    directUrl.searchParams.set("scope", scopes);
    directUrl.searchParams.set("response_type", "code");
    directUrl.searchParams.set("override_default_response_type", "true");

    const popup = window.open(directUrl.toString(), "fb_login", "width=600,height=700");

    async function handleMetaExchange(authCode: string, wabaId?: string, phoneId?: string) {
      if (popup) popup.close();
      try {
        const res = await metaExchange({
          code: authCode,
          wabaId: wabaId || embeddedData.waba_id,
          phoneNumberId: phoneId || embeddedData.phone_number_id,
          mode,
        });
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
          </div>
        )}

        <Button
          className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
          onClick={handleConnect}
          disabled={state === "loading_sdk" || state === "connecting" || state === "mode_select"}
        >
          {state === "loading_sdk" || state === "mode_select" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
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
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground">Stuck?</span></div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">If Meta said "Success" but this screen hasn't changed, click below:</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={checkManualStatus}>
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
