import Link from "next/link";

export default function WhatsAppPreviewBanner() {
  return (
    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-indigo-500 mt-1">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              WhatsApp Integration is a Pro Feature
            </h3>
            <p className="text-gray-600 mt-1">
              Messaging, campaigns, and automation are available in the <span className="font-semibold text-indigo-600">PRO plan</span> or as an add-on.
              You are currently viewing a preview.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="whitespace-nowrap bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          Upgrade to PRO
        </Link>
      </div>
    </div>
  );
}
