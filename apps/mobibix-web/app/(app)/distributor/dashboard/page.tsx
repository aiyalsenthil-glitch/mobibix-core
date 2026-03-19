import DistributorDashboard from "@/components/distributor/DistributorDashboard";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Distributor Dashboard | MobiBix',
  description: 'Manage your retailer network and monitor wholesale performance.',
};

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-6 lg:px-8">
      <DistributorDashboard />
    </div>
  );
}
