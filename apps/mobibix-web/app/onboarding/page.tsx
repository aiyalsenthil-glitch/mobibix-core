"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Building2, MapPin, Globe, Check, AlertCircle, Tag, Loader2, Network } from "lucide-react";
import {
  exchangeFirebaseToken,
  hasSessionHint,
  setAccessToken,
} from "@/services/auth.api";
import { createTenantWithToken, CreateTenantDto, previewPromoCode, PromoPreview } from "@/services/tenant.api";
import {
  fetchCountries,
  CountryOption,
  COUNTRY_FALLBACK,
} from "@/services/country.api";
import { INDIAN_STATES } from "@/constants/indian-states";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Inline default for first render (avoids flash of empty dropdown)
const DEFAULT_COUNTRY = COUNTRY_FALLBACK[0]; // India

export default function OnboardingPage() {
  const router = useRouter();
  const { logout, authUser, REMOVED_AUTH_PROVIDERUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [decidingInvite, setDecidingInvite] = useState<boolean | null>(null);

  // Dynamic country list (loaded from backend, falls back to static)
  const [countries, setCountries] = useState<CountryOption[]>(COUNTRY_FALLBACK);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(DEFAULT_COUNTRY);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCountryName, setCustomCountryName] = useState("");

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
    country: DEFAULT_COUNTRY.name,
    currency: DEFAULT_COUNTRY.currency,
    timezone: DEFAULT_COUNTRY.timezone,
    promoCode: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Load country list from backend on mount
  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  useEffect(() => {
    if (!hasSessionHint()) {
      router.push("/signin");
    } else if (authUser?.tenantId && (!authUser?.tenantType || authUser?.tenantType === "MOBILE_SHOP")) {
      // Only redirect to dashboard if the active tenant is a MOBILE_SHOP tenant.
      // Users with only a DIGITAL_LEDGER tenant should still complete MobiBix onboarding.
      router.push("/dashboard");
    } else {
      setCheckingAuth(false);
      
      // 🔥 SAAS FLOW: Check if user has a pending invite
      // Use pendingInvite property from authUser (which is ExchangeTokenResponse.user + pendingInvite merged in useAuth)
      if (authUser?.pendingInvite || (authUser as any)?.pendingInvite) {
        setDecidingInvite(true);
      } else {
        setDecidingInvite(false);
      }

      const savedRef = sessionStorage.getItem("mb_ref");
      const savedPromo = sessionStorage.getItem("mb_promo");
      const codeToUse = savedPromo || savedRef;
      if (codeToUse) {
        setFormData(prev => ({ ...prev, promoCode: codeToUse }));
      }
    }
  }, [authUser?.tenantId, authUser?.pendingInvite, (authUser as any)?.pendingInvite]);

  const handleJoinStaff = async () => {
    if (!authUser?.pendingInvite) return;
    try {
      setLoading(true);
      const { acceptStaffInvite } = await import("@/services/staff.api");
      const { setAccessToken } = await import("@/services/auth.api");
      const data = await acceptStaffInvite(authUser.pendingInvite.inviteToken);
      if (data && data.accessToken) {
        await setAccessToken(data.accessToken);
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to join shop");
      setLoading(false);
    }
  };

  const handleRejectAndOnboard = async () => {
    if (!authUser?.pendingInvite) {
        setDecidingInvite(false);
        return;
    }
    try {
      setLoading(true);
      const { rejectStaffInvite } = await import("@/services/staff.api");
      await rejectStaffInvite(authUser.pendingInvite.inviteToken);
      setDecidingInvite(false);
      setLoading(false);
    } catch (err: any) {
      console.error("Reject invite error:", err);
      // Even if rejection fails (e.g. already deleted), let them onboard
      setDecidingInvite(false);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/signin");
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  /** When country changes, auto-fill currency/timezone and update phone rules */
  const handleCountryChange = (countryName: string) => {
    const found = countries.find(c => c.name === countryName);
    
    if (countryName === "Others") {
      setIsOtherSelected(true);
      const other = countries.find(c => c.code === "OTHERS") || DEFAULT_COUNTRY;
      setSelectedCountry(other);
      setFormData(prev => ({
        ...prev,
        country: customCountryName || "Others",
        currency: other.currency,
        timezone: other.timezone,
        gstNumber: "",
      }));
    } else if (found) {
      setIsOtherSelected(false);
      setSelectedCountry(found);
      setFormData(prev => ({
        ...prev,
        country: found.name,
        currency: found.currency,
        timezone: found.timezone,
        gstNumber: found.hasGstField ? prev.gstNumber : "",
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "country") {
      handleCountryChange(value);
      return;
    }

    if (name === "contactPhone") {
      let cleaned = value.replace(/\D/g, "");
      if (selectedCountry.code === "IN" && cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      const maxLen = selectedCountry.code === "IN" ? 10 : 15;
      cleaned = cleaned.slice(0, maxLen);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    if (name === "state" && selectedCountry.code === "IN") {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      setFormData(prev => ({ ...prev, state: value }));
      return;
    }

    if (name === "gstNumber" && selectedCountry.code === "IN") {
      const gstVal = value.toUpperCase();
      setFormData(prev => {
        const next = { ...prev, gstNumber: gstVal };
        if (gstVal.length >= 2) {
          const prefix = gstVal.substring(0, 2);
          const matchedState = INDIAN_STATES.find(s => s.gstCode === prefix);
          if (matchedState) {
            next.state = matchedState.name;
          }
        }
        return next;
      });
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name?.trim()) return "Business Display Name is required";
    }
    if (step === 2) {
      if (!formData.contactPhone?.trim()) return "Contact Phone is required";
      if (selectedCountry.code === "IN") {
        if (formData.contactPhone.length !== 10) return "Phone number must be exactly 10 digits";
        if (!/^[6-9]\d{9}$/.test(formData.contactPhone)) return "Please enter a valid 10-digit mobile number (starting with 6-9)";
      } else {
        if (formData.contactPhone.length < 8) return "Phone number must be at least 8 digits";
        if (formData.contactPhone.length > 15) return "Phone number must be at most 15 digits";
      }
      if (!formData.city?.trim()) return "City is required";
      if (!formData.state?.trim()) return "State is required";

      if (selectedCountry.code === "IN" && formData.gstNumber) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(formData.gstNumber)) {
          return "Invalid GST Number format. Expected format: 22AAAAA0000A1Z5";
        }
        const selectedState = INDIAN_STATES.find(s => s.name === formData.state);
        if (selectedState && !formData.gstNumber.startsWith(selectedState.gstCode)) {
          return `GST Number must start with ${selectedState.gstCode} for ${selectedState.name}`;
        }
      }
    }
    if (step === 3) {
      if (!agreedToTerms) return "You must agree to the Terms and Privacy Policy to continue";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(s => s - 1);
  };

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }

    try {
      setLoading(true);
      setError(null);

      if (!hasSessionHint()) { router.push("/signin"); return; }
      if (!REMOVED_AUTH_PROVIDERUser) {
        setError("Your session is invalid. Please sign out and sign in again.");
        return;
      }

      const exchange = await exchangeFirebaseToken(await REMOVED_AUTH_PROVIDERUser.getIdToken());

      const phoneWithPrefix = selectedCountry.code !== "IN"
        ? `${selectedCountry.phonePrefix}${formData.contactPhone}`
        : formData.contactPhone;

      const payload: CreateTenantDto = {
        name: formData.name!,
        tenantType: "MOBILE_SHOP",
        legalName: formData.legalName,
        businessType: formData.businessType,
        contactPhone: phoneWithPrefix,
        addressLine1: formData.addressLine1,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstNumber: selectedCountry.hasGstField ? formData.gstNumber : undefined,
        country: selectedCountry.name,
        currency: selectedCountry.currency,
        timezone: selectedCountry.timezone,
        promoCode: formData.promoCode || undefined,
        marketingConsent: marketingConsent,
        acceptedPolicyVersion: "2026-03-01",
      };

      await createTenantWithToken(payload, exchange.accessToken);
      window.location.href = "/dashboard";
    } catch (e: any) {
      console.error("Create tenant error:", e);
      if (e.message?.includes("User not found")) {
        setError("Your session is invalid. Please sign out and sign in again.");
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
          <p className="text-center text-stone-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-stone-950 p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Set up your business</h1>
          <button onClick={handleSignOut} className="text-sm text-stone-400 hover:text-white transition">
            Sign out
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm font-medium text-red-300">{error}</p>
          </div>
        )}

        {decidingInvite === null ? (
          <div className="py-12 text-center text-stone-500">Checking for invitations...</div>
        ) : decidingInvite ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-4">
               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 mb-2">
                 <Building2 className="w-8 h-8" />
               </div>
               <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                 Invitation Detected
               </h2>
               <p className="text-stone-400 text-sm max-w-sm mx-auto">
                 <span className="text-white font-semibold">{authUser?.pendingInvite?.tenant.name}</span> has invited you to join their shop as <span className="text-teal-400 font-medium">{authUser?.pendingInvite?.role}</span>.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div 
                  onClick={handleJoinStaff}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-teal-500/30 bg-teal-500/5 p-6 hover:border-teal-500 hover:bg-teal-500/10 transition-all duration-300"
               >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Join as Staff</h3>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        Access the shop dashboard, manage inventory, and process sales as part of the team.
                      </p>
                    </div>
                    <div className="mt-6 flex items-center text-teal-400 text-sm font-bold">
                      Accept Invitation <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
               </div>

               <div 
                  onClick={handleRejectAndOnboard}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 hover:border-white/30 hover:bg-white/10 transition-all duration-300"
               >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Create My Shop</h3>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        Decline the invite and start fresh by setting up your own business on MobiBix.
                      </p>
                    </div>
                    <div className="mt-6 flex items-center text-stone-300 text-sm font-bold">
                      Start Onboarding <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
               </div>
            </div>

            <p className="text-[10px] text-center text-stone-600 italic">
               * Declining this invite will inform the owner that you've rejected the request.
            </p>
          </div>
        ) : (
          <>
            {/* STEPPER */}
            <div className="flex items-center justify-between mb-10 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-800 -z-10 -translate-y-1/2"></div>
              {[
                { label: "Identity", icon: <Building2 className="w-5 h-5" />, s: 1 },
                { label: "Location", icon: <MapPin className="w-5 h-5" />, s: 2 },
                { label: "Regional", icon: <Globe className="w-5 h-5" />, s: 3 },
              ].map(({ label, icon, s }) => (
                <div key={s} className="flex flex-col items-center gap-2 bg-stone-950 px-2">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= s ? "border-teal-500 bg-teal-500/10 text-teal-400" : "border-stone-700 bg-stone-900 text-stone-500"}`}>
                    {icon}
                  </div>
                  <span className={`text-xs ${step >= s ? "text-teal-400" : "text-stone-500"}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* WIZARD CONTENT */}
            <div className="min-h-[300px]">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Business Display Name <span className="text-red-400">*</span></Label>
                      <Input id="shop-name-input" name="name" value={formData.name || ""} onChange={handleChange} placeholder="e.g. Smart Tech Solutions" className="bg-stone-900 border-white/10" />
                      <p className="text-xs text-stone-500">This is the name your customers will see on invoices.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Legal / Registered Entity Name</Label>
                      <Input name="legalName" value={formData.legalName || ""} onChange={handleChange} placeholder="e.g. Smart Tech Pvt Ltd" className="bg-stone-900 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Category (Optional)</Label>
                      <Input name="businessType" value={formData.businessType || ""} onChange={handleChange} placeholder="e.g. Mobile Retailer, Electronics Repair" className="bg-stone-900 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Promo Code (Optional)</Label>
                      <Input name="promoCode" value={formData.promoCode || ""} onChange={handleChange} placeholder="Have a referral or promo code?" className="bg-stone-900 border-white/10 text-teal-400 uppercase font-bold" />
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
                        value={isOtherSelected ? "Others" : (formData.country || DEFAULT_COUNTRY.name)}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm appearance-none"
                      >
                        {countries.map(c => (
                          <option key={c.code} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      {isOtherSelected && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label className="text-[10px] text-stone-500 mb-1 block">Type your country name</Label>
                          <Input 
                            placeholder="Enter country name"
                            value={customCountryName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomCountryName(val);
                              setFormData(prev => ({ ...prev, country: val }));
                            }}
                            className="bg-stone-900 border-white/10"
                          />
                        </div>
                      )}
                      <p className="text-xs text-stone-500">
                        Currency auto-set to <span className="text-teal-400 font-semibold">{selectedCountry.currencySymbol} {selectedCountry.currency}</span>
                        {" · "} Prefix <span className="text-teal-400 font-semibold">{selectedCountry.phonePrefix}</span>
                      </p>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Contact Phone Number <span className="text-red-400">*</span></Label>
                      <div className="relative">
                        {!isOtherSelected && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-teal-400 font-bold border-r border-white/10 pr-2 pointer-events-none">
                            {selectedCountry.phonePrefix}
                          </div>
                        )}
                        <Input
                          id="phone-input"
                          name="contactPhone"
                          value={formData.contactPhone || ""}
                          onChange={handleChange}
                          placeholder={selectedCountry.code === "IN" ? "10-digit mobile number" : "Mobile number"}
                          className={`bg-stone-900 border-white/10 ${!isOtherSelected ? "pl-16" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Address Line 1</Label>
                      <Input name="addressLine1" value={formData.addressLine1 || ""} onChange={handleChange} placeholder="Shop/Building number, Street" className="bg-stone-900 border-white/10" />
                    </div>

                    <div className="space-y-2">
                      <Label>City <span className="text-red-400">*</span></Label>
                      <Input id="city-input" name="city" value={formData.city || ""} onChange={handleChange} placeholder="City" className="bg-stone-900 border-white/10" />
                    </div>

                    <div className="space-y-2">
                      <Label>State / Province <span className="text-red-400">*</span></Label>
                      {selectedCountry.code === "IN" ? (
                        <select
                          id="state-select"
                          name="state"
                          value={formData.state || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-stone-900 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm appearance-none"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map(s => (
                            <option key={s.code} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <Input name="state" value={formData.state || ""} onChange={handleChange} placeholder="State" className="bg-stone-900 border-white/10" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Pincode / Zip <span className="text-red-400">*</span></Label>
                      <Input id="pincode-input" name="pincode" value={formData.pincode || ""} onChange={handleChange} className="bg-stone-900 border-white/10" />
                    </div>

                    {selectedCountry.hasGstField && (
                      <div className="space-y-2 col-span-2">
                        <Label>GST Number (Optional)</Label>
                        <Input
                          id="gst-input"
                          name="gstNumber"
                          value={formData.gstNumber || ""}
                          onChange={handleChange}
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          className="bg-stone-900 border-white/10 uppercase"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <select name="currency" value={formData.currency || "INR"} onChange={handleChange} className="flex h-10 w-full rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                        {countries.map(c => (
                          <option key={c.code} value={c.currency}>{c.name} — {c.currencySymbol} {c.currency}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <select name="timezone" value={formData.timezone || "Asia/Kolkata"} onChange={handleChange} className="flex h-10 w-full rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                        {countries.map(c => (
                          <option key={c.code} value={c.timezone}>{c.name} — {c.timezone}</option>
                        ))}
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input id="terms-checkbox" type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1 w-5 h-5 rounded border-white/10 bg-stone-900 text-teal-600 focus:ring-teal-500" />
                      <span className="text-sm text-stone-300">
                        I agree to the <a href="/terms" target="_blank" className="text-teal-400 hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-teal-400 hover:underline">Privacy Policy</a> <span className="text-red-400">*</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} className="mt-1 w-5 h-5 rounded border-white/10 bg-stone-900 text-teal-600 focus:ring-teal-500" />
                      <span className="text-sm text-stone-300">I want to receive product updates, news, and promotional offers. (Optional)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER CONTROLS */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack} disabled={loading} className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : <div />}
              {step < 3 ? (
                <Button id="onboarding-next-btn" onClick={handleNext} className="bg-teal-500 hover:bg-teal-400 text-black">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button id="onboarding-finish-btn" onClick={handleCreateBusiness} disabled={loading} className="bg-teal-500 hover:bg-teal-400 text-black">
                  {loading ? "Creating..." : "Complete Setup"}
                  {!loading && <Check className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
