'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Star, MessageSquare } from 'lucide-react';

interface ServiceSelectorProps {
  onSelect: (provider: 'AUTHKEY' | 'META_CLOUD') => void;
  loading?: boolean;
}

export function ServiceSelector({ onSelect, loading }: ServiceSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-12">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">Connect WhatsApp</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-medium">
          Choose how to connect your number. You can switch modes once every 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Official Mode — Primary */}
        <Card
          className="rounded-[2.5rem] border-2 border-transparent hover:border-violet-500 transition-all cursor-pointer group shadow-sm hover:shadow-xl bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden relative"
          onClick={() => !loading && onSelect('AUTHKEY')}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-[2.5rem]" />
          <CardHeader className="p-8 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                Addon — from ₹499/mo
              </span>
            </div>
            <CardTitle className="text-2xl font-black dark:text-white">Official WhatsApp</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Dedicated number via Authkey. Reliable delivery, templates & SMS.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                1,000–8,000 utility messages / month
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                Official API — no ban risk
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 flex-shrink-0" />
                SMS included (Pro plan+)
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 gap-2">
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

      {/* Meta Cloud API — secondary option for businesses with own WABA */}
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Have your own Meta Business Account + WABA?</p>
          <p className="text-xs text-gray-400 mt-0.5">Connect directly via Facebook login. You pay Meta directly for messages — no Authkey needed.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl font-semibold"
          onClick={() => onSelect('META_CLOUD')}
          disabled={loading}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Connect via Meta
        </Button>
      </div>
    </div>
  );
}
