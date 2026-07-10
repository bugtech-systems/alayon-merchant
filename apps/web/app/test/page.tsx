// app/thermal-print/page.jsx
'use client';

import React, { useState, useRef } from 'react';
import EscPosEncoder from 'esc-pos-encoder';

export default function ThermalPrintPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);

  // Configuration for your PT-210
  const PRINTER_CONFIG = {
    // Common ESC/POS service UUID
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    // Common ESC/POS characteristic for writing
    characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  };

  // Build receipt using esc-pos-encoder
  const buildReceipt = (orderData) => {
    const encoder = new EscPosEncoder();
    
    // Start building the receipt
    encoder
      .initialize()
      .align('center')
      .bold(true)
      .size(2, 2)
      .text('MY STORE')
      .bold(false)
      .size(1, 1)
      .text('123 Main Street')
      .text('Tel: +1 (555) 123-4567')
      .newline()
      .align('left')
      .text(`Order #: ${orderData.id || 'N/A'}`)
      .text(`Date: ${new Date().toLocaleString()}`)
      .newline()
      .text('─'.repeat(32))
      .newline();

    // Items
    orderData.items?.forEach((item) => {
      const name = (item.title || 'Item').substring(0, 20).padEnd(20);
      const qty = item.quantity || 1;
      const price = (item.unit_price || 0).toFixed(2);
      encoder.text(`${name}${qty}  $${price}`);
    });

    encoder
      .text('─'.repeat(32))
      .newline()
      .align('right')
      .text(`Subtotal: $${(orderData.summary?.subtotal || 0).toFixed(2)}`)
      .text(`Tax: $${(orderData.summary?.tax_total || 0).toFixed(2)}`)
      .text('─'.repeat(32))
      .bold(true)
      .text(`TOTAL: $${(orderData.summary?.total || 0).toFixed(2)}`)
      .bold(false)
      .newline()
      .align('center')
      .text('Thank you!')
      .newline()
      .cut('full');

    return encoder.encode();
  };

  // Connect to printer
  const connectPrinter = async () => {
    setError(null);
    setStatus('connecting');

    try {
      // Check Web Bluetooth support
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
      }

      // Request the Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PRINTER_CONFIG.serviceUUID]
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Unknown Printer');

      // Connect to the GATT server
      const server = await device.gatt.connect();
      
      // Get the service
      const service = await server.getPrimaryService(PRINTER_CONFIG.serviceUUID);
      
      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic(PRINTER_CONFIG.characteristicUUID);
      characteristicRef.current = characteristic;

      setIsConnected(true);
      setStatus('connected');
      console.log('✅ Connected to printer:', device.name);

    } catch (err) {
      console.error('Connection error:', err);
      setError(`Connection failed: ${err.message}`);
      setStatus('error');
      setIsConnected(false);
    }
  };

  // Disconnect printer
  const disconnectPrinter = async () => {
    if (deviceRef.current && deviceRef.current.gatt) {
      try {
        await deviceRef.current.gatt.disconnect();
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    setIsConnected(false);
    setStatus('disconnected');
    deviceRef.current = null;
    characteristicRef.current = null;
    setDeviceName(null);
  };

  // Print receipt
  const printReceipt = async () => {
    if (!isConnected || !characteristicRef.current) {
      setError('Printer not connected. Please connect first.');
      return;
    }

    setIsPrinting(true);
    setError(null);
    setStatus('printing');

    try {
      // Sample order data - replace with your actual data
      const orderData = {
        id: 'ORD-1001',
        items: [
          { title: 'Premium Headphones', quantity: 2, unit_price: 99.99 },
          { title: 'USB-C Cable', quantity: 1, unit_price: 19.99 },
        ],
        summary: {
          subtotal: 219.97,
          tax_total: 17.60,
          total: 237.57
        }
      };

      // Build the receipt
      const receiptData = buildReceipt(orderData);
      
      // Send to printer
      await characteristicRef.current.writeValue(receiptData);
      
      setStatus('done');
      console.log('✅ Receipt printed successfully!');
      
      setTimeout(() => setStatus('connected'), 3000);

    } catch (err) {
      console.error('Print error:', err);
      setError(`Print failed: ${err.message}`);
      setStatus('error');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Thermal Printer</h1>

          {/* Connection Status */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'connected' ? 'bg-green-500' :
                  status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  status === 'printing' ? 'bg-blue-500 animate-pulse' :
                  'bg-gray-400'
                }`} />
                <span className="font-medium">
                  {status === 'connected' && deviceName ? `Connected: ${deviceName}` :
                   status === 'connecting' ? 'Connecting...' :
                   status === 'printing' ? 'Printing...' :
                   status === 'done' ? 'Print Complete! ✓' :
                   'Disconnected'}
                </span>
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <button
                    onClick={connectPrinter}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    onClick={disconnectPrinter}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                ❌ {error}
              </div>
            )}
          </div>

          {/* Print Button */}
          <button
            onClick={printReceipt}
            disabled={!isConnected || isPrinting}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition font-medium"
          >
            {isPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
          </button>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium">📌 Instructions:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Make sure your PT-210 is powered ON</li>
              <li>Put the printer in pairing mode (hold the power button)</li>
              <li>Click "Connect" above</li>
              <li>Select your printer from the list</li>
              <li>Click "Print Receipt" to test</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}