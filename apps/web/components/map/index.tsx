// apps/web/components/map/index.tsx
"use client";

import dynamic from 'next/dynamic';
import type { LatLngExpression } from 'leaflet';

// Dynamically import all map components with no SSR
// Dynamically import map components with no SSR
export const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

export const TileLayer = dynamic(
  () => import('./tile-layer').then(mod => mod.TileLayer),
  { ssr: false }
);

export const Marker = dynamic(
  () => import('./marker').then(mod => mod.Marker),
  { ssr: false }
);

export const Popup = dynamic(
  () => import('./popup').then(mod => mod.Popup),
  { ssr: false }
);

export const LocateControl = dynamic(
  () => import('./locate-control').then(mod => mod.LocateControl),
  { ssr: false }
);

function MapLoading() {
  return (
    <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}

export type { LatLngExpression };