import React from "react";
import { Wifi, WifiOff, Clock } from "lucide-react";

const StatusBar = ({ deviceName, deviceId, timestamp, isOnline, peer }) => {
  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString();
  };

  const formatUnixTime = (ts) => {
    return ts.toFixed(6);
  };

  return (
    <div className="bg-secondary/50 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Connection Status */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-2 ${
              isOnline ? "text-telemetry-status-online" : "text-destructive"
            }`}
          >
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            <span className="font-medium">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {peer && <div className="text-muted-foreground text-sm">{peer}</div>}
        </div>

        {/* Device Info */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Device</div>
            <div className="font-medium text-foreground">{deviceName}</div>
            <div className="text-xs text-muted-foreground">ID: {deviceId}</div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-muted-foreground" />
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatTimestamp(timestamp)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {formatUnixTime(timestamp)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
