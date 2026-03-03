"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface DeletionRequest {
  id: string;
  tenantId: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: string;
  adminNotes: string;
  tenant: {
    name: string;
    tenantType: string;
  };
}

export default function PrivacyRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/admin/privacy/deletions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (action === "approve" && !confirm("WARNING: This will permanently scrub user PII and optionally hard delete data according to GST logic. This cannot be undone. Proceed?")) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`/api/admin/privacy/deletions/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to process request");
      
      toast.success(resData.message || `Request ${action}d successfully`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🛡️ Privacy Requests</h1>
            <p className="text-stone-400">Manage account deletion and anonymization requests.</p>
          </div>
          <Link href="/dashboard/admin" className="text-teal-400 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-stone-300">
                <th className="p-4 font-semibold text-sm">Tenant</th>
                <th className="p-4 font-semibold text-sm">Requested At</th>
                <th className="p-4 font-semibold text-sm">Reason</th>
                <th className="p-4 font-semibold text-sm">Status</th>
                <th className="p-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-teal-300">{req.tenant.name}</div>
                    <div className="text-xs text-stone-500">{req.tenant.tenantType}</div>
                  </td>
                  <td className="p-4 text-stone-400 text-sm">
                    {new Date(req.requestedAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-stone-400 text-sm max-w-xs truncate">
                    {req.reason || "N/A"}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      req.status === 'PENDING' ? 'bg-orange-500/20 text-orange-300' :
                      req.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(req.id, 'approve')}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm font-semibold transition-colors"
                        >
                          Scrub Data
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'reject')}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm font-semibold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    No privacy requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
