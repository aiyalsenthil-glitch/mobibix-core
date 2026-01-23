import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-6 grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Shops</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">12</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today Sales</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">₹45,000</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Repairs</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">8</CardContent>
      </Card>
    </div>
  );
}
