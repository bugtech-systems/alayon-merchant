// apps/web/components/map/map-container.tsx
"use client";

import { useEffect, useRef, ReactNode } from 'react';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet';

interface MapContainerProps {
  center: LatLngExpression;
  zoom: number;
  className?: string;
  onClick?: (lat: number, lng: number) => void;
  children?: ReactNode;
}

export function MapContainer({ center, zoom, className, onClick, children }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapRef.current || leafletMapRef.current) return;

      try {
        // Import Leaflet dynamically
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix Leaflet's default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map instance
        const map = L.map(mapRef.current).setView(center as L.LatLngExpression, zoom);
        
        // Store map instance globally for other components
        (window as any).__leafletMap = map;
        leafletMapRef.current = map;

        // Add click handler
        if (onClick) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            onClick(e.latlng.lat, e.latlng.lng);
          });
        }

        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        (window as any).__leafletMap = null;
      }
    };
  }, []); // Only run once

  // Update map view when center/zoom changes
  useEffect(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView(center as L.LatLngExpression, zoom);
    }
  }, [center, zoom]);

  return (
    <div ref={mapRef} className={className} style={{ minHeight: '400px', width: '100%' }} />
  );
}