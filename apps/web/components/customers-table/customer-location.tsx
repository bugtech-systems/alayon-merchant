'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { listBarangays, listMunicipalities } from '@/lib/actions/regions';
import {  updateCustomerLocation } from '@/lib/actions/customer';
import { MapLocationPicker } from '@/components/map-location-picker';

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
  };
  onSuccess?: () => void;
}

// --- Helpers ---
const getFullName = (customer: CustomerLocationModalProps['customer']) =>
  `${customer.first_name} ${customer.last_name}`.trim();

const DEFAULT_COORDS = { lat: 14.5995, lng: 120.9842 }; // Manila

// Check if customer has a complete location (muni, barangay, and coords)
const hasCompleteLocation = (meta: CustomerLocationModalProps['customer']['metadata']) =>
  !!(meta?.municipality && meta?.barangay && meta?.lat != null && meta?.lng != null);

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function CustomerLocationModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: CustomerLocationModalProps) {
  const initialMeta = customer.metadata || {};
  const hasExisting = hasCompleteLocation(initialMeta);

  // --- UI state ---
  const [editMode, setEditMode] = useState(!hasExisting); // auto‑edit if incomplete
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

  // --- Derived selections ---
  const selectedMunicipality = useMemo(
    () => municipalities.find((m) => m.citymun_desc === form.municipality) || null,
    [municipalities, form.municipality]
  );
  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.barangay_desc === form.barangay) || null,
    [barangays, form.barangay]
  );


  console.log(customer, 'CUTOMSS')
  // --- Load municipalities on open ---
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  // --- Load barangays when municipality changes ---
  useEffect(() => {
    if (!selectedMunicipality) {
      setBarangays([]);
      return;
    }
    const load = async () => {
      setLoadingBarangays(true);
      try {
        const response = await listBarangays(selectedMunicipality.citymun_code);
        const data = Array.isArray(response) ? response : response?.data || [];
        setBarangays(data);
      } catch {
        setError('Failed to load barangays.');
      } finally {
        setLoadingBarangays(false);
      }
    };
    load();
  }, [selectedMunicipality]);

  // --- Reset form when dialog closes ---
  const resetForm = useCallback(() => {
    setForm({
      address: initialMeta.address || '',
      municipality: initialMeta.municipality || '',
      barangay: initialMeta.barangay || '',
      lat: initialMeta.lat ?? null,
      lng: initialMeta.lng ?? null,
      mapAddress: initialMeta.mapAddress || '',
    });
    setError('');
    setSuccess(false);
    setSaving(false);
    setEditMode(!hasExisting); // reset to auto‑edit if incomplete
  }, [initialMeta, hasExisting]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // --- Handlers ---
  const handleMunicipalityChange = (id: string) => {
    const found = municipalities.find((m) => m.id === id);
    if (found) {
      setForm((prev) => ({
        ...prev,
        municipality: found.citymun_desc,
        barangay: '', // reset barangay
      }));
    }
  };

  const handleBarangayChange = (id: string) => {
    const found = barangays.find((b) => b.id === id);
    if (found) {
      setForm((prev) => ({ ...prev, barangay: found.barangay_desc }));
    }
  };

  const handleMapLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setForm((prev) => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      mapAddress: location.address,
    }));
    if (error) setError('');
  };

  // --- Use current location (browser geolocation) ---
  const handleUseCurrentLocation = () => {
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



  let response =  await updateCustomerLocation(customer.id, {
        municipality: form.municipality,
        barangay: form.barangay,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        mapAddress: form.mapAddress,

      });



      console.log(response, 'RESPPP')

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

    // --- View Mode (only shown if location exists and not editing) ---
    if (!editMode && hasExisting) {
      return (
        <>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="size-4 text-primary" />
            <span className="font-medium">{form.municipality}</span>
            <span className="text-muted-foreground">· {form.barangay}</span>
          </div>

          {/* Read‑only map with marker */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
            <MapLocationPicker
              onLocationSelect={() => {}} // no‑op in view mode
              initialLocation={
                form.lat !== null && form.lng !== null
                  ? { lat: form.lat, lng: form.lng }
                  : undefined
              }
              placeholder="No location pinned"
            />
            <div className="absolute bottom-2 right-2 z-10">
              <Button
                variant="secondary"
                size="sm"
                className="shadow-md"
                asChild
              >
                <a
                  href={`https://www.google.com/maps?q=${displayLat},${displayLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3 mr-1" />
                  Open in Maps
                </a>
              </Button>
            </div>
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
            <Button onClick={() => setEditMode(true)}>
              <Edit className="size-4 mr-2" />
              Edit Location
            </Button>
          </DialogFooter>
        </>
      );
    }

    // --- Edit Mode (always shown if no location or user clicked Edit) ---
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

        {/* Map Pinning */}
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
            {editMode || !hasExisting
              ? `Set location for ${getFullName(customer)}`
              : `Location of ${getFullName(customer)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}