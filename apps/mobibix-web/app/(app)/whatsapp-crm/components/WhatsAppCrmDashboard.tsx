import WhatsAppRetailInbox from "./WhatsAppRetailInbox";

type WhatsAppCrmDashboardProps = {
  hasPhoneNumber: boolean;
  moduleType?: string; // ✅ Added
};

export default function WhatsAppCrmDashboard({
  hasPhoneNumber,
  moduleType,
}: WhatsAppCrmDashboardProps) {
  const isRetailDemo = moduleType === 'MOBILE_SHOP';

  if (!hasPhoneNumber) {
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
             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
               Retail Demo Mode – Automation & staff replies enabled
             </span>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Active Chats</div>
            <div className="text-3xl font-bold text-gray-900">
              {isRetailDemo ? "Demo" : "0"}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Pending Follow-ups</div>
            <div className="text-3xl font-bold text-gray-900">{isRetailDemo ? "--" : "0"}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Leads This Month</div>
            <div className="text-3xl font-bold text-teal-600">{isRetailDemo ? "--" : "0"}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Avg Response Time</div>
            <div className="text-3xl font-bold text-gray-900">--</div>
          </div>
        </div>

        {/* Main Content */}
        {isRetailDemo ? (
           // ✅ Retail Demo Inbox
           <WhatsAppRetailInbox />
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
                <button className="w-full text-left px-4 py-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition">
                  📝 Create Template
                </button>
                <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                  👥 Add Team Member
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition">
                  ⚙️ Configure Automation
                </button>
                <button className="w-full text-left px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition">
                  📊 View Analytics
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Notice (Only for non-demo) */}
        {!isRetailDemo && (
          <div className="mt-8 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold mb-2">Dashboard Coming Soon! 🚀</h3>
            <p className="text-teal-50">
              The full WhatsApp CRM interface is under active development. You'll
              be notified when it's ready to use.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
