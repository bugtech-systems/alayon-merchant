// apps/web/components/ui/map/map-marker.tsx
"use client";

import { useEffect, useRef, ReactNode } from "react";
import { renderToString } from "react-dom/server";
import type { LatLngExpression } from "leaflet";

interface MapMarkerProps {
  position: LatLngExpression;
  draggable?: boolean;
  eventHandlers?: Record<string, any>;
  children?: ReactNode;
  id?: string;
}

export function MapMarker({ position, draggable, eventHandlers, children, id }: MapMarkerProps) {
  const markerRef = useRef<any>(null);
  const markerId = id || `marker-${Date.now()}-${Math.random()}`;
  const isAddedRef = useRef(false);

  useEffect(() => {
    const addMarker = async () => {
      // Prevent duplicate markers
      if (isAddedRef.current || markerRef.current) return;
      
      const map = (window as any).__leafletMap;
      if (!map) {
        console.warn("Map not initialized yet");
        return;
      }

      try {
        const L = await import('leaflet');

        // Fix Leaflet icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create custom popup content
        const popupContent = children ? renderToString(<div className="marker-popup-content">{children}</div>) : undefined;

        const marker = L.marker(position as L.LatLngExpression, { draggable })
          .addTo(map)
          .bindPopup(popupContent || "");

        if (eventHandlers) {
          Object.entries(eventHandlers).forEach(([event, handler]) => {
            marker.on(event, handler);
          });
        }

        markerRef.current = marker;
        isAddedRef.current = true;
        
        // Store marker reference
        if (!(window as any).__leafletMarkers) {
          (window as any).__leafletMarkers = {};
        }
        (window as any).__leafletMarkers[markerId] = marker;
        
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    };

    addMarker();

    return () => {
      if (markerRef.current && (window as any).__leafletMap) {
        try {
          markerRef.current.remove();
          markerRef.current = null;
          isAddedRef.current = false;
          delete (window as any).__leafletMarkers?.[markerId];
        } catch (error) {
          console.error("Error removing marker:", error);
        }
      }
    };
  }, [position, draggable, eventHandlers, markerId]); // Remove children from dependencies to avoid re-renders

  // Hidden div to store marker data
  return (
    <div 
      data-marker-id={markerId}
      data-marker-lat={Array.isArray(position) ? position[0] : position.lat}
      data-marker-lng={Array.isArray(position) ? position[1] : position.lng}
      style={{ display: 'none' }}
    >
      {children}
    </div>
  );
}