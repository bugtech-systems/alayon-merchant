// components/print-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, QrCode, Smartphone, Monitor, Loader2 } from "lucide-react";
import { printOrder, printKitchenReceipt, type PrintOrderData, type PrinterSettings } from "@/lib/print-utils";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: PrintOrderData;
}

export function PrintDialog({ open, onOpenChange, orderData }: PrintDialogProps) {
  const [printType, setPrintType] = useState<"receipt" | "kitchen">("receipt");
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "80mm",
    copies: 1,
    autoCut: true,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      if (printType === "receipt") {
        await printOrder(orderData, printerSettings);
      } else {
        printKitchenReceipt(orderData);
      }
      
      // Close dialog after print attempt
      setTimeout(() => {
        onOpenChange(false);
        setIsPrinting(false);
      }, 1500);
    } catch (error) {
      console.error("Print error:", error);
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Order</DialogTitle>
          <DialogDescription>
            Select print options for order #{orderData.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Print Type Selection */}
          <div className="space-y-3">
            <Label>Print Type</Label>
            <RadioGroup
              value={printType}
              onValueChange={(v: any) => setPrintType(v)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="receipt" id="receipt" />
                <Label htmlFor="receipt" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Customer Receipt
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kitchen" id="kitchen" />
                <Label htmlFor="kitchen" className="flex items-center gap-2 cursor-pointer">
                  <QrCode className="h-4 w-4" />
                  Kitchen Ticket
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Printer Settings (only for receipt) */}
          {printType === "receipt" && (
            <>
              <div className="space-y-3">
                <Label>Paper Size</Label>
                <Select
                  value={printerSettings.paperSize}
                  onValueChange={(v: any) => setPrinterSettings(prev => ({ ...prev, paperSize: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm (Thermal)</SelectItem>
                    <SelectItem value="80mm">80mm (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Number of Copies</Label>
                <Select
                  value={printerSettings.copies.toString()}
                  onValueChange={(v) => setPrinterSettings(prev => ({ ...prev, copies: parseInt(v) }))}
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

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-cut">Auto Cut Paper</Label>
                <Switch
                  id="auto-cut"
                  checked={printerSettings.autoCut}
                  onCheckedChange={(checked) => setPrinterSettings(prev => ({ ...prev, autoCut: checked }))}
                />
              </div>
            </>
          )}

          {/* Print Method Info */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">Mobile Print</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Make sure Mobile Print Util app is installed and your Bluetooth printer is paired.
              The app will handle the printing automatically.
            </p>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">Order Summary</p>
            <div className="flex justify-between text-sm">
              <span>Items:</span>
              <span>{orderData.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span className="font-bold">{formatCurrency(orderData.total)}</span>
            </div>
          </div>
        </div>

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
      </DialogContent>
    </Dialog>
  );
}

// Helper function for formatting currency
function formatCurrency(amount: number): string {
  return `PHP ${amount.toFixed(2)}`;
}