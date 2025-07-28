import React from "react";

const SpeedometerGauge = ({ speed, maxSpeed = 240, unit = "km/h" }) => {
  const normalizedSpeed = Math.max(0, Math.min(speed, maxSpeed));
  const angle = (normalizedSpeed / maxSpeed) * 240 - 120; // -120 to 120 degrees

  const gaugeSize = 200;
  const center = gaugeSize / 2;
  const radius = 80;

  // Generate tick marks
  const ticks = [];
  const majorTicks = [0, 40, 80, 120, 160, 200, 240];

  for (let i = 0; i <= maxSpeed; i += 20) {
    const tickAngle = (i / maxSpeed) * 240 - 120;
    const isMajor = majorTicks.includes(i);
    const tickLength = isMajor ? 15 : 8;
    const tickRadius = radius + 5;

    const x1 =
      center +
      (tickRadius - tickLength) * Math.cos((tickAngle * Math.PI) / 180);
    const y1 =
      center +
      (tickRadius - tickLength) * Math.sin((tickAngle * Math.PI) / 180);
    const x2 = center + tickRadius * Math.cos((tickAngle * Math.PI) / 180);
    const y2 = center + tickRadius * Math.sin((tickAngle * Math.PI) / 180);

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="hsl(var(--foreground))"
        strokeWidth={isMajor ? 2 : 1}
        opacity={isMajor ? 0.8 : 0.4}
      />
    );

    // Add numbers for major ticks
    if (isMajor) {
      const textRadius = radius + 25;
      const textX = center + textRadius * Math.cos((tickAngle * Math.PI) / 180);
      const textY = center + textRadius * Math.sin((tickAngle * Math.PI) / 180);

      ticks.push(
        <text
          key={`label-${i}`}
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-xs font-medium"
        >
          {i}
        </text>
      );
    }
  }

  // Needle coordinates
  const needleLength = radius - 10;
  const needleX = center + needleLength * Math.cos((angle * Math.PI) / 180);
  const needleY = center + needleLength * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center justify-center bg-telemetry-gauge-bg rounded-lg p-4">
      <svg width={gaugeSize} height={gaugeSize} className="mb-2">
        {/* Gauge background arc */}
        <path
          d={`M ${center + radius * Math.cos((-120 * Math.PI) / 180)} ${
            center + radius * Math.sin((-120 * Math.PI) / 180)
          } A ${radius} ${radius} 0 1 1 ${
            center + radius * Math.cos((120 * Math.PI) / 180)
          } ${center + radius * Math.sin((120 * Math.PI) / 180)}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="3"
        />

        {/* Speed arc */}
        {normalizedSpeed > 0 && (
          <path
            d={`M ${center + radius * Math.cos((-120 * Math.PI) / 180)} ${
              center + radius * Math.sin((-120 * Math.PI) / 180)
            } A ${radius} ${radius} 0 ${angle > 0 ? 1 : 0} 1 ${
              center + radius * Math.cos((angle * Math.PI) / 180)
            } ${center + radius * Math.sin((angle * Math.PI) / 180)}`}
            fill="none"
            stroke="hsl(var(--telemetry-active))"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}

        {/* Tick marks */}
        {ticks}

        {/* Center dot */}
        <circle cx={center} cy={center} r="4" fill="hsl(var(--foreground))" />

        {/* Needle */}
        <line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="hsl(var(--telemetry-gauge-needle))"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transformOrigin: `${center}px ${center}px`,
            transition: "all 0.3s ease-out",
          }}
        />
      </svg>

      {/* Speed display */}
      <div className="text-center">
        <div className="text-2xl font-bold text-telemetry-gauge-needle">
          {normalizedSpeed.toFixed(0)}
        </div>
        <div className="text-sm text-muted-foreground font-medium">{unit}</div>
      </div>
    </div>
  );
};

export default SpeedometerGauge;
