import { useState } from "react";

export function useDrawing() {
  const [coords, setCoords] = useState([]); // [[lng, lat], ...] closed ring
  const [area, setArea] = useState({ sqm: 0, ha: 0 });

  const setGeometry = (newCoords, sqm) => {
    setCoords(newCoords);
    setArea({ sqm, ha: sqm / 10000 });
  };

  const clearGeometry = () => {
    setCoords([]);
    setArea({ sqm: 0, ha: 0 });
  };

  return { coords, area, setGeometry, clearGeometry };
}

export function closeRing(c) {
  if (!c?.length) return c;
  const [lng1, lat1] = c[0];
  const [lngN, latN] = c[c.length - 1];
  if (lng1 !== lngN || lat1 !== latN) return [...c, c[0]];
  return c;
}

export function fmt(n) {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
