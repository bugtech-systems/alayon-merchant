// components/ThermalPrinter.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ReceiptBuilder, generateReceiptPreview } from './ReceiptBuilder';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Printer, 
  Bluetooth, 
  BluetoothConnected,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';

// ============================================
// MEDUSA V2 ORDER DATA
// ============================================
const MEDUSA_TEST_ORDER = {
  display_id: 1001,
  created_at: "2026-07-10T14:30:00.000Z",
  status: "completed",
  currency_code: "php",
  
  customer: {
    first_name: "Maria",
    last_name: "Santos",
    email: "maria.santos@email.com",
    phone: "+63 912 3456 789"
  },
  
  items: [
    { title: "Premium Wireless Headphones", quantity: 2, unit_price: 2499.99, sku: "WH-1000XM5-BLK" },
    { title: "USB-C Charging Cable 6ft", quantity: 3, unit_price: 499.99, sku: "USB-C-6FT-WHT" },
    { title: "Wireless Charging Pad", quantity: 1, unit_price: 999.99, sku: "WC-PAD-BLK" },
    { title: "Phone Case Premium", quantity: 2, unit_price: 799.99, sku: "PC-PRM-BLK" }
  ],
  
  shipping: {
    method: "Express Shipping",
    cost: 150.00,
    tracking: "1Z999AA10123456784",
    address: {
      first_name: "Maria",
      last_name: "Santos",
      address_1: "123 Ayala Avenue",
      address_2: "Unit 8B",
      city: "Makati City",
      province: "Metro Manila",
      postal_code: "1200",
      country: "Philippines"
    }
  },
  
  payment: {
    method: "Credit Card",
    status: "PAID",
    card_last4: "4242",
    amount: 7999.93
  },
  
  totals: {
    subtotal: 7099.93,
    tax: 749.99,
    shipping: 150.00,
    discount: 0,
    total: 7999.93
  }
};

// ============================================
// PRINTER MANAGER
// ============================================
class PrinterManager {
  constructor(serviceUUID, characteristicUUID) {
    this.serviceUUID = serviceUUID;
    this.characteristicUUID = characteristicUUID;
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.connected = false;
  }

  async connect() {
    try {
      if (typeof window === 'undefined' || !navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser.');
      }

      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [this.serviceUUID]
      });

      await this.connectAndGetServices();
      this.connected = true;
      return this.device;

    } catch (error) {
      console.error('Connection error:', error);
      this.connected = false;
      throw error;
    }
  }

  async connectAndGetServices() {
    try {
      this.server = await this.device.gatt.connect();
      await this.sleep(200);
      this.service = await this.server.getPrimaryService(this.serviceUUID);
      this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
    } catch (error) {
      if (this.device && this.device.gatt) {
        await this.sleep(500);
        this.server = await this.device.gatt.connect();
        await this.sleep(200);
        this.service = await this.server.getPrimaryService(this.serviceUUID);
        this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
      } else {
        throw error;
      }
    }
  }

  async ensureConnected() {
    try {
      if (!this.device) throw new Error('No device selected');
      if (!this.device.gatt || !this.device.gatt.connected) {
        await this.connectAndGetServices();
        this.connected = true;
        return true;
      }
      if (!this.characteristic) {
        await this.connectAndGetServices();
        this.connected = true;
        return true;
      }
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Ensure connection failed:', error);
      this.connected = false;
      throw error;
    }
  }

  async write(data) {
    await this.ensureConnected();
    try {
      await this.characteristic.writeValue(data);
      return true;
    } catch (error) {
      if (error.message.includes('no longer valid') || error.message.includes('disconnected')) {
        await this.ensureConnected();
        await this.characteristic.writeValue(data);
        return true;
      }
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt) {
      try {
        await this.device.gatt.disconnect();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    this.connected = false;
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
  }

  isConnected() {
    return this.connected && this.device && this.device.gatt && 
           this.device.gatt.connected && this.characteristic;
  }

  getDeviceName() {
    return this.device?.name || 'Unknown';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// CHUNKED TRANSMISSION
// ============================================
class ChunkedTransmission {
  constructor(printerManager, chunkSize = 80) {
    this.printerManager = printerManager;
    this.chunkSize = chunkSize;
    this.maxRetries = 3;
    this.onProgress = null;
  }

  async send(data) {
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
    
    if (!this.printerManager.isConnected()) {
      await this.printerManager.ensureConnected();
    }

    const chunks = [];
    for (let i = 0; i < buffer.length; i += this.chunkSize) {
      chunks.push(buffer.slice(i, Math.min(i + this.chunkSize, buffer.length)));
    }

    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;

      while (!success && retries < this.maxRetries) {
        try {
          if (!this.printerManager.isConnected()) {
            await this.printerManager.ensureConnected();
          }
          await this.printerManager.write(chunks[i]);
          await this.sleep(100);
          success = true;
          this.onProgress?.(i + 1, chunks.length);
        } catch (error) {
          retries++;
          if (retries >= this.maxRetries) {
            throw new Error(`Failed to send chunk ${i + 1}: ${error.message}`);
          }
          await this.sleep(200 * retries);
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ThermalPrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [order, setOrder] = useState(MEDUSA_TEST_ORDER);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [chunkSize, setChunkSize] = useState(80);
  const [isClient, setIsClient] = useState(false);

  const printerManagerRef = useRef(null);
  const transmitterRef = useRef(null);

  const PRINTER_CONFIG = {
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const generatePreview = () => {
    try {
      const preview = generateReceiptPreview(order);
      const totalChunks = Math.ceil(preview.length / chunkSize);
      setReceiptPreview(preview + `\n\n📊 ${preview.length} bytes (${totalChunks} chunks)`);
    } catch (err) {
      setReceiptPreview('Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (isClient) {
      generatePreview();
    }
  }, [order, chunkSize, isClient]);

  const connectPrinter = async () => {
    setError(null);
    setStatus('connecting');

    try {
      const manager = new PrinterManager(
        PRINTER_CONFIG.serviceUUID,
        PRINTER_CONFIG.characteristicUUID
      );
      printerManagerRef.current = manager;

      const device = await manager.connect();
      setDeviceName(device.name || 'Unknown Printer');
      
      transmitterRef.current = new ChunkedTransmission(manager, chunkSize);
      
      setIsConnected(true);
      setStatus('connected');

    } catch (err) {
      console.error('Connection error:', err);
      
      let errorMsg = err.message;
      if (err.message.includes('cancelled')) {
        errorMsg = 'Connection cancelled. Please try again.';
      } else if (err.message.includes('No devices')) {
        errorMsg = 'No printer found. Make sure your PT-210 is powered on and in pairing mode.';
      } else if (err.message.includes('GATT')) {
        errorMsg = 'Failed to connect to printer. Please make sure the printer is not connected to another device and try again.';
      }
      
      setError(errorMsg);
      setStatus('disconnected');
      setIsConnected(false);
      printerManagerRef.current = null;
      transmitterRef.current = null;
    }
  };

  const disconnectPrinter = async () => {
    if (printerManagerRef.current) {
      await printerManagerRef.current.disconnect();
    }
    setIsConnected(false);
    setStatus('disconnected');
    printerManagerRef.current = null;
    transmitterRef.current = null;
    setDeviceName(null);
    setProgress({ current: 0, total: 0 });
  };

  const printReceipt = async () => {
    if (!transmitterRef.current) {
      setError('Printer not connected');
      return;
    }

    setIsPrinting(true);
    setError(null);
    setStatus('printing');
    setProgress({ current: 0, total: 0 });

    try {
      const builder = new ReceiptBuilder();
      const receiptData = builder.build(order);
      
      transmitterRef.current.chunkSize = chunkSize;
      transmitterRef.current.onProgress = (current, total) => {
        setProgress({ current, total });
      };
      
      await transmitterRef.current.send(receiptData);
      
      setStatus('done');
      setProgress({ current: 0, total: 0 });
      
      setTimeout(() => setStatus('connected'), 3000);

    } catch (err) {
      console.error('Print error:', err);
      setError(`Print failed: ${err.message}`);
      setStatus('error');
      setProgress({ current: 0, total: 0 });
      
      if (printerManagerRef.current && !printerManagerRef.current.isConnected()) {
        setIsConnected(false);
        setStatus('disconnected');
        setError('Connection lost. Please reconnect.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const updateOrderField = (path, value) => {
    setOrder(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addItem = () => {
    setOrder(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { title: 'New Item', quantity: 1, unit_price: 0, sku: '' }
      ]
    }));
  };

  const removeItem = (index) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setOrder(prev => {
      const updated = { ...prev };
      updated.items[index] = { ...updated.items[index], [field]: value };
      return updated;
    });
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading Printer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Thermal Printer</h1>
          <p className="text-gray-600 mt-1">58mm Receipt | Philippine Peso</p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {status === 'connected' ? (
                  <BluetoothConnected className="h-5 w-5 text-green-500" />
                ) : status === 'connecting' || status === 'printing' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                ) : (
                  <Bluetooth className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">
                    {status === 'connected' && deviceName ? `Connected: ${deviceName}` :
                     status === 'connecting' ? 'Connecting...' :
                     status === 'printing' ? 'Printing...' :
                     status === 'done' ? '✓ Print Complete!' :
                     'Disconnected'}
                  </p>
                  {deviceName && status === 'connected' && (
                    <p className="text-sm text-gray-500">{deviceName}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <Button
                    onClick={connectPrinter}
                    disabled={status === 'connecting'}
                    className="gap-2"
                  >
                    {status === 'connecting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bluetooth className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                ) : (
                  <Button
                    onClick={disconnectPrinter}
                    variant="destructive"
                    className="gap-2"
                  >
                    <BluetoothConnected className="h-4 w-4" />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            {progress.total > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Printing Progress</span>
                  <span>{progress.current} / {progress.total} chunks</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} />
              </div>
            )}

            {/* Chunk Size Selector */}
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Chunk Size:</Label>
                <Select
                  value={String(chunkSize)}
                  onValueChange={(value) => setChunkSize(Number(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 bytes</SelectItem>
                    <SelectItem value="80">80 bytes</SelectItem>
                    <SelectItem value="100">100 bytes</SelectItem>
                    <SelectItem value="200">200 bytes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-gray-500">
                Smaller chunks = more reliable
              </span>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Print Button */}
        <Button
          onClick={printReceipt}
          disabled={!isConnected || isPrinting}
          className="w-full mb-6 gap-2"
          size="lg"
        >
          {isPrinting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Printing...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" />
              Print Receipt
            </>
          )}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Data</CardTitle>
              <CardDescription>Edit order details for the receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Order #</Label>
                <Input
                  type="number"
                  value={order.display_id}
                  onChange={(e) => updateOrderField('display_id', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input
                  value={`${order.customer.first_name} ${order.customer.last_name}`}
                  onChange={(e) => {
                    const names = e.target.value.split(' ');
                    updateOrderField('customer.first_name', names[0] || '');
                    updateOrderField('customer.last_name', names.slice(1).join(' ') || '');
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Total (₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={order.totals.total}
                  onChange={(e) => updateOrderField('totals.total', parseFloat(e.target.value) || 0)}
                />
              </div>

              <Separator />

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Items</Label>
                  <Button
                    onClick={addItem}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            value={item.title}
                            onChange={(e) => updateItem(index, 'title', e.target.value)}
                            placeholder="Item name"
                            className="mb-1"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="Qty"
                              className="w-16"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => removeItem(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Receipt Preview</CardTitle>
                  <CardDescription>58mm thermal paper format</CardDescription>
                </div>
                <Button
                  onClick={generatePreview}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <ScrollArea className="h-[500px]">
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {receiptPreview || 'No preview available'}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}