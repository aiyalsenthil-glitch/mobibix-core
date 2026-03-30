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

    // Message listener for Embedded Signup (all versions)
    const sessionListener = (event: MessageEvent) => {
      // In production, also check event.srcElement === popupWindow if needed
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          const { waba_id, phone_number_id, code } = data.data || {};
          
          // Complete the exchange if we have all needed parts
          if (code) {
            window.removeEventListener("message", sessionListener);
            void handleMetaExchange(code, waba_id, phone_number_id);
          } else {
            // Older versions or intermediate steps might not have the code yet
            embeddedData = { waba_id, phone_number_id };
          }
        }
      } catch (err) {
        console.error("Message listener error:", err);
      }
    };

    window.addEventListener("message", sessionListener);

    // Modern "Direct Onboarding URL" flow parameters
    const extras = JSON.stringify({ 
      setup: {},
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3" 
    });
    const scopes = "whatsapp_business_management,whatsapp_business_messaging";
    
    // Construct the working Direct URL that showed the correct UI
    const directUrl = new URL("https://business.facebook.com/messaging/whatsapp/onboard/");
    directUrl.searchParams.set("app_id", FB_APP_ID);
    directUrl.searchParams.set("config_id", FB_CONFIG_ID);
    directUrl.searchParams.set("extras", extras);
    directUrl.searchParams.set("scope", scopes);
    directUrl.searchParams.set("response_type", "code");
    directUrl.searchParams.set("override_default_response_type", "true");

    // Open the popup
    const popup = window.open(directUrl.toString(), "fb_login", "width=600,height=700");

    // Helper to finish the process
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

    // Safety fallback for SDK-based completions (if popup closes without code but FB.login works)
    // Note: window.FB.login is kept here as a secondary mechanism if the direct URL redirects back differently
    if (window.FB && !popup) {
      window.FB.login((response: any) => {
        if (response.status === "connected" && response.authResponse?.code) {
          void handleMetaExchange(response.authResponse.code);
        } else if (state === "connecting") {
           setState("ready"); // Reset if window didn't open and login failed
        }
      }, {
        config_id: FB_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        scope: scopes,
        extras: { 
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3" 
        }
      });
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
