// components/orders/order-view.tsx
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrderViewProps {
  order: any;
  isDraft?: boolean;
}

export function OrderView({ order, isDraft = false }: OrderViewProps) {
  const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0) || 0;
  const total = order.total || subtotal;

  return (
    <div className="space-y-6">
      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription>
            {isDraft ? 'Draft Order' : 'Order'} ID: {order.id}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={isDraft ? "outline" : "default"} className="mt-1">
                {isDraft ? 'Draft' : order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold mt-1">₱{total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-lg font-bold mt-1">{order.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm mt-1">
                {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{order.email || '—'}</p>
            </div>
            {order.customer && (
              <>
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customer.first_name} {order.customer.last_name}
                  </p>
                </div>
                {order.customer.phone && (
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
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
              {order.items?.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.is_custom && (
                        <Badge variant="secondary" className="mt-1">Custom</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell>₱{(item.unit_price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Separator className="my-4" />
          
          <div className="space-y-1 text-right">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {order.shipping_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span>₱{order.shipping_total.toFixed(2)}</span>
              </div>
            )}
            {order.tax_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>₱{order.tax_total.toFixed(2)}</span>
              </div>
            )}
            {order.discount_total > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-green-600">-₱{order.discount_total.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      {order.shipping_address && (
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {order.shipping_address.first_name} {order.shipping_address.last_name}
            </p>
            <p className="text-sm">{order.shipping_address.address_1}</p>
            {order.shipping_address.address_2 && (
              <p className="text-sm">{order.shipping_address.address_2}</p>
            )}
            <p className="text-sm">
              {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}
            </p>
            <p className="text-sm">{order.shipping_address.country_code?.toUpperCase()}</p>
            {order.shipping_address.phone && (
              <p className="text-sm">{order.shipping_address.phone}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}