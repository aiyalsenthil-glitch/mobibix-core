"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Access denied</h1>
        <p className="text-gray-400">
          You do not have permission to view this page.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
