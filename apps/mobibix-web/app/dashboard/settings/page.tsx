"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("shops");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">⚙️ Settings</h1>
        <p className="text-stone-400">Manage your business settings</p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab("shops")}
          className={`px-4 py-3 font-semibold transition-all ${
            activeTab === "shops"
              ? "text-teal-400 border-b-2 border-teal-500"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Shops Settings
        </button>
        <button
          onClick={() => setActiveTab("jobcard")}
          className={`px-4 py-3 font-semibold transition-all ${
            activeTab === "jobcard"
              ? "text-teal-400 border-b-2 border-teal-500"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Jobcard Settings
        </button>
        <button
          onClick={() => setActiveTab("invoice")}
          className={`px-4 py-3 font-semibold transition-all ${
            activeTab === "invoice"
              ? "text-teal-400 border-b-2 border-teal-500"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Invoice Settings
        </button>
      </div>

      {/* Shops Settings */}
      {activeTab === "shops" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">
            Shop Configuration
          </h2>
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Shop Name
              </label>
              <input
                type="text"
                placeholder="My Repair Shop"
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Shop Address
              </label>
              <textarea
                placeholder="123 Main Street"
                rows={3}
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <button className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Jobcard Settings */}
      {activeTab === "jobcard" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">
            Jobcard Configuration
          </h2>
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span className="text-white font-medium">
                  Include customer notes on jobcard
                </span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span className="text-white font-medium">
                  Show cost estimation
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Default Service Categories
              </label>
              <textarea
                placeholder="Repair, Maintenance, Upgrade, Other"
                rows={3}
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <button className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Invoice Settings */}
      {activeTab === "invoice" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h2 className="text-2xl font-bold text-teal-300 mb-6">
            Invoice Configuration
          </h2>
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Invoice Prefix
              </label>
              <input
                type="text"
                placeholder="INV-"
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                placeholder="10"
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span className="text-white font-medium">
                  Include payment terms
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Company Logo URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-stone-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <button className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-all">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
