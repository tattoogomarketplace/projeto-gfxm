'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import type { MapArtistPin } from '@/lib/map-pins';
import 'leaflet/dist/leaflet.css';

type MapCanvasProps = {
  origin: { latitude: number; longitude: number };
  artists: MapArtistPin[];
  selectedId: string | null;
  onSelect: (artist: MapArtistPin) => void;
};

const CARTO_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function pinHtml(active: boolean, initial: string) {
  const size = active ? 44 : 36;
  const glow = active ? '0 0 18px rgba(217,70,14,0.55)' : '0 0 10px rgba(217,70,14,0.28)';
  return `<span style="display:flex;height:${size}px;width:${size}px;align-items:center;justify-content:center;border-radius:9999px;border:1.5px solid rgba(249,115,22,0.7);background:rgba(217,70,14,0.92);color:#fff;font-size:13px;font-weight:700;letter-spacing:0.02em;box-shadow:${glow}">${initial}</span>`;
}

function pinIcon(active: boolean, initial: string) {
  const size = active ? 44 : 36;
  return L.divIcon({
    className: 'tg-map-pin',
    html: pinHtml(active, initial),
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function MapInvalidate() {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [map]);
  return null;
}

export default function MapComponent({
  origin,
  artists,
  selectedId,
  onSelect,
}: MapCanvasProps) {
  const icons = useMemo(() => {
    const next = new Map<string, L.DivIcon>();
    artists.forEach((artist) => {
      next.set(artist.id, pinIcon(artist.id === selectedId, artist.initial || 'A'));
    });
    return next;
  }, [artists, selectedId]);

  return (
    <MapContainer
      center={[origin.latitude, origin.longitude]}
      zoom={13}
      zoomControl={false}
      attributionControl
      className="relative z-0 h-[100dvh] w-full bg-zinc-950"
      style={{ background: '#0a0a0a' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url={CARTO_DARK}
      />
      <MapInvalidate />
      {artists.map((artist) => (
        <Marker
          key={artist.id}
          position={[artist.latitude, artist.longitude]}
          icon={icons.get(artist.id)}
          eventHandlers={{
            click: () => onSelect(artist),
          }}
        />
      ))}
    </MapContainer>
  );
}
