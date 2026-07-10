// lib/escposBuilder.js

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

export class ESCPOSBuilder {
  constructor() {
    this.buffer = [];
  }

  // Initialize printer
  initialize() {
    this.buffer.push(ESC, 0x40); // @
    return this;
  }

  // Text with alignment
  text(text) {
    const str = String(text || '');
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
    this.buffer.push(LF);
    return this;
  }

  // Set alignment: 0=left, 1=center, 2=right
  align(alignment) {
    this.buffer.push(ESC, 0x61, alignment);
    return this;
  }

  // Set font size
  size(width, height) {
    const size = ((height - 1) << 4) | (width - 1);
    this.buffer.push(GS, 0x21, size);
    return this;
  }

  // Bold on/off
  bold(on) {
    this.buffer.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  // Newline
  newline(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  // QR Code
  qrCode(data) {
    // QR Code mode
    this.buffer.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    
    // QR Code data
    const len = data.length + 3;
    this.buffer.push(GS, 0x28, 0x6B, len & 0xFF, (len >> 8) & 0xFF, 0x31, 0x50, 0x30);
    
    // Store data
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data.charCodeAt(i));
    }
    
    // Print QR
    this.buffer.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  // Cut paper
  cut() {
    this.buffer.push(GS, 0x56, 0x00); // Full cut
    return this;
  }

  // Get buffer as Uint8Array
  getBuffer() {
    return new Uint8Array(this.buffer);
  }
}

// Build receipt
export const buildReceipt = (order, config = {}) => {
  const p = new ESCPOSBuilder();
  
  p.initialize();
  
  // Header
  p.align(1); // Center
  p.bold(true);
  p.size(2, 2);
  p.text(config.storeName || 'My Store');
  p.bold(false);
  p.size(1, 1);
  p.text(config.address || '123 Main Street');
  p.text(`Tel: ${config.phone || '+1 (555) 123-4567'}`);
  p.newline();

  // Order Info
  p.align(0); // Left
  p.text(`Order #: ${order.display_id || order.id}`);
  p.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
  p.newline();

  // Items Header
  p.text('ITEM'.padEnd(24) + 'QTY   PRICE');
  p.text('─'.repeat(32));
  
  // Items
  order.items.forEach((item) => {
    const displayName = (item.title || '').substring(0, 24);
    const qty = item.quantity;
    const price = item.unit_price.toFixed(2);
    p.text(`${displayName.padEnd(24)}${qty}  $${price}`);
  });

  p.text('─'.repeat(32));
  
  // Totals
  p.align(2); // Right
  p.text(`Subtotal: $${order.summary.subtotal.toFixed(2)}`);
  p.text(`Tax: $${order.summary.tax_total.toFixed(2)}`);
  if (order.summary.shipping_total > 0) {
    p.text(`Shipping: $${order.summary.shipping_total.toFixed(2)}`);
  }
  p.text('─'.repeat(32));
  p.bold(true);
  p.text(`TOTAL: $${order.summary.total.toFixed(2)}`);
  p.bold(false);
  p.newline();

  // Payment Info
  p.align(0);
  if (order.payments && order.payments.length > 0) {
    const payment = order.payments[0];
    p.text(`Payment: ${payment.provider_id}`);
    p.text(`Status: ${payment.captured_at ? 'Paid' : 'Pending'}`);
    p.newline();
  }

  // Shipping Info
  if (order.shipping_address) {
    p.text('Ship to:');
    p.text(`${order.shipping_address.first_name} ${order.shipping_address.last_name}`);
    p.text(order.shipping_address.address_1);
    if (order.shipping_address.address_2) {
      p.text(order.shipping_address.address_2);
    }
    p.text(`${order.shipping_address.city}, ${order.shipping_address.province} ${order.shipping_address.postal_code}`);
    p.newline();
  }

  // QR Code
  if (config.showQRCode !== false) {
    const qrData = `${process.env.NEXT_PUBLIC_STORE_URL || 'https://example.com'}/orders/${order.id}`;
    p.align(1);
    p.qrCode(qrData);
    p.text('Scan for receipt details');
    p.newline();
  }

  // Footer
  p.align(1);
  p.text(config.footerMessage || 'Thank you for your business!');
  if (config.showReturnPolicy !== false) {
    p.text('Returns accepted within 30 days');
  }
  p.newline();
  
  // Cut paper
  p.cut();

  return p.getBuffer();
};

// Test data
export const testOrderData = {
  id: "order_123456789",
  display_id: 1001,
  created_at: "2026-07-10T10:30:00.000Z",
  customer: {
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com"
  },
  items: [
    {
      title: "Premium Wireless Headphones",
      quantity: 2,
      unit_price: 99.99,
      variant: { sku: "WH-1000XM5-BLK" }
    },
    {
      title: "USB-C Charging Cable",
      quantity: 1,
      unit_price: 19.99,
      variant: { sku: "USB-C-6FT-WHT" }
    }
  ],
  shipping_address: {
    first_name: "John",
    last_name: "Doe",
    address_1: "123 Main Street",
    city: "New York",
    province: "NY",
    postal_code: "10001",
    country_code: "us"
  },
  payments: [
    {
      provider_id: "pp_stripe",
      captured_at: "2026-07-10T10:32:00.000Z",
      data: { id: "pi_123456", card_last4: "4242" }
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

export default ESCPOSBuilder;