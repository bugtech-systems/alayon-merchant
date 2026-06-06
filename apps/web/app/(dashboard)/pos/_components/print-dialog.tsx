// components/print-dialog.tsx
"use client";

import { useEffect, useState } from "react";
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
import { Printer, QrCode, Smartphone, Monitor, Loader2, CheckCircle2, AlertCircle, TabletSmartphone, ScanLine, ScanLineIcon } from "lucide-react";
import { printOrder, printKitchenReceipt, type PrintOrderData, type PrinterSettings } from "@/lib/print-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: PrintOrderData;
}



// Check if printing apps are installed
const checkAppInstalled = (app: any): Promise<boolean> => {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    
    const url = app === "mobile-print-util" 
      ? "com.samathosoft.webprint://test" 
      : "rawbt://test";
    
    let timeout: NodeJS.Timeout;
    
    const handleBlur = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      resolve(true);
    };
    
    const handleError = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      resolve(false);
    };
    
    window.addEventListener('blur', handleBlur);
    iframe.onerror = handleError;
    
    timeout = setTimeout(() => {
      window.removeEventListener('blur', handleBlur);
      document.body.removeChild(iframe);
      resolve(false);
    }, 500);
    
    iframe.src = url;
    document.body.appendChild(iframe);
  });
};

export function PrintDialog({ open, onOpenChange, orderData }: PrintDialogProps) {
  const [printType, setPrintType] = useState<"receipt" | "kitchen">("receipt");
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
    printApp: "mobile-print-util",
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [appStatus, setAppStatus] = useState<Record<any, boolean | null>>({
    "mobile-print-util": null,
    "rawbt": null,
  });
  const [showInstallAlert, setShowInstallAlert] = useState(false);

  // Check app installation status when dialog opens
  useEffect(() => {
    if (open) {
      const checkApps = async () => {
        const mobileStatus = await checkAppInstalled("mobile-print-util");
        const rawbtStatus = await checkAppInstalled("rawbt");
        setAppStatus({
          "mobile-print-util": mobileStatus,
          "rawbt": rawbtStatus,
        });
      };
      checkApps();
    }
  }, [open]);

  const handlePrint = async () => {
    // Validate app is installed
    const selectedApp = printerSettings.printApp;
    if (!appStatus[selectedApp]) {
      setShowInstallAlert(true);
      return;
    }
    
    setIsPrinting(true);
    setShowInstallAlert(false);
    
    try {
      if (printType === "receipt") {
        await printOrder(orderData, printerSettings);
      } else {
        await printKitchenReceipt(orderData);
      }
      
      // Show success and close after delay
      setTimeout(() => {
        onOpenChange(false);
        setIsPrinting(false);
      }, 1500);
    } catch (error) {
      console.error("Print error:", error);
      setIsPrinting(false);
    }
  };

  const getAppInstallUrl = (app: any): string => {
    return app === "mobile-print-util"
      ? "https://play.google.com/store/apps/details?id=com.samathosoft.mobileprintutil"
      : "https://play.google.com/store/apps/details?id=ru.a40k.rawbt";
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

          {/* Only show printer settings for receipt type */}
          {printType === "receipt" && (
            <>
              {/* Print App Selection */}
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
                    {appStatus["mobile-print-util"] === true && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {appStatus["mobile-print-util"] === false && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
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
                    {appStatus["rawbt"] === true && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {appStatus["rawbt"] === false && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </RadioGroup>
              </div>

              {/* Show install alert if app not detected */}
              {showInstallAlert && !appStatus[printerSettings.printApp] && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      {printerSettings.printApp === "mobile-print-util" 
                        ? "Mobile Print Util" 
                        : "RawBT"} is not installed
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(getAppInstallUrl(printerSettings.printApp), '_blank')}
                    >
                      Install Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

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

          {/* Print Method Info based on selected app */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              {printerSettings.printApp === "mobile-print-util" ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <ScanLineIcon className="h-4 w-4" />
              )}
              <span className="font-medium">
                {printerSettings.printApp === "mobile-print-util" 
                  ? "Mobile Print Util" 
                  : "RawBT"} Setup
              </span>
            </div>
            <ul className="text-muted-foreground text-xs space-y-1 list-disc list-inside">
              {printerSettings.printApp === "mobile-print-util" ? (
                <>
                  <li>Ensure Mobile Print Util is installed from Play Store</li>
                  <li>Pair your Bluetooth thermal printer in Android settings</li>
                  <li>Open the app once to grant necessary permissions</li>
                  <li>Free version includes a small watermark</li>
                </>
              ) : (
                <>
                  <li>Ensure RawBT is installed from Play Store</li>
                  <li>Supports ESC/POS commands for larger fonts</li>
                  <li>Better formatting and no watermark (paid)</li>
                  <li>Configure printer in RawBT app first</li>
                </>
              )}
            </ul>
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
// Helper function for formatting currency
function formatCurrency(amount: number): string {
  return `PHP ${amount.toFixed(2)}`;
}