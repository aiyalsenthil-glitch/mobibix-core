import { useState } from 'react';
import { connectWhatsApp } from "@/services/whatsapp.api";
import { Loader2 } from 'lucide-react';

export default function WhatsAppCrmContactSupport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const { url } = await connectWhatsApp();
      window.location.href = url;
    } catch (err: any) {
      console.error("Connection failed", err);
      setError(err.message || "Failed to initiate connection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-2xl w-full border border-teal-100">
        <div className="text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Subscription Active
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Connect Your WhatsApp
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            Your WhatsApp CRM subscription is ready. Link your Facebook Business account to activate your shared inbox and automation tools.
          </p>

          {/* Connection Card */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-10 border border-gray-100 relative group transition-all hover:bg-white hover:shadow-md">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
              Step 1: Link Meta Account
            </h3>
            
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white px-8 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Redirecting to Meta...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Connect with Facebook
                </>
              )}
            </button>

            {error && (
              <p className="mt-4 text-sm text-red-500 font-medium">
                {error}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="text-left space-y-4 max-w-md mx-auto">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">How it works:</h4>
            <div className="space-y-3">
              {[
                "Log in to your Facebook Business account",
                "Select your WhatsApp Business Portfolio",
                "Grant MobiBix permissions for messaging",
                "Return here to start managing chats"
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-600">
                  <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Support Link */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Need help? <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-600 font-semibold hover:underline">Contact our setup team</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
