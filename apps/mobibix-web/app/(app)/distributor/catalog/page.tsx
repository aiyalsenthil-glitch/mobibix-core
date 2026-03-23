import CatalogManager from "@/components/distributor/CatalogManager";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wholesale Catalog | MobiBix Distributor',
  description: 'Manage your product listings and stock for the retailer network.',
};

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Product Catalog
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          List your items here to make them available to your linked retailer shops.
        </p>
      </div>
      <CatalogManager />
    </div>
  );
}
