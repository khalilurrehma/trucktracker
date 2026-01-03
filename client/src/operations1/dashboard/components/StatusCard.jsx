import { useEffect, useState } from "react";
import { Card } from "./ui/card";

/**
 * @param {{
 *  title: string,
 *  value: string | number,
 *  subtitle?: string,
 *  icon: React.ElementType,
 *  variant?: "primary" | "success" | "warning" | "info",
 *  delay?: number
 * }} props
 */
export const StatusCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  delay = 0,
}) => {
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 🎨 Tailwind-native color variants (with dark versions)
  const variantStyles = {
    primary: isDark
      ? "bg-[#111827] border-blue-900 text-blue-400"
      : "bg-blue-50 border-blue-200 text-blue-700",
    success: isDark
      ? "bg-[#102a17] border-green-900 text-green-400"
      : "bg-green-50 border-green-200 text-green-700",
    warning: isDark
      ? "bg-[#2a1f0a] border-yellow-900 text-yellow-400"
      : "bg-yellow-50 border-yellow-200 text-yellow-700",
    info: isDark
      ? "bg-[#07272b] border-cyan-900 text-cyan-400"
      : "bg-cyan-50 border-cyan-200 text-cyan-700",
  };

  const iconBg = {
    primary: isDark ? "bg-blue-900/40" : "bg-blue-100",
    success: isDark ? "bg-green-900/40" : "bg-green-100",
    warning: isDark ? "bg-yellow-900/40" : "bg-yellow-100",
    info: isDark ? "bg-cyan-900/40" : "bg-cyan-100",
  }[variant];

  return (
    <Card
      className={`p-6 border-2 rounded-xl transition-all duration-300 transform hover:scale-[1.02] animate-slide-up 
        ${variantStyles[variant]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <Icon className="w-8 h-8" />
        </div>

        <div className="flex-1">
          <h3
            className={`text-sm font-medium mb-1 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {title}
          </h3>

          <p
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {value}
          </p>

          {subtitle && (
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
