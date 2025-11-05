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

const data = [
  { time: "10/12", efficiency: 85 },
  { time: "11/12", efficiency: 88 },
  { time: "12/12", efficiency: 78 },
  { time: "13/12", efficiency: 92 },
  { time: "14/12", efficiency: 86 },
  { time: "15/12", efficiency: 89 },
  { time: "16/12", efficiency: 83 },
  { time: "17/12", efficiency: 91 },
  { time: "18/12", efficiency: 87 },
  { time: "19/12", efficiency: 85 },
  { time: "20/12", efficiency: 82 },
];

export const EfficiencyChart = ({ delay = 0 }) => {
  return (
    <Card
      className="p-6 bg-card border-border slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Daily Efficiency Evolution
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
            }}
          />

          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
            }}
            domain={[70, 95]}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />

          <Line
            type="monotone"
            dataKey="efficiency"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
            animationBegin={delay}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
