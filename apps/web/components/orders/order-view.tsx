// components/orders/order-view.tsx
import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, CreditCard, Package, Calendar, Mail, User } from 'lucide-react';

interface OrderViewProps {
  order: any;
}

export function OrderView({ order }: OrderViewProps) {
  const calculateSubtotal = () => {
    return order.items?.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Order #{order.display_id}</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), 'PPP pp')}
          </p>
        </div>
        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
          {order.status}
        </Badge>
      </div>

      <Separator />

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">
              {order.customer?.first_name} {order.customer?.last_name}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {order.email}
            </p>
            {order.customer?.phone && (
              <p className="text-sm text-muted-foreground">
                Phone: {order.customer.phone}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping_address ? (
              <div className="space-y-1 text-sm">
                <p>{order.shipping_address.address_1}</p>
                {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country_code?.toUpperCase()}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No shipping address provided</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Status:</span>
              <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                {order.payment_status || 'pending'}
              </Badge>
            </div>
            {order.payments && order.payments[0] && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Method:</span>
                  <span className="capitalize">{order.payments[0].provider_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span>${(order.payments[0].amount / 100).toFixed(2)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${(calculateSubtotal() / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping:</span>
              <span>${((order.shipping_total || 0) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>${((order.tax_total || 0) / 100).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${((order.total || 0) / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between border-b last:border-0 pb-4">
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.variant?.sku || 'N/A'} | Quantity: {item.quantity}
                  </p>
                  {item.variant?.options && (
                    <p className="text-xs text-muted-foreground">
                      {item.variant.options.map((opt: any) => opt.value).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.unit_price / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Total: ${((item.unit_price * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {order.fulfillments && order.fulfillments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.fulfillments.map((fulfillment: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {fulfillment.tracking_number ? 'Shipped' : 'Processing'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(fulfillment.created_at), 'PPP')}
                    </p>
                    {fulfillment.tracking_number && (
                      <p className="text-sm">
                        Tracking: {fulfillment.tracking_number}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}