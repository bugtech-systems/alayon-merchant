// Enhanced Print Dialog Component
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Receipt, 
  Smartphone, 
  Ruler, 
  Copy, 
  Scissors, 
  Printer, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Package,
  Truck,
  Users
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {  formatCartToPrintData, generateKitchenText, generateReceiptText, printOrder } from '@/lib/print-utils';
import { PrinterSettings, PrintOrderData } from '@/lib/types';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: any;
  receiptData: any;
  region: any;
}

export function PrintDialog({ open, onOpenChange, cart, receiptData, region }: PrintDialogProps) {
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
    printReceipt: true,
    printKitchen: false,
    printCustomerCopy: false,
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [printStatus, setPrintStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });
  const [activeTab, setActiveTab] = useState<'receipt' | 'kitchen' | 'preview'>('preview');

  // Handle print with proper error handling and feedback
  const handlePrint = async () => {
    if (!printData) {
      setPrintStatus({
        type: 'error',
        message: 'No print data available'
      });
      return;
    }

    setIsPrinting(true);
    setPrintStatus({ type: 'idle', message: 'Preparing print job...' });

    try {
      // Determine what to print
      const printJobs: Array<{ type: 'receipt' | 'kitchen'; copies: number }> = [];
      
      if (printerSettings.printReceipt) {
        printJobs.push({ type: 'receipt', copies: printerSettings.copies });
      }
      
      if (printerSettings.printKitchen) {
        printJobs.push({ type: 'kitchen', copies: 1 });
      }
      
      // If customer copy is enabled, print an extra receipt
      if (printerSettings.printCustomerCopy && printerSettings.printReceipt) {
        // Add customer copy as a separate job with different header
        printJobs.push({ type: 'receipt', copies: 1 });
      }

      if (printJobs.length === 0) {
        setPrintStatus({
          type: 'error',
          message: 'Please select at least one print option'
        });
        setIsPrinting(false);
        return;
      }

      // Execute print jobs
      let successCount = 0;
      let totalJobs = printJobs.reduce((sum, job) => sum + job.copies, 0);

      for (const job of printJobs) {
        for (let i = 0; i < job.copies; i++) {
          const result = await printOrder(printData, job.type, {
            ...printerSettings,
            isCustomerCopy: job.type === 'receipt' && printJobs.length > 1 && i === job.copies - 1
          });
          
          if (result.success) {
            successCount++;
          }
          
          // Small delay between copies
          if (i < job.copies - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      if (successCount === totalJobs) {
        setPrintStatus({
          type: 'success',
          message: `Successfully printed ${successCount} copy(ies)!`
        });
        // Close dialog after successful print
        setTimeout(() => {
          onOpenChange(false);
          // Reset status after dialog closes
          setTimeout(() => {
            setPrintStatus({ type: 'idle', message: '' });
          }, 500);
        }, 1500);
      } else {
        setPrintStatus({
          type: 'error',
          message: `Printed ${successCount} of ${totalJobs} copies. Please check printer connection.`
        });
      }
    } catch (error) {
      console.error("Print error:", error);
      setPrintStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Print failed. Please try again.'
      });
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

  // Format print data when dialog opens
  useEffect(() => {
    if (open && (cart || receiptData)) {
      const formattedData = formatCartToPrintData(cart, receiptData) as any;
      setPrintData(formattedData);
      // Reset status when dialog opens
      setPrintStatus({ type: 'idle', message: '' });
      
      // Auto-set print options based on order type
      if (formattedData?.placement?.type === 'table') {
        setPrinterSettings(prev => ({
          ...prev,
          printReceipt: true,
          printKitchen: true,
        }));
      } else {
        setPrinterSettings(prev => ({
          ...prev,
          printReceipt: true,
          printKitchen: false,
        }));
      }
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
          overflow: "hidden",
        }}
      >
        <div style={{ 
          display: "grid", 
          gridTemplateRows: "auto 1fr auto", 
          height: "100%",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
                Print Order
              </DialogTitle>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Order #{printData.orderNumber}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {printData.placement.name}
                  </span>
                  {printData.placement.tables.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                      Table {printData.placement.tables.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {/* Mobile Print Status */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-300">Bluetooth Printing</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Make sure your Bluetooth printer is paired and ready
              </p>
            </div>

            {/* Print Options Tabs */}
            <div className="flex gap-2 border-b pb-2">
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'preview' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'receipt' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('receipt')}
              >
                Settings
              </button>
            </div>

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-3">
                {/* Order Summary */}
                <div className="rounded-lg border p-3 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Summary
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{getTotalItems()} pcs</span>
                    
                    <span className="text-muted-foreground">Order Type:</span>
                    <span className="font-medium capitalize">{printData.placement.type}</span>
                    
                    {printData.customer && (
                      <>
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{printData.customer.name}</span>
                      </>
                    )}
                    
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="font-medium">{printData.paymentMethod}</span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  <p className="font-medium text-sm">Items Preview</p>
                  <div className="space-y-1">
                    {printData.items?.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex justify-between text-xs border-b border-dashed pb-1">
                        <span>{item.quantity}x {item.name}</span>
                        <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {printData.items?.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{printData.items.length - 5} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals Preview */}
                <div className="rounded-lg border p-3 space-y-1 bg-green-50 dark:bg-green-950/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>₱{printData.subtotal.toFixed(2)}</span>
                  </div>
                  {printData.discount_total > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-₱{printData.discount_total.toFixed(2)}</span>
                    </div>
                  )}
                  {printData.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax ({Math.round(printData.taxRate * 100)}%):</span>
                      <span>₱{printData.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-blue-600">₱{printData.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Print Status Message */}
                {printStatus.type !== 'idle' && (
                  <div className={`rounded-lg p-3 flex items-start gap-2 ${
                    printStatus.type === 'success' 
                      ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                      : 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}>
                    {printStatus.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <p className={`text-sm ${
                      printStatus.type === 'success' 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {printStatus.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'receipt' && (
              <div className="space-y-4">
                {/* Paper Size */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Paper Size</Label>
                  </div>
                  <Select
                    value={printerSettings.paperSize}
                    onValueChange={(v: "58mm" | "80mm") => 
                      setPrinterSettings(prev => ({ ...prev, paperSize: v }))
                    }
                  >
                    <SelectTrigger className="w-full">
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
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Number of Copies</Label>
                  </div>
                  <Select
                    value={printerSettings.copies.toString()}
                    onValueChange={(v) => 
                      setPrinterSettings(prev => ({ ...prev, copies: parseInt(v) }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Copy</SelectItem>
                      <SelectItem value="2">2 Copies</SelectItem>
                      <SelectItem value="3">3 Copies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Print Options */}
                <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-sm font-medium">Print Options</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="print-receipt" className="text-sm">Customer Receipt</Label>
                    </div>
                    <Switch
                      id="print-receipt"
                      checked={printerSettings.printReceipt}
                      onCheckedChange={(checked) => 
                        setPrinterSettings(prev => ({ ...prev, printReceipt: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="print-kitchen" className="text-sm">Kitchen Ticket</Label>
                    </div>
                    <Switch
                      id="print-kitchen"
                      checked={printerSettings.printKitchen}
                      onCheckedChange={(checked) => 
                        setPrinterSettings(prev => ({ ...prev, printKitchen: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="print-customer" className="text-sm">Customer Copy</Label>
                    </div>
                    <Switch
                      id="print-customer"
                      checked={printerSettings.printCustomerCopy}
                      onCheckedChange={(checked) => 
                        setPrinterSettings(prev => ({ ...prev, printCustomerCopy: checked }))
                      }
                    />
                  </div>
                </div>

                {/* Auto Cut */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="auto-cut" className="text-sm">Auto Cut Paper</Label>
                  </div>
                  <Switch
                    id="auto-cut"
                    checked={printerSettings.autoCut}
                    onCheckedChange={(checked) => 
                      setPrinterSettings(prev => ({ ...prev, autoCut: checked }))
                    }
                  />
                </div>

                {/* Print Info */}
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                        Print Information
                      </p>
                      <ul className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 space-y-1 list-disc list-inside">
                        <li>Receipt will include: order details, items, prices, and payment info</li>
                        <li>Kitchen ticket will show items to prepare with special instructions</li>
                        <li>Customer copy is a duplicate receipt for customer records</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-background">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  onOpenChange(false);
                  setPrintStatus({ type: 'idle', message: '' });
                }}
                disabled={isPrinting}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handlePrint} 
                disabled={isPrinting || (!printerSettings.printReceipt && !printerSettings.printKitchen)}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Print {printerSettings.printReceipt && printerSettings.printKitchen ? 'All' : ''}
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

