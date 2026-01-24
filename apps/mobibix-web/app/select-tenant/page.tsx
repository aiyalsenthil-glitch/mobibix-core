"use client";

export default function SelectTenantPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-lg">
        <p className="text-sm text-blue-300">Multiple businesses detected</p>
        <h1 className="text-3xl font-bold">Select a tenant</h1>
        <p className="text-gray-400 text-sm">
          Your account is linked to multiple tenants. Tenant switcher UI will be
          added here.
        </p>
        <p className="text-gray-500 text-xs">Coming soon</p>
      </div>
    </div>
  );
}
