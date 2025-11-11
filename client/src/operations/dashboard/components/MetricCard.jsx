import React, { useEffect, useState } from "react";
import { Card } from "./ui/card";

export const MetricCard = ({ title, value, subtitle, icon: Icon, delay = 0 }) => {
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Card
      className={`p-6 rounded-xl border transition-all duration-300 transform hover:scale-[1.02]
        ${isDark
          ? "bg-[#141414] border-gray-700 text-gray-100"
          : "bg-white border-gray-200 text-gray-900"
        }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div
            className={`p-3 rounded-lg ${
              isDark ? "bg-gray-800 text-indigo-400" : "bg-gray-100 text-indigo-500"
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      <h3
        className={`text-sm font-medium mb-2 ${
          isDark ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {title}
      </h3>

      <p
        className={`text-3xl font-bold mb-1 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </p>

      {subtitle && (
        <p
          className={`text-xs ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {subtitle}
        </p>
      )}
    </Card>
  );
};
