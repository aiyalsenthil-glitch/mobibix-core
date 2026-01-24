"use client";

import Link from "next/link";

export default function DashboardHome() {
  return (
    <div className="p-8">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to ShopFlow
        </h1>
        <p className="text-xl text-stone-400">
          Manage your business efficiently with our integrated platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border border-teal-500/20 rounded-lg p-6">
          <p className="text-stone-400 text-sm mb-2">Active Jobs</p>
          <p className="text-4xl font-bold text-teal-300">24</p>
          <p className="text-xs text-stone-500 mt-2">+3 this week</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-6">
          <p className="text-stone-400 text-sm mb-2">Revenue</p>
          <p className="text-4xl font-bold text-blue-300">$12.5K</p>
          <p className="text-xs text-stone-500 mt-2">+8% this month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-6">
          <p className="text-stone-400 text-sm mb-2">Team Members</p>
          <p className="text-4xl font-bold text-purple-300">8</p>
          <p className="text-xs text-stone-500 mt-2">All active</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-6">
          <p className="text-stone-400 text-sm mb-2">Satisfaction</p>
          <p className="text-4xl font-bold text-green-300">98%</p>
          <p className="text-xs text-stone-500 mt-2">Customer rating</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/staff"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Manage Staff
          </h3>
          <p className="text-stone-400">
            Add, edit, and manage your team members
          </p>
        </Link>

        <Link
          href="/dashboard/sales"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Sales
          </h3>
          <p className="text-stone-400">Track revenue and sales metrics</p>
        </Link>

        <Link
          href="/dashboard/repair"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">🔧</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Repair Jobs
          </h3>
          <p className="text-stone-400">Manage repair jobs and work orders</p>
        </Link>

        <Link
          href="/dashboard/inventory"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Inventory
          </h3>
          <p className="text-stone-400">Track parts and inventory levels</p>
        </Link>

        <Link
          href="/dashboard/reports"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Reports
          </h3>
          <p className="text-stone-400">View detailed business reports</p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="group bg-white/5 border border-white/10 hover:border-teal-500/50 rounded-lg p-6 transition-all hover:bg-white/[0.08]"
        >
          <div className="text-4xl mb-4">⚙️</div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
            Settings
          </h3>
          <p className="text-stone-400">Configure shop, jobcard, and invoice</p>
        </Link>
      </div>
    </div>
  );
}
