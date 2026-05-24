// apps/web/components/map/locate-control.tsx
"use client";

import { useEffect, useRef } from 'react';

interface LocateControlProps {
  onLocate?: (location: { lat: number; lng: number }) => void;
  options?: Record<string, any>;
}

export function LocateControl({ onLocate, options = {} }: LocateControlProps) {
  const controlRef = useRef<any>(null);
  const isAddedRef = useRef(false);

  useEffect(() => {
    const addCustomLocateControl = async () => {
      const map = (window as any).__leafletMap;
      if (!map || isAddedRef.current) return;

      const L = await import('leaflet');

      // Custom locate control
      const CustomLocateControl = L.Control.extend({
        options: {
          position: 'bottomright',
          ...options
        },

        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
          container.style.backgroundColor = 'white';
          container.style.width = '34px';
          container.style.height = '34px';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.justifyContent = 'center';
          container.style.cursor = 'pointer';
          container.style.borderRadius = '4px';
          container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.65)';
          container.style.transition = 'background-color 0.2s';
          container.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/>
            </svg>
          `;
          container.title = 'Find my location';
          
          container.onclick = () => {
            if (!navigator.geolocation) {
              alert('Geolocation is not supported by your browser');
              return;
            }
            
            container.style.backgroundColor = '#e5e7eb';
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
                
                // Add temporary marker
                const marker = L.marker([latitude, longitude], {
                  icon: L.divIcon({
                    className: 'custom-locate-marker',
                    html: `<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  })
                }).addTo(map);
                
                setTimeout(() => marker.remove(), 3000);
                
                if (onLocate) {
                  onLocate({ lat: latitude, lng: longitude });
                }
                
                container.style.backgroundColor = 'white';
              },
              (error) => {
                console.error('Error getting location:', error);
                let errorMessage = 'Unable to get your location. ';
                switch(error.code) {
                  case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                  case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                  case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                }
                alert(errorMessage);
                container.style.backgroundColor = 'white';
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          };
          
          return container;
        }
      });
      
      const control = new CustomLocateControl();
      control.addTo(map);
      controlRef.current = control;
      isAddedRef.current = true;
    };

    addCustomLocateControl();

    return () => {
      if (controlRef.current && (window as any).__leafletMap) {
        controlRef.current.remove();
        controlRef.current = null;
        isAddedRef.current = false;
      }
    };
  }, [onLocate, options]);

  return null;
}