import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  CreditCard,
  Banknote,
  Loader2,
  UserIcon,
  Mail,
  Phone,
  MapPin,
  Package,
  Check,
  CheckCircle,
  Truck,
  Notebook,
} from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  display_id?: string;
  status: string;
  payment_status?: string;
  created_at?: string;
  orderDate?: string;
  total: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  notes?: string;
  email?: string;
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
    avatar?: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1: string;
    address_2?: string;
    city: string;
    province: string;
    postal_code: string;
    country_code?: string;
    phone?: string;
  };
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    is_custom?: boolean;
  }>;
}

interface OrderDetailsViewProps {
  order: Order;
}

export function OrderDetailsView({ order }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate totals
  const subtotal = order.items?.reduce(
    (sum: number, item: any) => sum + (item.unit_price * item.quantity), 
    0
  ) || 0;
  const total = order.total || subtotal;

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Action handlers
  const handleAction = (action: string) => {
    setIsLoading(true);
    toast.info(`Processing ${action}...`);
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`${action} completed successfully`);
    }, 1500);
  };

  console.log(order, "ORDER ")

  const OrderContent = () => (
    <div className="space-y-6">
      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription className="flex justify-between">
            <div>
            Order ID: {order?.delivery?.id.slice(-4) || order.display_id}
            </div>
             <div className="font-bold">
            Beeper: {order?.metadata?.beeper_ids?.join(',')}
            </div>
          </CardDescription>
          
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={"default"} className="mt-1">
                {order.status?.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-lg font-bold mt-1">{order.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm mt-1">
                {formatDate(order.created_at || order.orderDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4" />
            Customer Information
          </CardTitle>
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
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Phone className="size-3.5" />
                      Phone
                    </p>
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
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4" />
            Order Items
          </CardTitle>
          <CardDescription>
            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Separator className="my-4" />
          
          <div className="space-y-1 text-right">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {(order.shipping_total || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span>{formatCurrency(order.shipping_total || 0)}</span>
              </div>
            )}
            {(order.tax_total || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(order.tax_total || 0)}</span>
              </div>
            )}
            {(order.discount_total || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-green-600">-{formatCurrency(order.discount_total || 0)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
     {order?.metadata?.notes &&    <Card>
              <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Notebook className="size-4" />
         Notes
          </CardTitle>
        </CardHeader>   
            <CardContent>
                {order?.metadata.notes}
              </CardContent> 
        </Card>
        }
      {/* Shipping Address */}
      {order.shipping_address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping_address.first_name && order.shipping_address.last_name && (
              <p className="text-sm">
                {order.shipping_address.first_name} {order.shipping_address.last_name}
              </p>
            )}
            <p className="text-sm">{order.shipping_address.address_1}</p>
            {order.shipping_address.address_2 && (
              <p className="text-sm">{order.shipping_address.address_2}</p>
            )}
            <p className="text-sm">
              {order.shipping_address.city}, {order.shipping_address.province}{" "}
              {order.shipping_address.postal_code}
            </p>
            <p className="text-sm">
              {order.shipping_address.country_code?.toUpperCase()}
            </p>
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

  return (
    <>
     <Button variant="ghost" onClick={() => setIsDialogOpen(true)}>
        {order?.display_id}
     </Button>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Order Details  #{order?.display_id}
          </DialogTitle>
          <DialogDescription>
            Complete order information and items
          </DialogDescription>
        </DialogHeader>

        <OrderContent />

        <DialogFooter>


          {/* Order-specific actions */}
          {order.status === "pending" && (
            <Button
              onClick={() => handleAction("accepting order")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Accept Order
            </Button>
          )}

          {order.status === "accepted" && (
            <Button
              onClick={() => handleAction("preparing order")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              Start Preparing
            </Button>
          )}

          {order.status === "preparing" && (
            <Button
              onClick={() => handleAction("marking order as ready")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark as Ready
            </Button>
          )}

          {order.status === "ready" && (
            <Button
              onClick={() => handleAction("assigning driver")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              Assign Driver
            </Button>
          )}

          {order.payment_status === "authorized" && (
            <Button
              onClick={() => handleAction("capturing payment")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="mr-2 h-4 w-4" />
              )}
              Capture Payment
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={() => setIsDialogOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>

  );
}