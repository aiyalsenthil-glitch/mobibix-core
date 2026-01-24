"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authGuard } from "@/lib/authGuard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const ok = authGuard(router);
    setIsReady(ok);
  }, [router]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-16 p-6">{children}</main>
    </div>
  );
}
