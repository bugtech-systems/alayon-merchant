// app/admin/orders/drafts/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CreditCard, Package, Truck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useDraftOrder, useConvertDraftOrder } from "@/hooks/use-draft-orders";

export default function DraftOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const draftOrderId = params.id as string;

  const { data: draftOrder, isLoading, error } = useDraftOrder(draftOrderId);
  const { mutate: convertDraftOrder, isPending: isConverting } = useConvertDraftOrder();

  const handleConvert = () => {
    convertDraftOrder(draftOrderId, {
      onSuccess: (order) => {
        toast.success("Draft order converted to order successfully");
        router.push(`/admin/orders/${order.id}`);
      },
      onError: (error) => {
        toast.error("Failed to convert draft order");
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !draftOrder) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Draft Order Not Found</h2>
          <p className="text-muted-foreground">The draft order you're looking for doesn't exist or has been deleted.</p>
          <Button className="mt-4" onClick={() => router.push("/admin/orders/drafts")}>
            Back to Draft Orders
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = draftOrder.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
  const shippingTotal = draftOrder.shipping_total || 0;
  const taxTotal = draftOrder.tax_total || 0;
  const discountTotal = draftOrder.discount_total || 0;
  const total = draftOrder.total || 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Draft Order {draftOrder.id}</h2>
            <p className="text-muted-foreground">
              Created on {draftOrder.created_at && format(new Date(draftOrder.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/orders/drafts/${draftOrder.id}/edit`)}>
            Edit Draft Order
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            <CreditCard className="mr-2 h-4 w-4" />
            {isConverting ? "Converting..." : "Convert to Order"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: draftOrder.region?.currency_code || "USD",
              }).format(total / 100)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftOrder.items?.length || 0}</div>
            <p className="text-xs text-muted-foreground">products in order</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{draftOrder.email}</div>
            <p className="text-xs text-muted-foreground">
              {draftOrder.customer?.first_name} {draftOrder.customer?.last_name}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Draft</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
            <CardDescription>Products included in this draft order</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftOrder.items?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.is_custom && <Badge variant="secondary" className="mt-1">Custom</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: draftOrder.region?.currency_code || "USD",
                      }).format(item.unit_price / 100)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: draftOrder.region?.currency_code || "USD",
                      }).format((item.unit_price * item.quantity) / 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="space-y-1 text-right">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: draftOrder.region?.currency_code || "USD",
                  }).format(subtotal / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: draftOrder.region?.currency_code || "USD",
                  }).format(shippingTotal / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: draftOrder.region?.currency_code || "USD",
                  }).format(taxTotal / 100)}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-green-600">
                    -{new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: draftOrder.region?.currency_code || "USD",
                    }).format(discountTotal / 100)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: draftOrder.region?.currency_code || "USD",
                  }).format(total / 100)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{draftOrder.email}</p>
              </div>
              {draftOrder.customer && (
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {draftOrder.customer.first_name} {draftOrder.customer.last_name}
                  </p>
                </div>
              )}
              {draftOrder.customer?.phone && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{draftOrder.customer.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {draftOrder.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {draftOrder.shipping_address.first_name} {draftOrder.shipping_address.last_name}
                </p>
                <p className="text-sm">{draftOrder.shipping_address.address_1}</p>
                {draftOrder.shipping_address.address_2 && <p className="text-sm">{draftOrder.shipping_address.address_2}</p>}
                <p className="text-sm">
                  {draftOrder.shipping_address.city}, {draftOrder.shipping_address.province} {draftOrder.shipping_address.postal_code}
                </p>
                <p className="text-sm">{draftOrder.shipping_address.country_code?.toUpperCase()}</p>
                {draftOrder.shipping_address.phone && <p className="text-sm">{draftOrder.shipping_address.phone}</p>}
              </CardContent>
            </Card>
          )}

          {draftOrder.shipping_methods && draftOrder.shipping_methods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Method</CardTitle>
              </CardHeader>
              <CardContent>
                {draftOrder.shipping_methods.map((method, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium">{method.name || "Shipping"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: draftOrder.region?.currency_code || "USD",
                      }).format(method.price / 100)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}