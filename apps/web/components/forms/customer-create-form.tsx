// components/customer-create-form.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createQuickCustomer } from "@/lib/actions";

interface CustomerCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: any) => void;
  onError?: (error: Error) => void;
}

const countryCodes = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "nl", label: "Netherlands" },
  { value: "se", label: "Sweden" },
  { value: "no", label: "Norway" },
  { value: "dk", label: "Denmark" },
  { value: "fi", label: "Finland" },
  { value: "jp", label: "Japan" },
  { value: "cn", label: "China" },
  { value: "in", label: "India" },
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
];

export function CustomerCreateForm({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAddress, setShowAddress] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    phone: "",
    company_name: "",
    is_active: true,
    shipping_address: {
      address_1: "",
      address_2: "",
      city: "",
      country_code: "",
      province: "",
      postal_code: "",
      phone: "",
    },
    billing_address: {
      address_1: "",
      address_2: "",
      city: "",
      country_code: "",
      province: "",
      postal_code: "",
      phone: "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email";
    
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleAddressChange = (type: 'shipping' | 'billing', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [`${type}_address`]: { ...prev[`${type}_address`], [field]: value }
    }));
  };

  const copyShippingToBilling = () => {
    setFormData(prev => ({
      ...prev,
      billing_address: { ...prev.shipping_address }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const customer = await createQuickCustomer(formData);
      onSuccess?.(customer);
      onClose();
      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        phone: "",
        company_name: "",
        is_active: true,
        shipping_address: {
          address_1: "", address_2: "", city: "", country_code: "", province: "", postal_code: "", phone: ""
        },
        billing_address: {
          address_1: "", address_2: "", city: "", country_code: "", province: "", postal_code: "", phone: ""
        },
      });
      setShowAddress(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
      onError?.(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your store.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="John"
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name *</label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Doe"
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="customer@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="********"
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange("is_active", checked)}
              />
              <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                Active Customer
              </label>
            </div>
          </div>

          {/* Address Toggle */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddress(!showAddress)}
            className="w-full"
          >
            {showAddress ? "Hide Address Fields" : "Add Address Information"}
          </Button>

          {/* Address Fields */}
          {showAddress && (
            <>
              {/* Shipping Address */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Shipping Address</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Address Line 1</label>
                    <Input
                      value={formData.shipping_address.address_1}
                      onChange={(e) => handleAddressChange("shipping", "address_1", e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Address Line 2</label>
                    <Input
                      value={formData.shipping_address.address_2}
                      onChange={(e) => handleAddressChange("shipping", "address_2", e.target.value)}
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.shipping_address.city}
                      onChange={(e) => handleAddressChange("shipping", "city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">State/Province</label>
                    <Input
                      value={formData.shipping_address.province}
                      onChange={(e) => handleAddressChange("shipping", "province", e.target.value)}
                      placeholder="NY"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postal Code</label>
                    <Input
                      value={formData.shipping_address.postal_code}
                      onChange={(e) => handleAddressChange("shipping", "postal_code", e.target.value)}
                      placeholder="10001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Select
                      value={formData.shipping_address.country_code}
                      onValueChange={(value) => handleAddressChange("shipping", "country_code", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Phone (Shipping)</label>
                    <Input
                      value={formData.shipping_address.phone}
                      onChange={(e) => handleAddressChange("shipping", "phone", e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>

              {/* Copy Button */}
              <Button
                type="button"
                variant="secondary"
                onClick={copyShippingToBilling}
                className="w-full"
              >
                Copy Shipping Address to Billing
              </Button>

              {/* Billing Address */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Billing Address</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Address Line 1</label>
                    <Input
                      value={formData.billing_address.address_1}
                      onChange={(e) => handleAddressChange("billing", "address_1", e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Address Line 2</label>
                    <Input
                      value={formData.billing_address.address_2}
                      onChange={(e) => handleAddressChange("billing", "address_2", e.target.value)}
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.billing_address.city}
                      onChange={(e) => handleAddressChange("billing", "city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">State/Province</label>
                    <Input
                      value={formData.billing_address.province}
                      onChange={(e) => handleAddressChange("billing", "province", e.target.value)}
                      placeholder="NY"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postal Code</label>
                    <Input
                      value={formData.billing_address.postal_code}
                      onChange={(e) => handleAddressChange("billing", "postal_code", e.target.value)}
                      placeholder="10001"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Select
                      value={formData.billing_address.country_code}
                      onValueChange={(value) => handleAddressChange("billing", "country_code", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Phone (Billing)</label>
                    <Input
                      value={formData.billing_address.phone}
                      onChange={(e) => handleAddressChange("billing", "phone", e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}