import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Load", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Haul", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Dump", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Queue", value: 10, color: "hsl(var(--chart-4))" },
  { name: "Return", value: 10, color: "hsl(var(--chart-5))" },
];

export const CycleBreakdown = ({ delay = 0 }) => {
  return (
    <Card className="p-6 bg-card border-border slide-up" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Cycle Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            animationBegin={delay}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
