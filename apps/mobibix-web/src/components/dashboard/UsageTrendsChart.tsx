
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
            stroke={isDark ? "#334155" : "#e2e8f0"}
          />
          <XAxis
            dataKey="displayDate"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              backgroundColor: isDark ? "#1e293b" : "#fff",
              color: isDark ? "#fff" : "#0f172a",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="activeMembers"
            name="Members"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="activeStaff"
            name="Staff"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="activeShops"
            name="Shops"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
