// app/thermal-print/page.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CatPrinter } from '@opuu/cat-printer';

// Receipt template builder
const buildReceipt = (orderData) => {
  const { storeName, items, summary, orderId, customer, date } = orderData;
  
  let receipt = '';
  
  // Store Header
  receipt += `${'═'.repeat(32)}\n`;
  receipt += `${' '.repeat(12)}${storeName}\n`;
  receipt += `${' '.repeat(8)}123 Main Street\n`;
  receipt += `${' '.repeat(8)}Tel: +1 (555) 123-4567\n`;
  receipt += `${'═'.repeat(32)}\n\n`;
  
  // Order Info
  receipt += `Order #: ${orderId || 'N/A'}\n`;
  receipt += `Date: ${date || new Date().toLocaleString()}\n`;
  if (customer) {
    receipt += `Customer: ${customer.first_name || ''} ${customer.last_name || ''}\n`;
  }
  receipt += `\n`;
  
  // Items Header
  receipt += `${'ITEM'.padEnd(20)}${'QTY'.padEnd(6)}PRICE\n`;
  receipt += `${'─'.repeat(32)}\n`;
  
  // Items
  items.forEach((item) => {
    const name = (item.title || 'Item').substring(0, 20);
    const qty = item.quantity || 1;
    const price = (item.unit_price || 0).toFixed(2);
    receipt += `${name.padEnd(20)}${qty.toString().padEnd(6)}$${price}\n`;
  });
  
  receipt += `${'─'.repeat(32)}\n`;
  
  // Totals
  receipt += `Subtotal: $${(summary?.subtotal || 0).toFixed(2)}\n`;
  receipt += `Tax: $${(summary?.tax_total || 0).toFixed(2)}\n`;
  if (summary?.shipping_total > 0) {
    receipt += `Shipping: $${summary.shipping_total.toFixed(2)}\n`;
  }
  receipt += `${'─'.repeat(32)}\n`;
  receipt += `TOTAL: $${(summary?.total || 0).toFixed(2)}\n\n`;
  
  // Footer
  receipt += `${' '.repeat(10)}Thank you!\n`;
  receipt += `${' '.repeat(8)}Visit again!\n`;
  receipt += `${'═'.repeat(32)}\n`;
  
  return receipt;
};

// Test order data
const testOrderData = {
  storeName: 'My Store',
  orderId: 'ORD-1001',
  date: new Date().toLocaleString(),
  customer: {
    first_name: 'John',
    last_name: 'Doe'
  },
  items: [
    { title: 'Premium Headphones', quantity: 2, unit_price: 99.99 },
    { title: 'USB-C Cable', quantity: 1, unit_price: 19.99 },
    { title: 'Phone Case', quantity: 1, unit_price: 24.99 }
  ],
  summary: {
    subtotal: 244.96,
    tax_total: 19.60,
    shipping_total: 5.99,
    total: 270.55
  }
};

export default function ThermalPrintPage() {
  const [printer, setPrinter] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [printerInfo, setPrinterInfo] = useState(null);
  const [orderData, setOrderData] = useState(testOrderData);
  const [printSettings, setPrintSettings] = useState({
    fontSize: 24,
    fontWeight: 'bold',
    align: 'center',
    lineSpacing: 8,
    dithering: 'floyd-steinberg'
  });

  // Initialize printer
  const initializePrinter = useCallback(() => {
    try {
      const newPrinter = new CatPrinter({ 
        debug: true,
        onConnected: () => {
          setIsConnected(true);
          setStatus('connected');
          setError(null);
        },
        onDisconnected: () => {
          setIsConnected(false);
          setStatus('disconnected');
          setPrinterInfo(null);
        }
      });
      setPrinter(newPrinter);
      return newPrinter;
    } catch (err) {
      setError(`Failed to initialize printer: ${err.message}`);
      return null;
    }
  }, []);

  // Connect to printer
  const connectPrinter = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('connecting');

    try {
      let currentPrinter = printer;
      if (!currentPrinter) {
        currentPrinter = initializePrinter();
        if (!currentPrinter) {
          throw new Error('Failed to initialize printer');
        }
      }

      // Connect to printer
      await currentPrinter.connect();
      
      // Get printer info
      const info = await currentPrinter.getPrinterInfo().catch(() => null);
      setPrinterInfo(info);
      
      setStatus('connected');
      setIsConnected(true);
      setError(null);
      
    } catch (err) {
      console.error('Connection error:', err);
      setStatus('error');
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect printer
  const disconnectPrinter = async () => {
    if (printer) {
      try {
        await printer.disconnect();
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    setIsConnected(false);
    setStatus('disconnected');
    setPrinterInfo(null);
    setError(null);
  };

  // Print receipt
  const printReceipt = async () => {
    if (!printer || !isConnected) {
      setError('Printer not connected. Please connect first.');
      return;
    }

    setIsPrinting(true);
    setError(null);
    setStatus('printing');

    try {
      // Build receipt text
      const receiptText = buildReceipt(orderData);
      
      // Print text with settings
      await printer.printText(receiptText, {
        fontSize: printSettings.fontSize,
        fontWeight: printSettings.fontWeight,
        align: printSettings.align,
        lineSpacing: printSettings.lineSpacing
      });

      // Feed paper
      await printer.feed(100);
      
      // Optional: Print QR code
      // const qrData = `https://yourstore.com/order/${orderData.orderId}`;
      // await printer.printQrCode(qrData, { size: 4 });
      
      setStatus('done');
      
    } catch (err) {
      console.error('Print error:', err);
      setStatus('error');
      setError(`Print failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Print test page
  const printTestPage = async () => {
    if (!printer || !isConnected) {
      setError('Printer not connected. Please connect first.');
      return;
    }

    setIsPrinting(true);
    setError(null);

    try {
      // Print test pattern
      await printer.printText('═'.repeat(32), { fontSize: 16 });
      await printer.printText('PRINTER TEST PAGE', { 
        fontSize: 32, 
        fontWeight: 'bold',
        align: 'center'
      });
      await printer.printText('═'.repeat(32), { fontSize: 16 });
      await printer.printText(`Date: ${new Date().toLocaleString()}`, { fontSize: 16 });
      await printer.printText('Status: Working', { fontSize: 16 });
      await printer.printText('\nFont Sizes:', { fontSize: 16 });
      await printer.printText('Small text', { fontSize: 16 });
      await printer.printText('Medium text', { fontSize: 24 });
      await printer.printText('Large text', { fontSize: 32 });
      await printer.printText('\nAlignment:', { fontSize: 16 });
      await printer.printText('Left', { align: 'left', fontSize: 16 });
      await printer.printText('Center', { align: 'center', fontSize: 16 });
      await printer.printText('Right', { align: 'right', fontSize: 16 });
      await printer.feed(100);
      
      setStatus('done');
    } catch (err) {
      setError(`Test print failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Update order data (for custom receipts)
  const updateOrderData = (field, value) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Initial render effect
  useEffect(() => {
    initializePrinter();
    
    // Cleanup on unmount
    return () => {
      if (printer && isConnected) {
        printer.disconnect().catch(console.error);
      }
    };
  }, []);

  // Status display helper
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'printing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      case 'done':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'printing':
        return 'Printing...';
      case 'error':
        return 'Error';
      case 'done':
        return 'Print Complete!';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Thermal Printer Control</h1>

          {/* Connection Status */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor()} animate-pulse`} />
                <span className="font-medium">{getStatusText()}</span>
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <button
                    onClick={connectPrinter}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    {isLoading ? 'Connecting...' : 'Connect Printer'}
                  </button>
                ) : (
                  <button
                    onClick={disconnectPrinter}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Printer Info */}
            {printerInfo && (
              <div className="mt-4 text-sm">
                <p><strong>Printer:</strong> {printerInfo.name || 'Unknown'}</p>
                <p><strong>Status:</strong> {printerInfo.status || 'Ready'}</p>
                {printerInfo.battery !== undefined && (
                  <p><strong>Battery:</strong> {printerInfo.battery}%</p>
                )}
                {printerInfo.paper && (
                  <p><strong>Paper:</strong> {printerInfo.paper}</p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Print Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 border rounded-lg">
              <h2 className="font-semibold mb-3">Print Controls</h2>
              <div className="space-y-2">
                <button
                  onClick={printReceipt}
                  disabled={!isConnected || isPrinting}
                  className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {isPrinting ? 'Printing...' : 'Print Receipt'}
                </button>
                <button
                  onClick={printTestPage}
                  disabled={!isConnected || isPrinting}
                  className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded disabled:opacity-50"
                >
                  Print Test Page
                </button>
              </div>
            </div>

            {/* Print Settings */}
            <div className="p-4 border rounded-lg">
              <h2 className="font-semibold mb-3">Print Settings</h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm">Font Size</label>
                  <select
                    value={printSettings.fontSize}
                    onChange={(e) => setPrintSettings(prev => ({ 
                      ...prev, 
                      fontSize: parseInt(e.target.value) 
                    }))}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value={16}>Small (16px)</option>
                    <option value={24}>Medium (24px)</option>
                    <option value={32}>Large (32px)</option>
                    <option value={48}>XL (48px)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Alignment</label>
                  <select
                    value={printSettings.align}
                    onChange={(e) => setPrintSettings(prev => ({ 
                      ...prev, 
                      align: e.target.value 
                    }))}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={printSettings.fontWeight === 'bold'}
                      onChange={(e) => setPrintSettings(prev => ({ 
                        ...prev, 
                        fontWeight: e.target.checked ? 'bold' : 'normal' 
                      }))}
                    />
                    <span className="text-sm">Bold Text</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Order Data */}
          <div className="p-4 border rounded-lg mb-6">
            <h2 className="font-semibold mb-3">Receipt Data</h2>
            <div className="space-y-2">
              <div>
                <label className="block text-sm">Store Name</label>
                <input
                  type="text"
                  value={orderData.storeName}
                  onChange={(e) => updateOrderData('storeName', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm">Order ID</label>
                <input
                  type="text"
                  value={orderData.orderId}
                  onChange={(e) => updateOrderData('orderId', e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-3">Receipt Preview</h2>
            <div className="bg-gray-50 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
              {buildReceipt(orderData)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}