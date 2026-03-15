import { useState } from "react";
import WhatsAppRetailInbox from "./WhatsAppRetailInbox";
import WhatsAppPremiumPromoBanner from "../../whatsapp/components/WhatsAppPremiumPromoBanner";
import WhatsAppSettingsModal from "./WhatsAppSettingsModal";
import { useAuth } from "@/hooks/useAuth";

type WhatsAppCrmDashboardProps = {
  hasPhoneNumber: boolean;
  moduleType?: string; // ✅ Added
  whatsappAllowed?: boolean;
  hasAddon?: boolean;
};

export default function WhatsAppCrmDashboard({
  hasPhoneNumber,
  moduleType,
  whatsappAllowed = true, // Default to true for backward compatibility if not passed
  hasAddon = false,
}: WhatsAppCrmDashboardProps) {
  const { authUser: user } = useAuth();
  const isPro = user?.planCode === "MOBIBIX_PRO" || user?.planCode === "GYM_PRO";
  const isRetailDemo = moduleType === 'MOBILE_SHOP';
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleConnect = async () => {
    try {
      const { connectWhatsApp } = await import("@/services/whatsapp.api");
      setConnecting(true);
      setConnectError(null);
      const { url } = await connectWhatsApp();
      window.location.href = url;
    } catch (err: any) {
      setConnectError(err.message || "Failed to initiate connection");
    } finally {
      setConnecting(false);
    }
  };

  if (!hasPhoneNumber && whatsappAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-2xl w-full border border-teal-100 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Setup Required
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Link Your Business Number
          </h2>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            Your WhatsApp CRM tools are ready. Connect your Facebook Business account to start receiving customer messages and using automation.
          </p>

          <div className="bg-gray-50 rounded-2xl p-8 mb-6 border border-gray-100">
             <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white px-8 py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-70"
            >
              {connecting ? (
                <>
                  <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Redirecting...</span>
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
            {connectError && (
              <p className="mt-4 text-sm text-red-500 font-medium">{connectError}</p>
            )}
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="mt-6 text-sm text-gray-500 font-bold hover:text-teal-600 transition-colors uppercase tracking-wider"
            >
              Advanced: Manual Sync
            </button>
          </div>

          <p className="text-sm text-gray-500">
             Need help? <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-600 font-semibold hover:underline">Contact Setup Team</a>
          </p>

          <WhatsAppSettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            onStatusChange={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-gray-900">WhatsApp CRM</h1>
             <p className="text-sm text-gray-600">
               Retail conversations & leads
             </p>
          </div>
          <div className="flex items-center gap-4">
            {isRetailDemo && (
               <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                    Retail Demo Active
                  </span>
               </div>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-100"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!hasAddon && <WhatsAppPremiumPromoBanner />}

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 ${!whatsappAllowed ? 'opacity-75' : ''}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Chats</div>
            <div className="text-3xl font-black text-gray-900 flex items-baseline gap-1">
              {isRetailDemo || !whatsappAllowed ? "24" : "0"}
              <span className="text-xs font-medium text-green-500">+12%</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Needs Staff</div>
            <div className="text-3xl font-black text-amber-500">{isRetailDemo || !whatsappAllowed ? "3" : "0"}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sales Intent</div>
            <div className="text-3xl font-black text-teal-600">{isRetailDemo || !whatsappAllowed ? "8" : "0"}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conv. Rate</div>
            <div className="text-3xl font-black text-indigo-600">{isRetailDemo || !whatsappAllowed ? "33%" : "0%"}</div>
          </div>
        </div>

        {/* Main Content */}
        {isRetailDemo ? (
           // ✅ Retail Demo Inbox
           <WhatsAppRetailInbox disabled={!whatsappAllowed || !isPro} />
        ) : (
          // Legacy Placeholder Layout
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900">Conversations</h2>
              </div>
              <div className="p-8 text-center text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium mb-2">No conversations yet</p>
                <p className="text-sm">
                  Customer messages will appear here when they contact you via
                  WhatsApp
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                 <button 
                  disabled={!whatsappAllowed || !isPro}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${(!whatsappAllowed || !isPro) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                >
                  <span>📝 Create Template</span>
                  {(!whatsappAllowed || !isPro) && <span className="text-xs border border-gray-300 rounded px-1 group-hover:block">PRO ONLY</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed || !isPro}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${(!whatsappAllowed || !isPro) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                >
                  <span>👥 Add Team Member</span>
                  {(!whatsappAllowed || !isPro) && <span className="text-xs border border-gray-300 rounded px-1">PRO ONLY</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed || !isPro}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${(!whatsappAllowed || !isPro) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                >
                  <span>⚙️ Configure Automation</span>
                  {(!whatsappAllowed || !isPro) && <span className="text-xs border border-gray-300 rounded px-1">PRO ONLY</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed || !isPro}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${(!whatsappAllowed || !isPro) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                >
                  <span>📊 View Analytics</span>
                  {(!whatsappAllowed || !isPro) && <span className="text-xs border border-gray-300 rounded px-1">PRO ONLY</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Notice (Only for non-demo) */}
        {!isRetailDemo && whatsappAllowed && (
          <div className="mt-8 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Dashboard Coming Soon! 🚀</h3>
            <p className="text-teal-50">
              The full WhatsApp CRM interface is under active development. You&apos;ll
              be notified when it&apos;s ready to use.
            </p>
          </div>
        )}
      </div>
      
      <WhatsAppSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onStatusChange={() => window.location.reload()}
      />
    </div>
  );
}
