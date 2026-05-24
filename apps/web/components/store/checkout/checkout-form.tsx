"use client";

import { initiatePaymentSession, placeOrder, updateCartShippingAddress, createGuestCustomer } from "@/lib/actions";
import { useCart } from "@/lib/context/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionState, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import { 
  Loader2, 
  CheckCircle2, 
  CreditCard, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  FileText,
  Banknote,
  AlertCircle,
  ArrowRight,
  Building2,
  Home,
  Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import dynamic from 'next/dynamic';
import { n8nFetcher } from "@/hooks/useN8nQuery";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Dynamically import map component with no SSR
const MapLocationPicker = dynamic(
  () => import('@/components/map-location-picker').then(mod => mod.MapLocationPicker),
  { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" /> }
);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 gap-2" disabled={pending}>
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Place Order <ArrowRight className="h-4 w-4" /></>}
    </Button>
  );
}

// Payment Methods - Only COD enabled, others coming soon
const PAYMENT_METHODS = [
  { id: "cod", name: "Cash on Delivery", icon: Banknote, description: "Pay when you receive your order", enabled: true },
  { id: "gcash", name: "GCash", icon: CreditCard, description: "Pay via GCash wallet", enabled: false, comingSoon: true },
  { id: "maya", name: "Maya", icon: Building2, description: "Pay via Maya wallet", enabled: false, comingSoon: true }
];

const REGION_CODE = "08"; // Eastern Visayas

// Types
interface AddressFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  postal_code?: string;
  country_code: string;
  province: string;
  metadata: {
    barangay?: string;
    location_coordinates?: string | null;
    location_address?: string | null;
  };
}

interface CheckoutFormProps {
  cart: any;
}

export function CheckoutForm({ cart: cartProp }: CheckoutFormProps) {
  const cart = cartProp;
  
  const [state, formAction] = useActionState(placeOrder, null);
  
  // Customer state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  // Consolidated form state
  const [formData, setFormData] = useState({
    first_name: "", 
    last_name: "", 
    email: "", 
    phone: "", 
    address_1: "", 
    notes: ""
  });
  
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cod");
  
  // UI state
  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
  const [barangays, setBarangays] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDataPopulated, setIsDataPopulated] = useState(false);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);

  const updateTimeout = useRef<NodeJS.Timeout>();
  const initialPopulateDone = useRef(false);

  // Populate form from cart data - ONLY ONCE
  useEffect(() => {
    if (!cart?.shipping_address || initialPopulateDone.current) return;
    
    const addr = cart.shipping_address;
    setFormData({
      first_name: addr.first_name || "",
      last_name: addr.last_name || "",
      email: addr.email || cart.email || "",
      phone: addr.phone || "",
      address_1: addr.address_1 || "",
      notes: ""
    });
    
    if (addr.city) setSelectedCity(addr.city);
    if (addr.metadata?.barangay) setSelectedBarangay(addr.metadata.barangay);
    
    if (addr.metadata?.location_coordinates) {
      const [lat, lng] = addr.metadata.location_coordinates.split(',');
      setSelectedLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: addr.metadata?.location_address || ""
      });
    }
    
    initialPopulateDone.current = true;
    setIsDataPopulated(true);
  }, [cart]);

  // Auto-create guest customer when form is filled
  const autoCreateGuestCustomer = useCallback(async () => {
    if (customerId || isCreatingCustomer) return;
    
    const hasRequiredPersonal = formData.first_name && formData.last_name && formData.phone;
    const hasRequiredAddress = selectedCity && selectedBarangay && formData.address_1;
    
    if (!hasRequiredPersonal || !hasRequiredAddress) return;
    
    setIsCreatingCustomer(true);
    try {
      const customer = await createGuestCustomer({
        email: formData.email || undefined,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });
      
      if (customer?.id) {
        setCustomerId(customer.id);
        console.log("Guest customer created:", customer.id);
      }
    } catch (error) {
      console.error("Error creating guest customer:", error);
    } finally {
      setIsCreatingCustomer(false);
    }
  }, [formData, selectedCity, selectedBarangay, customerId, isCreatingCustomer]);

  // Trigger customer creation when form data is complete
  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     autoCreateGuestCustomer();
  //   }, 5000);
    
  //   return () => clearTimeout(timeout);
  // }, [formData.first_name, formData.last_name, formData.phone, selectedCity, selectedBarangay, autoCreateGuestCustomer]);

  // Update cart when form changes (debounced)
  const updateCartData = useCallback(async () => {
    if (!cart?.id || !isDataPopulated || isUpdatingCart) return;
    
    const hasRequiredAddress = selectedCity && selectedBarangay && formData.address_1;
    const hasRequiredPersonal = formData.first_name && formData.last_name;
    if (!hasRequiredAddress || !hasRequiredPersonal) return;

    setIsUpdatingCart(true);

    const shippingAddress: AddressFormData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      address_1: formData.address_1,
      city: selectedCity,
      postal_code: formData.postal_code || undefined,
      country_code: "ph",
      province: REGION_CODE,
      email: formData.email,
      phone: formData.phone,
      metadata: {
        barangay: selectedBarangay,
        location_coordinates: selectedLocation ? `${selectedLocation.lat},${selectedLocation.lng}` : null,
        location_address: selectedLocation?.address || null
      }
    };

    try {
      await updateCartShippingAddress(cart.id, shippingAddress);
    } catch (error) {
      console.error("Error updating cart:", error);
    } finally {
      setIsUpdatingCart(false);
    }
  }, [cart?.id, formData, selectedCity, selectedBarangay, selectedLocation, isDataPopulated, isUpdatingCart]);

  // Debounced cart updates
  useEffect(() => {
    if (!isDataPopulated) return;
    
    if (updateTimeout.current) clearTimeout(updateTimeout.current);
    
    const hasRequiredData = formData.first_name && formData.last_name && formData.address_1 && selectedCity && selectedBarangay;
    if (hasRequiredData) {
      updateTimeout.current = setTimeout(updateCartData, 5000);
    }
    
    return () => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
    };
  }, [formData, selectedCity, selectedBarangay, selectedLocation, updateCartData, isDataPopulated]);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoadingCities(true);
      try {
        const response = await n8nFetcher({
          endpoint: '/webhook/get-citymun',
          method: "GET",
          params: { regCode: REGION_CODE }
        });
        if (response && Array.isArray(response)) {
          setCities(response.map((city: any) => ({
            value: city.citymun_code,
            label: city.citymun_desc
          })));
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setIsLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Fetch barangays
  useEffect(() => {
    const fetchBarangays = async () => {
      if (!selectedCity) {
        setBarangays([]);
        setSelectedBarangay("");
        return;
      }
      
      setIsLoadingBarangays(true);
      try {
        const response = await n8nFetcher({
          endpoint: '/webhook/get-barangays',
          method: "GET",
          params: { citymun_code: selectedCity }
        });
        if (response && Array.isArray(response)) {
          setBarangays(response.map((barangay: any) => ({
            value: barangay.psgc_code,
            label: barangay.barangay_desc
          })));
        }
      } catch (error) {
        console.error("Error fetching barangays:", error);
        setBarangays([]);
      } finally {
        setIsLoadingBarangays(false);
      }
    };
    fetchBarangays();
  }, [selectedCity]);

  // Initialize payment session (only COD)
  useEffect(() => {
    const initPayment = async () => {
      if (!cart?.id || paymentInitialized) return;
      
      setIsInitializingPayment(true);
      try {
        const method = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
        if (method && method.enabled) {
          await initiatePaymentSession(cart, { provider_id: "pp_system_default" });
        }
        setPaymentInitialized(true);
      } catch (error) {
        console.error("Error initializing payment:", error);
      } finally {
        setIsInitializingPayment(false);
      }
    };
    
    initPayment();
  }, [cart, paymentInitialized, selectedPaymentMethod]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    // Email is NOT required - removed validation
    
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^(09|\+639)\d{9}$/.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = "Invalid Philippine number";
    
    if (!formData.address_1.trim()) newErrors.address_1 = "Street address is required";
    if (!selectedCity) newErrors.city = "Please select a city";
    if (!selectedBarangay) newErrors.barangay = "Please select a barangay";
    if (!selectedLocation) newErrors.location = "Please pin your location on the map";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedCity, selectedBarangay, selectedLocation]);

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Handle location selection
  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location);
    if (errors.location) setErrors(prev => ({ ...prev, location: "" }));
  }, [errors.location]);

  // Submit handler
  const handleSubmit = useCallback(async (formDataObj: FormData) => {
    if (isUpdatingCart) {
      setErrors(prev => ({ ...prev, form: "Please wait, updating address..." }));
      return;
    }
    
    if (!validateForm()) return;
    
    if (!cart?.id) {
      setErrors(prev => ({ ...prev, form: "Cart not found" }));
      return;
    }
    
    if (selectedPaymentMethod !== "cod") {
      setErrors(prev => ({ ...prev, form: "Only Cash on Delivery is available at this time" }));
      return;
    }
    
    if (!paymentInitialized && !isInitializingPayment) {
      setErrors(prev => ({ ...prev, form: "Payment not ready, please wait..." }));
      return;
    }
    
    formDataObj.set("cart_id", cart.id);
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== "email" || (key === "email" && value)) {
        formDataObj.set(key, value);
      }
    });
    formDataObj.set("city_code", selectedCity);
    formDataObj.set("barangay_code", selectedBarangay);
    formDataObj.set("payment_method", selectedPaymentMethod);
    
    if (selectedLocation) {
      formDataObj.set("location_coordinates", `${selectedLocation.lat},${selectedLocation.lng}`);
      formDataObj.set("location_address", selectedLocation.address);
    }
    
    if (customerId) {
      formDataObj.set("customer_id", customerId);
    }
    
    formDataObj.set("payment_provider_id", "pp_system_default");
    
    formAction(formDataObj);
    localStorage.removeItem('cart_id');
  }, [validateForm, cart?.id, paymentInitialized, isInitializingPayment, formData, selectedCity, selectedBarangay, selectedPaymentMethod, selectedLocation, customerId, formAction, isDataPopulated, updateCartData, isUpdatingCart]);

  // Handle successful order
  useEffect(() => {
    if (state?.success) {
      if (state.redirect_url) {
        window.location.href = state.redirect_url;
      } else if (state.order_id) {
        window.location.href = `/order/confirmation/${state.order_id}`;
      }
    }
  }, [state]);

  if (!cart) return null;

  const hasItems = cart.items && cart.items.length > 0;
  if (!hasItems) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <Card className="text-center ">
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-4">Please add items to your cart before checking out.</p>
              <Button onClick={() => window.location.href = '/shop'} variant="outline">
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  console.log(selectedLocation, 'SELECTEDD', cart)
  const cityLabel = cities.find(c => c.value === selectedCity)?.label || "";
  const barangayLabel = barangays.find(b => b.value === selectedBarangay)?.label || "";

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground">Complete your order information</p>
      </div>

      {/* Status Indicators */}
      {/* {(isInitializingPayment || isCreatingCustomer) && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">
            {isCreatingCustomer ? "Setting up your account..." : 
             "Preparing checkout..."}
          </span>
        </div>
      )} */}

      {customerId && !isCreatingCustomer && paymentInitialized && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">Ready to place order</span>
        </div>
      )}

      {errors.form && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form action={handleSubmit} className="space-y-8">
        {/* 2-Column Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN - Customer Information & Shipping Address (Merged) */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-primary" />
                  Delivery Information
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Tell us where to deliver your order</p>
              </CardHeader>
              <Separator />
              <CardContent className=" space-y-6">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name <span className="text-red-500">*</span></Label>
                      <Input 
                        value={formData.first_name} 
                        onChange={(e) => handleChange("first_name", e.target.value)} 
                        className={errors.first_name && "border-red-500"} 
                        placeholder="John"
                      />
                      {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name <span className="text-red-500">*</span></Label>
                      <Input 
                        value={formData.last_name} 
                        onChange={(e) => handleChange("last_name", e.target.value)} 
                        className={errors.last_name && "border-red-500"} 
                        placeholder="Doe"
                      />
                      {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Email <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          value={formData.email} 
                          onChange={(e) => handleChange("email", e.target.value)} 
                          className="pl-9" 
                          placeholder="you@example.com"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">For order updates (optional)</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="tel" 
                          value={formData.phone} 
                          onChange={(e) => handleChange("phone", e.target.value)} 
                          className="pl-9" 
                          placeholder="09123456789"
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address Information Section */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Delivery Address
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Street Address <span className="text-red-500">*</span></Label>
                      <Input 
                        value={formData.address_1} 
                        onChange={(e) => handleChange("address_1", e.target.value)} 
                        className={errors.address_1 && "border-red-500"} 
                        placeholder="House number, street, subdivision"
                      />
                      {errors.address_1 && <p className="text-xs text-red-500">{errors.address_1}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City <span className="text-red-500">*</span></Label>
                        <Combobox 
                          options={cities} 
                          value={selectedCity} 
                          onChange={setSelectedCity} 
                          placeholder="Search city..." 
                          isLoading={isLoadingCities} 
                        />
                        {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Barangay <span className="text-red-500">*</span></Label>
                        <Combobox 
                          options={barangays} 
                          value={selectedBarangay} 
                          onChange={setSelectedBarangay} 
                          placeholder={selectedCity ? "Search barangay..." : "Select city first"} 
                          disabled={!selectedCity} 
                          isLoading={isLoadingBarangays} 
                        />
                        {errors.barangay && <p className="text-xs text-red-500">{errors.barangay}</p>}
                      </div>
                    </div>

                
                  </div>
                </div>

                <Separator />

                {/* Map Location Picker */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Home className="h-3 w-3" />
                    Exact Pin Location
                  </h3>
                  <div className="space-y-3">
                    <MapLocationPicker 
                      onLocationSelect={handleLocationSelect}
                      initialLocation={selectedLocation || undefined}
                      barangayName={barangayLabel}
                      cityName={cityLabel}
                    />
                    {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                    {selectedLocation && !errors.location && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" /> Delivery location pinned
                        </p>
                        <p className="text-xs text-green-600 mt-1 truncate">{selectedLocation.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Order Notes & Payment Method */}
          <div className="space-y-6">
            {/* Order Notes Card */}
            <Card>
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-primary" />
                  Special Instructions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Help our rider find you faster</p>
              </CardHeader>
              <Separator />
              <CardContent className="">
                <Textarea 
                  value={formData.notes} 
                  onChange={(e) => handleChange("notes", e.target.value)} 
                  placeholder="Examples: Landmark near your location, gate color, preferred delivery time, etc." 
                  className="min-h-[150px] resize-none" 
                />
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This helps our rider locate you accurately
                </p>
              </CardContent>
            </Card>

            {/* Payment Method Card */}
            <Card>
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Method
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Choose how you want to pay</p>
              </CardHeader>
              <Separator />
              <CardContent className="">
                <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isDisabled = !method.enabled;
                    
                    return (
                      <div 
                        key={method.id} 
                        className={cn(
                          "relative rounded-lg border p-2 transition-all",
                          method.enabled 
                            ? selectedPaymentMethod === method.id 
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20 cursor-pointer" 
                              : "border-gray-200 hover:border-gray-300 cursor-pointer"
                            : "border-gray-200 bg-gray-50 opacity-75 cursor-not-allowed"
                        )}
                        onClick={() => method.enabled && setSelectedPaymentMethod(method.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            method.enabled && selectedPaymentMethod === method.id ? "bg-primary text-white" : "bg-gray-100 text-gray-500",
                            !method.enabled && "bg-gray-200 text-gray-400"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{method.name}</p>
                              {method.comingSoon && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Coming Soon</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                            {isDisabled && (
                              <p className="text-xs text-amber-600 mt-1">Available soon</p>
                            )}
                          </div>
                          {method.enabled && (
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                              selectedPaymentMethod === method.id ? "border-primary bg-primary" : "border-gray-300"
                            )}>
                              {selectedPaymentMethod === method.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          )}
                          {isDisabled && (
                            <div className="h-5 w-5">
                              <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* COD Info Box */}
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <Banknote className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Pay in cash when your order arrives. Please prepare exact amount if possible for faster delivery.</span>
                  </p>
                </div>

                {errors.payment && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    {errors.payment}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <input type="hidden" name="cart_id" value={cart.id} />
        <input type="hidden" name="city_name" value={cityLabel} />
        <input type="hidden" name="barangay_name" value={barangayLabel} />
        <input type="hidden" name="payment_provider_id" value="pp_system_default" />
        
        <SubmitButton />

        {state?.error && (
          <div className="p-4 rounded-lg border text-center bg-red-50 border-red-200 text-red-700">
            {state.error}
          </div>
        )}
      </form>
    </div>
  );
}

// Lock icon component for disabled payment methods
function Lock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}