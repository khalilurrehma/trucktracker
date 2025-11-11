import { useEffect, useState } from "react";
import { Card } from "./ui/card";

/**
 * @param {{ value: number, title: string, delay?: number }} props
 */
export const EfficiencyGauge = ({ value, title, delay = 0 }) => {
  const targetValue = Math.round(value ?? 0);
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // 🌗 Watch for theme change
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e) => setIsDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // 🎞 Animate progress value
  useEffect(() => {
    let current = 0;
    const increment = targetValue / 50;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
          setAnimatedValue(targetValue);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.round(current));
        }
      }, 20);
    }, delay);

    return () => clearTimeout(timer);
  }, [targetValue, delay]);

  // 🎨 Dynamic colors based on theme
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (animatedValue / 100) * circumference;

  const baseStroke = isDark ? "#1f2937" : "#e5e7eb"; // neutral gray ring
  const progressStroke = isDark ? "#60a5fa" : "#3b82f6"; // primary blue
  const textColor = isDark ? "#f3f4f6" : "#111827"; // main number
  const subTextColor = isDark ? "#9ca3af" : "#6b7280"; // muted text

  return (
    <Card
      className={`p-6 rounded-xl flex flex-col items-center justify-center transition-all duration-300 
                  border animate-slide-up hover:border-indigo-400 hover:shadow-md 
                  ${isDark ? "bg-[#141414] border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3
        className="text-sm font-medium mb-4 text-center"
        style={{ color: subTextColor }}
      >
        {title}
      </h3>

      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke={baseStroke}
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke={progressStroke}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="text-5xl font-bold"
            style={{ color: progressStroke }}
          >
            {animatedValue}
          </div>
          <div className="text-xl" style={{ color: subTextColor }}>
            %
          </div>
        </div>
      </div>
    </Card>
  );
};
