import L from "leaflet";

export const GOOGLE_SAT = "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
export const GOOGLE_HYBRID = "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
export const GOOGLE_TERRAIN = "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}";
export const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ESRI_TOPO =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
export const DARK =
  "https://tiles.stadiamaps.com/tiles/alidade_dark/{z}/{x}/{y}{r}.png";
export const LIGHT =
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";


export function createBaseLayers() {
  return {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),

    "Google Satellite": L.tileLayer(GOOGLE_SAT, {
      subdomains: ["mt0", "mt1", "mt2", "mt3"]
    }),

    "Google Hybrid": L.tileLayer(GOOGLE_HYBRID, {
      subdomains: ["mt0", "mt1", "mt2", "mt3"]
    }),

    "Google Terrain": L.tileLayer(GOOGLE_TERRAIN, {
      subdomains: ["mt0", "mt1", "mt2", "mt3"]
    }),

    "ESRI Satellite": L.tileLayer(ESRI_SAT),

    "ESRI Topographic": L.tileLayer(ESRI_TOPO),

    "Dark Mode": L.tileLayer(DARK),

    "Light Mode": L.tileLayer(LIGHT),
  };
}
