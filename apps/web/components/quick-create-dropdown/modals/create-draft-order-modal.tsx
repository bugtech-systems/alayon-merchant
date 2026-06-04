// modals/create-draft-order-modal.tsx
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, ChevronRight, ChevronLeft, Check, Search, User, Mail, Phone, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { draftOrderSchema, DraftOrderFormData } from '../schemas';
import { createDraftOrder } from '@/lib/actions/draft-order';
import { useMedusaCustomers } from '@/hooks/useMedusaCustomers';
import { useMedusaRegions } from '@/hooks/useMedusaRegions';
import { useMedusaShippingOptions } from '@/hooks/useMedusaShippingOptions';

interface CreateDraftOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface SelectedProduct {
  id: string;
  title: string;
  variant_id: string;
  variant_title: string;
  quantity: number;
  price: number;
  thumbnail?: string;
}

interface CustomItem {
  title: string;
  quantity: number;
  price: number;
}

export const CreateDraftOrderModal: React.FC<CreateDraftOrderModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [customItem, setCustomItem] = useState<CustomItem>({
    title: '',
    price: 0,
    quantity: 1,
  });

  // Fetch customers using your custom hook
  const {
    data: customersData,
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useMedusaCustomers({
    limit: 20,
    offset: 0,
    q: customerSearchQuery || undefined,
    order: 'created_at DESC',
  });

  // Fetch regions
  const { data: regionsData, isLoading: regionsLoading } = useMedusaRegions({
    limit: 100,
  });

  // Fetch shipping options
  const { data: shippingOptionsData, isLoading: shippingOptionsLoading } = useMedusaShippingOptions({
    limit: 100,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DraftOrderFormData>({
    resolver: zodResolver(draftOrderSchema),
    defaultValues: {
      email: '',
      region_id: '',
      customer_id: '',
      sales_channel_id: '',
      items: [],
      shipping_method: {
        option_id: '',
        price: 0,
      },
      shipping_address: {
        address_1: '',
        address_2: '',
        city: '',
        country_code: '',
        province: '',
        postal_code: '',
        phone: '',
      },
      billing_address: {
        address_1: '',
        address_2: '',
        city: '',
        country_code: '',
        province: '',
        postal_code: '',
        phone: '',
      },
      discount_code: '',
      no_notification: false,
    },
  });

  const selectedRegionId = watch('region_id');
  const selectedCustomerId = watch('customer_id');
  const useSameBillingAddress = watch('use_same_billing_address');
  const discountCode = watch('discount_code');

  // Get customers list from the response
  const customers = customersData?.customers || [];
  
  // Get regions list
  const regions = regionsData?.regions || [];
  
  // Get shipping options list
  const shippingOptions = shippingOptionsData?.shipping_options || [];

  // Filter shipping options based on selected region
  const filteredShippingOptions = shippingOptions.filter(
    (option) => option.region_id === selectedRegionId && !option.is_return
  );

  // Get selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Auto-fill customer email when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setValue('email', selectedCustomer.email);
      setValue('first_name', selectedCustomer.first_name);
      setValue('last_name', selectedCustomer.last_name);
      setValue('phone', selectedCustomer.phone || '');
      
      // Auto-fill shipping address if customer has default address
      const defaultAddress = selectedCustomer.shipping_addresses?.[0];
      if (defaultAddress) {
        setValue('shipping_address.address_1', defaultAddress.address_1 || '');
        setValue('shipping_address.address_2', defaultAddress.address_2 || '');
        setValue('shipping_address.city', defaultAddress.city || '');
        setValue('shipping_address.postal_code', defaultAddress.postal_code || '');
        setValue('shipping_address.country_code', defaultAddress.country_code || '');
        setValue('shipping_address.province', defaultAddress.province || '');
        setValue('shipping_address.phone', defaultAddress.phone || '');
      }
    }
  }, [selectedCustomer, setValue]);

  // Auto-fill billing address when "use same" is checked
  useEffect(() => {
    if (useSameBillingAddress) {
      const shippingAddr = watch('shipping_address');
      setValue('billing_address.address_1', shippingAddr.address_1);
      setValue('billing_address.address_2', shippingAddr.address_2);
      setValue('billing_address.city', shippingAddr.city);
      setValue('billing_address.country_code', shippingAddr.country_code);
      setValue('billing_address.province', shippingAddr.province);
      setValue('billing_address.postal_code', shippingAddr.postal_code);
      setValue('billing_address.phone', shippingAddr.phone);
    }
  }, [useSameBillingAddress, watch, setValue]);

  // Refetch customers when search query changes (with debounce)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (customerSearchQuery.length > 2 || customerSearchQuery === '') {
        refetchCustomers();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [customerSearchQuery, refetchCustomers]);

  const onSubmit = async (data: DraftOrderFormData) => {
    setIsLoading(true);
    try {
      // Prepare items combining existing products and custom items
      const allItems = [
        ...selectedProducts.map((p) => ({
          variant_id: p.variant_id,
          quantity: p.quantity,
        })),
        ...data.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      ];

      const orderData = {
        ...data,
        items: allItems,
      };

      const draftOrder = await createDraftOrder(orderData);
      
      if (draftOrder) {
        toast.success(`Draft order #${draftOrder.display_id} created successfully`);
        reset();
        setSelectedProducts([]);
        setCustomerSearchQuery('');
        setCurrentStep(1);
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create draft order');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create draft order');
    } finally {
      setIsLoading(false);
    }
  };

  const addExistingProduct = (product: SelectedProduct) => {
    setSelectedProducts([...selectedProducts, product]);
    setShowProductSelector(false);
  };

  const removeExistingProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    const updated = [...selectedProducts];
    updated[index].quantity = quantity;
    setSelectedProducts(updated);
  };

  const addCustomItem = () => {
    const currentItems = watch('items');
    setValue('items', [
      ...currentItems,
      {
        title: customItem.title,
        quantity: customItem.quantity,
        price: customItem.price,
      },
    ]);
    setShowCustomItemModal(false);
    setCustomItem({ title: '', price: 0, quantity: 1 });
  };

  const removeCustomItem = (index: number) => {
    const currentItems = watch('items');
    setValue(
      'items',
      currentItems.filter((_, i) => i !== index)
    );
  };

  const totalItems = selectedProducts.length + (watch('items')?.length || 0);
  
  const subtotal = [
    ...selectedProducts.map((p) => (p.price || 0) * p.quantity),
    ...(watch('items')?.map((i) => (i.price || 0) * i.quantity) || []),
  ].reduce((a, b) => a + b, 0);

  const shippingCost = watch('shipping_method.price') || 0;
  const discountAmount = 0; // Would need discount validation
  const total = subtotal + shippingCost - discountAmount;

  const selectedRegion = regions.find(r => r.id === selectedRegionId);
  const currencyCode = selectedRegion?.currency_code?.toUpperCase() || 'USD';

  const StepIndicator = () => (
    <div className="px-6 pt-6">
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep > step ? 'bg-green-600 text-white' : ''}
                  ${currentStep === step ? 'bg-blue-600 text-white' : ''}
                  ${currentStep < step ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {currentStep > step ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className="text-xs mt-1 text-gray-500">
                {step === 1 && 'Region'}
                {step === 2 && 'Items'}
                {step === 3 && 'Shipping'}
                {step === 4 && 'Customer'}
                {step === 5 && 'Billing'}
                {step === 6 && 'Summary'}
              </span>
            </div>
            {step < 6 && (
              <div
                className={`
                  flex-1 h-0.5 mx-2
                  ${currentStep > step ? 'bg-green-600' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!watch('region_id');
      case 2:
        return totalItems > 0;
      case 3:
        return !!watch('shipping_method.option_id');
      case 4:
        return !!watch('email') && !!watch('shipping_address.address_1');
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep((currentStep + 1) as Step);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="region_id" className="text-sm font-medium">
                Region <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('region_id')}
                onValueChange={(value) => setValue('region_id', value)}
              >
                <SelectTrigger className={errors.region_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regionsLoading ? (
                    <SelectItem value="loading" disabled>Loading regions...</SelectItem>
                  ) : (
                    regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name} ({region.currency_code.toUpperCase()}) - Tax: {region.tax_rate}%
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.region_id && (
                <p className="text-sm text-red-500">{errors.region_id.message}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                The region determines the currency, tax rates, and available shipping options for this order.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Items Summary */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium">Order Items</h3>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductSelector(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomItemModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom Item
                  </Button>
                </div>
              </div>

              {totalItems === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                  <p className="font-medium">No items added yet</p>
                  <p className="text-sm mt-1">Click "Add Product" or "Add Custom Item" to get started</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
                        <TableHead className="w-24">Price</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Existing Products */}
                      {selectedProducts.map((product, index) => (
                        <TableRow key={`existing-${index}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.title}</p>
                              <p className="text-sm text-gray-500">{product.variant_title}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateProductQuantity(index, parseInt(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format(product.price / 100)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format((product.price * product.quantity) / 100)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExistingProduct(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Custom Items */}
                      {watch('items')?.map((item, index) => (
                        <TableRow key={`custom-${index}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-500">Custom Item</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const items = watch('items');
                                items[index].quantity = parseInt(e.target.value);
                                setValue('items', items);
                              }}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format(item.price / 100)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format((item.price * item.quantity) / 100)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCustomItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Subtotal */}
            {totalItems > 0 && (
              <div className="border-t pt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="text-xl font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: currencyCode,
                    }).format(subtotal / 100)}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Shipping Method *</Label>
              {shippingOptionsLoading ? (
                <div className="text-center py-8">
                  <p>Loading shipping options...</p>
                </div>
              ) : filteredShippingOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>No shipping options available for this region</p>
                  <p className="text-sm mt-1">Please configure shipping options in your Medusa admin panel</p>
                </div>
              ) : (
                <RadioGroup
                  value={watch('shipping_method.option_id')}
                  onValueChange={(value) => {
                    const selectedOption = filteredShippingOptions.find(opt => opt.id === value);
                    setValue('shipping_method.option_id', value);
                    setValue('shipping_method.price', selectedOption?.amount || 0);
                  }}
                  className="space-y-3"
                >
                  {filteredShippingOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setValue('shipping_method.option_id', option.id);
                        setValue('shipping_method.price', option.amount);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="cursor-pointer">
                          <p className="font-medium">{option.name}</p>
                          {option.requirements && option.requirements.length > 0 && (
                            <p className="text-sm text-gray-500">
                              Min. order: {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currencyCode,
                              }).format(option.requirements[0].amount / 100)}
                            </p>
                          )}
                        </Label>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: currencyCode,
                          }).format(option.amount / 100)}
                        </p>
                        {option.price_type === 'calculated' && (
                          <p className="text-xs text-gray-500">Calculated at checkout</p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_search" className="text-sm font-medium">
                Search Customer
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="customer_search"
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                />
              </div>
              
              {customersLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Searching customers...</p>
                </div>
              ) : customers.length > 0 && customerSearchQuery ? (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedCustomerId === customer.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setValue('customer_id', customer.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Mail className="h-3 w-3" />
                            <span>{customer.email}</span>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          <Badge variant="secondary" className="mt-1">
                            {customer.has_account ? 'Registered' : 'Guest'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : customerSearchQuery && customerSearchQuery.length > 2 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No customers found</p>
                  <p className="text-sm mt-1">You can create a new customer by filling out the form below</p>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Customer Details Form */}
            <div className="space-y-4">
              <h3 className="text-md font-medium">Customer Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    {...register('first_name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    {...register('last_name')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  {...register('phone')}
                />
              </div>
            </div>

            <Separator />

            {/* Shipping Address */}
            <div className="space-y-4">
              <h3 className="text-md font-medium">Shipping Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="shipping_address.address_1" className="text-sm font-medium">
                  Address Line 1 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shipping_address.address_1"
                  placeholder="Street address"
                  {...register('shipping_address.address_1')}
                  className={errors.shipping_address?.address_1 ? 'border-red-500' : ''}
                />
                {errors.shipping_address?.address_1 && (
                  <p className="text-sm text-red-500">{errors.shipping_address.address_1.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_address.address_2">Address Line 2 (Optional)</Label>
                <Input
                  id="shipping_address.address_2"
                  placeholder="Apartment, suite, etc."
                  {...register('shipping_address.address_2')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_address.city" className="text-sm font-medium">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping_address.city"
                    placeholder="City"
                    {...register('shipping_address.city')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_address.postal_code" className="text-sm font-medium">
                    Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping_address.postal_code"
                    placeholder="Postal code"
                    {...register('shipping_address.postal_code')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_address.province">State/Province</Label>
                  <Input
                    id="shipping_address.province"
                    placeholder="State or province"
                    {...register('shipping_address.province')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_address.country_code" className="text-sm font-medium">
                    Country Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping_address.country_code"
                    placeholder="US"
                    maxLength={2}
                    {...register('shipping_address.country_code')}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use_same_billing"
                checked={useSameBillingAddress}
                onCheckedChange={(checked) => setValue('use_same_billing_address', checked as boolean)}
              />
              <Label htmlFor="use_same_billing" className="cursor-pointer">
                Use same address as shipping
              </Label>
            </div>

            {!useSameBillingAddress && (
              <div className="space-y-4">
                <h3 className="text-md font-medium">Billing Address</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="billing_address.address_1">Address Line 1</Label>
                  <Input
                    id="billing_address.address_1"
                    placeholder="Street address"
                    {...register('billing_address.address_1')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_address.address_2">Address Line 2 (Optional)</Label>
                  <Input
                    id="billing_address.address_2"
                    placeholder="Apartment, suite, etc."
                    {...register('billing_address.address_2')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_address.city">City</Label>
                    <Input
                      id="billing_address.city"
                      placeholder="City"
                      {...register('billing_address.city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_address.postal_code">Postal Code</Label>
                    <Input
                      id="billing_address.postal_code"
                      placeholder="Postal code"
                      {...register('billing_address.postal_code')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_address.province">State/Province</Label>
                    <Input
                      id="billing_address.province"
                      placeholder="State or province"
                      {...register('billing_address.province')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_address.country_code">Country Code</Label>
                    <Input
                      id="billing_address.country_code"
                      placeholder="US"
                      maxLength={2}
                      {...register('billing_address.country_code')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Order Summary</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                >
                  Edit
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Region:</span>
                  <span className="font-medium">{selectedRegion?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">{currencyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{totalItems} items</span>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Items</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                >
                  Edit
                </Button>
              </div>

              <div className="space-y-2">
                {selectedProducts.map((product, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {product.title} x{product.quantity}
                    </span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                      }).format((product.price * product.quantity) / 100)}
                    </span>
                  </div>
                ))}
                {watch('items')?.map((item, idx) => (
                  <div key={`custom-summary-${idx}`} className="flex justify-between text-sm">
                    <span>
                      {item.title} (Custom) x{item.quantity}
                    </span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                      }).format((item.price * item.quantity) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Summary */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Shipping</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(3)}
                >
                  Edit
                </Button>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  {filteredShippingOptions.find(o => o.id === watch('shipping_method.option_id'))?.name}
                </span>
                <span>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(shippingCost / 100)}
                </span>
              </div>
            </div>

            {/* Customer Summary */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Customer</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(4)}
                >
                  Edit
                </Button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span>{watch('email')}</span>
                </div>
                {watch('first_name') && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span>{watch('first_name')} {watch('last_name')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Address:</span>
                  <span className="text-right">
                    {watch('shipping_address.address_1')}<br />
                    {watch('shipping_address.city')}, {watch('shipping_address.postal_code')}
                  </span>
                </div>
              </div>
            </div>

            {/* Discount Code */}
            <div className="space-y-2">
              <Label htmlFor="discount_code">Discount Code</Label>
              <div className="flex gap-2">
                <Input
                  id="discount_code"
                  placeholder="Enter discount code"
                  {...register('discount_code')}
                />
                <Button type="button" variant="outline">
                  Apply
                </Button>
              </div>
            </div>

            {/* Notification Preference */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no_notification"
                {...register('no_notification')}
              />
              <Label htmlFor="no_notification" className="cursor-pointer">
                Don't send notification email to customer
              </Label>
            </div>

            <Separator />

            {/* Total */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(subtotal / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(shippingCost / 100)}
                </span>
              </div>
              {discountCode && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(discountAmount / 100)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(total / 100)}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Product Selector Modal
  const ProductSelectorModal = () => {
    if (!showProductSelector) return null;

    return (
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Add Products</DialogTitle>
            <DialogDescription>
              Select products to add to this draft order
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search products..." className="pl-9" />
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* This would map through actual products from useMedusaProducts hook */}
                    <TableRow>
                      <TableCell>
                        <Checkbox
                          onCheckedChange={() =>
                            addExistingProduct({
                              id: 'prod_123',
                              title: 'Sample Product',
                              variant_id: 'variant_123',
                              variant_title: 'Default',
                              quantity: 1,
                              price: 2999,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>Sample Product</TableCell>
                      <TableCell>Default</TableCell>
                      <TableCell>$29.99</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <div className="border-t px-6 py-4 flex justify-end">
            <Button onClick={() => setShowProductSelector(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Custom Item Modal
  const CustomItemModal = () => {
    if (!showCustomItemModal) return null;

    return (
      <Dialog open={showCustomItemModal} onOpenChange={setShowCustomItemModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>
              Add a custom item that is not in your product catalog
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Title *</Label>
              <Input
                placeholder="e.g., Custom Service Fee"
                value={customItem.title}
                onChange={(e) => setCustomItem({ ...customItem, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={customItem.price / 100 || ''}
                onChange={(e) =>
                  setCustomItem({ ...customItem, price: parseFloat(e.target.value) * 100 || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={customItem.quantity}
                onChange={(e) =>
                  setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCustomItemModal(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomItem} disabled={!customItem.title || customItem.price <= 0}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">Create Draft Order</DialogTitle>
            <DialogDescription>
              Create an order on behalf of a customer. The customer will be able to complete payment later.
            </DialogDescription>
          </DialogHeader>

          <StepIndicator />

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-6 py-6">
              {renderStepContent()}
            </ScrollArea>

            <div className="border-t px-6 py-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {currentStep < 6 ? (
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  disabled={!canProceed() || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Draft Order'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ProductSelectorModal />
      <CustomItemModal />
    </>
  );
};