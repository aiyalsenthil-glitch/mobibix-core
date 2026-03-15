"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getJobCard, type JobCard } from "@/services/jobcard.api";
import { QRCodeSVG } from "qrcode.react";

// Build a public tracking URL using the frontend origin
function buildPublicTrackUrl(token?: string): string {
  if (!token) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/track/${token}`;
}

export default function PrintJobCardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") || "";

  const [job, setJob] = useState<JobCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!shopId || !params?.id) {
        setError("Missing shopId or job id");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const data = await getJobCard(shopId, params.id);
        setJob(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load job card";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [shopId, params?.id]);

  useEffect(() => {
    if (job) {
      // Trigger browser print when job is loaded
      setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 200);
    }
  }, [job]);

  const publicUrl = useMemo(
    () => buildPublicTrackUrl(job?.publicToken),
    [job?.publicToken],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-red-600">
        {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Job not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto border border-black">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black">
          <div>
            <h1 className="text-2xl font-bold">Job Card</h1>
            <p className="text-sm">Job No: {job.jobNumber}</p>
            <p className="text-sm">Status: {job.status.replace(/_/g, " ")}</p>
          </div>
          {publicUrl && (
            <div className="flex flex-col items-center">
              <QRCodeSVG value={publicUrl} size={96} />
              <span className="text-xs mt-2">Scan to track</span>
            </div>
          )}
        </div>

        {/* Customer & Device */}
        <div className="grid grid-cols-2 gap-0">
          <div className="border-r border-black p-6">
            <h2 className="font-semibold mb-2">Customer</h2>
            <div className="space-y-1 text-sm">
              <p>Name: {job.customerName}</p>
              <p>Phone: {job.customerPhone}</p>
              {job.customerAltPhone && <p>Alt: {job.customerAltPhone}</p>}
            </div>
          </div>
          <div className="p-6">
            <h2 className="font-semibold mb-2">Device</h2>
            <div className="space-y-1 text-sm">
              <p>Type: {job.deviceType}</p>
              <p>
                Brand/Model: {job.deviceBrand} {job.deviceModel}
              </p>
              {job.deviceSerial && <p>Serial: {job.deviceSerial}</p>}
            </div>
          </div>
        </div>

        {/* Problem & Condition */}
        <div className="grid grid-cols-2 gap-0 border-t border-black">
          <div className="border-r border-black p-6">
            <h2 className="font-semibold mb-2">Customer Complaint</h2>
            <p className="text-sm whitespace-pre-line">
              {job.customerComplaint}
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-semibold mb-2">Physical Condition</h2>
            <p className="text-sm whitespace-pre-line">
              {job.physicalCondition || "-"}
            </p>
          </div>
        </div>

        {/* Charges */}
        <div className="grid grid-cols-3 gap-0 border-t border-black">
          <div className="border-r border-black p-6">
            <h2 className="font-semibold mb-2">Estimated Cost</h2>
            <p className="text-sm">
              {job.estimatedCost != null ? `₹ ${job.estimatedCost}` : "-"}
            </p>
          </div>
          <div className="border-r border-black p-6">
            <h2 className="font-semibold mb-2">Advance Paid</h2>
            <p className="text-sm">
              {job.advancePaid != null ? `₹ ${job.advancePaid}` : "-"}
            </p>
          </div>
          <div className="p-6">
            <h2 className="font-semibold mb-2">Est. Delivery</h2>
            <p className="text-sm">
              {job.estimatedDelivery
                ? new Date(job.estimatedDelivery).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black p-6 text-xs">
          <h3 className="font-semibold mb-2">Terms</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Please keep this receipt to collect your device.</li>
            <li>Unclaimed devices after 60 days may incur storage fees.</li>
            <li>Water damage and data loss are not covered under warranty.</li>
          </ul>
          <div className="grid grid-cols-2 mt-6">
            <div>
              <div className="h-10 border-b border-black w-48" />
              <span>Customer Signature</span>
            </div>
            <div>
              <div className="h-10 border-b border-black w-48" />
              <span>Shop Representative</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs">
              Created: {new Date(job.createdAt).toLocaleString()}
            </span>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 border border-black rounded"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
