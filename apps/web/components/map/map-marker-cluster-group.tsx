// apps/web/components/ui/map/map-marker-cluster-group.tsx
"use client";

import { useEffect, useRef, ReactNode } from "react";
import type { LatLngExpression } from "leaflet";

interface MapMarkerClusterGroupProps {
  children?: ReactNode;
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  spiderfyOnMaxZoom?: boolean;
  removeOutsideVisibleBounds?: boolean;
  animate?: boolean;
  maxClusterRadius?: number;
  disableClusteringAtZoom?: number;
  iconCreateFunction?: (cluster: any) => any;
  icon?: (markerCount: number) => ReactNode;
  onClusterClick?: (cluster: any) => void;
  className?: string;
}

export function MapMarkerClusterGroup({
  children,
  showCoverageOnHover = false,
  zoomToBoundsOnClick = true,
  spiderfyOnMaxZoom = true,
  removeOutsideVisibleBounds = true,
  animate = true,
  maxClusterRadius = 80,
  disableClusteringAtZoom = 18,
  iconCreateFunction,
  icon,
  onClusterClick,
  className,
}: MapMarkerClusterGroupProps) {
  const clusterGroupRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const initClusterGroup = async () => {
      const L = await import('leaflet');
      await import('leaflet.markercluster');
      await import('leaflet.markercluster/dist/MarkerCluster.css');
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
      
      const map = (window as any).__leafletMap;
      if (!map) return;

      // Create cluster group with options
      const clusterGroup = L.markerClusterGroup({
        showCoverageOnHover,
        zoomToBoundsOnClick,
        spiderfyOnMaxZoom,
        removeOutsideVisibleBounds,
        animate,
        maxClusterRadius,
        disableClusteringAtZoom,
        iconCreateFunction: iconCreateFunction || ((cluster: any) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="custom-cluster-marker" style="
              background-color: #3b82f6;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              border: 2px solid white;
            ">${count}</div>`,
            className: 'marker-cluster-custom',
            iconSize: L.point(40, 40),
          });
        }),
      });

      // Add cluster click handler
      if (onClusterClick) {
        clusterGroup.on('clusterclick', (cluster: any) => {
          onClusterClick(cluster);
        });
      }

      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;
    };

    initClusterGroup();

    return () => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.remove();
        clusterGroupRef.current = null;
      }
    };
  }, [showCoverageOnHover, zoomToBoundsOnClick, spiderfyOnMaxZoom, removeOutsideVisibleBounds, animate, maxClusterRadius, disableClusteringAtZoom, iconCreateFunction, onClusterClick]);

  // Add markers to cluster group
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    const addMarkers = async () => {
      const L = await import('leaflet');
      const map = (window as any).__leafletMap;
      
      if (!map || !clusterGroupRef.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => {
        clusterGroupRef.current.removeLayer(marker);
      });
      markersRef.current = [];

      // Get all marker elements from children
      const markerElements = document.querySelectorAll('[data-marker-id]');
      
      markerElements.forEach((element) => {
        const lat = parseFloat(element.getAttribute('data-marker-lat') || '0');
        const lng = parseFloat(element.getAttribute('data-marker-lng') || '0');
        const markerId = element.getAttribute('data-marker-id');
        
        if (lat && lng) {
          const marker = L.marker([lat, lng]);
          
          // Add popup content if available
          const popupContent = element.innerHTML;
          if (popupContent) {
            marker.bindPopup(popupContent);
          }
          
          clusterGroupRef.current.addLayer(marker);
          markersRef.current.push(marker);
        }
      });
    };

    addMarkers();
  }, [children]);

  return (
    <div className={className} style={{ display: 'none' }}>
      {children}
    </div>
  );
}