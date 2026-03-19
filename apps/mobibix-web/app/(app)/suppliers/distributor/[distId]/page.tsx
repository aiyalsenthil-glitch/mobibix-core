"use client";

import WholesaleBrowser from "@/components/distributor/WholesaleBrowser";
import { useParams } from "next/navigation";
import { ChevronLeft, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WholesalePage() {
  const params = useParams();
  const distId = params.distId as string;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 lg:px-8 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <Link href="/suppliers">
            <Button variant="ghost" className="rounded-xl px-2 -ml-2 text-slate-500 hover:text-indigo-600">
              <ChevronLeft size={16} className="mr-1" />
              Back to All Suppliers
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/30">
              <Truck size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Wholesale Portal
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                Direct procurement from your verified MobiBix Distributor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Experience */}
      <WholesaleBrowser distributorId={distId} />
    </div>
  );
}
