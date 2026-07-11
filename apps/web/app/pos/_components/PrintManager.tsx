// lib/printer/PrinterManager.ts
'use client';

import { PrinterConfig, PrinterDevice } from '@/types';

export class PrinterManager {
  private device: any | null = null;
  private server: any | null = null;
  private service: any | null = null;
  private characteristic: any | null = null;
  private connected: boolean = false;
  private serviceUUID: string;
  private characteristicUUID: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(
    serviceUUID: string = '000018f0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: string = '00002af1-0000-1000-8000-00805f9b34fb'
  ) {
    this.serviceUUID = serviceUUID;
    this.characteristicUUID = characteristicUUID;
  }

  async connect(): Promise<PrinterDevice> {
    try {
      // Check Web Bluetooth support
      if (typeof window === 'undefined' || !navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser.');
      }

      // Check secure context
      if (!window.isSecureContext) {
        throw new Error('Web Bluetooth requires a secure context (HTTPS).');
      }

      // Check Bluetooth availability
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        throw new Error('Bluetooth is not available on this device.');
      }

      // Request device with multiple filter options
      this.device = await this.requestDeviceWithFallback();

      // Connect to GATT server
      await this.connectToGatt();

      // Get service and characteristic
      await this.getServiceAndCharacteristic();

      this.connected = true;
      this.reconnectAttempts = 0;

      return {
        device: this.device,
        server: this.server!,
        service: this.service!,
        characteristic: this.characteristic!,
        name: this.device.name || 'Unknown Printer'
      };

    } catch (error) {
      console.error('Connection error:', error);
      this.connected = false;
      throw error;
    }
  }

  private async requestDeviceWithFallback(): Promise<any> {
    try {
      // Try with service filter first
      return await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.serviceUUID] },
          { namePrefix: 'Printer' },
          { namePrefix: 'BT' },
          { namePrefix: 'POS' },
          { namePrefix: 'Thermal' },
        ],
        optionalServices: [
          this.serviceUUID,
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
        ],
      });
    } catch (error) {
      console.log('Service filter failed, trying name filter...');
      try {
        return await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'Printer' },
            { namePrefix: 'BT' },
            { namePrefix: 'POS' },
            { namePrefix: 'Thermal' },
          ],
        });
      } catch (nameError) {
        console.log('Name filter failed, allowing all devices...');
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [this.serviceUUID],
        });
      }
    }
  }

  private async connectToGatt(): Promise<void> {
    try {
      this.server = await this.device!.gatt!.connect();
      await this.sleep(200);
    } catch (error) {
      if (this.device?.gatt) {
        await this.sleep(500);
        this.server = await this.device.gatt.connect();
        await this.sleep(200);
      } else {
        throw error;
      }
    }
  }

  private async getServiceAndCharacteristic(): Promise<void> {
    try {
      this.service = await this.server!.getPrimaryService(this.serviceUUID);
      this.characteristic = await this.service!.getCharacteristic(this.characteristicUUID);
    } catch (error) {
      // Try to find any writable characteristic
      const services = await this.server!.getPrimaryServices();
      for (const svc of services) {
        const characteristics = await svc.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.service = svc;
            this.characteristic = char;
            return;
          }
        }
      }
      throw new Error('No writable characteristic found for printing');
    }
  }

  async ensureConnected(): Promise<void> {
    try {
      if (!this.device) {
        await this.connect();
        return;
      }

      if (!this.device.gatt?.connected || !this.characteristic) {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          await this.connect();
          this.reconnectAttempts = 0;
          return;
        }
        await this.connectToGatt();
        await this.getServiceAndCharacteristic();
        this.connected = true;
      }
    } catch (error) {
      console.error('Ensure connection failed:', error);
      this.connected = false;
      throw error;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    await this.ensureConnected();
    
    try {
      // Try write with response first
      await this.characteristic!.writeValue(data);
    } catch (error: any) {
      // If write fails due to disconnection, reconnect and retry
      if (error.message?.includes('no longer valid') || 
          error.message?.includes('disconnected') ||
          error.message?.includes('GATT')) {
        await this.ensureConnected();
        await this.characteristic!.writeValue(data);
      } else {
        // Try write without response
        if (this.characteristic!.properties.writeWithoutResponse) {
          await this.characteristic!.writeValueWithoutResponse(data);
        } else {
          throw error;
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt) {
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
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.connected && 
           !!this.device?.gatt?.connected && 
           !!this.characteristic;
  }

  getDeviceName(): string {
    return this.device?.name || 'Unknown';
  }

  getDeviceInfo(): any {
    return {
      name: this.device?.name,
      id: this.device?.id,
      connected: this.isConnected(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ChunkedTransmission {
  private printerManager: PrinterManager;
  private chunkSize: number;
  private maxRetries: number;
  public onProgress: ((sent: number, total: number) => void) | null = null;
  public onChunkSent: ((chunk: number, total: number) => void) | null = null;

  constructor(printerManager: PrinterManager, chunkSize: number = 80, maxRetries: number = 3) {
    this.printerManager = printerManager;
    this.chunkSize = chunkSize;
    this.maxRetries = maxRetries;
  }

  async send(data: Uint8Array | string): Promise<void> {
    const buffer = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : data;

    if (!this.printerManager.isConnected()) {
      await this.printerManager.ensureConnected();
    }

    // Split into chunks
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < buffer.length; i += this.chunkSize) {
      chunks.push(buffer.slice(i, Math.min(i + this.chunkSize, buffer.length)));
    }

    // Send each chunk with retry
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;

      while (!success && retries < this.maxRetries) {
        try {
          if (!this.printerManager.isConnected()) {
            await this.printerManager.ensureConnected();
          }
          
          // Small delay between chunks
          if (i > 0) {
            await this.sleep(50);
          }
          
          await this.printerManager.write(chunks[i]);
          success = true;
          
          // Progress callback
          this.onProgress?.(i + 1, chunks.length);
          this.onChunkSent?.(i + 1, chunks.length);
          
        } catch (error) {
          retries++;
          if (retries >= this.maxRetries) {
            throw new Error(`Failed to send chunk ${i + 1}/${chunks.length}: ${(error as Error).message}`);
          }
          await this.sleep(200 * retries);
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setChunkSize(size: number): void {
    this.chunkSize = size;
  }
}