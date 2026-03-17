'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { configureAuthkey } from '@/services/whatsapp.api';
import { AlertCircle, Eye, EyeOff, ExternalLink, Star, ArrowLeft } from 'lucide-react';

interface AuthkeySetupFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const PLAN_TIERS = [
  {
    code: 'WA_OFFICIAL_STARTER',
    name: 'Starter',
    price: '₹499/mo',
    messages: '1,000 utility/mo',
    highlight: false,
  },
  {
    code: 'WA_OFFICIAL_PRO',
    name: 'Pro',
    price: '₹1,199/mo',
    messages: '3,000 utility + 150 marketing',
    highlight: true,
  },
  {
    code: 'WA_OFFICIAL_BUSINESS',
    name: 'Business',
    price: '₹2,499/mo',
    messages: '8,000 utility + 400 marketing',
    highlight: false,
  },
];

export default function AuthkeySetupForm({ onSuccess, onBack }: AuthkeySetupFormProps) {
  const [form, setForm] = useState({ apiKey: '', senderId: '', phoneNumber: '' });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsUpgrade(false);

    try {
      await configureAuthkey(form);
      onSuccess();
    } catch (err: any) {
      if (err.status === 403) {
        setNeedsUpgrade(true);
      } else {
        setError(err.message || 'Failed to configure Authkey. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (needsUpgrade) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5" /> Addon Required
          </div>
          <h2 className="text-3xl font-black text-gray-900">Upgrade to Official WhatsApp</h2>
          <p className="text-gray-500 max-w-lg mx-auto font-medium">
            Official API access requires a WA Official plan addon. Choose the plan that fits your volume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TIERS.map((plan) => (
            <Card
              key={plan.code}
              className={`rounded-3xl border-2 overflow-hidden ${
                plan.highlight
                  ? 'border-violet-500 shadow-lg shadow-violet-100'
                  : 'border-gray-100 shadow-sm'
              }`}
            >
              {plan.highlight && (
                <div className="bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5">
                  Most Popular
                </div>
              )}
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {plan.name}
                  </p>
                  <p className="text-2xl font-black text-gray-900">{plan.price}</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">{plan.messages}</p>
                </div>
                <Button
                  className={`w-full rounded-2xl h-11 font-bold ${
                    plan.highlight
                      ? 'bg-violet-600 hover:bg-violet-700'
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                  onClick={() => window.open('/settings/billing', '_self')}
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" className="font-bold text-gray-500 gap-2" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12 space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="font-bold text-gray-500 gap-2 -ml-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-3xl font-black text-gray-900">Configure Authkey</h2>
        <p className="text-gray-500 font-medium text-sm">
          Enter your Authkey credentials to activate Official WhatsApp.{' '}
          <a
            href="https://console.REMOVED_TOKEN.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 font-bold inline-flex items-center gap-0.5 hover:underline"
          >
            Open Authkey portal <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-medium leading-relaxed">
        <strong>Important:</strong> The phone number you enter here must be a{' '}
        <strong>new dedicated number</strong> registered with Authkey — not the same number linked
        to your personal WhatsApp.
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider ml-1">
            Authkey API Key
          </label>
          <div className="relative">
            <input
              required
              type={showKey ? 'text' : 'password'}
              placeholder="Paste your Authkey API key"
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowKey((v) => !v)}
              tabIndex={-1}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 ml-1">
            Found at{' '}
            <span className="font-mono bg-gray-100 px-1 rounded">
              console.REMOVED_TOKEN.io → My Account → Profile
            </span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider ml-1">
            Sender ID (SID)
          </label>
          <input
            required
            type="text"
            placeholder="e.g. MOBIBX"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm"
            value={form.senderId}
            onChange={(e) => setForm({ ...form, senderId: e.target.value })}
          />
          <p className="text-[11px] text-gray-400 ml-1">
            From Authkey portal → Sender List
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider ml-1">
            Dedicated Phone Number
          </label>
          <input
            required
            type="text"
            placeholder="e.g. 919876543210"
            pattern="[0-9]{10,15}"
            title="Enter digits only, including country code (e.g. 919876543210)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-mono text-sm"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, '') })}
          />
          <p className="text-[11px] text-gray-400 ml-1">
            Include country code — digits only (e.g. <span className="font-mono">919876543210</span>)
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-bold text-white shadow-lg shadow-violet-100 transition-all"
        >
          {loading ? 'Activating...' : 'Activate Official WhatsApp'}
        </Button>
      </form>
    </div>
  );
}
