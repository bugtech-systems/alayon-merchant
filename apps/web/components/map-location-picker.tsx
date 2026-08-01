"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle2, 
  MapPin, 
  Crosshair, 
  AlertCircle, 
  Loader2,
  Search,
  Navigation,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import Leaflet
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapLocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address?: string };
  barangayName?: string;
  cityName?: string;
  disabled?: boolean;
  placeholder?: string;
}

const DEFAULT_CENTER: [number, number] = [11.2299, 125.0022];
const DEFAULT_ZOOM = 15;

const geocodeCache = new Map<string, string>();

// ==================== GROUND-PINNED MARKER ====================

const createGroundPinIcon = () => {
  const primaryColor = "#ef4444";
  const size = 32;
  
  return L.divIcon({
    className: 'ground-pin-marker',
    html: `
      <div class="pin-container" style="width: ${size}px; height: ${size + 8}px;">
        <style>
          @keyframes pinLanding {
            0% {
              transform: translateY(-60px) scale(0.8);
              opacity: 0;
            }
            40% {
              transform: translateY(8px) scale(1.05);
            }
            70% {
              transform: translateY(-2px) scale(0.98);
            }
            100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
          
          .pin-container {
            position: relative;
            cursor: pointer;
          }
          .pin-container.landing {
            animation: pinLanding 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
          }
          .pin-svg {
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
            transition: transform 0.15s ease;
          }
          .pin-container:hover .pin-svg {
            transform: scale(1.08);
          }
          .pin-shadow {
            transition: transform 0.15s ease;
          }
          .pin-container:hover .pin-shadow {
            transform: scale(1.05);
          }
        </style>
        
        <ellipse cx="16" cy="${size - 4}" rx="8" ry="3" fill="rgba(0,0,0,0.25)" class="pin-shadow"/>
        
        <svg 
          width="${size}" 
          height="${size}" 
          viewBox="0 0 24 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          class="pin-svg"
          style="position: absolute; top: 0; left: 0;"
        >
          <defs>
            <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:1" />
            </linearGradient>
            <filter id="pinShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          
          <path 
            d="M12 2C7.5 2 4 5.5 4 10C4 14.5 12 28 12 28C12 28 20 14.5 20 10C20 5.5 16.5 2 12 2Z" 
            fill="url(#pinGradient)"
            stroke="white"
            stroke-width="2"
            filter="url(#pinShadow)"
          />
          
          <circle cx="12" cy="10" r="4" fill="white" opacity="0.95"/>
          <circle cx="12" cy="10" r="2" fill="${primaryColor}"/>
          <circle cx="12" cy="27" r="1.5" fill="${primaryColor}" opacity="0.8"/>
        </svg>
      </div>
    `,
    iconSize: [size, size + 8],
    popupAnchor: [0, -size / 2],
    tooltipAnchor: [0, -size / 2],
  });
};

const groundPinIcon = createGroundPinIcon();

// ==================== PERSISTENT MARKER ====================

function PersistentMarker({ 
  position, 
  onDragEnd,
  hasAnimated,
  onAnimationComplete
}: { 
  position: [number, number] | null; 
  onDragEnd: (lat: number, lng: number) => void;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const hasAnimatedRef = useRef(hasAnimated);
  
  useEffect(() => {
    if (!map) return;
    
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    
    if (position) {
      const marker = L.marker(position, { 
        draggable: true,
        icon: groundPinIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      
      markerRef.current = marker;
      
      if (!hasAnimatedRef.current) {
        setTimeout(() => {
          const element = marker.getElement();
          if (element) {
            const container = element.querySelector('.pin-container');
            if (container) {
              container.classList.add('landing');
              setTimeout(() => {
                container.classList.remove('landing');
                onAnimationComplete();
              }, 500);
            }
          }
        }, 50);
        hasAnimatedRef.current = true;
      }
      
      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        onDragEnd(latLng.lat, latLng.lng);
      });
    }
    
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, position, onDragEnd, onAnimationComplete]);
  
  return null;
}

// ==================== MAP CLICK HANDLER ====================

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ==================== MAP INNER COMPONENT ====================

function MapInner({ 
  onMapClick, 
  onMarkerDragEnd,
  selectedPosition,
  disabled,
  hasAnimated,
  onAnimationComplete
}: { 
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (lat: number, lng: number) => void;
  selectedPosition: { lat: number; lng: number } | null;
  disabled: boolean;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
}) {
  return (
    <>
      <MapClickHandler onClick={onMapClick} />
      <PersistentMarker 
        position={selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : null}
        onDragEnd={onMarkerDragEnd}
        hasAnimated={hasAnimated}
        onAnimationComplete={onAnimationComplete}
      />
    </>
  );
}

// ==================== MAIN COMPONENT ====================

export function MapLocationPicker({ 
  onLocationSelect, 
  initialLocation,
  barangayName,
  cityName = "Tacloban City",
  disabled = false,
  placeholder = "Search for a location..."
}: MapLocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [address, setAddress] = useState<string>(initialLocation?.address || "");
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLocation 
      ? [initialLocation.lat, initialLocation.lng]
      : DEFAULT_CENTER
  );
  const [mapKey, setMapKey] = useState(Date.now());
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMap, setShowMap] = useState(!!initialLocation); // Only show map if initial location exists

  // Reverse geocode address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat},${lng}`;
    
    if (geocodeCache.has(cacheKey)) {
      const cachedAddress = geocodeCache.get(cacheKey)!;
      setAddress(cachedAddress);
      setGeocodeError(null);
      return cachedAddress;
    }
    
    setIsGeocoding(true);
    setGeocodeError(null);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AlayonStore/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      let formattedAddress = "";
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (barangayName) parts.push(barangayName);
        if (cityName) parts.push(cityName);
        if (data.address.postcode) parts.push(data.address.postcode);
        
        formattedAddress = parts.length > 0 ? parts.join(", ") : data.display_name;
      } else {
        formattedAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      
      geocodeCache.set(cacheKey, formattedAddress);
      setAddress(formattedAddress);
      
      return formattedAddress;
    } catch (error) {
      console.error("Error getting address:", error);
      const fallbackAddress = `${barangayName || cityName}, ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      setGeocodeError("Address lookup failed");
      return fallbackAddress;
    } finally {
      setIsGeocoding(false);
    }
  }, [barangayName, cityName]);

  // Handle map click to place marker
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (disabled) return;
    
    setShowSuccess(false);
    setSelectedPosition({ lat, lng });
    setMapCenter([lat, lng]);
    
    const fullAddress = await reverseGeocode(lat, lng);
    onLocationSelect({ lat, lng, address: fullAddress });
  }, [reverseGeocode, onLocationSelect, disabled]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    if (disabled) return;
    
    setSelectedPosition({ lat, lng });
    setMapCenter([lat, lng]);
    
    const fullAddress = await reverseGeocode(lat, lng);
    onLocationSelect({ lat, lng, address: fullAddress });
  }, [reverseGeocode, onLocationSelect, disabled]);

  // Handle current location via button click - THIS TRIGGERS MAP DISPLAY
  const handleGetCurrentLocation = useCallback(() => {
    if (disabled || isLocating) return;
    
    setIsLocating(true);
    setGeocodeError(null);
    setShowMap(true); // Show map when location is requested
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setSelectedPosition({ lat: latitude, lng: longitude });
        setShowSuccess(false);
        
        const fullAddress = await reverseGeocode(latitude, longitude);
        onLocationSelect({ lat: latitude, lng: longitude, address: fullAddress });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Unable to get your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Please try again.";
        }
        alert(errorMessage);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [disabled, isLocating, reverseGeocode, onLocationSelect]);

  // Handle animation complete
  const handleAnimationComplete = useCallback(() => {
    setHasAnimated(true);
    setShowSuccess(true);
  }, []);

  // Force remount map on disabled change
  useEffect(() => {
    setMapKey(Date.now());
  }, [disabled]);

  // Set initial location
  useEffect(() => {
    if (initialLocation && !selectedPosition && !disabled) {
      setMapCenter([initialLocation.lat, initialLocation.lng]);
      setSelectedPosition({ lat: initialLocation.lat, lng: initialLocation.lng });
      setShowMap(true);
      if (initialLocation.address) {
        setAddress(initialLocation.address);
      } else {
        reverseGeocode(initialLocation.lat, initialLocation.lng);
      }
    }
  }, [initialLocation, selectedPosition, reverseGeocode, disabled]);

  return (
    <div className="space-y-3">
      {/* Location Button - Always visible */}
  

      {/* Map Container - Only shown after "Use my current location" is clicked OR if initial location exists */}
      {showMap && (
        <>
          <div className={cn(
            "relative h-[400px] w-full rounded-lg overflow-hidden border-2 transition-all shadow-md",
            disabled && "opacity-60 cursor-not-allowed",
            selectedPosition ? "border-green-500 border-2" : "border-gray-200"
          )}>
            <MapContainer
              key={mapKey}
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapInner 
                onMapClick={handleMapClick}
                onMarkerDragEnd={handleMarkerDragEnd}
                selectedPosition={selectedPosition}
                disabled={disabled}
                hasAnimated={hasAnimated}
                onAnimationComplete={handleAnimationComplete}
              />
            </MapContainer>

            {/* Loading Overlay */}
            {(isLocating || isGeocoding) && (
              <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-lg flex items-center gap-2 z-[1000]">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isLocating ? "Getting your location..." : "Getting address..."}
              </div>
            )}

            {/* Success Indicator */}
            {showSuccess && selectedPosition && !isLocating && !isGeocoding && !geocodeError && (
              <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-lg flex items-center gap-2 z-[1000] animate-in fade-in slide-in-from-top duration-300">
                <CheckCircle2 className="h-3 w-3" />
                Location pinned
              </div>
            )}

            {/* Map Instructions */}
            {!selectedPosition && !disabled && !isLocating && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 z-[1000] whitespace-nowrap">
                <MapPin className="h-3 w-3" />
                Click on map to adjust pin location
              </div>
            )}
          </div>

         
         
        </>
      )}

      {/* Initial Prompt - Show when map is hidden and no location selected */}
      {!showMap && !selectedPosition && !disabled && !isLocating && (
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <MapPin className="h-10 w-10 text-blue-500 mx-auto mb-3" />
          <p className="text-blue-800 font-medium mb-1">Set your delivery location</p>
          <p className="text-sm text-blue-600">
            Click "Use my current location" above to pin your delivery address on the map
          </p>
        </div>
      )}

      {/* Error State */}
      {geocodeError && !showMap && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{geocodeError}. Please try again.</span>
        </div>
      )}
    </div>
  );
}