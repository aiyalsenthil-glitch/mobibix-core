'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { section: 'partner-portal' } });
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-red-100 dark:border-red-900/20 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The partner portal encountered an error. Our team has been notified.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-left text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto">
            {error.message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={() => { window.location.href = '/partner/login'; }}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
