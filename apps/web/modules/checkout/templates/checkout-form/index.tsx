// components/checkout-form.tsx
"use client";

import { initiatePaymentSession, placeOrder, updateCartShippingAddress } from "@/lib/actions";
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
  Wallet,
  Smartphone,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import dynamic from 'next/dynamic';
import { n8nFetcher } from "@/hooks/useN8nQuery";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PaymentButton from "@/components/payment-button";

// Dynamically import map component with no SSR
const MapLocationPicker = dynamic(
  () => import('@/components/map-location-picker').then(mod => mod.MapLocationPicker),
  { ssr: false, loading: () => <div className="h-[350px] bg-gray-100 rounded-lg animate-pulse" /> }
);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 gap-2" disabled={pending}>
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Place Order <ArrowRight className="h-4 w-4" /></>}
    </Button>
  );
}

// Payment methods with proper Medusa provider IDs
const PAYMENT_METHODS = [
  { id: "cod", name: "Cash on Delivery", icon: Banknote, description: "Pay when you receive", provider_id: "pp_system_default" },
  { id: "gcash", name: "GCash", icon: Smartphone, description: "Pay via GCash", provider_id: "pp_gcash" },
  { id: "paymaya", name: "PayMaya", icon: Wallet, description: "Pay via PayMaya", provider_id: "pp_paymaya" },
  { id: "bank-transfer", name: "Bank Transfer", icon: CreditCard, description: "Pay via bank transfer", provider_id: "pp_system_default" },
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
  
  // Consolidated form state
  const [formData, setFormData] = useState({
    // Personal Info
    first_name: "", 
    last_name: "", 
    email: "", 
    phone: "", 
    // Address Info
    address_1: "", 
    postal_code: "", 
    // Order Info
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
  const [activeSection, setActiveSection] = useState("personal");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const updateTimeout = useRef<NodeJS.Timeout>();
  const initialPopulateDone = useRef(false);
  const mapRef = useRef<any>(null);

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
      postal_code: addr.postal_code || "",
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

const handlePaymentSuccess = useCallback(() => {
  // Redirect to order confirmation or show success message
  if (state?.order_id) {
    window.location.href = `/order/confirmation/${state.order_id}`;
  }
}, [state]);

const handlePaymentError = useCallback((error: string) => {
  setPaymentError(error);
  toast.error(error);
}, []);

  // Update cart when form changes (debounced)
  const updateCartData = useCallback(async () => {
    if (!cart?.id || !isDataPopulated || isUpdatingCart) return;
    
    // Validate required fields
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
      updateTimeout.current = setTimeout(updateCartData, 3000);
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

  // Initialize payment session
  useEffect(() => {
    const initPayment = async () => {
      if (!cart?.id || paymentInitialized) return;
      
      setIsInitializingPayment(true);
      try {
        const hasPaymentCollection = cart.payment_collection;
        const hasValidSession = hasPaymentCollection?.payment_sessions?.some(
          (s: any) => s.status === "pending" || s.status === "authorized"
        );
        
        if (!hasValidSession) {
          await initiatePaymentSession(cart, { provider_id: 'pp_system_default' });
        }
        setPaymentInitialized(true);
      } catch (error) {
        console.error("Error initializing payment:", error);
      } finally {
        setIsInitializingPayment(false);
      }
    };
    
    initPayment();
  }, [cart, paymentInitialized]);

  // Update payment session
  useEffect(() => {
    const updatePayment = async () => {
      if (!cart?.id || !paymentInitialized) return;
      
      const method = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
      if (!method) return;
      
      setIsInitializingPayment(true);
      try {
        await initiatePaymentSession(cart, { provider_id: method.provider_id });
      } catch (error) {
        console.error("Error updating payment:", error);
        setErrors(prev => ({ ...prev, payment: "Failed to initialize payment method" }));
      } finally {
        setIsInitializingPayment(false);
      }
    };
    
    updatePayment();
  }, [selectedPaymentMethod, cart?.id, paymentInitialized]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format";
    
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

  // Handle location selection without re-rendering map
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
    
    // Ensure cart address is up to date
    if (isDataPopulated && (!selectedCity || !selectedBarangay || !formData.address_1)) {
      await updateCartData();
    }
    
    if (!paymentInitialized && !isInitializingPayment) {
      setErrors(prev => ({ ...prev, form: "Payment not ready, please wait..." }));
      return;
    }
    
    // Build submission data
    formDataObj.set("cart_id", cart.id);
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.set(key, value);
    });
    formDataObj.set("city_code", selectedCity);
    formDataObj.set("barangay_code", selectedBarangay);
    formDataObj.set("payment_method", selectedPaymentMethod);
    
    if (selectedLocation) {
      formDataObj.set("location_coordinates", `${selectedLocation.lat},${selectedLocation.lng}`);
      formDataObj.set("location_address", selectedLocation.address);
    }
    
    const paymentMethod = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
    if (paymentMethod) {
      formDataObj.set("payment_provider_id", paymentMethod.provider_id);
    }
    
    formAction(formDataObj);
    localStorage.removeItem('cart_id');
  }, [validateForm, cart?.id, paymentInitialized, isInitializingPayment, formData, selectedCity, selectedBarangay, selectedPaymentMethod, selectedLocation, formAction, isDataPopulated, updateCartData, isUpdatingCart]);

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
        <Card className="text-center py-12">
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

  const cityLabel = cities.find(c => c.value === selectedCity)?.label || "";
  const barangayLabel = barangays.find(b => b.value === selectedBarangay)?.label || "";

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground">Complete your order information</p>
      </div>

      {/* Status Indicators */}
      {(isUpdatingCart || isInitializingPayment) && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">
            {isUpdatingCart ? "Updating shipping address..." : "Initializing payment..."}
          </span>
        </div>
      )}

      {paymentInitialized && !isInitializingPayment && !isUpdatingCart && (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.first_name} 
                      onChange={(e) => handleChange("first_name", e.target.value)} 
                      className={errors.first_name && "border-red-500"} 
                    />
                    {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name <span className="text-red-500">*</span></Label>
                    <Input 
                      value={formData.last_name} 
                      onChange={(e) => handleChange("last_name", e.target.value)} 
                      className={errors.last_name && "border-red-500"} 
                    />
                    {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => handleChange("email", e.target.value)} 
                      className="pl-9" 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
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
              </CardContent>
            </Card>

            {/* Order Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={formData.notes} 
                  onChange={(e) => handleChange("notes", e.target.value)} 
                  placeholder="Special instructions, landmark, etc." 
                  className="min-h-[100px]" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Shipping & Payment */}
          <div className="space-y-6">
            {/* Shipping Address Card - Consolidated */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      placeholder={selectedCity ? "Search..." : "Select city first"} 
                      disabled={!selectedCity} 
                      isLoading={isLoadingBarangays} 
                    />
                    {errors.barangay && <p className="text-xs text-red-500">{errors.barangay}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ZIP Code (Optional)</Label>
                    <Input 
                      value={formData.postal_code} 
                      onChange={(e) => handleChange("postal_code", e.target.value)} 
                      placeholder="6500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location Preview</Label>
                    <div className="h-10 px-3 py-2 bg-gray-50 rounded-lg text-sm truncate">
                      {barangayLabel && cityLabel ? `${barangayLabel}, ${cityLabel}` : "Select location"}
                    </div>
                  </div>
                </div>

                {/* Map - Only rendered when needed, won't re-render */}
                {selectedBarangay && selectedCity && (
                  <div className="space-y-2 pt-2">
                    <Label>Pin Your Location <span className="text-red-500">*</span></Label>
                    <MapLocationPicker 
                      onLocationSelect={handleLocationSelect}
                      initialLocation={selectedLocation || undefined}
                    />
                    {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                    {selectedLocation && !errors.location && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" /> Location selected
                        </p>
                        <p className="text-xs text-green-600 mt-1 truncate">{selectedLocation.address}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.id} className={cn(
                        "relative flex cursor-pointer rounded-lg border p-4 transition-all",
                        selectedPaymentMethod === method.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
                      )}>
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <Label htmlFor={method.id} className="flex flex-1 cursor-pointer items-start gap-4">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", selectedPaymentMethod === method.id ? "bg-primary text-white" : "bg-gray-100 text-gray-500")}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                          <div className={cn("h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center", selectedPaymentMethod === method.id ? "border-primary bg-primary" : "border-gray-300")}>
                            {selectedPaymentMethod === method.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {errors.payment && (
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                    {errors.payment}
                  </div>
                )}

                {(selectedPaymentMethod === "gcash" || selectedPaymentMethod === "paymaya") && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">You will be redirected to complete your payment after placing the order.</p>
                  </div>
                )}

                {selectedPaymentMethod === "bank-transfer" && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Bank Account Details:</p>
                    <p className="text-sm">BPI: 1234 5678 9012</p>
                    <p className="text-sm">BDO: 9876 5432 1098</p>
                    <p className="text-sm">Account Name: Alayon Store</p>
                    <p className="text-sm text-muted-foreground mt-2">Please include your order number as reference.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <input type="hidden" name="cart_id" value={cart.id} />
        <input type="hidden" name="city_name" value={cityLabel} />
        <input type="hidden" name="barangay_name" value={barangayLabel} />
<PaymentButton
  cart={cart}
  onSuccess={handlePaymentSuccess}
  onError={handlePaymentError}
  className="mt-4"
/>
        {/* <SubmitButton /> */}

        {state?.error && (
          <div className="p-4 rounded-lg border text-center bg-red-50 border-red-200 text-red-700">
            {state.error}
          </div>
        )}
      </form>
    </div>
  );
}