// app/thermal-print/page.jsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CatPrinter } from '@opuu/cat-printer';

// ============================================
// CONFIGURATION
// ============================================
const DEFAULT_CONFIG = {
  storeName: 'My Store',
  address: '123 Main Street',
  phone: '+1 (555) 123-4567',
  footerMessage: 'Thank you for your business!',
  showQRCode: true,
  showCustomer: true,
  showVariants: true,
  showPaymentDetails: true,
  showReturnPolicy: true,
  fontSize: 24,
  paperWidth: 32,
};

// ============================================
// TEST ORDER DATA
// ============================================
const testOrderData = {
  id: 'order_123456789',
  display_id: 1001,
  created_at: new Date().toISOString(),
  currency_code: 'USD',
  customer: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com'
  },
  items: [
    {
      id: 'li_1',
      title: 'Premium Wireless Headphones',
      quantity: 2,
      unit_price: 99.99,
      variant: { sku: 'WH-1000XM5-BLK' }
    },
    {
      id: 'li_2',
      title: 'USB-C Charging Cable',
      quantity: 1,
      unit_price: 19.99,
      variant: { sku: 'USB-C-6FT-WHT' }
    }
  ],
  shipping_address: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main Street',
    city: 'New York',
    province: 'NY',
    postal_code: '10001',
    country_code: 'us'
  },
  payments: [
    {
      provider_id: 'Stripe',
      captured_at: new Date().toISOString(),
      data: { card_last4: '4242' }
    }
  ],
  summary: {
    subtotal: 219.97,
    tax_total: 17.60,
    shipping_total: 5.99,
    discount_total: 0,
    total: 243.52
  }
};

// ============================================
// RECEIPT BUILDER
// ============================================
class ReceiptBuilder {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.width = this.config.paperWidth || 32;
  }

  centerText(text) {
    const padding = Math.max(0, this.width - text.length);
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + text;
  }

  formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
  }

  build(orderData) {
    const { storeName, address, phone, footerMessage, showQRCode, showCustomer, showVariants, showPaymentDetails } = this.config;
    const line = '═'.repeat(this.width);
    const dash = '─'.repeat(this.width);
    
    let receipt = '';

    // ===== HEADER =====
    receipt += `${line}\n`;
    receipt += `${this.centerText(storeName)}\n`;
    receipt += `${this.centerText(address)}\n`;
    receipt += `${this.centerText(`Tel: ${phone}`)}\n`;
    receipt += `${line}\n\n`;

    // ===== ORDER INFO =====
    receipt += `Order #: ${orderData.display_id || orderData.id || 'N/A'}\n`;
    receipt += `Date: ${new Date(orderData.created_at).toLocaleString()}\n`;
    if (showCustomer && orderData.customer) {
      receipt += `Customer: ${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}\n`;
    }
    receipt += `\n`;

    // ===== ITEMS =====
    receipt += `${'ITEM'.padEnd(20)}${'QTY'.padEnd(6)}PRICE\n`;
    receipt += `${dash}\n`;

    (orderData.items || []).forEach((item) => {
      let name = (item.title || item.product_title || 'Item').substring(0, 18);
      if (showVariants && item.variant?.sku) {
        name += ` (${item.variant.sku})`;
      }
      name = name.substring(0, 20);
      const qty = item.quantity || 1;
      const price = this.formatCurrency(item.unit_price || 0);
      receipt += `${name.padEnd(20)}${qty.toString().padEnd(6)}${price}\n`;
    });

    receipt += `${dash}\n`;

    // ===== TOTALS =====
    const summary = orderData.summary || orderData;
    receipt += `Subtotal: ${this.formatCurrency(summary.subtotal || 0)}\n`;
    if (summary.discount_total > 0) {
      receipt += `Discount: -${this.formatCurrency(summary.discount_total)}\n`;
    }
    receipt += `Tax: ${this.formatCurrency(summary.tax_total || 0)}\n`;
    if (summary.shipping_total > 0) {
      receipt += `Shipping: ${this.formatCurrency(summary.shipping_total)}\n`;
    }
    receipt += `${dash}\n`;
    receipt += `TOTAL: ${this.formatCurrency(summary.total || 0)}\n\n`;

    // ===== PAYMENT =====
    if (orderData.payments && orderData.payments.length > 0) {
      const payment = orderData.payments[0];
      receipt += `Payment: ${payment.provider_id || 'N/A'}\n`;
      receipt += `Status: ${payment.captured_at ? 'Paid' : 'Pending'}\n`;
      if (showPaymentDetails && payment.data?.card_last4) {
        receipt += `Card: ****${payment.data.card_last4}\n`;
      }
      receipt += `\n`;
    }

    // ===== SHIPPING =====
    if (orderData.shipping_address) {
      const addr = orderData.shipping_address;
      receipt += `Ship to:\n`;
      receipt += `${addr.first_name || ''} ${addr.last_name || ''}\n`;
      receipt += `${addr.address_1 || ''}\n`;
      if (addr.address_2) receipt += `${addr.address_2}\n`;
      receipt += `${addr.city || ''}, ${addr.province || ''} ${addr.postal_code || ''}\n`;
      receipt += `${(addr.country_code || '').toUpperCase()}\n\n`;
    }

    // ===== QR CODE =====
    if (showQRCode) {
      const qrData = `${window.location.origin}/orders/${orderData.id}`;
      receipt += `${line}\n`;
      receipt += `${this.centerText('[QR CODE]')}\n`;
      receipt += `${this.centerText(qrData.substring(0, 28))}\n`;
      receipt += `${this.centerText('Scan for details')}\n`;
      receipt += `${line}\n`;
    }

    // ===== FOOTER =====
    receipt += `${line}\n`;
    receipt += `${this.centerText(footerMessage)}\n`;
    if (this.config.showReturnPolicy) {
      receipt += `${this.centerText('Returns accepted within 30 days')}\n`;
    }
    receipt += `${line}\n`;

    return receipt;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ThermalPrintPage() {
  // State
  const [printer, setPrinter] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [printerInfo, setPrinterInfo] = useState(null);
  const [orderData, setOrderData] = useState(testOrderData);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [logs, setLogs] = useState([]);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Refs
  const receiptBuilderRef = useRef(new ReceiptBuilder(config));

  // Check Bluetooth support
  useEffect(() => {
    if (!navigator.bluetooth) {
      setIsBluetoothSupported(false);
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
  }, []);

  // Update receipt builder when config changes
  useEffect(() => {
    receiptBuilderRef.current = new ReceiptBuilder(config);
    generatePreview();
  }, [config, orderData]);

  // Generate preview
  const generatePreview = useCallback(() => {
    try {
      const preview = receiptBuilderRef.current.build(orderData);
      setReceiptPreview(preview);
    } catch (err) {
      console.error('Preview error:', err);
    }
  }, [orderData, config]);

  // Add log
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 50));
  };

  // Initialize printer
  const initializePrinter = useCallback(() => {
    try {
      const newPrinter = new CatPrinter({ 
        debug: true,
        onConnected: () => {
          setIsConnected(true);
          setStatus('connected');
          setError(null);
          setConnectionError(null);
          addLog('✅ Printer connected successfully!', 'success');
        },
        onDisconnected: () => {
          setIsConnected(false);
          setStatus('disconnected');
          setPrinterInfo(null);
          addLog('🔌 Printer disconnected', 'info');
        },
        onError: (err) => {
          // Don't show user cancellation as error
          if (err.message && err.message.includes('cancelled')) {
            setConnectionError('You cancelled the device selection. Click "Connect" again to try.');
            addLog('ℹ️ Device selection cancelled by user', 'info');
            setStatus('disconnected');
            setIsConnecting(false);
            return;
          }
          setError(err.message);
          addLog(`❌ Error: ${err.message}`, 'error');
        }
      });
      setPrinter(newPrinter);
      addLog('📡 Printer initialized', 'info');
      return newPrinter;
    } catch (err) {
      setError(`Failed to initialize printer: ${err.message}`);
      addLog(`❌ Initialization failed: ${err.message}`, 'error');
      return null;
    }
  }, []);

  // Connect to printer
  const connectPrinter = async () => {
    // Clear previous errors
    setError(null);
    setConnectionError(null);
    setIsConnecting(true);
    setStatus('connecting');
    addLog('🔍 Searching for printer...', 'info');

    try {
      let currentPrinter = printer;
      if (!currentPrinter) {
        currentPrinter = initializePrinter();
        if (!currentPrinter) {
          throw new Error('Failed to initialize printer');
        }
      }

      // This triggers the browser's Bluetooth pairing dialog
      await currentPrinter.connect();
      
      // Get printer info if available
      try {
        const info = await currentPrinter.getPrinterInfo();
        setPrinterInfo(info);
        addLog(`📋 Printer: ${info.name || 'Unknown'}`, 'info');
        if (info.battery !== undefined) {
          addLog(`🔋 Battery: ${info.battery}%`, 'info');
        }
      } catch (err) {
        // Some printers don't support getPrinterInfo
        addLog('ℹ️ Printer info not available', 'info');
      }
      
      setStatus('connected');
      setIsConnected(true);
      setConnectionError(null);
      addLog('✅ Ready to print!', 'success');
      
    } catch (err) {
      console.error('Connection error:', err);
      
      // Handle specific error types
      if (err.message && err.message.includes('cancelled')) {
        setConnectionError('You cancelled the device selection. Click "Connect" again to try.');
        setStatus('disconnected');
        addLog('ℹ️ Device selection cancelled by user', 'info');
      } else if (err.message && err.message.includes('No devices')) {
        setConnectionError('No Bluetooth devices found. Make sure your printer is powered on and in pairing mode.');
        setStatus('disconnected');
        addLog('ℹ️ No devices found', 'info');
      } else {
        setError(`Connection failed: ${err.message}`);
        setStatus('error');
        addLog(`❌ Connection failed: ${err.message}`, 'error');
      }
      
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect printer
  const disconnectPrinter = async () => {
    if (printer) {
      try {
        await printer.disconnect();
        addLog('🔌 Disconnected from printer', 'info');
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    setIsConnected(false);
    setStatus('disconnected');
    setPrinterInfo(null);
    setError(null);
    setConnectionError(null);
  };

  // Print receipt
  const printReceipt = async () => {
    if (!printer || !isConnected) {
      setError('Printer not connected. Please connect first.');
      addLog('❌ Cannot print: Printer not connected', 'error');
      return;
    }

    setIsPrinting(true);
    setError(null);
    setStatus('printing');
    addLog('🖨️ Starting print job...', 'info');

    try {
      // Build receipt
      const receiptText = receiptBuilderRef.current.build(orderData);
      
      // Print text
      await printer.printText(receiptText, {
        fontSize: config.fontSize || 24,
        fontWeight: 'bold',
        align: 'center',
        lineSpacing: 8
      });

      // Feed paper
      await printer.feed(80);
      
      setStatus('done');
      addLog('✅ Receipt printed successfully!', 'success');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('connected');
      }, 3000);
      
    } catch (err) {
      console.error('Print error:', err);
      setStatus('error');
      setError(`Print failed: ${err.message}`);
      addLog(`❌ Print failed: ${err.message}`, 'error');
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
    addLog('🖨️ Printing test page...', 'info');

    try {
      // Build test page
      const testText = `
${'═'.repeat(32)}
    PRINTER TEST PAGE
${'═'.repeat(32)}

Date: ${new Date().toLocaleString()}
Status: Working

Font Tests:
  Small Text
  Medium Text
  Large Text

Alignment Tests:
  Left aligned
    Center aligned
      Right aligned

${'─'.repeat(32)}
Test Complete!
${'═'.repeat(32)}
      `;

      await printer.printText(testText, {
        fontSize: 20,
        align: 'center'
      });
      
      await printer.feed(80);
      addLog('✅ Test page printed successfully!', 'success');
      
    } catch (err) {
      setError(`Test print failed: ${err.message}`);
      addLog(`❌ Test print failed: ${err.message}`, 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  // Update order data
  const updateOrderData = (field, value) => {
    setOrderData(prev => {
      const updated = { ...prev };
      const keys = field.split('.');
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // Update config
  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Auto-initialize on mount
  useEffect(() => {
    initializePrinter();
    generatePreview();
    
    return () => {
      if (printer && isConnected) {
        printer.disconnect().catch(console.error);
      }
    };
  }, []);

  // Status helper
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'printing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      case 'done': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected ✓';
      case 'connecting': return 'Connecting...';
      case 'printing': return 'Printing...';
      case 'error': return 'Error';
      case 'done': return 'Print Complete!';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h1 className="text-3xl font-bold">Thermal Printer</h1>
            <p className="text-blue-100 mt-1">Direct Bluetooth Printing</p>
          </div>

          <div className="p-6">
            {/* Bluetooth Support Warning */}
            {!isBluetoothSupported && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            {/* Connection Status */}
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor()} ${status === 'connecting' || status === 'printing' ? 'animate-pulse' : ''}`} />
                  <span className="font-medium">{getStatusText()}</span>
                  {isConnecting && (
                    <span className="text-sm text-gray-500">Searching for printer...</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isConnected ? (
                    <button
                      onClick={connectPrinter}
                      disabled={isConnecting || !isBluetoothSupported}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition"
                    >
                      {isConnecting ? 'Connecting...' : '🔗 Connect Printer'}
                    </button>
                  ) : (
                    <button
                      onClick={disconnectPrinter}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      🔌 Disconnect
                    </button>
                  )}
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm"
                  >
                    {showHelp ? 'Hide Help' : 'Show Help'}
                  </button>
                </div>
              </div>

              {/* Help Section */}
              {showHelp && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">How to Connect:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Make sure your thermal printer is powered ON</li>
                    <li>Put the printer in Bluetooth pairing mode (usually hold power button)</li>
                    <li>Click the "Connect Printer" button above</li>
                    <li>Select your printer from the list that appears</li>
                    <li>Wait for the connection to complete</li>
                  </ol>
                  <div className="mt-2 text-xs text-blue-600">
                    💡 If no devices appear, check that your printer is discoverable and within range.
                  </div>
                </div>
              )}

              {/* Connection Error (User Cancelled) */}
              {connectionError && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg text-sm">
                  💡 {connectionError}
                </div>
              )}

              {/* Other Errors */}
              {error && !connectionError && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  ❌ {error}
                </div>
              )}

              {/* Printer Info */}
              {printerInfo && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div><span className="font-medium">Name:</span> {printerInfo.name || 'Unknown'}</div>
                  <div><span className="font-medium">Status:</span> {printerInfo.status || 'Ready'}</div>
                  {printerInfo.battery !== undefined && (
                    <div><span className="font-medium">Battery:</span> {printerInfo.battery}%</div>
                  )}
                  {printerInfo.paper && (
                    <div><span className="font-medium">Paper:</span> {printerInfo.paper}</div>
                  )}
                </div>
              )}
            </div>

            {/* Print Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={printReceipt}
                disabled={!isConnected || isPrinting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition font-medium"
              >
                {isPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
              </button>
              <button
                onClick={printTestPage}
                disabled={!isConnected || isPrinting}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition font-medium"
              >
                🧪 Print Test Page
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Configuration */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                
                <div className="space-y-4">
                  {/* Store Settings */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Store Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Store Name</label>
                        <input
                          type="text"
                          value={config.storeName}
                          onChange={(e) => updateConfig('storeName', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <input
                          type="text"
                          value={config.address}
                          onChange={(e) => updateConfig('address', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                          type="text"
                          value={config.phone}
                          onChange={(e) => updateConfig('phone', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Receipt Options */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Receipt Options</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showQRCode}
                          onChange={(e) => updateConfig('showQRCode', e.target.checked)}
                          className="rounded"
                        />
                        Show QR Code
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCustomer}
                          onChange={(e) => updateConfig('showCustomer', e.target.checked)}
                          className="rounded"
                        />
                        Show Customer Info
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showVariants}
                          onChange={(e) => updateConfig('showVariants', e.target.checked)}
                          className="rounded"
                        />
                        Show Variants
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showPaymentDetails}
                          onChange={(e) => updateConfig('showPaymentDetails', e.target.checked)}
                          className="rounded"
                        />
                        Show Payment Details
                      </label>
                    </div>
                  </div>

                  {/* Order Data Editor */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Order Data</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Order ID</label>
                        <input
                          type="text"
                          value={orderData.display_id || ''}
                          onChange={(e) => updateOrderData('display_id', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={orderData.customer?.first_name || ''}
                          onChange={(e) => updateOrderData('customer.first_name', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Total Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={orderData.summary?.total || 0}
                          onChange={(e) => updateOrderData('summary.total', parseFloat(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Preview & Logs */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Receipt Preview</h2>
                
                <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <pre className="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-[400px] leading-relaxed">
                    {receiptPreview || 'No preview available'}
                  </pre>
                </div>

                {/* Logs */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
                  <div className="border rounded-lg p-2 bg-gray-50 max-h-[200px] overflow-y-auto">
                    {logs.length === 0 ? (
                      <p className="text-gray-400 text-sm p-2">No activity yet</p>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className={`text-sm p-1 border-b border-gray-200 last:border-0 ${
                          log.type === 'error' ? 'text-red-600' :
                          log.type === 'success' ? 'text-green-600' :
                          'text-gray-700'
                        }`}>
                          <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}