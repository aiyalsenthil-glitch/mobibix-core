"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Facebook, Smartphone, Cloud } from "lucide-react";
import { metaExchange } from "@/services/whatsapp.api";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const REQUIRED_SCOPES = ["whatsapp_business_management", "whatsapp_business_messaging"];

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

  useEffect(() => {
    const initFB = () => {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: "v22.0" });
      setState("mode_select");
    };

    if (window.FB) { initFB(); return; }

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
  }, []);

  function handleConnect() {
    if (!window.FB) { setError("Facebook SDK not loaded. Please refresh."); return; }
    if (window.location.protocol !== "https:") {
      setError("Facebook login requires HTTPS."); return;
    }

    setState("connecting");
    setError(null);

    let embeddedData: { waba_id?: string; phone_number_id?: string } = {};
    const sessionListener = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          embeddedData = { waba_id: data.data?.waba_id, phone_number_id: data.data?.phone_number_id };
        }
      } catch {}
    };
    window.addEventListener("message", sessionListener);

    const loginParams: any = {
      config_id: FB_CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      return_scopes: true,
      scope: "whatsapp_business_management,whatsapp_business_messaging",
      extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: "3", version: "v3", setup: {} },
    };

    window.FB.login((response: any) => {
      window.removeEventListener("message", sessionListener);

      if (response.status !== "connected") {
        setState("ready"); setError("Facebook login was cancelled. Please try again."); return;
      }

      const grantedScopes: string[] = response.authResponse?.grantedScopes?.split(",") ?? [];
      if (grantedScopes.length > 0) {
        const missing = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));
        if (missing.length > 0) {
          setState("ready");
          setError(`Missing permissions: ${missing.join(", ")}. Please reconnect and allow all permissions.`);
          return;
        }
      }

      if (!response.authResponse?.code) {
        setState("ready"); setError("No authorization code received. Please try again."); return;
      }

      void (async () => {
        try {
          const res = await metaExchange({
            code: response.authResponse.code,
            wabaId: embeddedData.waba_id,
            phoneNumberId: embeddedData.phone_number_id,
            mode,
          });
          setResult({ phoneNumber: res.phoneNumber, wabaId: res.wabaId, tokenType: res.tokenType });
          setState("success");
        } catch (err: any) {
          setState("ready");
          setError(err.message || "Failed to connect Meta WhatsApp. Please try again.");
        }
      })();
    }, loginParams);
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
                <strong>Token expires in ~60 days.</strong> For uninterrupted service, ask your Meta admin to
                create a <strong>System User token</strong> (no expiry) in Business Settings.
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

        {/* Mode selection */}
        {state !== "loading_sdk" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How do you want to connect?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode("coexist"); setState("ready"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === "coexist"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                }`}
              >
                <Smartphone className={`h-5 w-5 mb-1 ${mode === "coexist" ? "text-green-600" : "text-gray-400"}`} />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Coexistence</p>
                <p className="text-xs text-gray-500 mt-0.5">Keep WhatsApp app + API both active</p>
              </button>
              <button
                onClick={() => { setMode("new_number"); setState("ready"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === "new_number"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                }`}
              >
                <Cloud className={`h-5 w-5 mb-1 ${mode === "new_number" ? "text-blue-600" : "text-gray-400"}`} />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Cloud API only</p>
                <p className="text-xs text-gray-500 mt-0.5">New/dedicated number, full migration</p>
              </button>
            </div>
            {mode === "new_number" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Warning:</strong> Full migration removes WhatsApp Business App access on this number.
                </AlertDescription>
              </Alert>
            )}
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting with Facebook...</>
          ) : (
            <><Facebook className="h-4 w-4 mr-2" /> Continue with Facebook</>
          )}
        </Button>

        <Button variant="ghost" className="w-full" onClick={onBack}>
          Back to mode selection
        </Button>
      </CardContent>
    </Card>
  );
}
