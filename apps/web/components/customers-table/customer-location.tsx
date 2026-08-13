'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit,
  LocateFixed,
  Search,
  X,
} from 'lucide-react';
import { listBarangays, listMunicipalities } from '@/lib/actions/regions';
import { updateCustomerLocation } from '@/lib/actions/customer';

// --- Types ---
interface Municipality {
  id: string;
  citymun_desc: string;
  citymun_code: string;
}

interface Barangay {
  id: string;
  barangay_desc: string;
}

interface CustomerLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    metadata?: {
      municipality?: string;
      barangay?: string;
      address?: string;
      lat?: number;
      lng?: number;
      mapAddress?: string;
    };
  } | any;
  onSuccess?: () => void;
  viewOnly?: boolean;
}

// --- Helpers ---
const getFullName = (customer: CustomerLocationModalProps['customer']) =>
  `${customer?.first_name} ${customer?.last_name}`.trim();

const DEFAULT_COORDS = { lat: 14.5995, lng: 120.9842 }; // Manila

// Check if customer has a complete location
const hasCompleteLocation = (meta: CustomerLocationModalProps['customer']['metadata']) =>
  !!(meta?.municipality && meta?.barangay && meta?.lat != null && meta?.lng != null);

// ===========================================================================
// MAP LOCATION PICKER COMPONENT (UPDATED)
// ===========================================================================
interface MapLocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
  barangayName?: string;
  cityName?: string;
  placeholder?: string;
  viewOnly?: boolean;
  defaultMapType?: 'roadmap' | 'satellite';
}

// Simple map component using iframe (free, no API key needed)
function MapLocationPicker({
  onLocationSelect,
  initialLocation,
  barangayName,
  cityName,
  placeholder = 'Click on map to select location',
  viewOnly = false,
  defaultMapType = 'satellite',
}: MapLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>(defaultMapType);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Update location when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
      setAddress('');
    }
  }, [initialLocation]);

  // Handle map click (only in edit mode)
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewOnly) return; // Prevent marker changes in view-only mode
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Simulate getting coordinates from click position
    // In a real implementation, you'd use the map's API to get actual coordinates
    const lat = initialLocation?.lat || DEFAULT_COORDS.lat;
    const lng = initialLocation?.lng || DEFAULT_COORDS.lng;
    
    // Simulate slight variation for demo
    const newLat = lat + (y / rect.height - 0.5) * 0.05;
    const newLng = lng + (x / rect.width - 0.5) * 0.05;
    
    setLocation({ lat: newLat, lng: newLng });
    setAddress(`Selected location at ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    onLocationSelect({ lat: newLat, lng: newLng, address: `Selected location` });
  };

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewOnly) return;
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Use Nominatim API (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const displayName = result.display_name;
        
        setLocation({ lat, lng });
        setAddress(displayName);
        onLocationSelect({ lat, lng, address: displayName });
        setSearchQuery('');
      } else {
        setError('Location not found. Please try a different search.');
      }
    } catch (err) {
      setError('Failed to search location. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Generate map URL
  const getMapUrl = useCallback(() => {
    const lat = location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat;
    const lng = location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng;
    
    // Use OpenStreetMap with different tile layers
    const baseUrl = 'https://www.openstreetmap.org';
    
    if (mapType === 'satellite') {
      // Use satellite imagery from ESRI (free)
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
    } else {
      // Standard OpenStreetMap
      return `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;
    }
  }, [location, initialLocation, mapType]);

  // Generate static map preview URL (using OpenStreetMap static images, free)
  const getStaticMapUrl = useCallback(() => {
    const lat = location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat;
    const lng = location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng;
    const zoom = 15;
    const width = 600;
    const height = 400;
    
    // Use OpenStreetMap static map service (free, no API key)
    return `https://tile.openstreetmap.org/${zoom}/${Math.floor((lng + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.png`;
  }, [location, initialLocation]);

  // Get Google Maps URL for external link
  const getGoogleMapsUrl = useCallback(() => {
    const lat = location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat;
    const lng = location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [location, initialLocation]);

  return (
    <div className="space-y-3">
      {/* Search Bar - Only show in edit mode */}
      {!viewOnly && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              className="pl-9"
              disabled={isSearching}
            />
          </div>
          <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>
      )}

      {/* Map Type Toggle - Only show in edit mode */}
      {!viewOnly && (
        <div className="flex gap-2 justify-end">
          <Button
            variant={mapType === 'roadmap' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('roadmap')}
          >
            Roadmap
          </Button>
          <Button
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('satellite')}
          >
            Satellite
          </Button>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={`relative aspect-video bg-muted rounded-lg overflow-hidden border ${
          !viewOnly ? 'cursor-crosshair hover:ring-2 hover:ring-primary/50' : ''
        }`}
        onClick={handleMapClick}
      >
        {/* Map Display - Using iframe with OpenStreetMap */}
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${(location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng) - 0.01},${(location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat) - 0.01},${(location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng) + 0.01},${(location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat) + 0.01}&layer=${mapType === 'satellite' ? 'mapnik' : 'mapnik'}&marker=${location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat},${location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Location Info Display */}
        {(location || initialLocation) && (
          <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm p-2 rounded-md text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                📍 {address || `${(location?.lat || initialLocation?.lat || DEFAULT_COORDS.lat).toFixed(6)}, ${(location?.lng || initialLocation?.lng || DEFAULT_COORDS.lng).toFixed(6)}`}
              </span>
              {!viewOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (location) {
                      window.open(getGoogleMapsUrl(), '_blank');
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in Maps
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Placeholder when no location */}
        {!location && !initialLocation && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted/50">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{placeholder}</p>
              {barangayName && cityName && (
                <p className="text-xs mt-1">
                  Searching in: {barangayName}, {cityName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Marker Pin (visual indicator) */}
        {(location || initialLocation) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <MapPin className={`h-8 w-8 ${viewOnly ? 'text-red-500' : 'text-red-500 animate-bounce'}`} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="text-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function CustomerLocationModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
  viewOnly = false,
}: CustomerLocationModalProps) {
  const initialMeta = customer?.metadata || {};
  const hasExisting = hasCompleteLocation(initialMeta);

  // --- UI state ---
  const [editMode, setEditMode] = useState(!hasExisting && !viewOnly);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // --- Form state ---
  const [form, setForm] = useState({
    address: initialMeta.address || '',
    municipality: initialMeta.municipality || '',
    barangay: initialMeta.barangay || '',
    lat: initialMeta.lat ?? null,
    lng: initialMeta.lng ?? null,
    mapAddress: initialMeta.mapAddress || '',
  });

  // --- Municipality / Barangay data ---
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // --- Refs to prevent infinite loops ---
  const isInitialMount = useRef(true);
  const previousCustomerId = useRef(customer?.id);
  const previousIsOpen = useRef(isOpen);

  // --- Derived selections ---
  const selectedMunicipality = useMemo(
    () => municipalities.find((m) => m.citymun_desc === form.municipality) || null,
    [municipalities, form.municipality]
  );
  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.barangay_desc === form.barangay) || null,
    [barangays, form.barangay]
  );

  const customerId = customer?.id;

  // --- Determine if in view-only mode ---
  const isViewOnly = viewOnly || (!editMode && hasExisting);

  // --- Reset form function ---
  const resetForm = useCallback(() => {
    const meta = customer?.metadata || {};
    setForm({
      address: meta.address || '',
      municipality: meta.municipality || '',
      barangay: meta.barangay || '',
      lat: meta.lat ?? null,
      lng: meta.lng ?? null,
      mapAddress: meta.mapAddress || '',
    });
    setError('');
    setSuccess(false);
    setSaving(false);
    const hasExisting = !!(meta?.municipality && meta?.barangay && meta?.lat != null && meta?.lng != null);
    setEditMode(!hasExisting && !viewOnly);
  }, [customer?.metadata, viewOnly]);

  // --- Reset form when modal opens or customer changes ---
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const customerChanged = previousCustomerId.current !== customerId;
    const dialogOpened = !previousIsOpen.current && isOpen;

    if (isOpen && (customerChanged || dialogOpened)) {
      resetForm();
    }

    previousCustomerId.current = customerId;
    previousIsOpen.current = isOpen;
  }, [isOpen, customerId, resetForm]);

  // --- Load municipalities only when modal opens ---
  useEffect(() => {
    if (isOpen && municipalities.length === 0) {
      const load = async () => {
        setLoadingMunicipalities(true);
        try {
          const response = await listMunicipalities();
          const data = Array.isArray(response) ? response : response?.data || [];
          setMunicipalities(data);
        } catch {
          setError('Failed to load municipalities.');
        } finally {
          setLoadingMunicipalities(false);
        }
      };
      load();
    }
  }, [isOpen, municipalities.length]);

  // --- Load barangays when municipality changes ---
  useEffect(() => {
    if (!selectedMunicipality) {
      setBarangays([]);
      return;
    }
    
    let isMounted = true;
    const load = async () => {
      setLoadingBarangays(true);
      try {
        const response = await listBarangays(selectedMunicipality.citymun_code);
        if (isMounted) {
          const data = Array.isArray(response) ? response : response?.data || [];
          setBarangays(data);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load barangays.');
        }
      } finally {
        if (isMounted) {
          setLoadingBarangays(false);
        }
      }
    };
    load();

    return () => {
      isMounted = false;
    };
  }, [selectedMunicipality]);

  // --- Handlers ---
  const handleMunicipalityChange = (id: string) => {
    if (isViewOnly) return;
    const found = municipalities.find((m) => m.id === id);
    if (found) {
      setForm((prev) => ({
        ...prev,
        municipality: found.citymun_desc,
        barangay: '',
      }));
    }
  };

  const handleBarangayChange = (id: string) => {
    if (isViewOnly) return;
    const found = barangays.find((b) => b.id === id);
    if (found) {
      setForm((prev) => ({ ...prev, barangay: found.barangay_desc }));
    }
  };

  const handleMapLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    if (isViewOnly) return;
    setForm((prev) => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      mapAddress: location.address,
    }));
    if (error) setError('');
  };

  const handleUseCurrentLocation = () => {
    if (isViewOnly) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          mapAddress: 'Current location (from browser)',
        }));
        setError('');
      },
      (err) => {
        setError(`Unable to retrieve location: ${err.message}`);
      }
    );
  };

  const handleSave = async () => {
    if (isViewOnly) return;
    
    if (!selectedMunicipality) {
      setError('Please select a municipality.');
      return;
    }
    if (!selectedBarangay) {
      setError('Please select a barangay.');
      return;
    }
    if (form.lat === null || form.lng === null) {
      setError('Please pin the exact location on the map or use "Use my location".');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateCustomerLocation(customer.id, {
        municipality: form.municipality,
        barangay: form.barangay,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        mapAddress: form.mapAddress,
      });

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setError('Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEditMode(false);
    resetForm();
    onClose();
  };

  // --- Determine display coordinates ---
  const displayLat = form.lat ?? DEFAULT_COORDS.lat;
  const displayLng = form.lng ?? DEFAULT_COORDS.lng;
  const displayAddress = form.mapAddress || form.address || '';

  // --- Render content ---
  const renderContent = () => {
    if (success) {
      return (
        <div className="py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold">Location updated successfully!</p>
        </div>
      );
    }

    // --- View Mode ---
    if (isViewOnly) {
      return (
        <>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="size-4 text-primary" />
            <span className="font-medium">{form.municipality}</span>
            <span className="text-muted-foreground">· {form.barangay}</span>
          </div>

          {/* View-only map with satellite view */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
            <MapLocationPicker
              onLocationSelect={() => {}} // no-op in view-only
              initialLocation={
                form.lat !== null && form.lng !== null
                  ? { lat: form.lat, lng: form.lng }
                  : undefined
              }
              placeholder="No location pinned"
              viewOnly={true}
              defaultMapType="satellite"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-mono">{displayLat.toFixed(6)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-mono">{displayLng.toFixed(6)}</p>
            </div>
          </div>
          {displayAddress && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Address:</span> {displayAddress}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {!viewOnly && (
              <Button onClick={() => setEditMode(true)}>
                <Edit className="size-4 mr-2" />
                Edit Location
              </Button>
            )}
          </DialogFooter>
        </>
      );
    }

    // --- Edit Mode ---
    return (
      <>
        {/* Address */}
        <div>
          <Label className="text-sm font-medium">
            Street / Building / Unit (optional)
          </Label>
          <Input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="e.g. 123 Main St, Block 4, Lot 2"
            className="mt-1"
          />
        </div>

        <Separator />

        {/* Municipality */}
        <div>
          <Label className="text-sm font-medium">
            Municipality / City <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            options={municipalities.map((m) => ({ id: m.id, name: m.citymun_desc }))}
            value={selectedMunicipality?.id || ''}
            onValueChange={handleMunicipalityChange}
            placeholder="Search municipality..."
            searchPlaceholder="Type municipality name..."
            emptyMessage="No municipality found."
            disabled={loadingMunicipalities}
            loading={loadingMunicipalities}
          />
        </div>

        {/* Barangay */}
        {selectedMunicipality && (
          <div>
            <Label className="text-sm font-medium">
              Barangay <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              options={barangays.map((b) => ({ id: b.id, name: b.barangay_desc }))}
              value={selectedBarangay?.id || ''}
              onValueChange={handleBarangayChange}
              placeholder="Search barangay..."
              searchPlaceholder="Type barangay name..."
              emptyMessage={loadingBarangays ? 'Loading...' : 'No barangay found.'}
              disabled={loadingBarangays || barangays.length === 0}
              loading={loadingBarangays}
            />
          </div>
        )}

        {/* Map Pinning - Editable */}
        <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span className="text-sm font-medium">
                Pin exact location <span className="text-red-500">*</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={saving}
            >
              <LocateFixed className="size-3 mr-1" />
              Use my location
            </Button>
          </div>

          <MapLocationPicker
            onLocationSelect={handleMapLocationSelect}
            initialLocation={
              form.lat !== null && form.lng !== null
                ? { lat: form.lat, lng: form.lng }
                : undefined
            }
            barangayName={selectedBarangay?.barangay_desc}
            cityName={selectedMunicipality?.citymun_desc}
            placeholder="Search address or click on map..."
            viewOnly={false}
            defaultMapType="roadmap"
          />

          {form.lat !== null && form.lng !== null && form.mapAddress && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                📍 {form.mapAddress}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Lat: {form.lat.toFixed(6)}, Lng: {form.lng.toFixed(6)}
              </p>
            </div>
          )}
          {(!form.lat || !form.lng) && (
            <p className="mt-3 text-xs text-muted-foreground">
              Click on the map, search, or use "Use my location" to set coordinates.
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setEditMode(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || form.lat === null || form.lng === null}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="size-4 mr-2" />
                Save Location
              </>
            )}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Location</DialogTitle>
          <DialogDescription>
            {isViewOnly
              ? `Location of ${getFullName(customer)}`
              : editMode || !hasExisting
              ? `Set location for ${getFullName(customer)}`
              : `Location of ${getFullName(customer)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}