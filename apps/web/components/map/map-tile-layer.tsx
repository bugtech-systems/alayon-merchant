// apps/web/components/ui/map/map-tile-layer.tsx
"use client";

import { useEffect, useRef } from "react";

export function MapTileLayer() {
  const isAddedRef = useRef(false);

  useEffect(() => {
    const addTileLayer = async () => {
      if (isAddedRef.current) return;
      
      const map = (window as any).__leafletMap;
      if (!map) {
        console.warn("Map not initialized yet");
        return;
      }

      try {
        const L = await import('leaflet');
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
          minZoom: 3
        }).addTo(map);
        
        isAddedRef.current = true;
      } catch (error) {
        console.error("Error adding tile layer:", error);
      }
    };

    addTileLayer();
  }, []);

  return null;
}