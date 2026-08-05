"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Target,
  ZoomIn,
  ZoomOut,
  Satellite,
  Map as MapIcon,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import Leaflet
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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

const createGroundPinIcon = (isDragging: boolean = false) => {
  const primaryColor = "#ef4444";
  const size = 36;
  
  return L.divIcon({
    className: 'ground-pin-marker',
    html: `
      <div class="pin-container" style="width: ${size}px; height: ${size + 8}px;">
        <style>
          @keyframes pinLanding {
            0% { transform: translateY(-60px) scale(0.8); opacity: 0; }
            40% { transform: translateY(8px) scale(1.1); }
            70% { transform: translateY(-2px) scale(0.95); }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes pinPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); }
          }
          .pin-container {
            position: relative;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          .pin-container.landing {
            animation: pinLanding 0.6s cubic-bezier(0.34, 1.2, 0.64, 1);
          }
          .pin-container.dragging {
            animation: pinPulse 0.5s ease infinite;
          }
          .pin-container:hover {
            transform: scale(1.08);
          }
          .pin-svg {
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
            transition: transform 0.15s ease;
          }
          .pin-shadow {
            transition: transform 0.15s ease;
          }
          .pin-container:hover .pin-shadow {
            transform: scale(1.05);
          }
          .pulse-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size + 20}px;
            height: ${size + 20}px;
            border-radius: 50%;
            border: 2px solid ${primaryColor};
            opacity: 0;
            pointer-events: none;
          }
          .pulse-ring.active {
            animation: pulseRing 1.5s ease-out infinite;
          }
          @keyframes pulseRing {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
          }
        </style>
        
        <div class="pulse-ring ${isDragging ? 'active' : ''}"></div>
        
        <ellipse cx="${size/2}" cy="${size - 4}" rx="10" ry="3" fill="rgba(0,0,0,0.25)" class="pin-shadow"/>
        
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
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
            </filter>
          </defs>
          
          <path 
            d="M12 2C7.5 2 4 5.5 4 10C4 14.5 12 28 12 28C12 28 20 14.5 20 10C20 5.5 16.5 2 12 2Z" 
            fill="url(#pinGradient)"
            stroke="white"
            stroke-width="2.5"
            filter="url(#pinShadow)"
          />
          
          <circle cx="12" cy="10" r="4.5" fill="white" opacity="0.95"/>
          <circle cx="12" cy="10" r="2.5" fill="${primaryColor}"/>
        </svg>
      </div>
    `,
    iconSize: [size, size + 8],
    popupAnchor: [0, -size / 2],
    tooltipAnchor: [0, -size / 2],
  });
};

// ==================== SEARCH CONTROL - FIXED WITH useMap INSIDE MAP CONTAINER ====================

function SearchControl({ onSearchResult }: { onSearchResult: (lat: number, lng: number, address: string) => void }) {
  const map = useMap(); // Now this is safe because SearchControl is rendered inside MapContainer
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=PH&accept-language=en`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AlayonStore/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  }, [searchLocation]);

  const handleSelectSuggestion = useCallback((item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name;
    
    setSearchQuery(address);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Fly to location with animation
    map.flyTo([lat, lng], 17, {
      duration: 1.5,
      easeLinearity: 0.25
    });
    
    onSearchResult(lat, lng, address);
  }, [map, onSearchResult]);

  return (
    <div className="absolute top-3 left-3 z-[1000] w-72">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-9 h-10 bg-white shadow-lg border-2 hover:border-primary/50 focus:border-primary transition-colors"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto z-[1001]">
            {suggestions.map((item, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-start gap-2 border-b last:border-0"
                onClick={() => handleSelectSuggestion(item)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LOCATION CONTROLS - FIXED ====================

function LocationControls({ 
  onLocate, 
  isLocating,
  onZoomIn,
  onZoomOut,
  onToggleSatellite,
  isSatellite
}: { 
  onLocate: () => void;
  isLocating: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSatellite: () => void;
  isSatellite: boolean;
}) {
  const map = useMap(); // Safe because LocationControls is rendered inside MapContainer

  const handleZoomIn = () => {
    map.zoomIn();
    onZoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
    onZoomOut();
  };

  return (
    <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 bg-white rounded-lg shadow-lg border p-1">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <div className="h-px bg-border" />
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
      </div>

      {/* Satellite Toggle */}
      <button
        onClick={onToggleSatellite}
        className={cn(
          "p-2 bg-white rounded-lg shadow-lg border hover:bg-muted transition-colors",
          isSatellite && "bg-primary/10 text-primary border-primary/30"
        )}
        title={isSatellite ? "Switch to map view" : "Switch to satellite view"}
      >
        {isSatellite ? (
          <MapIcon className="h-5 w-5" />
        ) : (
          <Satellite className="h-5 w-5" />
        )}
      </button>

      {/* Locate Button */}
      <button
        onClick={onLocate}
        disabled={isLocating}
        className={cn(
          "p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors",
          isLocating && "opacity-50 cursor-not-allowed"
        )}
        title="Use my current location"
      >
        {isLocating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Crosshair className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

// ==================== PERSISTENT MARKER ====================

function PersistentMarker({ 
  position, 
  onDragEnd,
  hasAnimated,
  onAnimationComplete,
  isDragging,
  setIsDragging
}: { 
  position: [number, number] | null; 
  onDragEnd: (lat: number, lng: number) => void;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}) {
  const map = useMap(); // Safe because PersistentMarker is rendered inside MapContainer
  const markerRef = useRef<L.Marker | null>(null);
  const hasAnimatedRef = useRef(hasAnimated);

  useEffect(() => {
    if (!map) return;
    
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    
    if (position) {
      const icon = createGroundPinIcon(isDragging);
      const marker = L.marker(position, { 
        draggable: true,
        icon: icon,
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
              }, 600);
            }
          }
        }, 100);
        hasAnimatedRef.current = true;
      }
      
      marker.on('dragstart', () => {
        setIsDragging(true);
      });
      
      marker.on('drag', () => {
        const element = marker.getElement();
        if (element) {
          const container = element.querySelector('.pin-container');
          if (container && !container.classList.contains('dragging')) {
            container.classList.add('dragging');
          }
        }
      });
      
      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        setIsDragging(false);
        
        const element = marker.getElement();
        if (element) {
          const container = element.querySelector('.pin-container');
          if (container) {
            container.classList.remove('dragging');
          }
        }
        
        onDragEnd(latLng.lat, latLng.lng);
      });
    }
    
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, position, onDragEnd, onAnimationComplete, setIsDragging, isDragging]);

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
  onAnimationComplete,
  isDragging,
  setIsDragging
}: { 
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (lat: number, lng: number) => void;
  selectedPosition: { lat: number; lng: number } | null;
  disabled: boolean;
  hasAnimated: boolean;
  onAnimationComplete: () => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}) {
  return (
    <>
      <MapClickHandler onClick={onMapClick} />
      <PersistentMarker 
        position={selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : null}
        onDragEnd={onMarkerDragEnd}
        hasAnimated={hasAnimated}
        onAnimationComplete={onAnimationComplete}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
      />
      <SearchControl onSearchResult={onMapClick} />
      <LocationControls 
        onLocate={() => {}} // This will be overridden by the parent
        isLocating={false}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onToggleSatellite={() => {}}
        isSatellite={false}
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
  const [showMap, setShowMap] = useState(!!initialLocation);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

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
        if (data.address.road || data.address.street) {
          parts.push(data.address.road || data.address.street);
        }
        if (data.address.suburb) parts.push(data.address.suburb);
        if (barangayName) parts.push(barangayName);
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        } else if (cityName) {
          parts.push(cityName);
        }
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

  // Handle current location
  const handleGetCurrentLocation = useCallback(() => {
    if (disabled || isLocating) return;
    
    setIsLocating(true);
    setGeocodeError(null);
    setShowMap(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setZoom(17);
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

  // Toggle satellite view
  const handleToggleSatellite = useCallback(() => {
    setIsSatellite(!isSatellite);
    setMapKey(Date.now());
  }, [isSatellite]);

  // Force remount map on disabled change
  useEffect(() => {
    setMapKey(Date.now());
  }, [disabled, isSatellite]);

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

  // Handle zoom changes
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 1, 20));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 1, 1));
  }, []);

  return (
    <div className="space-y-3">
      {/* Map Container */}
      {showMap && (
        <div className={cn(
          "relative h-[500px] w-full rounded-lg overflow-hidden border-2 transition-all shadow-lg",
          disabled && "opacity-60 cursor-not-allowed",
          selectedPosition ? "border-primary/50 border-2" : "border-gray-200",
          isDragging && "border-primary ring-2 ring-primary/20"
        )}>
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            minZoom={1}
            maxZoom={20}
            attributionControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={isSatellite 
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
              maxZoom={20}
            />
            
            <MapClickHandler onClick={handleMapClick} />
            <PersistentMarker 
              position={selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : null}
              onDragEnd={handleMarkerDragEnd}
              hasAnimated={hasAnimated}
              onAnimationComplete={handleAnimationComplete}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
            <SearchControl onSearchResult={handleMapClick} />
            <LocationControls 
              onLocate={handleGetCurrentLocation}
              isLocating={isLocating}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleSatellite={handleToggleSatellite}
              isSatellite={isSatellite}
            />
          </MapContainer>

          {/* Loading Overlay */}
          {(isLocating || isGeocoding) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2 z-[1000]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isLocating ? "Getting your location..." : "Getting address..."}
            </div>
          )}

          {/* Success Indicator */}
          {showSuccess && selectedPosition && !isLocating && !isGeocoding && !geocodeError && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2 z-[1000] animate-in fade-in slide-in-from-top duration-300">
              <CheckCircle2 className="h-3 w-3" />
              Location pinned
            </div>
          )}

          {/* Address Display */}
          {address && selectedPosition && !isDragging && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border z-[1000] max-w-[90%]">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="text-muted-foreground truncate">{address}</span>
              </div>
            </div>
          )}

          {/* Map Instructions */}
          {!selectedPosition && !disabled && !isLocating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 z-[1000] whitespace-nowrap backdrop-blur-sm">
              <MapPin className="h-3 w-3" />
              Click on map or search to set location
            </div>
          )}

          {/* Drag Indicator */}
          {isDragging && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] pointer-events-none">
              <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                Drop to set location
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial Prompt */}
      {!showMap && !selectedPosition && !disabled && !isLocating && (
        <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border-2 border-dashed border-blue-300 text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 animate-pulse bg-blue-400/20 rounded-full blur-xl" />
            <MapPin className="h-12 w-12 text-blue-500 relative z-10 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Set Your Delivery Location</h3>
          <p className="text-sm text-blue-700 max-w-md mx-auto mb-4">
            Click the <Crosshair className="h-4 w-4 inline text-blue-600" /> button above to use your current location, 
            or search for an address to pin it on the map.
          </p>
          <Button 
            onClick={handleGetCurrentLocation} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            disabled={isLocating}
          >
            {isLocating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                Use My Current Location
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error State */}
      {geocodeError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{geocodeError}. Please try again.</span>
          <button 
            onClick={() => selectedPosition && reverseGeocode(selectedPosition.lat, selectedPosition.lng)}
            className="ml-auto text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}