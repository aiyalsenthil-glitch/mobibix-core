"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

interface PublicJobStatus {
  jobNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  updatedAt?: string;
}

export default function PublicTrackPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.token) {
        setError("Missing token");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/public/job/${params.token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load status");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load status");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params?.token]);

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

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Repair Status</h1>
        <p className="text-sm mb-6">Job No: {data.jobNumber}</p>

        <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            <span className="text-sm">
              {new Date(data.updatedAt || Date.now()).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-lg">{data.status?.replace(/_/g, " ")}</div>
        </div>

        <h2 className="font-semibold mb-2">Device</h2>
        <div className="border border-gray-300 rounded p-4 mb-6 text-sm">
          <p>Type: {data.deviceType}</p>
          <p>
            Brand/Model: {data.deviceBrand} {data.deviceModel}
          </p>
        </div>

        <h2 className="font-semibold mb-2">Contact</h2>
        <div className="border border-gray-300 rounded p-4 text-sm">
          <p>{data.customerName}</p>
          <p>Phone: {data.customerPhone}</p>
        </div>
      </div>
    </div>
  );
}
