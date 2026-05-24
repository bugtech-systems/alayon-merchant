// components/location/LocationDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from '@/lib/context/LocationContext';
import { Municipality, Barangay } from '@/types';
import { MapPin, Store, Truck, Loader2 } from 'lucide-react';
import { n8nFetcher } from '@/hooks/useN8nQuery';
import { SearchableSelect } from '@/components/ui/searchable-select';

const DEFAULT_REGION = "08";
const DEFAULT_PROVINCE = "0837";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationDialog: React.FC<LocationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { setUserLocation } = useLocation();
  
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>('');
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [error, setError] = useState('');

  // Load municipalities on component mount
  useEffect(() => {
    loadMunicipalities();
  }, []);

  // Reset barangay selection when municipality changes
  useEffect(() => {
    if (selectedMunicipalityId) {
      loadBarangays(selectedMunicipalityId);
    } else {
      setBarangays([]);
      setSelectedBarangayId('');
    }
  }, [selectedMunicipalityId]);

  const loadMunicipalities = async () => {
    setLoadingMunicipalities(true);
    setError('');
    try {
      const data = await n8nFetcher({
        endpoint: `/webhook/get-citymun?regCode=${DEFAULT_REGION}&provCode=${DEFAULT_PROVINCE}`, 
        method: "GET"
      });
      
      // Transform data based on your API response structure
      const formattedMunicipalities = data.map((item: any) => ({
        id: item.citymun_code || item.id || item.code,
        name: item.citymun_desc || item.name || item.description,
        code: item.citymun_code || item.code,
      }));
      
      setMunicipalities(formattedMunicipalities);
    } catch (err) {
      setError('Failed to load municipalities');
      console.error(err);
    } finally {
      setLoadingMunicipalities(false);
    }
  };

  const loadBarangays = async (municipalityId: string) => {
    setLoadingBarangays(true);
    setError('');
    setSelectedBarangayId('');
    
    try {
      const data = await n8nFetcher({
        endpoint: `/webhook/get-barangays?regCode=${DEFAULT_REGION}&provCode=${DEFAULT_PROVINCE}&citymun_code=${municipalityId}`,
        method: "GET"
      });
      
      console.log(data,' barrrs')
      const formattedBarangays = data.map((item: any) => ({
        id: item.psgc_code || item.id || item.code,
        name: item.barangay_desc || item.name || item.description,
        code: item.psgc_code || item.code,
      }));
      
      setBarangays(formattedBarangays);
    } catch (err) {
      setError('Failed to load barangays');
      console.error(err);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleMunicipalityChange = (municipalityId: string) => {
    setSelectedMunicipalityId(municipalityId);
  };

  const handleSubmit = () => {
    const selectedMunicipality = municipalities.find(m => m.id === selectedMunicipalityId);
    const selectedBarangay = barangays.find(b => b.id === selectedBarangayId);
    
    if (selectedMunicipality && selectedBarangay) {
      setUserLocation({
        municipality: selectedMunicipality.name,
        municipalityId: selectedMunicipality.id,
        barangay: selectedBarangay.name,
        barangayId: selectedBarangay.id,
      });
      onOpenChange(false);
    }
  };

  const isValid = selectedMunicipalityId && selectedBarangayId;

  // Get selected items for display
  const getSelectedMunicipalityName = () => {
    const municipality = municipalities.find(m => m.id === selectedMunicipalityId);
    return municipality?.name || '';
  };

  const getSelectedBarangayName = () => {
    const barangay = barangays.find(b => b.id === selectedBarangayId);
    return barangay?.name || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Select Your Location</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Choose your municipality and barangay to see available products and delivery options in your area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Retail Prices</span>
                </div>
                <p className="text-sm font-semibold mt-1">Local Rates</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Delivery</span>
                </div>
                <p className="text-sm font-semibold mt-1">Available in your area</p>
              </CardContent>
            </Card>
          </div>

          {/* Municipality Searchable Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Municipality / City</label>
            <SearchableSelect
              options={municipalities}
              value={selectedMunicipalityId}
              onValueChange={handleMunicipalityChange}
              placeholder="Search for municipality..."
              searchPlaceholder="Search municipality name..."
              emptyMessage="No municipality found."
              disabled={loadingMunicipalities}
              loading={loadingMunicipalities}
            />
          </div>

          {/* Barangay Searchable Select - Only shows when municipality is selected */}
          {selectedMunicipalityId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Barangay</label>
              <SearchableSelect
                options={barangays}
                value={selectedBarangayId}
                onValueChange={setSelectedBarangayId}
                placeholder="Search for barangay..."
                searchPlaceholder="Search barangay name..."
                emptyMessage={loadingBarangays ? "Loading barangays..." : "No barangay found for this municipality."}
                disabled={loadingBarangays || barangays.length === 0}
                loading={loadingBarangays}
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* Selected Location Preview */}
          {selectedMunicipalityId && selectedBarangayId && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-primary/70 mb-1">Selected Location</p>
              <p className="text-sm font-medium">
                {getSelectedBarangayName()}, {getSelectedMunicipalityName()}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Later
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!isValid || loadingBarangays}
            >
              {loadingBarangays ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Confirm Location'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            We'll use this to show you accurate pricing and delivery options
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};