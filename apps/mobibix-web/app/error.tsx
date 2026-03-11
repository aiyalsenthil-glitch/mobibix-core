'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6 selection:bg-teal-500/30 selection:text-teal-900 dark:selection:text-teal-200">
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-red-500/5 text-center transition-all">
        
        {/* Icon */}
        <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100 dark:border-red-500/20">
          <AlertTriangle className="w-12 h-12" />
        </div>

        {/* Text Body */}
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Something went wrong!
        </h1>
        
        <p className="text-gray-500 dark:text-stone-400 mb-6 leading-relaxed text-sm md:text-base">
          MobiBix encountered an unexpected error while rendering this page. The system administrator has been notified. 
        </p>

        {/* Developer Stack Trace Output (Hidden in Production automatically, but useful for Dev) */}
        {process.env.NODE_ENV === 'development' && (
           <div className="mb-8 p-4 bg-gray-100 dark:bg-black/50 border border-red-200 dark:border-red-900/30 rounded-xl text-left overflow-x-auto text-xs font-mono text-red-800 dark:text-red-300">
               <span className="font-bold opacity-70 block mb-2 uppercase tracking-wide">Developer Trace:</span>
               {error.message}
               {error.digest && <span className="block mt-2 opacity-50">Digest: {error.digest}</span>}
           </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <RefreshCw className="w-5 h-5" /> Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Return Home
          </button>
        </div>
        
      </div>

      <p className="mt-8 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-stone-600">
         MobiBix System Recovery
      </p>

    </div>
  );
}
