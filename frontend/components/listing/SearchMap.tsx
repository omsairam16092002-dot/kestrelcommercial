"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { fullAddress, type Property } from "@kestrel/shared";
import { listingImageSrc, listingPlaceholderSrc } from "@/lib/images";
import { MapTileLayer } from "@/components/listing/MapTileLayer";
import {
  leafletMapOptions,
  mapIsLaidOut,
  safeFitBounds,
  safeFlyTo,
  safeSetView,
  usableLatLng,
} from "@/lib/leafletMap";
import "leaflet/dist/leaflet.css";

const MELBOURNE_WEST: [number, number] = [-37.82, 144.76];

function pinIcon(side: "sale" | "lease", selected: boolean, index: number) {
  const bg = side === "sale" ? "#5C1F27" : "#D9A26B";
  const color = side === "sale" ? "#F6F1EC" : "#2A1418";
  const size = selected ? 38 : 30;
  return L.divIcon({
    className: "kc-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
    html: `<div class="kc-pin-inner ${selected ? "is-selected" : ""}" style="--pin:${bg};--ink:${color};width:${size}px;height:${size}px">${String(index).padStart(2, "0")}</div>`,
  });
}

function whenMapHasSize(map: L.Map, run: () => void) {
  let done = false;
  const tick = () => {
    map.invalidateSize();
    if (done || !mapIsLaidOut(map)) return;
    done = true;
    run();
  };
  tick();
  map.on("resize", tick);
  const frame = requestAnimationFrame(tick);
  const timer = window.setTimeout(tick, 200);
  const el = map.getContainer();
  const ro = new ResizeObserver(tick);
  ro.observe(el.parentElement ?? el);
  return () => {
    map.off("resize", tick);
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    ro.disconnect();
  };
}

function FitToResults({ properties }: { properties: Property[] }) {
  const map = useMap();
  const key = properties.map((p) => p.slug).join(",");

  useEffect(() => {
    return whenMapHasSize(map, () => {
      const pts = properties.map((p) => usableLatLng(p)).filter((pair): pair is [number, number] => Boolean(pair));
      if (!pts.length) {
        safeSetView(map, MELBOURNE_WEST, 11);
        return;
      }
      if (pts.length === 1) {
        safeSetView(map, pts[0], 14);
        return;
      }
      safeFitBounds(map, pts);
    });
  }, [map, key, properties]);

  return null;
}

function FlyToSelected({ property }: { property?: Property }) {
  const map = useMap();
  const prevSlug = useRef<string | undefined>(undefined);

  useEffect(() => {
    const pair = usableLatLng(property ?? null);
    const slug = property?.slug;
    if (!pair || !slug) return;

    const moved = prevSlug.current !== undefined && prevSlug.current !== slug;
    prevSlug.current = slug;
    if (!moved) return;

    return whenMapHasSize(map, () => {
      const zoom = map.getZoom();
      const nextZoom = Number.isFinite(zoom) ? Math.max(zoom, 14) : 14;
      safeFlyTo(map, pair, nextZoom);
    });
  }, [map, property]);

  return null;
}

function SelectableMarker({
  property,
  index,
  selected,
  onSelect,
}: {
  property: Property;
  index: number;
  selected: boolean;
  onSelect: (slug: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const hero = property.images.find((i) => i.isHero) ?? property.images[0];
  const src = hero ? listingImageSrc(hero.publicId, 640, "card") : listingPlaceholderSrc(property, 640);
  const pair = usableLatLng(property);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (selected) marker.openPopup();
    const el = marker.getElement();
    if (el) {
      el.setAttribute("aria-label", `${property.address}, ${property.suburb}`);
      el.setAttribute("title", property.address);
    }
  }, [selected, property.address, property.suburb]);

  if (!pair) return null;

  return (
    <Marker
      ref={markerRef}
      position={pair}
      icon={pinIcon(property.transactionSide, selected, index)}
      title={property.address}
      alt={property.address}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(property.slug) }}
    >
      <Popup className="kc-map-popup" closeButton={false}>
        <a href={`/listing/${property.slug}`} className="kc-map-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={property.address} />
          <div>
            <p className="kc-map-kicker">{property.priceLabel}</p>
            <p className="kc-map-title">{property.address}</p>
            <p className="kc-map-meta">
              {property.suburb} · {fullAddress(property).split(", ").slice(-1)}
            </p>
            <span className="kc-map-cta">View listing →</span>
          </div>
        </a>
      </Popup>
    </Marker>
  );
}

export function SearchMap({
  properties,
  selectedSlug,
  hoveredSlug,
  onSelect,
}: {
  properties: Property[];
  selectedSlug: string | null;
  hoveredSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const mapped = useMemo(() => properties.filter((p) => Boolean(usableLatLng(p))), [properties]);
  const selected = mapped.find((p) => p.slug === selectedSlug) ?? mapped.find((p) => p.slug === hoveredSlug);
  const activeSlug = selectedSlug ?? hoveredSlug;

  return (
    <MapContainer
      center={MELBOURNE_WEST}
      zoom={11}
      minZoom={leafletMapOptions.minZoom}
      className="kc-search-map h-full min-h-[420px] w-full"
      scrollWheelZoom
    >
      <MapTileLayer />
      <FitToResults properties={mapped} />
      <FlyToSelected property={selected} />
      {mapped.map((property, i) => (
        <SelectableMarker
          key={property.slug}
          property={property}
          index={i + 1}
          selected={property.slug === activeSlug}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  );
}
