export default function WhatsAppCrmContactSupport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-block bg-yellow-100 text-yellow-600 rounded-full p-6 mb-6">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            WhatsApp CRM Setup Required
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-8">
            Your WhatsApp CRM subscription is active, but the feature needs to
            be configured by our support team before you can use it.
          </p>

          {/* Setup Requirements */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-gray-900 mb-3">
              What happens next:
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-teal-600 mr-2 mt-1">1.</span>
                <span>Our team will verify your WhatsApp Business Account</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2 mt-1">2.</span>
                <span>Configure your dedicated phone number for CRM</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2 mt-1">3.</span>
                <span>Set up automation rules and team access</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2 mt-1">4.</span>
                <span>Activate your WhatsApp CRM dashboard</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <a
              href="mailto:support@mobibix.com?subject=WhatsApp CRM Setup Request"
              className="inline-block bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Contact Support Team
            </a>
            <p className="text-sm text-gray-500">
              Setup usually takes 1-2 business days
            </p>
          </div>

          {/* Support Contact */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Need immediate help?</p>
            <div className="flex justify-center space-x-6 text-sm">
              <a
                href="mailto:support@mobibix.com"
                className="text-teal-600 hover:underline"
              >
                📧 support@mobibix.com
              </a>
              <a
                href="tel:+918888888888"
                className="text-teal-600 hover:underline"
              >
                📞 +91 88888 88888
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
