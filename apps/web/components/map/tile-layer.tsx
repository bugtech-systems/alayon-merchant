// apps/web/components/map/tile-layer.tsx
"use client";

import { useEffect } from 'react';

export function TileLayer() {
  useEffect(() => {
    const addTileLayer = async () => {
      const map = (window as any).__leafletMap;
      if (!map) return;

      const L = await import('leaflet');
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
      }).addTo(map);
    };

    addTileLayer();
  }, []);

  return null;
}