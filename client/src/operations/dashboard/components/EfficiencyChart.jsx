import { Card } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// receives props: { delay, value: kpi.last10Efficiency }
export const EfficiencyChart = ({ delay = 0, value = [] }) => {
  // Map incoming KPI data
  const chartData =
    value?.length > 0
      ? value
          .filter((e) => e.efficiency != null)
          .map((e) => ({
            time: e.date?.slice(5) || "—", // e.g. "11-05" → "11-05"
            efficiency: Number(e.efficiency || 0),
          }))
      : [
          { time: "10/12", efficiency: 85 },
          { time: "11/12", efficiency: 88 },
          { time: "12/12", efficiency: 78 },
          { time: "13/12", efficiency: 92 },
          { time: "14/12", efficiency: 86 },
        ];

  // Resolve Tailwind theme colors safely
  const getVar = (v, fallback) => {
    const css = getComputedStyle(document.documentElement).getPropertyValue(v);
    return css?.trim() ? `hsl(${css.trim()})` : fallback;
  };
  const borderColor = getVar("--border", "#e5e7eb");
  const textColor = getVar("--muted-foreground", "#6b7280");
  const primaryColor = getVar("--primary", "#3b82f6");

  return (
    <Card
      className="p-6 bg-card border-border slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Daily Efficiency Evolution
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />

          <XAxis
            dataKey="time"
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
          />

          <YAxis
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
            domain={[0, 100]}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(val) => [`${val.toFixed(1)} %`, "Efficiency"]}
          />

          <Line
            type="monotone"
            dataKey="efficiency"
            stroke={primaryColor}
            strokeWidth={3}
            dot={{ fill: primaryColor, r: 4 }}
            activeDot={{ r: 6 }}
            animationBegin={delay}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
