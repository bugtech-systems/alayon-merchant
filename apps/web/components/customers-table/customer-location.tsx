// components/CustomerLocationModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
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
  X,
} from 'lucide-react';
import { listBarangays, listMunicipalities } from '@/lib/actions/regions';
import { updateCustomerLocation } from '@/lib/actions/customer'; // your update action
import { MapLocationPicker } from '@/components/map-location-picker';
import { cn } from '@/lib/utils';

// --- Types ------------------------------------------------------------------
interface Municipality {
  id: string;
  psgc_code: string;
  name: string;
  citymun_desc: string;
  reg_desc: string;
  prov_code: string;
  citymun_code: string;
}

interface Barangay {
  id: string;
  psgc_code: string;
  name: string;
  barangay_desc: string;
  reg_desc: string;
  prov_code: string;
  citymun_code: string;
}

interface ActionModalProps {
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
      city?: string; // legacy fallback
    };
  };
  onSuccess?: () => void;
}

// --- Helper to get full name -----------------------------------------------
const getFullName = (customer: ActionModalProps['customer']) =>
  `${customer.first_name} ${customer.last_name}`;

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function CustomerLocationModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: ActionModalProps) {
  // --- Derive initial values from customer metadata ------------------------
  const initialMunicipality = customer.metadata?.municipality || '';
  const initialBarangay = customer.metadata?.barangay || '';
  const initialAddress = customer.metadata?.address || '';
  const initialLat = customer.metadata?.lat;
  const initialLng = customer.metadata?.lng;
  const initialHasCoords = initialLat != null && initialLng != null;

  // --- State ---------------------------------------------------------------
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [address, setAddress] = useState(initialAddress);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialHasCoords ? { lat: initialLat!, lng: initialLng! } : null,
  );
  const [mapAddress, setMapAddress] = useState('');

  // Municipality / Barangay
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(
    null,
  );
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null);

  // UI states
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // --- Load municipalities on mount (and when dialog opens) ----------------
  const loadMunicipalities = useCallback(async () => {
    setLoadingMunicipalities(true);
    try {
      const response = await listMunicipalities();
      let data: Municipality[] = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data) data = response.data as Municipality[];
      setMunicipalities(data);
    } catch {
      setError('Failed to load municipalities.');
    } finally {
      setLoadingMunicipalities(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadMunicipalities();
  }, [isOpen, loadMunicipalities]);

  // --- Pre‑select initial municipality if available ------------------------
  useEffect(() => {
    if (municipalities.length > 0 && initialMunicipality && !selectedMunicipality) {
      const match = municipalities.find(
        (m) => m.citymun_desc === initialMunicipality,
      );
      if (match) setSelectedMunicipality(match);
    }
  }, [municipalities, initialMunicipality, selectedMunicipality]);

  // --- Load barangays when municipality changes ----------------------------
  const loadBarangays = useCallback(async (citymunCode: string) => {
    setLoadingBarangays(true);
    setSelectedBarangay(null);
    try {
      const response = await listBarangays(citymunCode);
      let data: Barangay[] = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data) data = response.data as Barangay[];
      setBarangays(data);
    } catch {
      setError('Failed to load barangays.');
    } finally {
      setLoadingBarangays(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMunicipality) {
      loadBarangays(selectedMunicipality.citymun_code);
    } else {
      setBarangays([]);
      setSelectedBarangay(null);
    }
  }, [selectedMunicipality, loadBarangays]);

  // Pre‑select initial barangay once list is loaded
  useEffect(() => {
    if (barangays.length > 0 && initialBarangay && !selectedBarangay) {
      const match = barangays.find((b) => b.barangay_desc === initialBarangay);
      if (match) setSelectedBarangay(match);
    }
  }, [barangays, initialBarangay, selectedBarangay]);

  // --- Map pin handler -----------------------------------------------------
  const handleMapLocationSelect = useCallback(
    (location: { lat: number; lng: number; address: string }) => {
      setCoordinates({ lat: location.lat, lng: location.lng });
      setMapAddress(location.address);
      if (error) setError('');
    },
    [error],
  );

  // --- Reset to initial state when dialog closes ---------------------------
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset everything on close
      setEditMode(false);
      setSaving(false);
      setAddress(initialAddress);
      setCoordinates(initialHasCoords ? { lat: initialLat!, lng: initialLng! } : null);
      setMapAddress('');
      setError('');
      setSuccess(false);
      setSelectedMunicipality(null);
      setSelectedBarangay(null);
      onClose();
    }
  };

  // --- Save handler --------------------------------------------------------
  const handleSave = async () => {
    if (!selectedMunicipality || !selectedBarangay) {
      setError('Please select municipality and barangay.');
      return;
    }
    if (!coordinates) {
      setError('Please pin the exact location on the map.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateCustomerLocation(customer.id, {
        municipality: selectedMunicipality.citymun_desc,
        barangay: selectedBarangay.barangay_desc,
        address,
        lat: coordinates.lat,
        lng: coordinates.lng,
        mapAddress,
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (err) {
      setError('Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render --------------------------------------------------------------
  const displayCity = customer.metadata?.city || 'Manila, Philippines';
  const displayLat = customer.metadata?.lat ?? 14.5995;
  const displayLng = customer.metadata?.lng ?? 120.9842;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Location</DialogTitle>
          <DialogDescription>
            {editMode
              ? 'Edit location details for ' + getFullName(customer)
              : 'Location of ' + getFullName(customer)}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold">Location updated successfully!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ---- View Mode ---- */}
            {!editMode ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <MapPin className="size-4 text-primary" />
                  <span className="font-medium">{displayCity}</span>
                </div>

                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <MapPin className="size-12 mb-2 text-primary/50" />
                    <p className="font-medium">Map View</p>
                    <p className="text-sm">
                      Lat: {displayLat}, Lng: {displayLng}
                    </p>
                    <Button variant="outline" className="mt-4" size="sm" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${displayLat},${displayLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-4 mr-2" />
                        Open in Google Maps
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Latitude</p>
                      <p className="font-mono">{displayLat}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Longitude</p>
                      <p className="font-mono">{displayLng}</p>
                    </CardContent>
                  </Card>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button onClick={() => setEditMode(true)}>
                    <Edit className="size-4 mr-2" />
                    Edit Location
                  </Button>
                </DialogFooter>
              </>
            ) : (
              /* ---- Edit Mode ---- */
              <>
                {/* Address */}
                <div>
                  <Label className="text-sm font-medium">
                    Street / Building / Unit (optional)
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    options={municipalities.map((m) => ({
                      id: m.id,
                      name: m.citymun_desc,
                    }))}
                    value={selectedMunicipality?.id || ''}
                    onValueChange={(id) => {
                      const found = municipalities.find((m) => m.id === id);
                      setSelectedMunicipality(found || null);
                    }}
                    placeholder="Search municipality..."
                    searchPlaceholder="Type municipality name..."
                    emptyMessage="No municipality found."
                    disabled={loadingMunicipalities}
                    loading={loadingMunicipalities}
                    className="mt-1"
                  />
                </div>

                {/* Barangay */}
                {selectedMunicipality && (
                  <div>
                    <Label className="text-sm font-medium">
                      Barangay <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                      options={barangays.map((b) => ({
                        id: b.id,
                        name: b.barangay_desc,
                      }))}
                      value={selectedBarangay?.id || ''}
                      onValueChange={(id) => {
                        const found = barangays.find((b) => b.id === id);
                        setSelectedBarangay(found || null);
                      }}
                      placeholder="Search barangay..."
                      searchPlaceholder="Type barangay name..."
                      emptyMessage={
                        loadingBarangays
                          ? 'Loading...'
                          : 'No barangay found for this municipality.'
                      }
                      disabled={loadingBarangays || barangays.length === 0}
                      loading={loadingBarangays}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Map Pinning */}
                <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="size-4 text-primary" />
                    <span className="text-sm font-medium">
                      Pin exact location <span className="text-red-500">*</span>
                    </span>
                    <span className="ml-auto text-xs text-red-500 font-medium">
                      Required
                    </span>
                  </div>

                  <MapLocationPicker
                    onLocationSelect={handleMapLocationSelect}
                    initialLocation={coordinates || undefined}
                    barangayName={selectedBarangay?.barangay_desc}
                    cityName={selectedMunicipality?.citymun_desc}
                    placeholder="Search address or click on map..."
                  />

                  {/* Pinned location preview */}
                  {coordinates && mapAddress ? (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">
                        📍 {mapAddress}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Lat: {coordinates.lat.toFixed(6)}, Lng:{' '}
                        {coordinates.lng.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Click on the map or search to pin the location.
                    </p>
                  )}
                </div>

                {/* Error message */}
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
                      setError('');
                      // Reset form to current metadata
                      setAddress(initialAddress);
                      setCoordinates(initialHasCoords ? { lat: initialLat!, lng: initialLng! } : null);
                      setMapAddress('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
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
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}