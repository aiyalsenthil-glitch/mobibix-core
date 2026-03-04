"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Building2, MapPin, Globe, Check, AlertCircle } from "lucide-react";
import {
  exchangeFirebaseToken,
  hasSessionHint,
  setAccessToken,
} from "@/services/auth.api";
import { createTenantWithToken, CreateTenantDto } from "@/services/tenant.api";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Assumes user is authenticated and holds a backend JWT
export default function OnboardingPage() {
  const router = useRouter();
  const { logout, authUser, REMOVED_AUTH_PROVIDERUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<CreateTenantDto>>({
    name: "",
    legalName: "",
    businessType: "",
    contactPhone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    country: "India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    promoCode: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    // Check if user is authenticated; if not, redirect to signin
    if (!hasSessionHint()) {
      router.push("/signin");
    } else if (authUser?.tenantId) {
      // 🔒 User already has a tenant → redirect to dashboard
      console.log("ℹ️ User already has tenant, redirecting to dashboard...");
      router.push("/dashboard");
    } else {
      setCheckingAuth(false);
      
      // ✨ Auto-fill referral/promo code from session
      const savedRef = sessionStorage.getItem("mb_ref");
      const savedPromo = sessionStorage.getItem("mb_promo");
      const codeToUse = savedPromo || savedRef;
      
      if (codeToUse) {
        setFormData(prev => ({ ...prev, promoCode: codeToUse }));
        console.log("💎 Auto-filled promo/referral code:", codeToUse);
      }
    }
  }, [authUser?.tenantId]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/signin");
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // ✨ Clean phone numbers
    if (name === "contactPhone") {
      let cleaned = value.replace(/\D/g, "");
      // Only remove leading zero if India is selected
      if (formData.country === "India" && cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      // Limit to 10 digits for India, 15 for others
      const maxLen = formData.country === "India" ? 10 : 15;
      cleaned = cleaned.slice(0, maxLen);
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name?.trim()) return "Business Display Name is required";
    }
    if (step === 2) {
      if (!formData.contactPhone?.trim()) return "Contact Phone is required";
      const isIndia = formData.country === "India";
      if (isIndia) {
        if (formData.contactPhone.length !== 10) return "Phone number must be exactly 10 digits";
        if (!/^[6-9]\d{9}$/.test(formData.contactPhone)) return "Please enter a valid 10-digit mobile number (starting with 6-9)";
      } else {
        if (formData.contactPhone.length < 8) return "Phone number must be at least 8 digits";
        if (formData.contactPhone.length > 15) return "Phone number must be at most 15 digits";
      }
      if (!formData.city?.trim()) return "City is required";
      if (!formData.state?.trim()) return "State is required";
    }
    if (step === 3) {
      if (!agreedToTerms) return "You must agree to the Terms and Privacy Policy to continue";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();

    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!hasSessionHint()) {
        router.push("/signin");
        return;
      }

      if (!REMOVED_AUTH_PROVIDERUser) {
        setError(
          "Your session is invalid. Please sign out and sign in again to create a new account.",
        );
        return;
      }

      // Refresh backend session to avoid stale access token cookies.
      const exchange = await exchangeFirebaseToken(
        await REMOVED_AUTH_PROVIDERUser.getIdToken(),
      );

      const payload: CreateTenantDto = {
        name: formData.name!,
        tenantType: "MOBILE_SHOP",
        legalName: formData.legalName,
        businessType: formData.businessType,
        contactPhone: formData.contactPhone,
        addressLine1: formData.addressLine1,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstNumber: formData.gstNumber,
        currency: formData.currency,
        timezone: formData.timezone,
        promoCode: formData.promoCode || undefined,
        marketingConsent: marketingConsent,
        acceptedPolicyVersion: "2026-03-01", // Match 'Last Updated' in policies
      };

      await createTenantWithToken(payload, exchange.accessToken);

      // Full page reload to ensure auth context reinitializes with new tenant context
      window.location.href = "/dashboard";
      return;
    } catch (e: any) {
      console.error("Create tenant error:", e);

      // If user not found, suggest re-authentication
      if (e.message?.includes("User not found")) {
        setError(
          "Your session is invalid. Please sign out and sign in again to create a new account.",
        );
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("accessToken");
        setAccessToken(null);
      } else {
        setError(e.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-center text-stone-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-stone-950 p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Set up your business</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-stone-400 hover:text-white transition"
          >
            Sign out
          </button>
        </div>

        {/* STEPPER */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-800 -z-10 -translate-y-1/2"></div>
          
          <div className="flex flex-col items-center gap-2 bg-stone-950 px-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 1 ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-stone-700 bg-stone-900 text-stone-500'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <span className={`text-xs ${step >= 1 ? 'text-teal-400' : 'text-stone-500'}`}>Identity</span>
          </div>

          <div className="flex flex-col items-center gap-2 bg-stone-950 px-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 2 ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-stone-700 bg-stone-900 text-stone-500'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <span className={`text-xs ${step >= 2 ? 'text-teal-400' : 'text-stone-500'}`}>Location</span>
          </div>

          <div className="flex flex-col items-center gap-2 bg-stone-950 px-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step === 3 ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-stone-700 bg-stone-900 text-stone-500'}`}>
              <Globe className="w-5 h-5" />
            </div>
            <span className={`text-xs ${step === 3 ? 'text-teal-400' : 'text-stone-500'}`}>Regional</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* WIZARD CONTENT */}
        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Display Name <span className="text-red-400">*</span></Label>
                  <Input 
                    name="name" 
                    value={formData.name || ""} 
                    onChange={handleChange} 
                    placeholder="e.g. Smart Tech Solutions"
                    className="bg-stone-900 border-white/10"
                  />
                  <p className="text-xs text-stone-500">This is the name your customers will see on invoices.</p>
                </div>

                <div className="space-y-2">
                  <Label>Legal / Registered Entity Name</Label>
                  <Input 
                    name="legalName" 
                    value={formData.legalName || ""} 
                    onChange={handleChange} 
                    placeholder="e.g. Smart Tech Pvt Ltd"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Category (Optional)</Label>
                  <Input 
                    name="businessType" 
                    value={formData.businessType || ""} 
                    onChange={handleChange} 
                    placeholder="e.g. Mobile Retailer, Electronics Repair"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Promo Code (Optional)</Label>
                  <Input 
                    name="promoCode" 
                    value={formData.promoCode || ""} 
                    onChange={handleChange} 
                    placeholder="Have a referral or promo code?"
                    className="bg-stone-900 border-white/10 text-teal-400 uppercase font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Country <span className="text-red-400">*</span></Label>
                  <select
                    name="country"
                    value={formData.country || "India"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Contact Phone Number <span className="text-red-400">*</span></Label>
                  <Input 
                    name="contactPhone" 
                    value={formData.contactPhone || ""} 
                    onChange={handleChange} 
                    placeholder={formData.country === "India" ? "10-digit mobile number" : "Phone number with country code"}
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Address Line 1</Label>
                  <Input 
                    name="addressLine1" 
                    value={formData.addressLine1 || ""} 
                    onChange={handleChange} 
                    placeholder="Shop/Building number, Street"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>City <span className="text-red-400">*</span></Label>
                  <Input 
                    name="city" 
                    value={formData.city || ""} 
                    onChange={handleChange} 
                    placeholder="City"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>State / Province <span className="text-red-400">*</span></Label>
                  <Input 
                    name="state" 
                    value={formData.state || ""} 
                    onChange={handleChange} 
                    placeholder="State"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pincode / Zipcode</Label>
                  <Input 
                    name="pincode" 
                    value={formData.pincode || ""} 
                    onChange={handleChange} 
                    placeholder="Postal code"
                    className="bg-stone-900 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST / Tax Registration Number (Optional)</Label>
                  <Input 
                    name="gstNumber" 
                    value={formData.gstNumber || ""} 
                    onChange={handleChange} 
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className="bg-stone-900 border-white/10"
                  />
                  <p className="text-[10px] text-stone-500">Essential for legal taxation on generated invoices.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <p className="text-stone-400 text-sm mb-4">Set your regional preferences so the system displays the correct time and currency formats.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    name="currency"
                    value={formData.currency || "INR"}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="AED">UAE Dirham (د.إ)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select
                    name="timezone"
                    value={formData.timezone || "Asia/Kolkata"}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                    <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-white/10 bg-stone-900 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-stone-300">
                    I agree to the <a href="/terms" target="_blank" className="text-teal-400 hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-teal-400 hover:underline">Privacy Policy</a> <span className="text-red-400">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-white/10 bg-stone-900 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-stone-300">
                    I want to receive product updates, news, and promotional offers. (Optional)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CONTROLS */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={loading} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div></div> // Spacer formatting
          )}

          {step < 3 ? (
            <Button onClick={handleNext} className="bg-teal-500 hover:bg-teal-400 text-black">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreateBusiness} 
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-400 text-black"
            >
              {loading ? "Creating..." : "Complete Setup"}
              {!loading && <Check className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
