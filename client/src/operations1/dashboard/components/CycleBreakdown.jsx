import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const LIGHT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
const DARK_COLORS  = ["#60a5fa", "#4ade80", "#facc15", "#f87171", "#a78bfa"];

export const CycleBreakdown = ({ delay = 0, value = {} }) => {
  // Prepare chart data safely
  const data = [
    { name: "Load", value: Number(value?.load || 0) },
    { name: "Haul", value: Number(value?.haul || 0) },
    { name: "Dump", value: Number(value?.dump || 0) },
    { name: "Queue", value: Number(value?.queue || 0) },
    { name: "Return", value: Number(value?.ret || 0) },
  ];

  // 🌗 Live system theme detection
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <Card
      className={`p-6 rounded-xl transition-all duration-300 border animate-slide-up
                  hover:border-indigo-400 hover:shadow-md
                  ${isDark ? "bg-[#141414] border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-semibold mb-4">Cycle Breakdown</h3>

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
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
              border: isDark ? "1px solid #333" : "1px solid #ddd",
              borderRadius: "8px",
              color: isDark ? "#f3f3f3" : "#111",
            }}
            formatter={(val, name) => [`${val.toFixed(1)} min`, name]}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span
                className={`text-sm ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
