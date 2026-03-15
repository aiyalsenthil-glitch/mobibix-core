"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GRN, listGrns, confirmGrn } from "@/services/grn.api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Package, Plus } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function GrnListPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") || undefined;

  useEffect(() => {
    fetchGrns();
  }, [shopId]);

  async function fetchGrns() {
    try {
      setLoading(true);
      const data = await listGrns(shopId);
      setGrns(data);
    } catch (error) {
      console.error("Failed to fetch GRNs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: string) {
    try {
      await confirmGrn(id);
      await fetchGrns();
    } catch (error) {
      console.error("Failed to confirm GRN:", error);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="default">Confirmed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts (GRN)</h1>
          <p className="text-muted-foreground">
            Manage physical inventory receipts against Purchase Orders.
          </p>
        </div>
        <Link href="/purchases/grn/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Receipt
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN #</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No receipts found.
                  </TableCell>
                </TableRow>
              ) : (
                grns.map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                    <TableCell>{grn.poId.substring(0, 8)}...</TableCell>
                    <TableCell>
                      {format(new Date(grn.receivedDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(grn.status)}</TableCell>
                    <TableCell>{grn.items.length} items</TableCell>
                    <TableCell className="text-right">
                      {grn.status === "DRAFT" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirm(grn.id)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
