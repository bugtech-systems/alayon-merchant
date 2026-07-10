// lib/PrinterManager.js
'use client';

export class PrinterManager {
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

export class ChunkedTransmission {
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