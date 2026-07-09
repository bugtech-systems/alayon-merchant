"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Printer,
  Smartphone,
  Loader2,
  Copy,
  Scissors,
  Ruler,
  Receipt,
} from "lucide-react";
import { printOrder } from "@/lib/print-utils";
import { PrintOrderData, PrinterSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/print-utils";
import { cn } from "@/lib/utils";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: any;
  receiptData?: any;
  region?: any;
}

function formatCartToPrintData(cart: any, receiptData?: any): PrintOrderData {
  // Use receiptData if provided (from completed order)
  if (receiptData) {
    return {
      merchant: {
        name: "BELLY BYTES",
        address: "016 Dadison Street, Barangay 56, Tacloban City",
        phone: "(02) 8123 4567",
        tax_id: "123-456-789-000",
      },
      orderNumber: receiptData.display_id?.toString() || receiptData.order_id?.slice(-8).toUpperCase(),
      date: new Date(receiptData.timestamp),
      customer: receiptData.customer ? {
        name: receiptData.customer.first_name,
        email: receiptData.customer.email,
        phone: receiptData.customer.phone,
      } : undefined,
      placement: {
        type: receiptData.tables?.length > 0 ? "table" : "takeaway",
        name: receiptData.tables?.length > 0 ? `Table ${receiptData.tables.join(', ')}` : "Takeaway",
        tables: receiptData.tables,
      },
      items: receiptData.items?.map((item: any) => ({
        id: item.id,
        name: item.title,
        quantity: item.quantity,
        price: item.unit_price,
        unit_price: item.unit_price,
        total: item.subtotal,
        variant: item.variant_title,
        is_custom_priced: item.is_custom_priced,
        original_price: item.original_unit_price,
      })),
      subtotal: receiptData.totals?.subtotal,
      tax: receiptData.totals?.tax,
      taxRate: receiptData.totals?.tax ? (receiptData.totals.tax / receiptData.totals.subtotal) : 0,
      discount_total: receiptData.pricing_info?.total_discount || 0,
      shipping_total: 0,
      total: receiptData.totals?.total,
      paymentMethod: receiptData.payment?.method || "Cash",
      paymentDetails: {
        amount: receiptData.payment?.amount,
        change: receiptData.payment?.change,
        timestamp: receiptData.payment?.timestamp,
      },
      notes: receiptData.notes,
      pricing_info: receiptData.pricing_info,
      autoCut: true,
      copies: 1,
    };
  }

  // Format from cart data for draft/current order
  const taxRate = cart?.tax_rate || 0;
  const taxTotal = cart?.tax_total || 0;
  const subtotal = cart?.subtotal || 0;
  
  let calculatedTaxRate = 0;
  if (subtotal > 0 && taxTotal > 0) {
    calculatedTaxRate = taxTotal / subtotal;
  }

  const items = cart?.items?.map((item: any) => ({
    id: item.id,
    name: item.title,
    quantity: item.quantity,
    price: item.unit_price,
    unit_price: item.unit_price,
    total: item.subtotal || (item.unit_price * item.quantity),
    variant: item.variant?.title || item.variant_title,
    notes: item.note,
    is_giftcard: item.is_giftcard || false,
    is_custom_priced: item.is_custom_priced,
    original_price: item.original_unit_price,
  }));

  const customerName = cart?.customer 
    ? `${cart.customer.first_name || ''} ${cart.customer.last_name || ''}`.trim()
    : cart?.metadata?.customer_name;

  let placementType: "table" | "takeaway" | "delivery" = "takeaway";
  let placementName = "Takeaway";
  let tables: string[] = [];
  
  if (cart?.metadata?.table_ids && cart.metadata.table_ids.length > 0) {
    placementType = "table";
    tables = cart.metadata.table_ids;
    placementName = `Table ${tables.join(', ')}`;
  } else if (cart?.metadata?.placement_type) {
    placementType = cart.metadata.placement_type;
    placementName = cart.metadata.placement_name;
  } else if (cart?.shipping_methods && cart.shipping_methods.length > 0) {
    placementType = "delivery";
    placementName = cart.shipping_methods[0].shipping_option?.name || "Delivery";
  }

  let paymentMethod = "Cash";
  if (cart?.payment_session?.provider_id) {
    const provider = cart.payment_session.provider_id;
    if (provider === "cash") paymentMethod = "Cash";
    else if (provider.includes("stripe")) paymentMethod = "Card";
    else if (provider === "gcash") paymentMethod = "GCash";
    else paymentMethod = provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  // Calculate custom pricing info
  const customPricedItems = items?.filter((i: any) => i.is_custom_priced) || [];
  const totalDiscount = items?.reduce((sum: number, item: any) => {
    if (item.original_price && item.original_price > item.price) {
      return sum + ((item.original_price - item.price) * item.quantity);
    }
    return sum;
  }, 0) || 0;

  return {
    merchant: {
      name: "BELLY BYTES",
      address: "016 Dadison Street, Barangay 56, Tacloban City",
      phone: "(02) 8123 4567",
      tax_id: "123-456-789-000",
    },
    orderNumber: cart?.id?.slice(-8).toUpperCase(),
    date: new Date(cart?.updated_at || cart?.created_at),
    customer: customerName ? {
      name: customerName,
      email: cart?.customer?.email || cart?.metadata?.customer_email,
      phone: cart?.customer?.phone,
    } : undefined,
    placement: {
      type: placementType,
      name: placementName,
      tables: tables,
    },
    items: items,
    subtotal: subtotal,
    tax: taxTotal,
    taxRate: calculatedTaxRate,
    discount_total: cart?.discount_total || totalDiscount,
    shipping_total: cart?.shipping_total || 0,
    total: cart?.total || 0,
    paymentMethod: paymentMethod,
    notes: cart?.metadata?.notes,
    pricing_info: {
      strategy: cart?.metadata?.pricing_strategy,
      has_custom_prices: customPricedItems.length > 0,
      price_list_applied: !!cart?.metadata?.price_list_id,
      total_discount: totalDiscount,
      custom_prices_count: customPricedItems.length,
    },
    autoCut: true,
    copies: 1,
  };
}

export function PrintDialog({ open, onOpenChange, cart, receiptData, region }: PrintDialogProps) {
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
    printType: true
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<PrintOrderData | null>(null);

  const handlePrint = async () => {
    if (!printData) return;
    
    setIsPrinting(true);
    try {
      // Print with copies setting
      for (let i = 0; i < printerSettings.copies; i++) {
        await printOrder(printData, printerSettings?.printType ? "receipt" : "kitchen", printerSettings);
        // Small delay between copies
        if (i < printerSettings.copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Print error:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const getTotalItems = () => {
    if (!printData) return 0;
    return printData.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const getCustomPricedCount = () => {
    if (!printData) return 0;
    return printData.items?.filter(item => item.is_custom_priced).length || 0;
  };

  useEffect(() => {
    if (open && (cart || receiptData)) {
      const formattedData = formatCartToPrintData(cart, receiptData);
      setPrintData(formattedData);
    }
  }, [cart, receiptData, open]);

  if (!printData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0"
        style={{ 
          display: "flex", 
          flexDirection: "column",
          height: "auto",
          maxHeight: "90vh",
        }}
      >
        <div style={{ 
          display: "grid", 
          gridTemplateRows: "auto 1fr auto", 
          height: "100%",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div className="border-b px-6 py-4">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Print Receipt
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Print customer receipt for order #{printData.orderNumber}
              </p>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 py-4 space-y-6">
            {/* Mobile Print Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Mobile Print Ready</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Make sure Bluetooth printer is paired and selected
              </p>
            </div>

            {/* Paper Size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <Label>Paper Size</Label>
              </div>
              <Select
                value={printerSettings.paperSize}
                onValueChange={(v: "58mm" | "80mm") => 
                  setPrinterSettings(prev => ({ ...prev, paperSize: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Thermal) - Recommended</SelectItem>
                  <SelectItem value="80mm">80mm (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Copies */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                <Label>Number of Copies</Label>
              </div>
              <Select
                value={printerSettings.copies.toString()}
                onValueChange={(v) => 
                  setPrinterSettings(prev => ({ ...prev, copies: parseInt(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Copy</SelectItem>
                  <SelectItem value="2">2 Copies</SelectItem>
                  <SelectItem value="3">3 Copies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Cut */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                <Label htmlFor="auto-cut">Auto Cut Paper</Label>
              </div>
              <Switch
                id="auto-cut"
                checked={printerSettings.autoCut}
                onCheckedChange={(checked) => 
                  setPrinterSettings(prev => ({ ...prev, autoCut: checked }))
                }
              />
            </div>
            {/* Type Cut */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                <Label htmlFor="print-type">Receipt?</Label>
              </div>
              <Switch
                id="print-type"
                checked={printerSettings.printType}
                onCheckedChange={(checked) => 
                  setPrinterSettings(prev => ({ ...prev, printType: checked }))
                }
              />
            </div>
            {/* Order Summary */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-medium text-sm">Order Summary</p>
              <div className="flex justify-between text-sm">
                <span>Items:</span>
                <span>{getTotalItems()} pcs</span>
              </div>
              {getCustomPricedCount() > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Custom Priced Items:</span>
                  <span>{getCustomPricedCount()} item(s)</span>
                </div>
              )}
              {printData.pricing_info?.price_list_applied && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Price List Applied:</span>
                  <span>✓</span>
                </div>
              )}
              {printData.pricing_info?.total_discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Total Discount:</span>
                  <span>-{formatCurrency(printData.pricing_info.total_discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(printData.subtotal)}</span>
              </div>
              {printData.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({Math.round(printData.taxRate * 100)}%):</span>
                  <span>{formatCurrency(printData.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(printData.total)}</span>
              </div>
            </div>

            {/* Receipt Preview Note */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">Receipt Preview</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receipt will include: order details, items with prices, 
                {printData.pricing_info?.has_custom_prices && " custom price indicators,"}
                payment information, and thank you message.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}