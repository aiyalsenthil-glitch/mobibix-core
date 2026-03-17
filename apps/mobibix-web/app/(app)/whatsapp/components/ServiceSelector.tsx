'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, Star, MessageSquare } from 'lucide-react';

interface ServiceSelectorProps {
  onSelect: (provider: 'WEB_SOCKET' | 'AUTHKEY' | 'META_CLOUD') => void;
  loading?: boolean;
}

export function ServiceSelector({ onSelect, loading }: ServiceSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-12">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black text-gray-900">Connect WhatsApp</h2>
        <p className="text-gray-500 max-w-xl mx-auto font-medium">
          Choose how to connect your number. You can switch modes once every 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Web Mode — Free */}
        <Card
          className="rounded-[2.5rem] border-2 border-transparent hover:border-teal-500 transition-all cursor-pointer group shadow-sm hover:shadow-xl bg-white overflow-hidden"
          onClick={() => !loading && onSelect('WEB_SOCKET')}
        >
          <CardHeader className="p-8 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-teal-600" />
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                FREE with Pro
              </span>
            </div>
            <CardTitle className="text-2xl font-black">Web Mode</CardTitle>
            <p className="text-sm text-gray-500 font-medium">Use your existing WhatsApp number. Scan QR to connect.</p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                500 utility messages / month included
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                100 marketing conversations / month
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                Full inbox, CRM & automations
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-400 gap-2">
                <span className="h-4 w-4 flex-shrink-0 text-center text-xs">✕</span>
                No official API guarantee
              </li>
            </ul>
            <Button
              className="w-full rounded-2xl h-12 bg-teal-600 hover:bg-teal-700 font-bold"
              disabled={loading}
            >
              Connect via QR Scan
            </Button>
          </CardContent>
        </Card>

        {/* Official Mode — Paid Addon */}
        <Card
          className="rounded-[2.5rem] border-2 border-transparent hover:border-violet-500 transition-all cursor-pointer group shadow-sm hover:shadow-xl bg-white overflow-hidden relative"
          onClick={() => !loading && onSelect('AUTHKEY')}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-[2.5rem]" />
          <CardHeader className="p-8 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-7 w-7 text-violet-600" />
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                Addon — from ₹499/mo
              </span>
            </div>
            <CardTitle className="text-2xl font-black">Official WhatsApp</CardTitle>
            <p className="text-sm text-gray-500 font-medium">
              Dedicated number via Authkey. Reliable delivery, templates & SMS.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                1,000–8,000 utility messages / month
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                Official API — no ban risk
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                SMS included (Pro plan+)
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                Team inbox & bulk campaigns
              </li>
            </ul>
            <Button
              className="w-full rounded-2xl h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 font-bold"
              disabled={loading}
            >
              Setup Official API
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Meta Cloud API option */}
      <p className="text-center text-xs text-gray-400 font-medium">
        Have a Meta Business Account?{' '}
        <button
          className="underline hover:text-gray-600 transition-colors"
          onClick={() => onSelect('META_CLOUD')}
          disabled={loading}
        >
          Connect via Meta (Official API)
        </button>
      </p>
    </div>
  );
}
