'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  tenantId: string;
  onConnected: () => void;
}

export default function QRScanner({ tenantId, onConnected }: QRScannerProps) {
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'SCAN_REQUIRED' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tenant dashboard calls the microservice directly or via proxy
  const WA_SERVICE_URL = process.env.NEXT_PUBLIC_WA_WEB_URL || 'http://localhost_REPLACED:3001';

  const startConnection = async () => {
    try {
      setStatus('CONNECTING');
      setError(null);
      
      await axios.post(`${WA_SERVICE_URL}/whatsapp/connect`, { tenantId });
      setStatus('SCAN_REQUIRED');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize connection');
      setStatus('ERROR');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'SCAN_REQUIRED') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${WA_SERVICE_URL}/whatsapp/status/${tenantId}`);
          if (res.data.status === 'CONNECTED') {
            setStatus('CONNECTED');
            clearInterval(interval);
            onConnected();
          } else if (res.data.qr) {
            setQrCode(res.data.qr);
          }
        } catch (err) {
          console.error('Polling failed', err);
        }
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [status, tenantId, onConnected]);

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-2 border-primary/10 shadow-xl">
      <CardHeader className="bg-primary/5 pb-8">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${status === 'CONNECTING' ? 'animate-spin' : ''}`} />
          WhatsApp Connection
        </CardTitle>
        <CardDescription>
          Link your WhatsApp account to enable automation and real-time chat.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        {status === 'IDLE' && (
          <div className="text-center space-y-6">
            <div className="p-4 bg-primary/5 rounded-full inline-block">
              <RefreshCw className="w-12 h-12 text-primary opacity-50" />
            </div>
            <p className="text-muted-foreground">Ready to connect your WhatsApp?</p>
            <Button onClick={startConnection} size="lg" className="w-full">
              Begin Connection
            </Button>
          </div>
        )}

        {status === 'CONNECTING' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="font-medium animate-pulse">Initializing WhatsApp Engine...</p>
          </div>
        )}

        {status === 'SCAN_REQUIRED' && qrCode && (
          <div className="flex flex-col items-center gap-8 w-full">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-primary/5">
              <QRCodeSVG value={qrCode} size={256} includeMargin={true} />
            </div>
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium bg-secondary px-4 py-2 rounded-full">
                Scan the QR code with your phone
              </p>
              <ol className="text-xs text-muted-foreground text-left space-y-2 list-decimal list-inside">
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu (⋮) or Settings (⚙️)</li>
                <li>Link a Device → Scan QR Code</li>
              </ol>
            </div>
          </div>
        )}

        {status === 'CONNECTED' && (
          <div className="text-center space-y-6 animate-in zoom-in duration-300">
            <div className="p-4 bg-green-500/10 rounded-full inline-block">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-green-600">Successfully Linked!</h3>
            <p className="text-muted-foreground">Your WhatsApp is now active and syncing messages.</p>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="text-center space-y-6 animate-in slide-in-from-top duration-300">
            <div className="p-4 bg-destructive/10 rounded-full inline-block">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-destructive">Connection Failed</h3>
            <p className="text-muted-foreground text-sm max-w-[250px]">{error}</p>
            <Button variant="outline" onClick={startConnection} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
