import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

// fallback palette (use your Tailwind colors or shadcn tokens here)
const DEFAULT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export const CycleBreakdown = ({ delay = 0, value = {} }) => {
  // Convert KPI object → chart data array
  const data = [
    { name: "Load", value: Number(value?.load || 0) },
    { name: "Haul", value: Number(value?.haul || 0) },
    { name: "Dump", value: Number(value?.dump || 0) },
    { name: "Queue", value: Number(value?.queue || 0) },
    { name: "Return", value: Number(value?.ret || 0) },
  ];

  // Resolve CSS vars safely (dark/light mode compatible)
  const resolveColor = (varName, fallback) => {
    const css = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return css?.trim() ? `hsl(${css.trim()})` : fallback;
  };

  const colors = [
    resolveColor("--chart-1", DEFAULT_COLORS[0]),
    resolveColor("--chart-2", DEFAULT_COLORS[1]),
    resolveColor("--chart-3", DEFAULT_COLORS[2]),
    resolveColor("--chart-4", DEFAULT_COLORS[3]),
    resolveColor("--chart-5", DEFAULT_COLORS[4]),
  ];

  return (
    <Card
      className="p-6 bg-card border-border slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Cycle Breakdown
      </h3>

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
            labelLine={false}
            label={({ name, value }) =>
              value > 0 ? `${name}: ${value.toFixed(1)} min` : ""
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(val, name) => [`${val.toFixed(1)} min`, name]}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
