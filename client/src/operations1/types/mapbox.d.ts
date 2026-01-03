declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "@mapbox/mapbox-gl-draw" {
  import { IControl, Map } from "mapbox-gl";

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      polygon?: boolean;
      trash?: boolean;
      point?: boolean;
      line_string?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    styles?: object[];
  }

  class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getAll(): GeoJSON.FeatureCollection;
    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    get(featureId: string): GeoJSON.Feature | undefined;
    getMode(): string;
    changeMode(mode: string, options?: object): this;
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
  }

  export default MapboxDraw;
}

declare module "@mapbox/mapbox-gl-geocoder" {
  import { IControl, Map, LngLatLike } from "mapbox-gl";

  interface GeocoderOptions {
    accessToken: string;
    mapboxgl?: typeof import("mapbox-gl");
    placeholder?: string;
    collapsed?: boolean;
    proximity?: LngLatLike;
    trackProximity?: boolean;
    bbox?: [number, number, number, number];
    countries?: string;
    types?: string;
    minLength?: number;
    limit?: number;
    language?: string;
    filter?: (feature: GeoJSON.Feature) => boolean;
    localGeocoder?: (query: string) => GeoJSON.Feature[];
    externalGeocoder?: (query: string) => Promise<GeoJSON.Feature[]>;
    reverseGeocode?: boolean;
    enableEventLogging?: boolean;
    marker?: boolean;
    render?: (feature: GeoJSON.Feature) => string;
    getItemValue?: (feature: GeoJSON.Feature) => string;
    mode?: "mapbox.places" | "mapbox.places-permanent";
    localGeocoderOnly?: boolean;
  }

  class MapboxGeocoder implements IControl {
    constructor(options: GeocoderOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    query(query: string): this;
    setInput(value: string): this;
    setProximity(proximity: LngLatLike): this;
    getProximity(): LngLatLike;
    setRenderFunction(fn: (feature: GeoJSON.Feature) => string): this;
    setLanguage(language: string): this;
    getLanguage(): string;
    setZoom(zoom: number): this;
    getZoom(): number;
    setFlyTo(flyTo: boolean): this;
    getFlyTo(): boolean;
    setPlaceholder(placeholder: string): this;
    getPlaceholder(): string;
    getBbox(): [number, number, number, number];
    setBbox(bbox: [number, number, number, number]): this;
    getCountries(): string;
    setCountries(countries: string): this;
    getTypes(): string;
    setTypes(types: string): this;
    getMinLength(): number;
    setMinLength(minLength: number): this;
    getLimit(): number;
    setLimit(limit: number): this;
    getFilter(): (feature: GeoJSON.Feature) => boolean;
    setFilter(fn: (feature: GeoJSON.Feature) => boolean): this;
    clear(): void;
    on(type: string, fn: (event: object) => void): this;
    off(type: string, fn: (event: object) => void): this;
  }

  export default MapboxGeocoder;
}
