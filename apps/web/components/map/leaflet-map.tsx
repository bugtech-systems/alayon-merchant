// apps/web/components/ui/leaflet-map.tsx
"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMapType } from "leaflet";

interface LeafletMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number } | null;
}

export default function LeafletMap({ onLocationSelect, initialPosition }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMapType | null>(null);
  const markerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current || !mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix Leaflet icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create map
      const map = L.map(mapRef.current!).setView(
        initialPosition ? [initialPosition.lat, initialPosition.lng] : [11.2433, 125.0047],
        15
      );

      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
      }).addTo(map);

      // Add marker if initial position exists
      if (initialPosition) {
        markerRef.current = L.marker([initialPosition.lat, initialPosition.lng])
          .addTo(map)
          .bindPopup('Your delivery location')
          .openPopup();
      }

      // Handle map clicks
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker
        if (markerRef.current) {
          markerRef.current.remove();
        }
        
        // Add new marker
        markerRef.current = L.marker([lat, lng])
          .addTo(map)
          .bindPopup('Selected location')
          .openPopup();
        
        onLocationSelect(lat, lng);
      });

      leafletMapRef.current = map;
      isInitializedRef.current = true;
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [initialPosition, onLocationSelect]);

  // Update marker when initialPosition changes
  useEffect(() => {
    if (leafletMapRef.current && initialPosition && !markerRef.current) {
      const L = require('leaflet');
      markerRef.current = L.marker([initialPosition.lat, initialPosition.lng])
        .addTo(leafletMapRef.current)
        .bindPopup('Your delivery location')
        .openPopup();
      leafletMapRef.current.setView([initialPosition.lat, initialPosition.lng], 15);
    }
  }, [initialPosition]);

  return <div ref={mapRef} className="h-[400px] w-full rounded-lg overflow-hidden border-2" />;
}