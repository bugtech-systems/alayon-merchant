// app/(dashboard)/company/_components/order-page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Package,
  Truck,
  Calendar,
  Hash,
  Globe,
  Mail,
  Phone,
} from 'lucide-react';

// Type definition for the full order object
type Order = {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  shipping_total: number;
  currency_code: string;
  email: string;
  customer_name: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
  region_id: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    formatted_unit_price: string;
    total: number;
    formatted_total: string;
    product_id: string;
    variant_id: string;
    thumbnail?: string;
  }>;
  shipping_address: {
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    phone?: string | null;
    formatted_address?: string;
  };
  shipping_methods: any[];
  payment_collections: Array<{
    id: string;
    status: string;
    amount: number;
    authorized_amount: number;
    captured_amount: number;
    refunded_amount: number;
    currency_code: string;
    created_at: string;
  }>;
  fulfillments: any[];
  summary: {
    paid_total: number;
    refunded_total: number;
    accounting_total: number;
    current_order_total: number;
    original_order_total: number;
  };
  formatted_total: string;
  formatted_subtotal: string;
  formatted_shipping: string;
  formatted_discount: string;
  formatted_tax: string;
  totalQuantity: number;
  item_count: number;
  unique_product_count: number;
  has_been_paid: boolean;
  has_been_fulfilled: boolean;
  created_date: string;
  days_since_created: number;
  status_display?: string;
  payment_status_display?: string;
  fulfillment_status_display?: string;
  version?: number;
};

interface OrderViewClientProps {
  order: Order;
}

export function OrderViewClient({ order: initialOrder }: OrderViewClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(order.status);
  const [customerEmail, setCustomerEmail] = useState<string>(order.email || '');
  const [addressLine1, setAddressLine1] = useState<string>(
    order.shipping_address?.address_1 || ''
  );
  const { toast } = useToast();

  // --- Action handlers ---
  const updateStatus = async () => {
    setIsLoading(true);
    // Replace with actual API call:
    // await medusaClient.admin.orders.update(order.id, { status: newStatus })
    setOrder((prev) => ({ ...prev, status: newStatus }));
    toast({ title: 'Status updated', description: `New status: ${newStatus}` });
    setIsLoading(false);
  };

  const assignCustomer = async () => {
    setIsLoading(true);
    // await medusaClient.admin.orders.update(order.id, { customer_id: customerId })
    toast({ title: 'Customer assigned', description: `Assigned to ${customerEmail}` });
    setIsLoading(false);
  };

  const assignAddress = async () => {
    setIsLoading(true);
    // await medusaClient.admin.orders.update(order.id, { shipping_address: { address_1: addressLine1 } })
    toast({ title: 'Address updated', description: `New address: ${addressLine1}` });
    setIsLoading(false);
  };

  const capturePayment = async () => {
    setIsLoading(true);
    // await medusaClient.admin.paymentCollections.capture(order.payment_collections[0].id)
    toast({ title: 'Payment captured', description: 'Payment has been captured.' });
    setIsLoading(false);
  };

  const allocateStock = async () => {
    setIsLoading(true);
    // await medusaClient.admin.orders.allocateStock(order.id)
    toast({ title: 'Stock allocated', description: 'Inventory has been allocated.' });
    setIsLoading(false);
  };

  const fulfillOrder = async () => {
    setIsLoading(true);
    // await medusaClient.admin.orders.fulfill(order.id)
    toast({ title: 'Order fulfilled', description: 'Order is now fulfilled.' });
    setIsLoading(false);
  };

  // --- Helpers ---
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-200 text-yellow-800',
      completed: 'bg-green-200 text-green-800',
      canceled: 'bg-red-200 text-red-800',
      archived: 'bg-gray-200 text-gray-800',
      requires_action: 'bg-blue-200 text-blue-800',
      authorized: 'bg-indigo-200 text-indigo-800',
      captured: 'bg-emerald-200 text-emerald-800',
      not_fulfilled: 'bg-gray-200 text-gray-800',
      fulfilled: 'bg-green-200 text-green-800',
      partially_fulfilled: 'bg-orange-200 text-orange-800',
    };
    return <Badge className={map[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const canCapturePayment = order.payment_collections?.some(
    (pc) => pc.status === 'authorized' && pc.captured_amount < pc.amount
  );

  return (
    // Full width with generous padding, no max-width constraint
    <div className="w-full px-4 md:px-8 py-4 md:py-6">
      {/* Header with Back Button and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Order #{order.display_id}</h1>
            {statusBadge(order.status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <Package className="mr-2 h-4 w-4" />
                Allocate Stock
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Allocate Stock?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will allocate inventory for this order.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={allocateStock}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <Truck className="mr-2 h-4 w-4" />
                Fulfill
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fulfill Order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the order as fulfilled.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={fulfillOrder}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {canCapturePayment && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" disabled={isLoading}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Capture Payment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Capture Payment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will capture the authorized payment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={capturePayment}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Order meta info */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatDate(order.created_at)}
        </span>
        <span className="flex items-center gap-1">
          <Hash className="h-4 w-4" />
          ID: {order.id.slice(0, 8)}…
        </span>
        <span className="flex items-center gap-1">
          <Globe className="h-4 w-4" />
          {order.region_id}
        </span>
      </div>

      {/* Main Grid - full width, no max-w */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Items + Summary + Payment Collections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {order.item_count} items ({order.totalQuantity} total quantity)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.thumbnail && (
                              <Image
                                src={item.thumbnail}
                                alt={item.title}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Variant: {item.variant_id?.slice(0, 8) || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.formatted_unit_price || item.unit_price}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.formatted_total || item.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{order.formatted_subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{order.formatted_shipping}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>{order.formatted_discount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{order.formatted_tax}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{order.formatted_total}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Payment</span>
                    <div>{statusBadge(order.payment_status)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fulfillment</span>
                    <div>{statusBadge(order.fulfillment_status)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items</span>
                    <div>{order.item_count}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Qty</span>
                    <div>{order.totalQuantity}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Collections */}
          {order.payment_collections?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Authorized</TableHead>
                      <TableHead className="text-right">Captured</TableHead>
                      <TableHead className="text-right">Refunded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payment_collections.map((pc) => (
                      <TableRow key={pc.id}>
                        <TableCell className="font-mono text-xs">{pc.id.slice(0, 8)}…</TableCell>
                        <TableCell>{statusBadge(pc.status)}</TableCell>
                        <TableCell className="text-right">
                          {pc.currency_code.toUpperCase()} {pc.amount}
                        </TableCell>
                        <TableCell className="text-right">{pc.authorized_amount}</TableCell>
                        <TableCell className="text-right">{pc.captured_amount}</TableCell>
                        <TableCell className="text-right">{pc.refunded_amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Actions and details */}
        <div className="space-y-6">
          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Current</Label>
                  <div className="mt-1">{statusBadge(order.status)}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="requires_action">Requires Action</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={updateStatus} disabled={isLoading}>
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{order.email}</span>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_phone}</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Customer email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                  <Button onClick={assignCustomer} disabled={isLoading} variant="outline">
                    Assign Customer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {order.shipping_address?.formatted_address ? (
                      <div>{order.shipping_address.formatted_address}</div>
                    ) : (
                      <div className="text-muted-foreground">No address provided</div>
                    )}
                    {order.shipping_address?.country_code && (
                      <div className="text-xs text-muted-foreground">
                        Country: {order.shipping_address.country_code.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Address line 1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                  <Button onClick={assignAddress} disabled={isLoading} variant="outline">
                    Update Address
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span>{order.region_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{order.currency_code.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{order.created_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days since</span>
                <span>{order.days_since_created} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>v{order.version || 1}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}