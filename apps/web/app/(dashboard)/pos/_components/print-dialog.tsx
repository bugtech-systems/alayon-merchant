// components/print-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Printer,
  QrCode,
  Smartphone,
  Loader2,
  ExternalLink,
  Copy,
  Scissors,
  Ruler,
} from "lucide-react";
import { printOrder } from "@/lib/print-utils";
import { PrintOrderData, PrinterSettings } from "@/lib/types";
import { formatCurrency,  } from "@/lib/print-utils";

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
  const [printResult, setPrintResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintResult(null);
    
    const result = await printOrder(orderData, printType, printerSettings);
    setPrintResult(result);
    
    setTimeout(() => {
      if (result.success) {
        onOpenChange(false);
      }
      setIsPrinting(false);
    }, 2000);
  };

  const getTotalItems = () => {
    return orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Order
          </DialogTitle>
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
              className="grid grid-cols-2 gap-3"
            >
              <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer ${printType === "receipt" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="receipt" id="receipt" />
                <Label htmlFor="receipt" className="flex items-center gap-2 cursor-pointer w-full">
                  <Printer className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Customer Receipt</div>
                    <div className="text-xs text-muted-foreground">Full receipt with prices</div>
                  </div>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer ${printType === "kitchen" ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value="kitchen" id="kitchen" />
                <Label htmlFor="kitchen" className="flex items-center gap-2 cursor-pointer w-full">
                  <QrCode className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Kitchen Ticket</div>
                    <div className="text-xs text-muted-foreground">Items & quantities only</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mobile Print Util Info Card */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Mobile Print Util</span>
            </div>
            <p className="text-xs text-blue-700">
              This receipt will be printed using Mobile Print Util app.
              Make sure the app is installed and your Bluetooth printer is paired.
            </p>
          </div>

          {/* Printer Settings */}
          <div className="space-y-4">
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

          <div className="space-y-4">
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

          {/* Print Result Alert */}
          {printResult && (
            <Alert variant={printResult.success ? "default" : "destructive"}>
              <AlertDescription>
                {printResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Installation Info */}
          <Alert className="bg-blue-50 border-blue-200">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <p className="font-medium mb-1">Using Mobile Print Util:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>App will open automatically when you print</li>
                <li>If not installed, you'll be redirected to Play Store</li>
                <li>Make sure your printer is paired via Bluetooth</li>
                <li>Free version includes a small watermark</li>
              </ul>
            </AlertDescription>
          </Alert>

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
            <div className="flex justify-between text-sm font-bold">
              <span>Total:</span>
              <span>{formatCurrency(orderData.total)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handlePrint} 
            disabled={isPrinting}
          >
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