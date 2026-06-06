// components/print-dialog-grid.tsx
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Printer,
  QrCode,
  Smartphone,
  Loader2,
  Copy,
  Scissors,
  Ruler,
} from "lucide-react";
import { printOrder } from "@/lib/print-utils";
import { PrintOrderData, PrinterSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/print-utils";
import { cn } from "@/lib/utils";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: PrintOrderData;
}

export function PrintDialog({ open, onOpenChange, orderData }: PrintDialogProps) {
  const [printType, setPrintType] = useState<"receipt" | "kitchen">("receipt");
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    await printOrder(orderData, printType, printerSettings);
    setTimeout(() => {
      onOpenChange(false);
      setIsPrinting(false);
    }, 1500);
  };

  const getTotalItems = () => {
    return orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0"
        style={{ 
          display: "flex", 
          flexDirection: "column",
          height: "80vh",
          maxHeight: "600px",
        }}
      >
        {/* CSS Grid Layout for perfect sticky footer */}
        <div style={{ 
          display: "grid", 
          gridTemplateRows: "auto 1fr auto", 
          height: "100%",
          overflow: "hidden",
        }}>
          {/* Header - Auto height */}
          <div className="border-b px-6 py-4">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Order
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select print options for order #{orderData.orderNumber}
              </p>
            </DialogHeader>
          </div>

          {/* Scrollable Content - Takes remaining space */}
          <div className="overflow-y-auto px-6 py-4 space-y-6">
            {/* Print Type */}
            <div className="space-y-3">
              <Label>Print Type</Label>
              <RadioGroup
                value={printType}
                onValueChange={(v: any) => setPrintType(v)}
                className="grid grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                  printType === "receipt" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="receipt" id="receipt" />
                  <Label htmlFor="receipt" className="flex items-center gap-2 cursor-pointer">
                    <Printer className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Customer Receipt</div>
                      <div className="text-xs text-muted-foreground">Full receipt</div>
                    </div>
                  </Label>
                </div>
                
                <div className={cn(
                  "flex items-center space-x-2 p-3 border rounded-lg cursor-pointer",
                  printType === "kitchen" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="kitchen" id="kitchen" />
                  <Label htmlFor="kitchen" className="flex items-center gap-2 cursor-pointer">
                    <QrCode className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Kitchen Ticket</div>
                      <div className="text-xs text-muted-foreground">Items only</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Mobile Print Util Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Mobile Print Util</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Make sure the app is installed and Bluetooth printer is paired
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

            {/* Order Summary */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-medium text-sm">Order Summary</p>
              <div className="flex justify-between text-sm">
                <span>Items:</span>
                <span>{getTotalItems()} pcs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(orderData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(orderData.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer - Auto height, sticks to bottom */}
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
                    Print Order
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