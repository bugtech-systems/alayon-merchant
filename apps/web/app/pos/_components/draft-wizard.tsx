// components/draft-order/DraftOrderWizard.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Trash2, Search, X, Package, Truck, User, CreditCard } from "lucide-react";

// Hooks and types
import { useCreateDraftOrder, useRegions, useShippingOptions, useSearchCustomers, useSearchProducts } from "@/hooks/use-draft-orders";
import { DraftOrder, DraftOrderItem } from "@/types";

const draftOrderSchema = z.object({
  email: z.string().email("Invalid email address"),
  region_id: z.string().min(1, "Region is required"),
  customer_id: z.string().optional(),
  discount_code: z.string().optional(),
});

type DraftOrderFormValues = z.infer<typeof draftOrderSchema>;

interface DraftOrderWizardProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DraftOrderWizard({ trigger, open: controlledOpen, onOpenChange }: DraftOrderWizardProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedItems, setSelectedItems] = useState<DraftOrderItem[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);
  const [customShippingPrice, setCustomShippingPrice] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<any>({});
  const [billingAddress, setBillingAddress] = useState<any>({});
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const setIsOpen = isControlled ? onOpenChange! : setOpen;

  
  const router = useRouter();
  
    const form = useForm<DraftOrderFormValues>({
    resolver: zodResolver(draftOrderSchema),
    defaultValues: {
      email: "",
      region_id: "",
      discount_code: "",
    },
  });
  
  const { mutate: createDraftOrder, isPending } = useCreateDraftOrder();
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: shippingOptions, refetch: refetchShipping } = useShippingOptions(
    form.watch("region_id")
  );
  const { data: customers } = useSearchCustomers(customerSearch);
  const { data: productVariants } = useSearchProducts(productSearch);



  const steps = [
    { title: "Region", description: "Select order region", icon: Package },
    { title: "Items", description: "Add products or custom items", icon: Package },
    { title: "Shipping", description: "Choose shipping method", icon: Truck },
    { title: "Customer", description: "Customer details", icon: User },
    { title: "Billing", description: "Billing address", icon: CreditCard },
    { title: "Review", description: "Confirm order details", icon: Package },
  ];

  const handleNext = () => {
    if (currentStep === 0 && !form.getValues("region_id")) {
      toast.error("Please select a region");
      return;
    }
    if (currentStep === 1 && selectedItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    if (currentStep === 2 && !selectedShippingMethod) {
      toast.error("Please select a shipping method");
      return;
    }
    if (currentStep === 3 && !customerData?.email) {
      toast.error("Please provide customer email");
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleAddProduct = (variant: any) => {
    const existingItem = selectedItems.find((item) => item.variant_id === variant.id);
    if (existingItem) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.variant_id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          variant_id: variant.id,
          title: variant.product.title,
          unit_price: variant.prices[0]?.amount / 100 || 0,
          quantity: 1,
          thumbnail: variant.product.thumbnail,
          is_custom: false,
        },
      ]);
    }
    setProductSearch("");
  };

  const handleAddCustomItem = () => {
    const title = prompt("Enter item title");
    const price = parseFloat(prompt("Enter price") || "0");
    const quantity = parseInt(prompt("Enter quantity") || "1");

    if (title && price > 0 && quantity > 0) {
      setSelectedItems([
        ...selectedItems,
        {
          title,
          unit_price: price,
          quantity,
          is_custom: true,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const newItems = [...selectedItems];
    const newQuantity = newItems[index].quantity + delta;
    if (newQuantity > 0) {
      newItems[index].quantity = newQuantity;
      setSelectedItems(newItems);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleCustomerSelect = (customer: any) => {
    setCustomerData(customer);
    form.setValue("email", customer.email);
    setShippingAddress({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
    });
    setCustomerSearch("");
  };

  const handleSubmit = () => {
    const draftOrderData = {
      email: customerData?.email || form.getValues("email"),
      region_id: form.getValues("region_id"),
      items: selectedItems.map((item) => ({
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        ...(item.is_custom ? { title: item.title, unit_price: item.unit_price } : {}),
        quantity: item.quantity,
      })),
      shipping_methods: [
        {
          option_id: selectedShippingMethod.id,
          ...(customShippingPrice !== null ? { price: customShippingPrice } : {}),
        },
      ],
      ...(customerData?.id ? { customer_id: customerData.id } : {}),
      shipping_address: shippingAddress,
      billing_address: useSameAddress ? shippingAddress : billingAddress,
      discount_code: form.getValues("discount_code") || undefined,
    };

    createDraftOrder(draftOrderData, {
      onSuccess: (draftOrder) => {
        toast.success("Draft order created successfully");
        setIsOpen(false);
        router.push(`/admin/orders/drafts/${draftOrder.id}`);
        setCurrentStep(0);
        setSelectedItems([]);
        setSelectedShippingMethod(null);
        setCustomerData(null);
        form.reset();
      },
      onError: (error) => {
        toast.error("Failed to create draft order");
        console.error(error);
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="region_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name} ({region.currency_code.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <Button type="button" variant="outline" onClick={handleAddCustomItem}>
                <Plus className="h-4 w-4 mr-2" />
                Custom Item
              </Button>
            </div>

            {productSearch && productVariants && productVariants.length > 0 && (
              <Card>
                <CardContent className="p-2">
                  {productVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                      onClick={() => handleAddProduct(variant)}
                    >
                      <div className="flex items-center gap-3">
                        {variant.product.thumbnail && (
                          <img
                            src={variant.product.thumbnail}
                            alt={variant.product.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{variant.product.title}</p>
                          <p className="text-sm text-muted-foreground">{variant.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: regions?.find((r) => r.id === form.getValues("region_id"))?.currency_code || "USD",
                          }).format(variant.prices[0]?.amount / 100 || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {selectedItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.is_custom && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: regions?.find((r) => r.id === form.getValues("region_id"))?.currency_code || "USD",
                        }).format(item.unit_price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(index, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => handleUpdateQuantity(index, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: regions?.find((r) => r.id === form.getValues("region_id"))?.currency_code || "USD",
                        }).format(item.unit_price * item.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-4">
              {shippingOptions?.map((option) => (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all ${
                    selectedShippingMethod?.id === option.id ? "border-primary ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedShippingMethod(option)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{option.name}</p>
                        <p className="text-sm text-muted-foreground">{option.provider_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: regions?.find((r) => r.id === form.getValues("region_id"))?.currency_code || "USD",
                          }).format(option.amount / 100)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedShippingMethod && (
              <div className="mt-4 p-4 border rounded-lg">
                <label className="text-sm font-medium">Custom Shipping Price (Optional)</label>
                <Input
                  type="number"
                  placeholder="Enter custom price"
                  value={customShippingPrice || ""}
                  onChange={(e) => setCustomShippingPrice(parseFloat(e.target.value) || null)}
                  className="mt-2"
                />
                {customShippingPrice !== null && customShippingPrice !== selectedShippingMethod.amount / 100 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Custom price will override the default shipping cost
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search existing customer by email or name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch && customers && customers.length > 0 && (
                <Card className="absolute z-10 w-full mt-1">
                  <CardContent className="p-2">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <p className="font-medium">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.first_name} {customer.last_name}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            <div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="customer@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="First Name"
                value={shippingAddress.first_name || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, first_name: e.target.value })}
              />
              <Input
                placeholder="Last Name"
                value={shippingAddress.last_name || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, last_name: e.target.value })}
              />
            </div>

            <Input
              placeholder="Address Line 1"
              value={shippingAddress.address_1 || ""}
              onChange={(e) => setShippingAddress({ ...shippingAddress, address_1: e.target.value })}
            />
            <Input
              placeholder="Address Line 2 (Optional)"
              value={shippingAddress.address_2 || ""}
              onChange={(e) => setShippingAddress({ ...shippingAddress, address_2: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="City"
                value={shippingAddress.city || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
              />
              <Input
                placeholder="Postal Code"
                value={shippingAddress.postal_code || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Province/State"
                value={shippingAddress.province || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={shippingAddress.phone || ""}
                onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-same-address"
                checked={useSameAddress}
                onCheckedChange={(checked) => setUseSameAddress(checked as boolean)}
              />
              <label htmlFor="use-same-address" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Same as shipping address
              </label>
            </div>

            {!useSameAddress && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={billingAddress.first_name || ""}
                    onChange={(e) => setBillingAddress({ ...billingAddress, first_name: e.target.value })}
                  />
                  <Input
                    placeholder="Last Name"
                    value={billingAddress.last_name || ""}
                    onChange={(e) => setBillingAddress({ ...billingAddress, last_name: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Address Line 1"
                  value={billingAddress.address_1 || ""}
                  onChange={(e) => setBillingAddress({ ...billingAddress, address_1: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="City"
                    value={billingAddress.city || ""}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                  />
                  <Input
                    placeholder="Postal Code"
                    value={billingAddress.postal_code || ""}
                    onChange={(e) => setBillingAddress({ ...billingAddress, postal_code: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        const selectedRegion = regions?.find((r) => r.id === form.getValues("region_id"));
        const subtotal = selectedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        const shippingTotal = customShippingPrice !== null ? customShippingPrice : (selectedShippingMethod?.amount / 100 || 0);
        const taxTotal = subtotal * ((selectedRegion?.tax_rate || 0) / 100);
        const discountTotal = 0; // Calculate discount if applied
        const total = subtotal + shippingTotal + taxTotal - discountTotal;

        return (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.title} x{item.quantity}
                          {item.is_custom && <Badge variant="secondary" className="ml-2">Custom</Badge>}
                        </span>
                        <span>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: selectedRegion?.currency_code || "USD",
                          }).format(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: selectedRegion?.currency_code || "USD" }).format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: selectedRegion?.currency_code || "USD" }).format(shippingTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({selectedRegion?.tax_rate || 0}%)</span>
                      <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: selectedRegion?.currency_code || "USD" }).format(taxTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: selectedRegion?.currency_code || "USD" }).format(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Email:</strong> {customerData?.email || form.getValues("email")}</p>
                  <p><strong>Name:</strong> {shippingAddress.first_name} {shippingAddress.last_name}</p>
                  <p><strong>Phone:</strong> {shippingAddress.phone}</p>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{shippingAddress.address_1}</p>
                  {shippingAddress.address_2 && <p>{shippingAddress.address_2}</p>}
                  <p>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}</p>
                </CardContent>
              </Card>

              {/* Discount Code */}
              <FormField
                control={form.control}
                name="discount_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter discount code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Create Draft Order</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{steps[currentStep].title}</DialogTitle>
          <DialogDescription>{steps[currentStep].description}</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={`flex flex-col items-center flex-1 ${
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep ? "border-primary bg-primary text-white" : "border-muted-foreground"
                  }`}
                >
                  {index < currentStep ? "✓" : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>

        <div className="py-4">{renderStep()}</div>

        <DialogFooter className="flex justify-between">
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Creating..." : "Create Draft Order"}
              </Button>
            ) : (
              <Button onClick={handleNext}>Next</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}