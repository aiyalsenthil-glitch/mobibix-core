export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-sm text-stone-400">Total Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">$0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-sm text-stone-400">Active Jobs</p>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-sm text-stone-400">Total Customers</p>
          <p className="text-3xl font-bold text-white mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
