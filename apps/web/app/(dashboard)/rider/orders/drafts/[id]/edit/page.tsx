// app/admin/orders/drafts/[id]/edit/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Plus, Minus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useDraftOrder, useUpdateDraftOrder, useAddLineItem, useRemoveLineItem, useUpdateLineItem, useSearchProducts, useRegions, useShippingOptions } from "@/hooks/use-draft-orders";

const editDraftOrderSchema = z.object({
  email: z.string().email("Invalid email address"),
  discount_code: z.string().optional(),
  shipping_method_id: z.string().optional(),
  custom_shipping_price: z.number().optional(),
});

type EditDraftOrderFormValues = z.infer<typeof editDraftOrderSchema>;

export default function EditDraftOrderPage() {
  const params = useParams();
  const router = useRouter();
  const draftOrderId = params.id as string;

  const [productSearch, setProductSearch] = useState("");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);
  const [customShippingPrice, setCustomShippingPrice] = useState<number | null>(null);

  const { data: draftOrder, isLoading, refetch } = useDraftOrder(draftOrderId);
  const { mutate: updateDraftOrder, isPending: isUpdating } = useUpdateDraftOrder();
  const { mutate: addLineItem } = useAddLineItem();
  const { mutate: removeLineItem } = useRemoveLineItem();
  const { mutate: updateLineItem } = useUpdateLineItem();
  const { data: productVariants } = useSearchProducts(productSearch);
  const { data: regions } = useRegions();
  const { data: shippingOptions } = useShippingOptions(draftOrder?.region_id || "");

  const form = useForm<EditDraftOrderFormValues>({
    resolver: zodResolver(editDraftOrderSchema),
    defaultValues: {
      email: draftOrder?.email || "",
      discount_code: draftOrder?.discount_code || "",
    },
  });

  // Update form when draft order loads
  useState(() => {
    if (draftOrder) {
      form.reset({
        email: draftOrder.email,
        discount_code: draftOrder.discount_code || "",
      });
      if (draftOrder.shipping_methods?.[0]) {
        setSelectedShippingMethod(draftOrder.shipping_methods[0]);
      }
    }
  });

  const handleAddProduct = (variant: any) => {
    addLineItem({
      draftOrderId,
      item: {
        variant_id: variant.id,
        quantity: 1,
      },
    }, {
      onSuccess: () => {
        toast.success("Item added successfully");
        refetch();
        setProductSearch("");
      },
      onError: (error) => {
        toast.error("Failed to add item");
        console.error(error);
      },
    });
  };

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    updateLineItem({
      draftOrderId,
      lineItemId,
      quantity,
    }, {
      onSuccess: () => {
        refetch();
      },
      onError: (error) => {
        toast.error("Failed to update quantity");
        console.error(error);
      },
    });
  };

  const handleRemoveItem = (lineItemId: string) => {
    removeLineItem({
      draftOrderId,
      lineItemId,
    }, {
      onSuccess: () => {
        toast.success("Item removed");
        refetch();
      },
      onError: (error) => {
        toast.error("Failed to remove item");
        console.error(error);
      },
    });
  };

  const handleAddCustomItem = () => {
    const title = prompt("Enter item title");
    const price = parseFloat(prompt("Enter price") || "0");
    const quantity = parseInt(prompt("Enter quantity") || "1");

    if (title && price > 0 && quantity > 0) {
      addLineItem({
        draftOrderId,
        item: {
          title,
          unit_price: price,
          quantity,
        },
      }, {
        onSuccess: () => {
          toast.success("Custom item added");
          refetch();
        },
        onError: (error) => {
          toast.error("Failed to add custom item");
          console.error(error);
        },
      });
    }
  };

  const handleSubmit = (data: EditDraftOrderFormValues) => {
    const updateData: any = {
      email: data.email,
      discount_code: data.discount_code,
    };

    if (selectedShippingMethod) {
      updateData.shipping_methods = [
        {
          option_id: selectedShippingMethod.id,
          ...(customShippingPrice !== null ? { price: customShippingPrice } : {}),
        },
      ];
    }

    updateDraftOrder({
      id: draftOrderId,
      ...updateData,
    }, {
      onSuccess: () => {
        toast.success("Draft order updated successfully");
        router.push(`/admin/orders/drafts/${draftOrderId}`);
      },
      onError: (error) => {
        toast.error("Failed to update draft order");
        console.error(error);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!draftOrder) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Draft Order Not Found</h2>
          <Button className="mt-4" onClick={() => router.push("/admin/orders/drafts")}>
            Back to Draft Orders
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = draftOrder.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const selectedRegion = regions?.find((r) => r.id === draftOrder.region_id);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Draft Order</h2>
          <p className="text-muted-foreground">Modify items, quantities, and customer details</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>Add or remove items from this draft order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Search and add products..."
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
                  <Card className="border shadow-lg">
                    <CardContent className="p-2 max-h-64 overflow-y-auto">
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
                                currency: selectedRegion?.currency_code || "USD",
                              }).format(variant.prices[0]?.amount / 100 || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

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
                    {draftOrder.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            {item.is_custom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: selectedRegion?.currency_code || "USD",
                          }).format(item.unit_price / 100)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item.id!, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleUpdateQuantity(item.id!, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: selectedRegion?.currency_code || "USD",
                          }).format((item.unit_price * item.quantity) / 100)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveItem(item.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {draftOrder.items?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Add products or custom items above.
                  </div>
                )}

                <Separator />

                <div className="space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: selectedRegion?.currency_code || "USD",
                      }).format(subtotal / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: selectedRegion?.currency_code || "USD",
                      }).format(draftOrder.total / 100)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter discount code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    onValueChange={(value) => {
                      const option = shippingOptions?.find((o) => o.id === value);
                      setSelectedShippingMethod(option);
                    }}
                    value={selectedShippingMethod?.id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping method" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingOptions?.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} - {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: selectedRegion?.currency_code || "USD",
                          }).format(option.amount / 100)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedShippingMethod && (
                    <div>
                      <label className="text-sm font-medium">Custom Price (Optional)</label>
                      <Input
                        type="number"
                        placeholder="Enter custom price"
                        value={customShippingPrice || ""}
                        onChange={(e) => setCustomShippingPrice(parseFloat(e.target.value) || null)}
                        className="mt-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/orders/drafts/${draftOrderId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}