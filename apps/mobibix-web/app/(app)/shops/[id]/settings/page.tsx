"use client";

import { ShopSettingsView } from "@/components/shops/ShopSettingsView";
import { useParams } from "next/navigation";

export default function ShopSettingsPage() {
  const params = useParams();
  const shopId = params?.id as string;

  if (!shopId) return <div>Invalid Shop ID</div>;

  return <ShopSettingsView shopId={shopId} />;
}
