import WhatsAppRetailInbox from "./WhatsAppRetailInbox";
import WhatsAppPreviewBanner from "./WhatsAppPreviewBanner";

type WhatsAppCrmDashboardProps = {
  hasPhoneNumber: boolean;
  moduleType?: string; // ✅ Added
  whatsappAllowed?: boolean;
};

export default function WhatsAppCrmDashboard({
  hasPhoneNumber,
  moduleType,
  whatsappAllowed = true, // Default to true for backward compatibility if not passed
}: WhatsAppCrmDashboardProps) {
  const isRetailDemo = moduleType === 'MOBILE_SHOP';

  if (!hasPhoneNumber && whatsappAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Phone Number Required
          </h2>
          <p className="text-gray-600 mb-6">
            Your WhatsApp CRM is enabled but no phone number is configured.
            Please contact support to complete the setup.
          </p>
          <a
            href="mailto:support@mobibix.com"
            className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
          >
            Contact Support
          </a>
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
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!whatsappAllowed && <WhatsAppPreviewBanner />}

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
           <WhatsAppRetailInbox disabled={!whatsappAllowed} />
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
                  disabled={!whatsappAllowed}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${!whatsappAllowed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                >
                  <span>📝 Create Template</span>
                  {!whatsappAllowed && <span className="text-xs border border-gray-300 rounded px-1 group-hover:block">ADD-ON</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${!whatsappAllowed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                >
                  <span>👥 Add Team Member</span>
                  {!whatsappAllowed && <span className="text-xs border border-gray-300 rounded px-1">ADD-ON</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${!whatsappAllowed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                >
                  <span>⚙️ Configure Automation</span>
                  {!whatsappAllowed && <span className="text-xs border border-gray-300 rounded px-1">ADD-ON</span>}
                </button>
                <button 
                  disabled={!whatsappAllowed}
                  className={`w-full text-left px-4 py-3 rounded-lg transition items-center flex justify-between group ${!whatsappAllowed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                >
                  <span>📊 View Analytics</span>
                  {!whatsappAllowed && <span className="text-xs border border-gray-300 rounded px-1">ADD-ON</span>}
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
    </div>
  );
}
