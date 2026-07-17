// components/ReceiptBuilder.js
'use client';

import EscPosEncoder from 'esc-pos-encoder';

export class ReceiptBuilder {
  constructor(config = {}) {
    this.config = {
      storeName: 'Belly Bytes',
      address: '016 Dadison St. Pericohon',
      city: 'Tacloban City, Leyte',
      phone: '+639774461641',
      vat: 'VAT TIN: ',
      footer: 'Thank you for Buying!',
      ...config
    };
  }

  // 58mm paper = 32 characters max
  PAPER_WIDTH = 32;

  formatCurrency(amount) {
    return `${Number(amount).toFixed(2)}`;
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
  centerText(text, width = 32) {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    return ' '.repeat(leftPad) + text;
  }

  separator(char = '─', width = 32) {
    return char.repeat(width);
  }

  // Truncate text to fit within max length
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '..';
  }

  // Ensure text fits within width
  fitText(text, width = 32) {
    if (text.length > width) {
      return text.substring(0, width - 2) + '..';
    }
    return text.padEnd(width);
  }

  // Format item line - Shows: Item Title + Qty only
  formatItemLine(title, qty) {
    const maxTitleLen = 24; // Leave room for qty
    let displayTitle = this.truncateText(title, maxTitleLen);
    displayTitle = displayTitle.padEnd(maxTitleLen);
    
    const qtyStr = `x${qty}`.padStart(6);
    
    // Combine: 24 + 6 = 30 chars
    let line = `${displayTitle}${qtyStr}`;
    return line.padEnd(32);
  }

  // Format item total line - Shows: Total amount for item
  formatItemTotalLine(price, qty) {
    const total = price * qty;
    const label = 'Total:';
    const amountStr = this.formatCurrency(total).padStart(11);
    
    let line = `${amountStr}`;
    return line.padEnd(32);
  }

  // Format total line - LEFT ALIGNED - 32 chars
  formatTotalLine(label, amount) {
    const maxLabelLen = 19;
    let displayLabel = this.truncateText(label, maxLabelLen);
    displayLabel = displayLabel.padEnd(maxLabelLen);
    
    const amountStr = this.formatCurrency(amount).padStart(13);
    
    let line = `${displayLabel}${amountStr}`;
    return line.padEnd(32);
  }

  // Format header line - CENTERED
  formatHeaderLine(text) {
    const width = 32;
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
console.log(order.metadata, order, 'HOOORD')
    // ============================================
    // ORDER INFORMATION - LEFT ALIGNED
    // ============================================
    encoder
      .align('left')
      .bold(true)
      .text(this.fitText('ORDER DETAILS'))
      .bold(false)
      .text(this.fitText(`Order #: ${order.display_id || order.id || 'N/A'} || ${order?.metadata?.table_ids?.[0] ? order?.metadata?.table_ids?.[0] : ''}`))
      .text(this.fitText(`Date: ${this.formatDate(order.created_at)}`))
      .text(this.fitText(`Status: ${order.status?.toUpperCase() || 'COMPLETED'}`))
      .newline(2);

    // ============================================
    // CUSTOMER INFORMATION - LEFT ALIGNED
    // ============================================
    if (order.customer) {
      encoder
        .bold(true)
        .text(this.fitText('CUSTOMER'))
        .bold(false)
        .text(this.fitText(`${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Guest'));
      
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
      .text(this.fitText('ITEM                   QTY'))
      .bold(false)
      .text(this.fitText('─'.repeat(32)))
      .newline();

    // Print each item with title, qty, and total
    order.items.forEach((item, index) => {
      // Line 1: Item Title + Qty
      const line1 = this.formatItemLine(
        item.title || item.product_title || 'Item',
        item.quantity || 1
      );
      encoder.text(line1);
      
      // Line 2: Item Total (price x qty)
      const line2 = this.formatItemTotalLine(
        item.unit_price || 0,
        item.quantity || 1
      );
      encoder.text(line2);
      
      // Add spacing between items
      if (index < order.items.length - 1) {
        encoder.newline();
      }
    });

    encoder.newline(2);
    encoder.text(this.fitText('─'.repeat(32)));
    encoder.newline(2);

    // ============================================
    // TOTALS SECTION - LEFT ALIGNED
    // ============================================
    encoder
      .text(this.formatTotalLine('Subtotal', totals.subtotal || 0))
      .newline();

    if (totals.discount && totals.discount > 0) {
      encoder.text(this.formatTotalLine('Discount', -totals.discount))
        .newline();
    }

    encoder
      .text(this.formatTotalLine('Tax(12%)', totals.tax || 0))
      .newline();

    if (totals.shipping && totals.shipping > 0) {
      encoder.text(this.formatTotalLine('Shipping', totals.shipping))
        .newline();
    }

    encoder
      .newline()
      .text(this.fitText('─'.repeat(32)))
      .newline()
      .bold(true)
      .size(1, 2)
      .text(this.formatTotalLine('TOTAL', totals.total || 0))
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
        .text(this.fitText(`Method: ${order.payment.method || 'N/A'}`))
        .text(this.fitText(`Amount: ${this.formatCurrency(order.payment.amount || 0)}`))
        .text(this.fitText(`Status: ${order.payment.status || 'PAID'}`));
      
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
        .text(this.fitText(`Method: ${shipping.method || 'N/A'}`))
        .text(this.fitText(`Cost: ${this.formatCurrency(shipping.cost || 0)}`));
      
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
          .text(this.fitText(`${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'N/A'))
          .text(this.fitText(addr.address_1 || ''));
        
        if (addr.address_2) {
          encoder.text(this.fitText(addr.address_2));
        }
        
        encoder.text(this.fitText(`${addr.city || ''}, ${addr.province || ''}`));
        encoder.text(this.fitText(`${addr.postal_code || ''}, ${addr.country || ''}`));
      }
      encoder.newline(2);
    }

  
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