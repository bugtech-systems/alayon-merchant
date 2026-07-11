// components/PrintDialog.tsx
"use client";

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
  Ruler, 
  Copy, 
  Scissors, 
  Printer, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bluetooth,
  BluetoothConnected,
} from 'lucide-react';
import { ReceiptBuilder, generateReceiptPreview } from './ReceiptBuilder';
import { PrinterManager, ChunkedTransmission } from './PrintManager';

// ============================================
// TYPES
// ============================================
interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: any;
  receiptData: any;
  region: any;
}

interface PrinterSettings {
  paperSize: "58mm" | "80mm";
  copies: number;
  autoCut: boolean;
  printReceipt: boolean;
  printKitchen: boolean;
  printCustomerCopy: boolean;
}

interface PrintStatus {
  type: 'idle' | 'success' | 'error' | 'printing' | 'connecting';
  message: string;
}

// ============================================
// ORDER DATA TRANSFORMER
// ============================================
const transformOrderData = (cart: any, region: any) => {
  const items = cart?.items?.map((item: any) => ({
    title: item.title || item.name || 'Item',
    quantity: item.quantity || 1,
    unit_price: item.unit_price || item.price || 0,
    sku: item.sku || item.variant_sku || '',
  })) || [];

  const customer = cart?.customer || null;
  const shipping = cart?.shipping || null;
  const payment = cart?.payment || null;
  
  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
  const tax = subtotal * 0.12; // 12% VAT
  const shippingCost = cart?.shipping_cost || 0;
  const discount = cart?.discount || 0;
  const total = subtotal + tax + shippingCost - discount;

  return {
    ...cart,
    display_id: cart?.display_id || cart?.id || '1001',
    created_at: cart?.created_at || new Date().toISOString(),
    status: cart?.status || 'completed',
    currency_code: region?.currency_code || 'PHP',
    customer,
    items,
    shipping: shipping ? {
      method: shipping.method || 'Standard',
      cost: shipping.cost || 0,
      tracking: shipping.tracking || '',
      address: shipping.address || null
    } : null,
    payment: payment ? {
      method: payment.method || 'Cash',
      status: payment.status || 'PAID',
      card_last4: payment.card_last4 || '',
      amount: payment.amount || total
    } : null,
    totals: {
      subtotal,
      tax,
      shipping: shippingCost,
      discount,
      total
    }
  };
};

// ============================================
// MAIN COMPONENT
// ============================================
export function PrintDialog({ open, onOpenChange, cart, receiptData, region }: PrintDialogProps) {
  // State
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    paperSize: "58mm",
    copies: 1,
    autoCut: true,
    printReceipt: true,
    printKitchen: false,
    printCustomerCopy: false,
  });
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [printStatus, setPrintStatus] = useState<PrintStatus>({
    type: 'idle',
    message: ''
  });
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  
  // Printer connection state
  const [printerManager, setPrinterManager] = useState<PrinterManager | null>(null);
  const [transmitter, setTransmitter] = useState<ChunkedTransmission | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const PRINTER_CONFIG = {
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  };

  // Initialize printer manager
  const initPrinter = useCallback(() => {
    const manager = new PrinterManager(
      PRINTER_CONFIG.serviceUUID,
      PRINTER_CONFIG.characteristicUUID
    );
    setPrinterManager(manager);
    return manager;
  }, []);

  // Connect to printer
  const connectPrinter = async () => {
    setPrintStatus({ type: 'connecting', message: 'Connecting to printer...' });
    
    try {
      let manager = printerManager;
      if (!manager) {
        manager = initPrinter();
      }
      
      const device = await manager.connect();
      setDeviceName(device.name || 'Unknown Printer');
      setIsConnected(true);
      
      const transmitter = new ChunkedTransmission(manager, 80);
      setTransmitter(transmitter);
      
      // Get battery level if available
      try {
        const battery = await manager.getBatteryLevel();
        setBatteryLevel(battery);
      } catch {
        // Battery reading not critical
      }
      
      setPrintStatus({ type: 'idle', message: 'Printer connected successfully!' });
      setTimeout(() => {
        setPrintStatus({ type: 'idle', message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Connection error:', error);
      setPrintStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect to printer'
      });
    }
  };

  // Disconnect printer
  const disconnectPrinter = async () => {
    if (printerManager) {
      await printerManager.disconnect();
    }
    setIsConnected(false);
    setDeviceName('');
    setBatteryLevel(null);
    setPrintStatus({ type: 'idle', message: '' });
  };

  // Transform order data
  useEffect(() => {
    if (open && (cart || receiptData)) {
      const transformed = transformOrderData(cart, region);
      setOrderData(transformed);
      
      // Generate preview
      try {
        const preview = generateReceiptPreview(transformed, {
          storeName: 'Belly Bytes',
          paperSize: printerSettings.paperSize === '58mm' ? 30 : 42
        });
        setReceiptPreview(preview);
      } catch (error) {
        console.error('Preview error:', error);
      }
      
      // Reset status
      setPrintStatus({ type: 'idle', message: '' });
    }
  }, [cart, receiptData, region, open]);

  // Generate preview when settings change
  useEffect(() => {
    if (orderData) {
      try {
        const preview = generateReceiptPreview(orderData, {
          storeName: 'Belly Bytes',
          paperSize: printerSettings.paperSize === '58mm' ? 30 : 42
        });
        setReceiptPreview(preview);
      } catch (error) {
        console.error('Preview error:', error);
      }
    }
  }, [orderData, printerSettings.paperSize]);

  // Print receipt
  const handlePrint = async () => {
    if (!orderData) {
      setPrintStatus({
        type: 'error',
        message: 'No order data available'
      });
      return;
    }

    // Check connection
    if (!isConnected || !transmitter) {
      setPrintStatus({
        type: 'error',
        message: 'Printer not connected. Please connect first.'
      });
      return;
    }

    setIsPrinting(true);
    setPrintStatus({ type: 'printing', message: 'Printing receipt...' });

    try {
      const builder = new ReceiptBuilder({
        storeName: 'Belly Bytes',
        paperSize: printerSettings.paperSize === '58mm' ? 30 : 42
      });
      
      const receiptData = builder.build(orderData);
      
      // Send to printer
      await transmitter.send(receiptData);
      
      setPrintStatus({
        type: 'success',
        message: 'Receipt printed successfully!'
      });
      
      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setPrintStatus({ type: 'idle', message: '' });
        }, 500);
      }, 2000);

    } catch (error) {
      console.error('Print error:', error);
      setPrintStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Print failed'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Get total items
  const getTotalItems = () => {
    if (!orderData) return 0;
    return orderData.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  };

  if (!orderData) return null;

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
                  Order #{orderData.display_id}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {orderData.status.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    {orderData.items?.length || 0} items
                  </span>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {/* Bluetooth Connection Status */}
            <div className={`rounded-lg border p-3 ${
              isConnected 
                ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <BluetoothConnected className="h-4 w-4 text-green-600" />
                  ) : (
                    <Bluetooth className="h-4 w-4 text-blue-600" />
                  )}
                  <span className={`font-medium ${
                    isConnected 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {isConnected ? `Connected: ${deviceName}` : 'Bluetooth Printer'}
                  </span>
                </div>
                {!isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectPrinter}
                    className="gap-1"
                  >
                    <Bluetooth className="h-3 w-3" />
                    Connect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectPrinter}
                    className="gap-1 text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
              {batteryLevel !== null && isConnected && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Battery:</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        batteryLevel > 50 ? 'bg-green-500' : 
                        batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${batteryLevel}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{batteryLevel}%</span>
                </div>
              )}
              {!isConnected && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Connect your Bluetooth printer before printing
                </p>
              )}
            </div>

            {/* Print Status */}
            {printStatus.type !== 'idle' && (
              <div className={`rounded-lg p-3 flex items-start gap-2 ${
                printStatus.type === 'success' 
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                  : printStatus.type === 'error'
                  ? 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  : printStatus.type === 'connecting' || printStatus.type === 'printing'
                  ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                {printStatus.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : printStatus.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                ) : printStatus.type === 'connecting' || printStatus.type === 'printing' ? (
                  <Loader2 className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0 animate-spin" />
                ) : null}
                <p className={`text-sm ${
                  printStatus.type === 'success' 
                    ? 'text-green-700 dark:text-green-300' 
                    : printStatus.type === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : printStatus.type === 'connecting' || printStatus.type === 'printing'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-gray-700'
                }`}>
                  {printStatus.message}
                </p>
              </div>
            )}

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
                  activeTab === 'settings' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('settings')}
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
                    Order Summary
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{getTotalItems()} pcs</span>
                    
                    {orderData.customer && (
                      <>
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{orderData.customer.first_name} {orderData.customer.last_name}</span>
                      </>
                    )}
                    
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="font-medium">{orderData.payment?.method || 'N/A'}</span>
                    
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium text-blue-600">
                      {orderData.currency_code} {orderData.totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Receipt Preview */}
                <div className="rounded-lg border p-3 bg-white dark:bg-gray-900">
                  <p className="font-medium text-sm mb-2">Receipt Preview</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-[300px] overflow-auto">
                    <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {receiptPreview || 'Generating preview...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
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
                      <SelectItem value="58mm">58mm (Thermal)</SelectItem>
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
                      <Receipt className="h-4 w-4 text-muted-foreground" />
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
                      <Receipt className="h-4 w-4 text-muted-foreground" />
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
                        <li>Receipt includes: order details, items, prices, payment info</li>
                        <li>Kitchen ticket shows items to prepare</li>
                        <li>Customer copy is a duplicate receipt</li>
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
                disabled={isPrinting || !isConnected || (!printerSettings.printReceipt && !printerSettings.printKitchen)}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
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