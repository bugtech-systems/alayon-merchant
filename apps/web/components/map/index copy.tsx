// apps/web/components/ui/map/index.tsx
"use client";

import dynamic from 'next/dynamic';

// Dynamically import all map components with no SSR
export const Map = dynamic(
  () => import('./map').then(mod => mod.Map),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" /> }
) as any;

export const MapMarker = dynamic(
  () => import('./map-marker').then(mod => mod.MapMarker),
  { ssr: false }
) as any;

export const MapTileLayer = dynamic(
  () => import('./map-tile-layer').then(mod => mod.MapTileLayer),
  { ssr: false }
) as any;

export const MapLocateControl = dynamic(
  () => import('./map-locate-control').then(mod => mod.MapLocateControl),
  { ssr: false }
) as any;

export const MapMarkerClusterGroup = dynamic(
  () => import('./map-marker-cluster-group').then(mod => mod.MapMarkerClusterGroup),
  { ssr: false }
) as any;

export type { LatLngExpression } from 'leaflet';