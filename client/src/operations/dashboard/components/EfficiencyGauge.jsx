import { useEffect, useState } from "react";
import { Card } from "./ui/card";

/**
 * @param {{ value: number, title: string, delay?: number }} props
 */
export const EfficiencyGauge = ({ value, title, delay = 0 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let current = 0;
    const increment = value / 50;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setAnimatedValue(value);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.floor(current));
        }
      }, 20);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  return (
    <Card
      className="p-6 bg-card border-border slide-up flex flex-col items-center justify-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
        {title}
      </h3>

      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="hsl(var(--secondary))"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-primary">{animatedValue}</div>
          <div className="text-xl text-muted-foreground">%</div>
        </div>
      </div>
    </Card>
  );
};
