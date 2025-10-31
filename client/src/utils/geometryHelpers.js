export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
export function fmt(n) {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
export function closeRing(coords) {
  if (!coords.length) return;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
}
export function isPolygonInside(g, zonePath, operationPoly) {
  const allInside = zonePath.every((pt) =>
    g.maps.geometry.poly.containsLocation(pt, operationPoly)
  );
  if (!allInside) return false;
  return true;
}
