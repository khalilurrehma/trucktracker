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
  // Define color variants
  const variantStyles = {
    primary: "text-primary border-primary/20 bg-primary/5",
    success: "text-success border-success/20 bg-success/5",
    warning: "text-warning border-warning/20 bg-warning/5",
    info: "text-info border-info/20 bg-info/5",
  };

  // Background color for icon area
  const bgColor = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    info: "bg-info/10",
  }[variant];

  return (
    <Card
      className={`p-6 bg-card border-2 slide-up transition-all duration-300 hover:scale-[1.02] ${variantStyles[variant]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </h3>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
