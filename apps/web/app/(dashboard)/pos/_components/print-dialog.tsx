// components/print-dialog.tsx (updated)

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
  TabletSmartphone,
} from "lucide-react";
import { printOrder, printKitchenReceipt, formatCurrency, PrinterSettings } from "@/lib/print-utils";

export function PrintDialog({ open, onOpenChange, orderData }: any) {
  const [printType, setPrintType] = useState<"receipt" | "kitchen">("receipt");
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
    printApp: "mobile-print-util",
  });
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      if (printType === "receipt") {
        await printOrder(orderData, printerSettings);
      } else {
        await printKitchenReceipt(orderData);
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
              {/* Print App Selection - Simplified */}
              <div className="space-y-3">
                <Label>Print App</Label>
                <RadioGroup
                  value={printerSettings.printApp}
                  onValueChange={(v: any) => 
                    setPrinterSettings(prev => ({ ...prev, printApp: v }))
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="mobile-print-util" id="mobile-print-util" />
                      <Label htmlFor="mobile-print-util" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span>Mobile Print Util</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Simple text printing, free with watermark
                        </p>
                      </Label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="rawbt" id="rawbt" />
                      <Label htmlFor="rawbt" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <TabletSmartphone className="h-4 w-4" />
                          <span>RawBT</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ESC/POS support, larger fonts, no watermark
                        </p>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Paper Size */}
              <div className="space-y-3">
                <Label>Paper Size</Label>
                <Select
                  value={printerSettings.paperSize}
                  onValueChange={(v: any) => 
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

              {/* Number of Copies */}
              <div className="space-y-3">
                <Label>Number of Copies</Label>
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

              {/* Auto Cut Paper */}
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-cut">Auto Cut Paper</Label>
                <Switch
                  id="auto-cut"
                  checked={printerSettings.autoCut}
                  onCheckedChange={(checked) => 
                    setPrinterSettings(prev => ({ ...prev, autoCut: checked }))
                  }
                />
              </div>
            </>
          )}

          {/* Important: How Intent URLs work */}
          <Alert className="bg-blue-50 border-blue-200">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <p className="font-medium mb-1">How printing works:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Clicking print will attempt to open {printerSettings.printApp === "rawbt" ? "RawBT" : "Mobile Print Util"}</li>
                <li>If the app is installed, it will open and print automatically</li>
                <li>If not installed, you'll be directed to Google Play Store to install it</li>
                <li>No manual setup or detection required</li>
              </ul>
            </AlertDescription>
          </Alert>

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