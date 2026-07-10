// components/ReceiptBuilder.js
'use client';

import EscPosEncoder from 'esc-pos-encoder';

export class ReceiptBuilder {
  constructor(config = {}) {
    this.config = {
      storeName: 'TechHub PH',
      address: '123 Ayala Avenue',
      city: 'Makati City, Metro Manila',
      phone: '+63 (2) 8123 4567',
      vat: 'VAT TIN: 123-456-789',
      footer: 'Thank you for shopping!',
      ...config
    };
  }

  // 58mm paper = 30 characters max
  PAPER_WIDTH = 30;

  formatCurrency(amount) {
    return `₱${Number(amount).toFixed(2)}`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day} ${year} ${hour12}:${minutes}${ampm}`;
  }

  // Center text for headers only
  centerText(text, width = 30) {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + text;
  }

  separator(char = '─', width = 30) {
    return char.repeat(width);
  }

  // Truncate text to fit within max length
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '..';
  }

  // Ensure text fits within width
  fitText(text, width = 30) {
    if (text.length > width) {
      return text.substring(0, width - 2) + '..';
    }
    return text.padEnd(width);
  }

  // Format item line - ALL LEFT ALIGNED - 30 chars
  formatItemLine(name, qty, price) {
    const maxNameLen = 15; // 15 + 4 + 11 = 30
    let displayName = this.truncateText(name, maxNameLen);
    displayName = displayName.padEnd(maxNameLen);
    
    const qtyStr = `x${qty}`.padEnd(4);
    const priceStr = this.formatCurrency(price);
    
    // Combine: 15 + 4 + 11 = 30 chars
    let line = `${displayName}${qtyStr}${priceStr}`;
    return this.fitText(line);
  }

  // Format total line - LEFT ALIGNED - 30 chars
  formatTotalLine(label, amount) {
    const maxLabelLen = 19; // 19 + 11 = 30
    let displayLabel = this.truncateText(label, maxLabelLen);
    displayLabel = displayLabel.padEnd(maxLabelLen);
    
    const amountStr = this.formatCurrency(amount);
    
    // Combine: 19 + 11 = 30 chars
    let line = `${displayLabel}${amountStr}`;
    return this.fitText(line);
  }

  // Format header line - CENTERED
  formatHeaderLine(text) {
    const width = 30;
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  build(order) {
    const encoder = new EscPosEncoder();
    const store = this.config;
    const totals = order.totals;

    encoder.initialize();

    // ============================================
    // HEADER SECTION - CENTERED
    // ============================================
    encoder
      .align('center')
      .bold(true)
      .size(2, 2)
      .text(this.formatHeaderLine(store.storeName))
      .bold(false)
      .size(1, 1)
      .newline()
      .text(this.formatHeaderLine(store.address))
      .text(this.formatHeaderLine(store.city))
      .text(this.formatHeaderLine(`Tel: ${store.phone}`))
      .text(this.formatHeaderLine(store.vat))
      .newline(2);

    // ============================================
    // ORDER INFORMATION - LEFT ALIGNED
    // ============================================
    encoder
      .align('left')
      .bold(true)
      .text(this.fitText('ORDER DETAILS'))
      .bold(false)
      .text(this.fitText(`Order #: ${order.display_id}`))
      .text(this.fitText(`Date: ${this.formatDate(order.created_at)}`))
      .text(this.fitText(`Status: ${order.status.toUpperCase()}`))
      .newline(2);

    // ============================================
    // CUSTOMER INFORMATION - LEFT ALIGNED
    // ============================================
    if (order.customer) {
      encoder
        .bold(true)
        .text(this.fitText('CUSTOMER'))
        .bold(false)
        .text(this.fitText(`${order.customer.first_name} ${order.customer.last_name}`));
      
      if (order.customer.email) {
        encoder.text(this.fitText(`Email: ${order.customer.email}`));
      }
      if (order.customer.phone) {
        encoder.text(this.fitText(`Phone: ${order.customer.phone}`));
      }
      encoder.newline(2);
    }

    // ============================================
    // ITEMS SECTION - LEFT ALIGNED
    // ============================================
    encoder
      .bold(true)
      .text(this.fitText('ITEM           QTY PRICE'))
      .bold(false)
      .text(this.fitText('─'.repeat(30)))
      .newline();

    // Print each item
    order.items.forEach((item, index) => {
      const line = this.formatItemLine(item.title, item.quantity, item.unit_price);
      encoder.text(line);
      
      if (index < order.items.length - 1) {
        encoder.newline();
      }
    });

    encoder.newline(2);
    encoder.text(this.fitText('─'.repeat(30)));
    encoder.newline(2);

    // ============================================
    // TOTALS SECTION - LEFT ALIGNED
    // ============================================
    encoder
      .text(this.formatTotalLine('Subtotal', totals.subtotal))
      .newline();

    if (totals.discount > 0) {
      encoder.text(this.formatTotalLine('Discount', -totals.discount))
        .newline();
    }

    encoder
      .text(this.formatTotalLine('Tax(12%)', totals.tax))
      .newline();

    if (totals.shipping > 0) {
      encoder.text(this.formatTotalLine('Shipping', totals.shipping))
        .newline();
    }

    encoder
      .newline()
      .text(this.fitText('─'.repeat(30)))
      .newline()
      .bold(true)
      .size(1, 2)
      .text(this.formatTotalLine('TOTAL', totals.total))
      .bold(false)
      .size(1, 1)
      .newline(2);

    // ============================================
    // PAYMENT SECTION - LEFT ALIGNED
    // ============================================
    if (order.payment) {
      encoder
        .bold(true)
        .text(this.fitText('PAYMENT'))
        .bold(false)
        .text(this.fitText(`Method: ${order.payment.method}`))
        .text(this.fitText(`Amount: ${this.formatCurrency(order.payment.amount)}`))
        .text(this.fitText(`Status: ${order.payment.status}`));
      
      if (order.payment.card_last4) {
        encoder.text(this.fitText(`Card: ****${order.payment.card_last4}`));
      }
      encoder.newline(2);
    }

    // ============================================
    // SHIPPING SECTION - LEFT ALIGNED
    // ============================================
    if (order.shipping) {
      const shipping = order.shipping;
      
      encoder
        .bold(true)
        .text(this.fitText('SHIPPING'))
        .bold(false)
        .text(this.fitText(`Method: ${shipping.method}`))
        .text(this.fitText(`Cost: ${this.formatCurrency(shipping.cost)}`));
      
      if (shipping.tracking) {
        encoder.text(this.fitText(`Tracking: ${shipping.tracking}`));
      }

      if (shipping.address) {
        const addr = shipping.address;
        encoder
          .newline()
          .bold(true)
          .text(this.fitText('SHIP TO'))
          .bold(false)
          .text(this.fitText(`${addr.first_name} ${addr.last_name}`))
          .text(this.fitText(addr.address_1));
        
        if (addr.address_2) {
          encoder.text(this.fitText(addr.address_2));
        }
        
        encoder.text(this.fitText(`${addr.city}, ${addr.province}`));
        encoder.text(this.fitText(`${addr.postal_code}, ${addr.country}`));
      }
      encoder.newline(2);
    }

    // ============================================
    // FOOTER SECTION - CENTERED
    // ============================================
    encoder
      .align('center')
      .text(this.formatHeaderLine('═'.repeat(30)))
      .newline(2)
      .text(this.formatHeaderLine(store.footer))
      .newline()
      .text(this.formatHeaderLine('Returns within 7 days'))
      .text(this.formatHeaderLine('with original receipt'))
      .newline(2)
      .text(this.formatHeaderLine('Thank you!'))
      .newline(3)
      .cut('full');

    return encoder.encode();
  }
}

// ============================================
// RECEIPT PREVIEW GENERATOR
// ============================================
export const generateReceiptPreview = (order, config = {}) => {
  try {
    const builder = new ReceiptBuilder(config);
    const buffer = builder.build(order);
    
    let preview = '';
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      const char = String.fromCharCode(view[i]);
      if (char === '\x00') continue;
      if (char === '\x0A') preview += '\n';
      else if (char.charCodeAt(0) >= 32) preview += char;
    }
    
    return preview;
  } catch (err) {
    return 'Error generating preview: ' + err.message;
  }
};