import React from 'react';
import { Car } from 'lucide-react';

const VehicleOrientation = ({ direction, speed }) => {
  const isMoving = speed > 0;

  return (
    <div className="flex flex-col items-center justify-center bg-card rounded-lg p-4 h-full">
      <div className="relative w-32 h-32 rounded-full border-2 border-border flex items-center justify-center mb-4">
        {/* Compass directions */}
        <div className="absolute top-1 text-xs text-muted-foreground font-medium">
          N
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
          E
        </div>
        <div className="absolute bottom-1 text-xs text-muted-foreground font-medium">
          S
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
          W
        </div>

        {/* Vehicle icon */}
        <div
          className={`transition-transform duration-300 ${
            isMoving ? "text-telemetry-active" : "text-muted-foreground"
          }`}
          style={{ transform: `rotate(${direction}deg)` }}
        >
          <Car size={24} />
        </div>

        {/* Direction indicator line */}
        <div
          className="absolute w-0.5 bg-telemetry-active opacity-60"
          style={{
            height: "40px",
            top: "10px",
            left: "50%",
            transformOrigin: "bottom center",
            transform: `translateX(-50%) rotate(${direction}deg)`,
            transition: "transform 0.3s ease-out",
          }}
        />
      </div>

      <div className="text-center space-y-1">
        <div className="text-lg font-bold">{direction.toFixed(0)}°</div>
        <div className="text-xs text-muted-foreground">
          {getCardinalDirection(direction)}
        </div>
        <div
          className={`text-xs ${
            isMoving ? "text-telemetry-active" : "text-muted-foreground"
          }`}
        >
          {isMoving ? "Moving" : "Stationary"}
        </div>
      </div>
    </div>
  );
};

function getCardinalDirection(degrees) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export default VehicleOrientation;
