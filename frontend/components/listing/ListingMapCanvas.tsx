"use client";

import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { type Property } from "@kestrel/shared";
import { MapTileLayer } from "@/components/listing/MapTileLayer";
import { leafletMapOptions, mapIsLaidOut, usableLatLng } from "@/lib/leafletMap";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

function pinIcon(side: "sale" | "lease") {
  const bg = side === "sale" ? "#5C1F27" : "#D9A26B";
  const color = side === "sale" ? "#F6F1EC" : "#2A1418";
  return L.divIcon({
    className: "kc-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    html: `<div class="kc-pin-inner is-selected" style="--pin:${bg};--ink:${color};width:18px;height:18px"></div>`,
  });
}

function LabeledPin({ property, pair }: { property: Property; pair: [number, number] }) {
  const ref = useRef<L.Marker | null>(null);
  useEffect(() => {
    const el = ref.current?.getElement();
    if (!el) return;
    el.setAttribute("aria-label", property.address);
    el.setAttribute("title", property.address);
  });
  return (
    <Marker
      ref={ref}
      position={pair}
      icon={pinIcon(property.transactionSide)}
      title={property.address}
      alt={property.address}
    />
  );
}

function InvalidateWhenReady() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      if (!mapIsLaidOut(map)) {
        window.setTimeout(() => map.invalidateSize(), 200);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}

export function ListingMapCanvas({ property }: { property: Property }) {
  const pair = usableLatLng(property);
  if (!pair) return null;

  return (
    <MapContainer
      center={pair}
      zoom={15}
      minZoom={leafletMapOptions.minZoom}
      className="kc-search-map h-full min-h-[18rem] w-full"
      scrollWheelZoom
    >
      <MapTileLayer />
      <InvalidateWhenReady />
      <LabeledPin property={property} pair={pair} />
    </MapContainer>
  );
}
