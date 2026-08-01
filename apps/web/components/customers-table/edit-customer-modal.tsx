// components/EditCustomerModal.tsx
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Trash2, Plus } from 'lucide-react';
import { listBarangays, listMunicipalities } from '@/lib/actions/regions';
import { updateCustomer } from '@/lib/actions';
import { cn } from '@/lib/utils';

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

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status?: string;
    metadata?: Record<string, any>;
  };
  onActionComplete?: () => void;
}

// Keys that have dedicated UI fields (they won't appear in the dynamic list)
const EXPLICIT_METADATA_KEYS = new Set([
  'municipality',
  'barangay',
  'role',
  'subscription',
]);

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onActionComplete,
}: EditCustomerModalProps) {
  const initialMeta = customer.metadata || {};

  // --- Explicit fields state ---
  const [formData, setFormData] = useState({
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    phone: customer.phone || '',
    status: customer.status || initialMeta.status || 'active',
    municipality: initialMeta.municipality || '',
    barangay: initialMeta.barangay || ''
  });

  // --- Dynamic metadata state (array of { key, value }) ---
  const [dynamicMetadata, setDynamicMetadata] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // --- UI state ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // --- Derived selections ---
  const selectedMunicipality = useMemo(
    () => municipalities.find((m) => m.citymun_desc === formData.municipality) || null,
    [municipalities, formData.municipality]
  );
  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.barangay_desc === formData.barangay) || null,
    [barangays, formData.barangay]
  );

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

  // --- Populate dynamic metadata from initialMeta, excluding explicit keys ---
  const populateDynamicMetadata = useCallback(() => {
    const extra: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(initialMeta)) {
      if (!EXPLICIT_METADATA_KEYS.has(key)) {
        // Convert value to string for input
        extra.push({ key, value: String(value ?? '') });
      }
    }
    setDynamicMetadata(extra);
  }, [initialMeta]);

  // Reset form when dialog opens/closes
  const resetForm = useCallback(() => {
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.phone || '',
      status: customer.status || initialMeta.status || 'active',
      municipality: initialMeta.municipality || '',
      barangay: initialMeta.barangay || ''
    });
    populateDynamicMetadata();
    setError('');
  }, [customer, initialMeta, populateDynamicMetadata]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // --- Handlers for explicit fields ---
  const handleMunicipalityChange = (id: string) => {
    const found = municipalities.find((m) => m.id === id);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        municipality: found.citymun_desc,
        barangay: '', // reset barangay
      }));
    }
  };

  const handleBarangayChange = (id: string) => {
    const found = barangays.find((b) => b.id === id);
    if (found) {
      setFormData((prev) => ({ ...prev, barangay: found.barangay_desc }));
    }
  };

  // --- Handlers for dynamic metadata ---
  const handleMetadataKeyChange = (index: number, newKey: string) => {
    const updated = [...dynamicMetadata];
    updated[index].key = newKey;
    setDynamicMetadata(updated);
  };

  const handleMetadataValueChange = (index: number, newValue: string) => {
    const updated = [...dynamicMetadata];
    updated[index].value = newValue;
    setDynamicMetadata(updated);
  };

  const handleAddMetadataField = () => {
    setDynamicMetadata((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveMetadataField = (index: number) => {
    setDynamicMetadata((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First and last name are required.');
      setLoading(false);
      return;
    }

    // Build metadata object: start with explicit fields (as they should be stored in metadata)
    const metadata: Record<string, any> = {
      status: formData.status,
      municipality: formData.municipality,
      barangay: formData.barangay,
      role: formData.role,
      subscription: formData.subscription,
    };

    // Add dynamic metadata (skip empty keys)
    for (const item of dynamicMetadata) {
      const key = item.key.trim();
      const value = item.value.trim();
      if (key) {
        // Attempt to preserve type (if value looks like a number or boolean)
        let parsedValue: any = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value)) && value !== '') parsedValue = Number(value);
        metadata[key] = parsedValue;
      }
    }

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        status: formData.status,
        metadata,
      };

      await updateCustomer(customer.id, payload);

      onActionComplete?.();
      onClose();
    } catch (err) {
      setError('Failed to update customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer details, including location and custom metadata.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <Separator />

          {/* Location fields */}
          <div className="space-y-2">
            <Label htmlFor="municipality">Municipality / City</Label>
            <SearchableSelect
              options={municipalities.map((m) => ({
                id: m.id,
                name: m.citymun_desc,
              }))}
              value={selectedMunicipality?.id || ''}
              onValueChange={handleMunicipalityChange}
              placeholder="Search municipality..."
              searchPlaceholder="Type municipality name..."
              emptyMessage="No municipality found."
              disabled={loadingMunicipalities}
              loading={loadingMunicipalities}
            />
          </div>

          {selectedMunicipality && (
            <div className="space-y-2">
              <Label htmlFor="barangay">Barangay</Label>
              <SearchableSelect
                options={barangays.map((b) => ({
                  id: b.id,
                  name: b.barangay_desc,
                }))}
                value={selectedBarangay?.id || ''}
                onValueChange={handleBarangayChange}
                placeholder="Search barangay..."
                searchPlaceholder="Type barangay name..."
                emptyMessage={
                  loadingBarangays ? 'Loading...' : 'No barangay found.'
                }
                disabled={loadingBarangays || barangays.length === 0}
                loading={loadingBarangays}
              />
            </div>
          )}

          <Separator />

          {/* Role, Status, Subscription */}
          {/* <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="customer">Customer</option>
                <option value="company">Company</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="at_risk">At Risk</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription">Subscription</Label>
              <select
                id="subscription"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.subscription}
                onChange={(e) =>
                  setFormData({ ...formData, subscription: e.target.value })
                }
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
                <option value="trial">Trial</option>
              </select>
            </div>
          </div> */}

          <Separator />

          {/* Dynamic Metadata */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Additional Metadata</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMetadataField}
                className="h-8 gap-1"
              >
                <Plus className="size-3.5" />
                Add Field
              </Button>
            </div>

            {dynamicMetadata.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No additional metadata fields.
              </p>
            ) : (
              <div className="space-y-2">
                {dynamicMetadata.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key"
                      value={item.key}
                      onChange={(e) =>
                        handleMetadataKeyChange(index, e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) =>
                        handleMetadataValueChange(index, e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMetadataField(index)}
                      className="h-9 w-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}