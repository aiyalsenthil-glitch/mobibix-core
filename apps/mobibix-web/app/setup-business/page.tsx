"use client";

import Link from "next/link";

export default function SetupBusinessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-xl">
        <p className="text-sm text-teal-300">Setup required</p>
        <h1 className="text-3xl font-bold">Finish setting up your business</h1>
        <p className="text-gray-400">
          Your account is authenticated but not linked to a tenant yet. Complete
          the business setup to continue.
        </p>
        <div className="flex items-center justify-center gap-3 text-sm">
          <Link
            href="/auth"
            className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg px-4 py-2"
          >
            Switch account
          </Link>
          <span className="text-gray-500">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
