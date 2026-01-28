"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StockCorrectionForm } from "@/components/inventory/StockCorrectionForm";
import { useShop } from "@/context/ShopContext";
import { useToast } from "@/hooks/use-toast";

export default function StockCorrectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedShopId, selectShop, isLoadingShops } = useShop();
  const { toast } = useToast();

  const shopIdParam = searchParams.get("shopId");
  const productIdParam = searchParams.get("productId");

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (shopIdParam && selectedShopId !== shopIdParam) {
      selectShop(shopIdParam);
    }
    setIsReady(true);
  }, [shopIdParam, selectedShopId, selectShop]);

  const handleSuccess = () => {
    toast({
      title: "Stock Corrected",
      description: "Stock levels have been updated successfully.",
    });

    // Navigate back or to negative stock report
    if (productIdParam) {
      router.push("/inventory/negative-stock");
    } else {
      router.push("/inventory");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoadingShops || !isReady) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center p-12">
            <div className="text-slate-500 dark:text-slate-400">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedShopId) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="container mx-auto p-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  Please select a shop to continue
                </p>
                <Button
                  onClick={() => router.push("/inventory")}
                  className="bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white"
                >
                  Go to Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Stock Correction
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manually adjust inventory levels for bulk products
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-50">
              Correction Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StockCorrectionForm
              shopId={selectedShopId}
              preSelectedProductId={productIdParam || undefined}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
