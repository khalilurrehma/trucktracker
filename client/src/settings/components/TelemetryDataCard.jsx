import React from "react";
import { BarChart3, Activity, Signal } from "lucide-react";
const TelemetryDataCard = ({
  title,
  value,
  unit,
  isActive = false,
  showSignal = false,
  signalStrength = "medium",
}) => {
  const getSignalColor = () => {
    switch (signalStrength) {
      case "weak":
        return "text-telemetry-warning";
      case "strong":
        return "text-telemetry-active";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div
      className={`bg-telemetry-grid-bg border rounded-lg p-3 transition-all duration-200 hover:border-primary/50 ${
        isActive
          ? "border-telemetry-active/50 bg-telemetry-active/5"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-medium text-muted-foreground truncate pr-2">
          {title}
        </h3>
        <div className="flex-shrink-0">
          {showSignal ? (
            <Signal size={12} className={getSignalColor()} />
          ) : (
            <BarChart3 size={12} className="text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="min-w-0 flex-1">
          <div
            className={`text-lg font-bold leading-tight truncate ${
              isActive ? "text-telemetry-active" : "text-foreground"
            }`}
          >
            {typeof value === "number" ? value.toFixed(3) : value}
          </div>
          {unit && (
            <div className="text-xs text-muted-foreground mt-0.5">{unit}</div>
          )}
        </div>

        {/* Activity indicator */}
        {isActive && (
          <div className="flex-shrink-0 ml-2">
            <Activity
              size={12}
              className="text-telemetry-active animate-pulse"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TelemetryDataCard;
