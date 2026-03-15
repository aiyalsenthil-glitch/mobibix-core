
"use client";

import { UsageSnapshot } from "@/services/tenant.api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";

interface UsageTrendsChartProps {
  data: UsageSnapshot[];
  isLoading: boolean;
}

export function UsageTrendsChart({ data, isLoading }: UsageTrendsChartProps) {
  // Removed useTheme as we use CSS variables now

  if (isLoading) {
    return <div className="w-full h-64 bg-muted/20 animate-pulse rounded-lg" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground opacity-50 text-sm">
        No usage history available
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="displayDate"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)' }}
          />
          <YAxis 
            stroke="var(--muted-foreground)" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="activeMembers"
            name="Members"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="activeStaff"
            name="Staff"
            stroke="#10b981" // Emerald-500 keeps its meaning
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="activeShops"
            name="Shops"
            stroke="#f59e0b" // Amber-500
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
