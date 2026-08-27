"use client";

import { TileLayer } from "react-leaflet";
import { mapTileLayerConfig } from "@/lib/leafletMap";

/** Shared basemap — Carto light raster when keyed, OSM fallback otherwise. */
export function MapTileLayer() {
  const tiles = mapTileLayerConfig();

  return (
    <TileLayer
      url={tiles.url}
      attribution={tiles.attribution}
      subdomains={tiles.subdomains}
      maxZoom={tiles.maxZoom}
    />
  );
}
