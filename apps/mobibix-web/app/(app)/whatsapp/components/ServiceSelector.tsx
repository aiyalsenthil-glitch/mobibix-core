'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, ShieldCheck } from 'lucide-react';

interface ServiceSelectorProps {
  onSelect: (provider: 'META_CLOUD' | 'WEB_SOCKET') => void;
  loading?: boolean;
}

export function ServiceSelector({ onSelect, loading }: ServiceSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-gray-900">Choose Your WhatsApp Engine</h2>
        <p className="text-gray-500 max-w-xl mx-auto font-medium">
          Select the connection method that fits your business. You can switch later (once every 24 hours).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="rounded-[2.5rem] border-2 border-transparent hover:border-teal-500 transition-all cursor-pointer group shadow-sm hover:shadow-xl bg-white overflow-hidden" 
          onClick={() => !loading && onSelect('WEB_SOCKET')}
        >
          <CardHeader className="p-8 pb-4">
            <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="h-7 w-7 text-teal-600" />
            </div>
            <CardTitle className="text-2xl font-black">WhatsApp Web</CardTitle>
            <p className="text-sm text-gray-500 font-medium">Best for local shops and quick setup.</p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> No official API fees
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Quick scan to connect
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Multi-device automation
              </li>
            </ul>
            <Button className="w-full rounded-2xl h-12 bg-teal-600 hover:bg-teal-700 font-bold" disabled={loading}>
              Connect via Web
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 transition-all cursor-pointer group shadow-sm hover:shadow-xl bg-white overflow-hidden" 
          onClick={() => !loading && onSelect('META_CLOUD')}
        >
          <CardHeader className="p-8 pb-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-7 w-7 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-black">Official Meta API</CardTitle>
            <p className="text-sm text-gray-500 font-medium">Scalable solution for growing brands.</p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> 24/7 Reliable uptime
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Meta Verified status
              </li>
              <li className="flex items-center text-sm font-semibold text-gray-700 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Official template support
              </li>
            </ul>
            <Button className="w-full rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
              Setup Official API
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
