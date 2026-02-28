"use client";

import { useState, useEffect } from "react";
import { LoyaltyConfig, updateLoyaltyConfig } from "@/services/loyalty.api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Gift, 
  Coins, 
  Percent, 
  ShieldCheck,
  Zap
} from "lucide-react";

interface LoyaltySettingsProps {
  initialConfig: LoyaltyConfig | null;
}

export function LoyaltySettings({ initialConfig }: LoyaltySettingsProps) {
  const [config, setConfig] = useState<LoyaltyConfig | null>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (field: keyof LoyaltyConfig) => {
    if (!config) return;
    setConfig({ ...config, [field]: !config[field] });
  };

  const handleChange = (field: keyof LoyaltyConfig, value: string) => {
    if (!config) return;
    const numValue = field === 'pointValueInRupees' ? parseFloat(value) : parseInt(value);
    setConfig({ ...config, [field]: isNaN(numValue) ? 0 : numValue });
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const updated = await updateLoyaltyConfig(config);
      if (updated) {
        setConfig(updated);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to update configuration");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-2xl border border-dashed">
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">Loyalty configuration not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* status alert */}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">Configuration saved successfully!</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Switch */}
      <Card className="overflow-hidden border-2 transition-all duration-300 shadow-md">
        <div className={`h-1.5 w-full ${config.isEnabled ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Gift className={`w-5 h-5 ${config.isEnabled ? 'text-teal-600' : 'text-gray-400'}`} />
              Loyalty Program Status
            </CardTitle>
            <CardDescription>
              {config.isEnabled ? "Program is active and awarding points." : "Program is currently disabled."}
            </CardDescription>
          </div>
          <button
            onClick={() => handleToggle('isEnabled')}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 focus:ring-teal-500 ${
              config.isEnabled ? "bg-teal-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                config.isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </CardHeader>
      </Card>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!config.isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Earning Rules */}
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Earning Rules
            </CardTitle>
            <CardDescription>Define how customers earn points.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="earnAmount">Spend Amount (₹)</Label>
              <div className="relative">
                <Input
                  id="earnAmount"
                  type="number"
                  value={config.earnAmountPerPoint / 100}
                  onChange={(e) => handleChange('earnAmountPerPoint', (parseInt(e.target.value) * 100).toString())}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Customer spends this amount to earn units.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="earnPoints">Points Awarded</Label>
              <Input
                id="earnPoints"
                type="number"
                value={config.pointsPerEarnUnit}
                onChange={(e) => handleChange('pointsPerEarnUnit', e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground italic">Number of points awarded per unit spent.</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800">
               <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                  Current Rule: Spend <span className="font-bold">₹{config.earnAmountPerPoint/100}</span> to earn <span className="font-bold">{config.pointsPerEarnUnit} point{config.pointsPerEarnUnit !== 1 ? 's' : ''}</span>.
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Redemption Rules */}
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-500" />
              Redemption Rules
            </CardTitle>
            <CardDescription>How points translate to discounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pointValue">Point Value (₹)</Label>
              <div className="relative">
                <Input
                  id="pointValue"
                  type="number"
                  step="0.1"
                  value={config.pointValueInRupees}
                  onChange={(e) => handleChange('pointValueInRupees', e.target.value)}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Rupee value of a single point when redeemed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRedeem">Max Discount (%)</Label>
              <div className="relative">
                <Input
                  id="maxRedeem"
                  type="number"
                  value={config.maxRedeemPercent}
                  onChange={(e) => handleChange('maxRedeemPercent', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Maximum percentage of bill value that can be paid via points.</p>
            </div>
          </CardContent>
        </Card>

        {/* Categories / Eligibility */}
        <Card className="shadow-sm border-border/60 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-500" />
              Eligibility & Restrictions
            </CardTitle>
            <CardDescription>Control where points can be used.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                   <div className="flex flex-col">
                      <span className="text-sm font-semibold">Repairs</span>
                      <span className="text-[10px] text-muted-foreground">Allow on Job Cards</span>
                   </div>
                   <button
                    onClick={() => handleToggle('allowOnRepairs')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      config.allowOnRepairs ? "bg-teal-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config.allowOnRepairs ? "translate-x-4.5" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                   <div className="flex flex-col">
                      <span className="text-sm font-semibold">Accessories</span>
                      <span className="text-[10px] text-muted-foreground">Allow on Counter Sales</span>
                   </div>
                   <button
                    onClick={() => handleToggle('allowOnAccessories')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      config.allowOnAccessories ? "bg-teal-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config.allowOnAccessories ? "translate-x-4.5" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                   <div className="flex flex-col">
                      <span className="text-sm font-semibold">Manual Adjustment</span>
                      <span className="text-[10px] text-muted-foreground">Allow staff corrections</span>
                   </div>
                   <button
                    onClick={() => handleToggle('allowManualAdjustment')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      config.allowManualAdjustment ? "bg-teal-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config.allowManualAdjustment ? "translate-x-4.5" : "translate-x-1"}`} />
                  </button>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="px-8 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                < Zap className="w-4 h-4 animate-pulse" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Configuration
              </span>
            )}
          </Button>
      </div>
    </div>
  );
}
