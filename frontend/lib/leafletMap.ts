import type { Map as LeafletMap, MapOptions } from "leaflet";
import { latLngPair, type Property } from "@kestrel/shared";

/** Light raster style — matches Kestrel paper/oxblood palette (Positron equivalent). */
export const CARTO_LIGHT_STYLE = "light_all";

export const MAP_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const OSM_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapTileLayerConfig = {
  url: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
  usesCarto: boolean;
};

export const leafletMapOptions: Pick<MapOptions, "minZoom"> = {
  minZoom: 1,
};

export function cartoApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  return key || undefined;
}

export function cartoRasterTileUrl(key: string): string {
  return `https://{s}.basemaps.cartocdn.com/${CARTO_LIGHT_STYLE}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`;
}

/** Carto light raster when keyed, OpenStreetMap fallback otherwise. */
export function mapTileLayerConfig(): MapTileLayerConfig {
  const key = cartoApiKey();
  if (key) {
    return {
      url: cartoRasterTileUrl(key),
      attribution: MAP_TILE_ATTR,
      subdomains: "abcd",
      maxZoom: 20,
      usesCarto: true,
    };
  }
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_TILE_ATTR,
    subdomains: "abc",
    maxZoom: 19,
    usesCarto: false,
  };
}

/** Leaflet throws `Invalid LatLng (NaN, NaN)` if the pane is still 0×0 (display:none / first paint). */
export function mapIsLaidOut(map: LeafletMap): boolean {
  try {
    const size = map.getSize();
    return size.x > 0 && size.y > 0 && Number.isFinite(size.x) && Number.isFinite(size.y);
  } catch {
    return false;
  }
}

export function usableLatLng(property?: Pick<Property, "lat" | "lng"> | null): [number, number] | null {
  if (!property) return null;
  const pair = latLngPair(property);
  if (!pair) return null;
  const [lat, lng] = pair;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return pair;
}

export function safeSetView(map: LeafletMap, pair: [number, number], zoom: number): boolean {
  if (!mapIsLaidOut(map)) return false;
  if (!Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) || !Number.isFinite(zoom)) return false;
  try {
    map.setView(pair, zoom);
    return true;
  } catch {
    return false;
  }
}

export function safeFitBounds(map: LeafletMap, points: [number, number][]): boolean {
  if (!mapIsLaidOut(map) || points.length < 2) return false;
  if (points.some(([lat, lng]) => !Number.isFinite(lat) || !Number.isFinite(lng))) return false;
  try {
    map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    return true;
  } catch {
    return false;
  }
}

export function safeFlyTo(map: LeafletMap, pair: [number, number], zoom: number): boolean {
  if (!mapIsLaidOut(map)) return false;
  if (!Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) || !Number.isFinite(zoom)) return false;
  try {
    map.flyTo(pair, zoom, { duration: 0.55 });
    return true;
  } catch {
    return false;
  }
}
