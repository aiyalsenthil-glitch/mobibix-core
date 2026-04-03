'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getNotificationSource,
  setNotificationSource,
  getCapiSettings,
  saveCapiSettings,
} from '@/services/whatsapp.api';
import { Loader2, CheckCircle2, AlertCircle, Smartphone, Globe } from 'lucide-react';

export default function WhatsAppSettingsPanel() {
  // Notification source
  const [notifSource, setNotifSource] = useState<'PLATFORM' | 'OWN_NUMBER'>('PLATFORM');
  const [hasOwnNumber, setHasOwnNumber] = useState(false);
  const [ownNumberDisplay, setOwnNumberDisplay] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifOk, setNotifOk] = useState(false);

  // CAPI
  const [capiConfigured, setCapiConfigured] = useState(false);
  const [capiDatasetId, setCapiDatasetId] = useState('');
  const [capiToken, setCapiToken] = useState('');
  const [hasCapiToken, setHasCapiToken] = useState(false);
  const [capiNumberDisplay, setCapiNumberDisplay] = useState('');
  const [savingCapi, setSavingCapi] = useState(false);
  const [capiOk, setCapiOk] = useState(false);
  const [capiError, setCapiError] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getNotificationSource(), getCapiSettings()])
      .then(([ns, cs]) => {
        setNotifSource(ns.notificationSource);
        setHasOwnNumber(ns.hasOwnNumber);
        setOwnNumberDisplay(ns.ownNumber?.displayNumber || '');

        if (cs.configured !== false) {
          setCapiConfigured(cs.configured);
          setCapiDatasetId(cs.capiDatasetId || '');
          setHasCapiToken(!!cs.hasCapiToken);
          setCapiNumberDisplay(cs.displayNumber || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveNotifSource = async (source: 'PLATFORM' | 'OWN_NUMBER') => {
    setSavingNotif(true);
    setNotifOk(false);
    try {
      await setNotificationSource(source);
      setNotifSource(source);
      setNotifOk(true);
      setTimeout(() => setNotifOk(false), 3000);
    } catch { /* silent */ }
    finally { setSavingNotif(false); }
  };

  const handleSaveCapi = async () => {
    setCapiError('');
    if (!capiDatasetId.trim()) { setCapiError('Dataset ID is required'); return; }
    setSavingCapi(true);
    setCapiOk(false);
    try {
      await saveCapiSettings({ capiDatasetId: capiDatasetId.trim(), capiAccessToken: capiToken.trim() || undefined });
      setCapiOk(true);
      setCapiConfigured(true);
      if (capiToken.trim()) setHasCapiToken(true);
      setCapiToken('');
      setTimeout(() => setCapiOk(false), 3000);
    } catch { setCapiError('Failed to save. Please try again.'); }
    finally { setSavingCapi(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Notification Source */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">Notification Source</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how owner alerts (new leads, handovers) are sent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Platform option */}
          <button
            onClick={() => notifSource !== 'PLATFORM' && handleSaveNotifSource('PLATFORM')}
            disabled={savingNotif}
            className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
              notifSource === 'PLATFORM'
                ? 'border-teal-500 bg-teal-500/5'
                : 'border-border hover:border-teal-500/40'
            }`}
          >
            <Globe className="w-5 h-5 text-teal-500" />
            <span className="text-sm font-black text-foreground">Mobibix Platform</span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              Alerts sent via Mobibix shared number. Always available.
            </span>
            {notifSource === 'PLATFORM' && (
              <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-teal-500" />
            )}
          </button>

          {/* Own Number option */}
          <button
            onClick={() => hasOwnNumber && notifSource !== 'OWN_NUMBER' && handleSaveNotifSource('OWN_NUMBER')}
            disabled={savingNotif || !hasOwnNumber}
            className={`relative flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
              !hasOwnNumber ? 'opacity-40 cursor-not-allowed border-border' :
              notifSource === 'OWN_NUMBER'
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-border hover:border-blue-500/40'
            }`}
          >
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-black text-foreground">Own Number</span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {hasOwnNumber
                ? `Send alerts from your Meta number: ${ownNumberDisplay}`
                : 'Connect a Meta Cloud API number first'}
            </span>
            {notifSource === 'OWN_NUMBER' && (
              <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
            )}
          </button>
        </div>

        {savingNotif && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </div>
        )}
        {notifOk && (
          <div className="flex items-center gap-2 text-xs text-teal-600 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Saved
          </div>
        )}
      </Card>

      {/* CAPI Settings */}
      <Card className="rounded-3xl border-none shadow-sm bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-foreground">Meta Conversions API (CAPI)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Attribute Click-to-WhatsApp ad leads back to Meta for better ROAS.
            </p>
          </div>
          {capiConfigured ? (
            <span className="text-[10px] font-bold text-teal-600 bg-teal-500/10 px-2 py-1 rounded-full uppercase">Active</span>
          ) : (
            <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full uppercase">Not Configured</span>
          )}
        </div>

        {capiNumberDisplay && (
          <p className="text-xs text-muted-foreground">
            Number: <span className="font-semibold text-foreground">{capiNumberDisplay}</span>
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              Dataset ID
            </label>
            <Input
              value={capiDatasetId}
              onChange={e => setCapiDatasetId(e.target.value)}
              placeholder="e.g. 123456789012345"
              className="rounded-xl font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Found in Meta Events Manager → your dataset → Settings
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              System User Access Token
              {hasCapiToken && <span className="ml-2 text-teal-500 normal-case font-normal">● Token set</span>}
            </label>
            <Input
              type="password"
              value={capiToken}
              onChange={e => setCapiToken(e.target.value)}
              placeholder={hasCapiToken ? 'Leave blank to keep existing token' : 'Paste system user token'}
              className="rounded-xl font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Create a System User in Meta Business Suite → Integrations with CAPI permission
            </p>
          </div>
        </div>

        {capiError && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="w-3 h-3" /> {capiError}
          </div>
        )}
        {capiOk && (
          <div className="flex items-center gap-2 text-xs text-teal-600 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> CAPI settings saved
          </div>
        )}

        <Button
          onClick={handleSaveCapi}
          disabled={savingCapi}
          className="rounded-xl h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white"
        >
          {savingCapi ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save CAPI Settings
        </Button>
      </Card>
    </div>
  );
}
