// apps/web/components/ui/map/map.tsx
"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import { cn } from "@/lib/utils";

interface MapProps {
  center: LatLngExpression;
  zoom: number;
  className?: string;
  onClick?: (lat: number, lng: number) => void;
  onMove?: (center: LatLngExpression, zoom: number) => void;
  children?: React.ReactNode;
}

export function Map({ center, zoom, className, onClick, onMove, children }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization
    if (isInitializedRef.current || leafletMapRef.current) return;
    
    const initMap = async () => {
      // Check if container exists and map is not already initialized
      if (!mapRef.current || leafletMapRef.current) return;
      
      // Check if container already has a leaflet map instance
      if ((mapRef.current as any)._leaflet_id) {
        console.warn("Map container already has a leaflet instance");
        return;
      }

      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix Leaflet icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map instance
        const map = L.map(mapRef.current, {
          center: center as L.LatLngExpression,
          zoom: zoom,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          touchZoom: true,
          dragging: true,
        });
        
        // Store map instance globally and in ref
        (window as any).__leafletMap = map;
        leafletMapRef.current = map;
        isInitializedRef.current = true;
        
        // Add event handlers
        if (onClick) {
          map.on('click', (e: any) => {
            onClick(e.latlng.lat, e.latlng.lng);
          });
        }
        
        if (onMove) {
          map.on('moveend', () => {
            const newCenter = map.getCenter();
            const newZoom = map.getZoom();
            onMove([newCenter.lat, newCenter.lng], newZoom);
          });
        }

        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
        
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    
    return () => {
      clearTimeout(timer);
      // Only clean up if we have a map instance
      if (leafletMapRef.current && isInitializedRef.current) {
        try {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
          isInitializedRef.current = false;
          if ((window as any).__leafletMap) {
            (window as any).__leafletMap = null;
          }
        } catch (error) {
          console.error("Error cleaning up map:", error);
        }
      }
    };
  }, []); // Empty dependency array - only run once

  // Update view when center/zoom changes
  useEffect(() => {
    if (leafletMapRef.current && isInitializedRef.current) {
      try {
        leafletMapRef.current.setView(center as L.LatLngExpression, zoom);
      } catch (error) {
        console.error("Error updating map view:", error);
      }
    }
  }, [center, zoom]);

  return (
    <div ref={mapRef} className={cn("relative", className)}>
      {children}
    </div>
  );
}