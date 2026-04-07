"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SalesTrendChartProps {
  data: { date: string; sales: number }[];
  isLoading?: boolean;
  currentMonthRevenue?: number;
  lastMonthRevenue?: number;
}

const formatCurrency = (v: number) =>
  v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-bold text-foreground text-base">
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(payload[0].value)}
      </p>
    </div>
  );
};

export function SalesTrendChart({
  data,
  isLoading,
  currentMonthRevenue,
  lastMonthRevenue,
}: SalesTrendChartProps) {
  const gradientId = useId();
  // MoM calculation
  const momDelta =
    lastMonthRevenue && lastMonthRevenue > 0 && currentMonthRevenue != null
      ? Math.round(
          ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        )
      : null;

  const avgSales =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.sales, 0) / data.length
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted/30 animate-pulse rounded-lg" />
        <div className="w-full h-64 bg-muted/20 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + MoM Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">
            7-Day Sales Trend
          </h3>
          {momDelta !== null && (
            <MoMBadge delta={momDelta} />
          )}
        </div>
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full font-medium">
          Daily Revenue
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground opacity-50 text-sm">
          No sales data available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrency}
                tick={{ fill: "var(--muted-foreground)" }}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              {avgSales > 0 && (
                <ReferenceLine
                  y={avgSales}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: "avg",
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3.5, fill: "#0ea5e9", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function MoMBadge({ delta }: { delta: number }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;

  const colorClass = isZero
    ? "bg-muted text-muted-foreground"
    : isPositive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-red-500/10 text-red-600 dark:text-red-400";

  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}
    >
      <Icon className="w-3 h-3" />
      {isZero ? "Same as last month" : `${isPositive ? "+" : ""}${delta}% vs last month`}
    </span>
  );
}
