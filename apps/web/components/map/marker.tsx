// apps/web/components/map/marker.tsx
"use client";

import { useEffect, useRef } from 'react';
import type { LatLngExpression } from 'leaflet';

interface MarkerProps {
  position: LatLngExpression;
  draggable?: boolean;
  eventHandlers?: Record<string, (e: any) => void>;
  children?: React.ReactNode;
}

export function Marker({ position, draggable, eventHandlers, children }: MarkerProps) {
  const markerRef = useRef<any>(null);
  const isAddedRef = useRef(false);

  useEffect(() => {
    const addMarker = async () => {
      const map = (window as any).__leafletMap;
      if (!map || isAddedRef.current) return;

      try {
        const L = await import('leaflet');
        
        // Create marker
        const marker = L.marker(position as L.LatLngExpression, { draggable });
        
        // Add popup if children exist
        if (children) {
          // Create a temporary div for React content
          const popupContent = document.createElement('div');
          marker.bindPopup(popupContent);
        }
        
        marker.addTo(map);
        markerRef.current = marker;
        isAddedRef.current = true;

        // Add event handlers
        if (eventHandlers) {
          Object.entries(eventHandlers).forEach(([event, handler]) => {
            marker.on(event, handler);
          });
        }

      } catch (error) {
        console.error('Error adding marker:', error);
      }
    };

    addMarker();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
        isAddedRef.current = false;
      }
    };
  }, [position, draggable, eventHandlers, children]);

  // Update marker position
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return null;
}