"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PaymentBreakdownChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean;
}

// Colour palette: sky → emerald → amber → violet → rose
const PALETTE = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank",
  CREDIT: "Credit",
  EMI: "EMI",
};

const formatINR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-muted-foreground text-xs mb-1">
        {PAYMENT_LABELS[payload[0].payload.name] ?? payload[0].payload.name}
      </p>
      <p className="font-bold text-foreground">{formatINR(payload[0].value)}</p>
    </div>
  );
};

const renderLegend = (props: { payload?: readonly { value?: string; color?: string }[] }) => {
  const { payload } = props;
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry, i) => (
        <span key={entry.value ?? i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value ? (PAYMENT_LABELS[entry.value] ?? entry.value) : ''}
        </span>
      ))}
    </div>
  );
};

export function PaymentBreakdownChart({
  data,
  isLoading,
}: PaymentBreakdownChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-muted/30 animate-pulse rounded-lg" />
        <div className="w-40 h-40 mx-auto rounded-full bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Payment Distribution
        </h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {formatINR(total)} total
          </span>
        )}
      </div>

      {data.length === 0 || total === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-50">
          <p className="text-sm">No payments today</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={58}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="var(--background)"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown list below donut */}
      {data.length > 0 && total > 0 && (
        <div className="space-y-1.5 pt-1">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-muted-foreground">
                  {PAYMENT_LABELS[item.name] ?? item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{formatINR(item.value)}</span>
                <span className="text-muted-foreground w-8 text-right">
                  {Math.round((item.value / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
