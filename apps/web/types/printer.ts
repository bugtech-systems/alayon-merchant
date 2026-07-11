// lib/printer/types.ts
export interface PrinterConfig {
  serviceUUID: string;
  characteristicUUID: string;
  chunkSize: number;
  maxRetries: number;
}

export interface PrinterDevice {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  characteristic: BluetoothRemoteGATTCharacteristic;
  name: string;
}

export interface PrintStatus {
  type: 'idle' | 'success' | 'error' | 'printing' | 'connecting' | 'disconnected';
  message: string;
  progress?: number;
}

export interface PrinterSettings {
  paperSize: '58mm' | '80mm';
  copies: number;
  autoCut: boolean;
  printReceipt: boolean;
  printKitchen: boolean;
  printCustomerCopy: boolean;
}

export interface OrderData {
  display_id: string;
  created_at: string;
  status: string;
  currency_code: string;
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  } | null;
  items: OrderItem[];
  shipping: {
    method: string;
    cost: number;
    tracking?: string;
    address?: {
      address1: string;
      city: string;
      postal_code: string;
    };
  } | null;
  payment: {
    method: string;
    status: string;
    card_last4?: string;
    amount: number;
  } | null;
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
}

export interface OrderItem {
  title: string;
  quantity: number;
  unit_price: number;
  sku?: string;
  variant?: {
    title: string;
  };
}

export interface ReceiptOptions {
  storeName: string;
  paperSize: number;
  currency: string;
  showLogo?: boolean;
  showTax?: boolean;
}