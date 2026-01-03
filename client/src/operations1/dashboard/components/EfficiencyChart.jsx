import { useEffect, useState } from "react";
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

export const EfficiencyChart = ({ delay = 0, value = [] }) => {
  const chartData =
    value?.length > 0
      ? value
          .filter((e) => e.efficiency != null)
          .map((e) => ({
            time: e.date?.slice(5) || "—",
            efficiency: Number(e.efficiency || 0),
          }))
      : [
        ];

  // 🌗 Live theme detection
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 🎨 Theme-aware colors
  const borderColor = isDark ? "#2f2f2f" : "#e5e7eb";
  const textColor = isDark ? "#d1d5db" : "#6b7280";
  const bgColor = isDark ? "#141414" : "#ffffff";
  const primaryColor = isDark ? "#60a5fa" : "#3b82f6";

  return (
    <Card
      className={`p-6 rounded-xl transition-all duration-300 
                  border animate-slide-up hover:border-indigo-400 hover:shadow-md 
                  ${isDark ? "bg-[#141414] border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-lg font-semibold mb-4">
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
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              color: textColor,
            }}
            labelStyle={{ color: textColor }}
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
