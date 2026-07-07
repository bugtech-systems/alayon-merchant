'use client'

import { DeliveryDTO, DriverDTO } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Package,
  Calendar,
  MapPin,
  User,
  Hash,
  CreditCard,
  Store,
  Truck,
  ShoppingBag,
  Clock,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Box,
  Receipt,
} from "lucide-react";
import DriverDeliveryButtons from "./driver/delivery-buttons";
import { DriverDeliveryStatusBadge } from "./driver/delivery-status-badge";
import CompanyDeliveryButtons from "./company/delivery-buttons";
import { CompanyDeliveryBadgeStatus } from "./company/delivery-status-badge";

interface OrderItem {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail: string;
  variant_id: string;
  product_id: string;
  product_title: string;
  product_description: string;
  variant_sku: string;
  variant_title: string;
  quantity: number;
  unit_price: number;
  metadata: {
    original_price?: number;
    applied_unit_price?: number;
    discount_amount?: number;
    discount_percentage?: number;
    custom_unit_price?: number;
    original_unit_price?: number;
    price_list_price?: number;
    [key: string]: any;
  };
  detail: {
    quantity: number;
    fulfilled_quantity: number;
    delivered_quantity: number;
    shipped_quantity: number;
  };
}

interface Order {
  id: string;
  display_id: number;
  status: string;
  currency_code: string;
  created_at: string;
  items: OrderItem[];
  shipping_address: {
    id: string;
  };
  metadata: {
    seller_id?: string;
    company_id?: string;
    delivery_id?: string;
    price_list_id?: string;
    [key: string]: any;
  };
}

export default function DeliveryCard({
  delivery,
  driver,
  type,
  compact = false,
}: {
  delivery: DeliveryDTO;
  driver?: DriverDTO;
  type: "company" | "driver" | any;
  compact?: boolean;
}) {
  if (!delivery || delivery === null) return null;

  const order = delivery.order as Order;
  const items = order?.items || delivery.cart?.items || [];
  const isDriver = type === "driver";
  const isCompany = type === "company";

  // Calculate order totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const discountTotal = items.reduce(
    (sum, item) => sum + ((item.metadata?.discount_amount || 0) * item.quantity),
    0
  );
  const total = subtotal - discountTotal;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: order?.currency_code || "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Compact mode for column views
  if (compact) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-primary group">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">
                  Order #{order?.display_id || delivery?.id?.slice(-6)}
                </p>
                {isDriver && <DriverDeliveryStatusBadge delivery={delivery} />}
                {isCompany && <CompanyDeliveryBadgeStatus delivery={delivery} />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{items.length} items</span>
                <span>•</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
                {discountTotal > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-500 line-through">
                      {formatPrice(subtotal + discountTotal)}
                    </span>
                  </>
                )}
              </div>
              {order?.created_at && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(order.created_at)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isDriver && driver && (
                <DriverDeliveryButtons delivery={delivery} driver={driver} />
              )}
              {isCompany && <CompanyDeliveryButtons delivery={delivery} />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full mode
  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-b p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">
                Order #{order?.display_id || delivery?.id?.slice(-6)}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              <span className="font-mono text-xs">{delivery?.id?.slice(-8)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3" />
              {formatDate(order?.created_at || delivery?.created_at)}
            </Badge>
            {isDriver && <DriverDeliveryStatusBadge delivery={delivery} />}
            {isCompany && <CompanyDeliveryBadgeStatus delivery={delivery} />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
            <div className="text-2xl font-bold text-primary">
              {totalItems}
            </div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(subtotal)}
            </div>
            <div className="text-xs text-muted-foreground">Subtotal</div>
          </div>
          {discountTotal > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
              <div className="text-2xl font-bold text-red-500">
                -{formatPrice(discountTotal)}
              </div>
              <div className="text-xs text-muted-foreground">Discount</div>
            </div>
          )}
          <div className="bg-muted/30 rounded-lg p-3 text-center hover:bg-muted/50 transition-colors">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatPrice(total)}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        <Separator />

        {/* Order Details Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border rounded-lg px-2">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Order Details</span>
                <Badge variant="secondary" className="ml-2">
                  {items.length} items
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2 pb-4">
                {/* Order Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded-lg">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Seller:</span>
                      <span className="font-medium truncate">
                        {order?.metadata?.seller_id || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded-lg">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Delivery:</span>
                      <span className="font-medium truncate">
                        {order?.metadata?.delivery_id || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded-lg">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium uppercase">
                        {order?.currency_code || "PHP"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded-lg">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {order?.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items Table */}
                <div className="rounded-md border overflow-hidden">
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[40%]">Product</TableHead>
                          <TableHead className="w-[20%] text-center hidden sm:table-cell">
                            SKU
                          </TableHead>
                          <TableHead className="w-[15%] text-center">
                            Qty
                          </TableHead>
                          <TableHead className="w-[25%] text-right">
                            Price
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/20">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.thumbnail ? (
                                  <Avatar className="h-12 w-12 rounded-md border">
                                    <AvatarImage
                                      src={item.thumbnail}
                                      alt={item.title}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="rounded-md">
                                      {getInitials(item.title)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                                    <Box className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm truncate">
                                    {item.title}
                                  </div>
                                  {item.subtitle && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {item.subtitle}
                                    </div>
                                  )}
                                  {item.metadata?.discount_percentage > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="mt-1 text-xs"
                                    >
                                      {item.metadata.discount_percentage}% OFF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs hidden sm:table-cell">
                              {item.variant_sku || "N/A"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">
                                x{item.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {formatPrice(item.unit_price * item.quantity)}
                                </div>
                                {item.metadata?.original_unit_price > item.unit_price && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    {formatPrice(
                                      item.metadata.original_unit_price *
                                        item.quantity
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Summary */}
                <div className="flex flex-wrap justify-between gap-2 text-sm bg-muted/20 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium text-red-500">
                        -{formatPrice(discountTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-lg text-primary">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      {/* Footer with Actions */}
      <CardFooter className="bg-muted/10 border-t p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-end w-full">
          {isDriver && driver && (
            <DriverDeliveryButtons delivery={delivery} driver={driver} />
          )}
          {isCompany && <CompanyDeliveryButtons delivery={delivery} />}
        </div>
      </CardFooter>
    </Card>
  );
}