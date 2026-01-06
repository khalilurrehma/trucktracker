import React from "react";
import { MapPin, Settings, AlertCircle, ExternalLink, Truck, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";

const VehiclePopup = ({
  vehicle,
  onClose,
  onLocate,
  onSettings,
  onAlert,
  onDetails,
}) => {
  return (
    <div className="relative bg-card border border-border rounded-lg shadow-xl p-4 min-w-[280px] animate-scale-in">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded hover:bg-accent/60 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-3 mb-3 pr-6">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            vehicle.type === "truck" ? "bg-primary/20" : "bg-amber-500/20"
          )}
        >
          {vehicle.type === "truck" ? (
            <Truck className="w-5 h-5 text-primary" />
          ) : (
            <Loader2 className="w-5 h-5 text-amber-500" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{vehicle.name}</h4>
          <p className="text-xs text-muted-foreground">{vehicle.lastUpdate}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Eff:</span>
          <span
            className={cn(
              "font-medium",
              vehicle.efficiency > 80
                ? "text-green-400"
                : vehicle.efficiency > 50
                ? "text-amber-400"
                : "text-red-400"
            )}
          >
            {Number(vehicle.efficiency || 0).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Trips:</span>
          <span className="font-medium text-foreground">{vehicle.trips}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Fuel/mA3:</span>
          <span className="font-medium text-foreground">
            {Number(vehicle.fuelPerM3 || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Vol (mA3):</span>
          <span className="font-medium text-foreground">
            {Number(vehicle.volumeM3 || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Cycle:</span>
          <span className="font-medium text-foreground">{vehicle.cycleTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Queue:</span>
          <span className="font-medium text-foreground">{vehicle.queueTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={onLocate}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="Locate on map"
        >
          <MapPin className="w-4 h-4 text-red-400" />
        </button>
        <button
          onClick={onSettings}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-primary" />
        </button>
        <button
          onClick={onAlert}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="Alerts"
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </button>
        <button
          onClick={onDetails}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="View details"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default VehiclePopup;
