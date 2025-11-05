import { Card } from "./ui/card";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {string} [props.subtitle]
 * @param {React.ElementType} props.icon
 * @param {string} [props.iconColor]
 * @param {string} [props.valueColor]
 * @param {"up"|"down"|"neutral"} [props.trend]
 * @param {number} [props.delay]
 */
export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  valueColor = "text-foreground",
  trend,
  delay = 0,
}) => {
  // Map trends to colors
  const trendClass =
    trend === "up"
      ? "text-success bg-success/10"
      : trend === "down"
      ? "text-destructive bg-destructive/10"
      : trend === "neutral"
      ? "text-muted-foreground bg-muted"
      : "";

  return (
    <Card
      className={`p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-secondary/50 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>

        {trend && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded ${trendClass}`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </div>
        )}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className={`text-3xl font-bold mb-1 ${valueColor}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </Card>
  );
};
