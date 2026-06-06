// lib/print-utils.ts

export interface PrintOrderData {
  orderNumber: string;
  date: Date;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  placement?: {
    name: string;
    type: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
    variant?: string;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

export interface PrinterSettings {
  printerName?: string;
  paperSize: "58mm" | "80mm";
  copies: number;
  autoCut: boolean;
}



// Format date for receipt
export const formatReceiptDate = (date: Date): string => {
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Generate ESC/POS commands (for thermal printers)
export const generateEscPosCommands = (data: PrintOrderData): Uint8Array => {
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @
  
  // Set alignment to center
  commands.push(0x1B, 0x61, 0x01); // ESC a 1
  
  // Bold on
  commands.push(0x1B, 0x45, 0x01); // ESC E 1
  
  // Store name (customize as needed)
  const storeName = "ALAYON RESTAURANT";
  commands.push(...stringToBytes(storeName));
  commands.push(0x0A); // LF
  
  // Bold off
  commands.push(0x1B, 0x45, 0x00); // ESC E 0
  
  // Store address
  const address = "123 Main Street, City";
  commands.push(...stringToBytes(address));
  commands.push(0x0A);
  
  const phone = "Tel: (02) 1234 5678";
  commands.push(...stringToBytes(phone));
  commands.push(0x0A);
  
  commands.push(0x0A); // Empty line
  
  // Order info
  commands.push(0x1B, 0x61, 0x00); // ESC a 0 (left align)
  
  const orderLine = `Order #: ${data.orderNumber}`;
  commands.push(...stringToBytes(orderLine));
  commands.push(0x0A);
  
  const dateLine = `Date: ${formatReceiptDate(data.date)}`;
  commands.push(...stringToBytes(dateLine));
  commands.push(0x0A);
  
  // Customer info
  if (data.customer?.name) {
    commands.push(...stringToBytes(`Customer: ${data.customer.name}`));
    commands.push(0x0A);
  }
  
  // Table/Placement info
  if (data.placement?.name) {
    commands.push(...stringToBytes(`${data.placement.type === "table" ? "Table" : "Section"}: ${data.placement.name}`));
    commands.push(0x0A);
  }
  
  commands.push(0x0A);
  
  // Separator line
  commands.push(...stringToBytes("--------------------------------"));
  commands.push(0x0A);
  
  // Header
  commands.push(...stringToBytes("Qty  Item                    Price"));
  commands.push(0x0A);
  commands.push(...stringToBytes("--------------------------------"));
  commands.push(0x0A);
  
  // Items
  for (const item of data.items) {
    const quantityStr = `${item.quantity}`.padEnd(4);
    let nameStr = item.name;
    if (item.variant) {
      nameStr += ` (${item.variant})`;
    }
    nameStr = nameStr.substring(0, 20).padEnd(20);
    const priceStr = `${formatCurrency(item.price)}`.padStart(10);
    
    commands.push(...stringToBytes(`${quantityStr} ${nameStr} ${priceStr}`));
    commands.push(0x0A);
    
    if (item.notes) {
      commands.push(...stringToBytes(`     Note: ${item.notes.substring(0, 30)}`));
      commands.push(0x0A);
    }
  }
  
  commands.push(...stringToBytes("--------------------------------"));
  commands.push(0x0A);
  
  // Totals
  commands.push(...stringToBytes(`Subtotal:${formatCurrency(data.subtotal).padStart(28)}`));
  commands.push(0x0A);
  commands.push(...stringToBytes(`Tax (${(data.taxRate * 100).toFixed(0)}%):${formatCurrency(data.tax).padStart(26)}`));
  commands.push(0x0A);
  
  // Bold for total
  commands.push(0x1B, 0x45, 0x01); // ESC E 1
  commands.push(...stringToBytes(`TOTAL:${formatCurrency(data.total).padStart(30)}`));
  commands.push(0x0A);
  commands.push(0x1B, 0x45, 0x00); // ESC E 0
  
  commands.push(0x0A);
  
  // Payment method
  commands.push(...stringToBytes(`Payment: ${data.paymentMethod}`));
  commands.push(0x0A);
  
  // Order notes
  if (data.notes) {
    commands.push(0x0A);
    commands.push(...stringToBytes("Notes:"));
    commands.push(0x0A);
    commands.push(...stringToBytes(data.notes.substring(0, 48)));
    commands.push(0x0A);
  }
  
  commands.push(0x0A);
  
  // Thank you message
  commands.push(0x1B, 0x61, 0x01); // ESC a 1 (center)
  commands.push(...stringToBytes("Thank you for dining with us!"));
  commands.push(0x0A);
  commands.push(...stringToBytes("Please come again!"));
  commands.push(0x0A);
  commands.push(0x0A);
  
  // Cut paper (if supported)
  if (data.paperSize === "80mm") {
    commands.push(0x1D, 0x56, 0x42, 0x00); // GS V B (full cut)
  } else {
    commands.push(0x1D, 0x56, 0x41, 0x00); // GS V A (partial cut)
  }
  
  return new Uint8Array(commands);
};

// Helper to convert string to byte array
function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

// Generate HTML for browser printing
export const generatePrintHtml = (data: PrintOrderData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Order Receipt</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          padding: 20px;
          background: white;
        }
        
        .receipt {
          max-width: ${data.paperSize === "58mm" ? "200px" : "300px"};
          margin: 0 auto;
          padding: 10px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #000;
        }
        
        .store-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .store-info {
          font-size: 10px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .order-info {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #000;
        }
        
        .order-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .customer-info {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #000;
        }
        
        .items {
          margin-bottom: 15px;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 5px;
          padding-bottom: 5px;
          border-bottom: 1px solid #000;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .item-name {
          flex: 2;
          word-break: break-word;
        }
        
        .item-qty {
          width: 40px;
          text-align: center;
        }
        
        .item-price {
          width: 70px;
          text-align: right;
        }
        
        .item-total {
          width: 70px;
          text-align: right;
        }
        
        .item-notes {
          font-size: 10px;
          color: #666;
          margin-left: 40px;
          margin-bottom: 5px;
        }
        
        .totals {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #000;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .grand-total {
          font-weight: bold;
          font-size: 14px;
          margin-top: 5px;
          padding-top: 5px;
          border-top: 1px solid #000;
        }
        
        .payment-info {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px dashed #000;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #000;
          font-size: 10px;
        }
        
        .thankyou {
          text-align: center;
          margin-top: 15px;
          font-weight: bold;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
          .receipt {
            margin: 0;
            padding: 5px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="store-name">ALAYON RESTAURANT</div>
          <div class="store-info">123 Main Street, City</div>
          <div class="store-info">Tel: (02) 1234 5678</div>
          <div class="store-info">VAT REG TIN: 123-456-789-000</div>
        </div>
        
        <div class="order-info">
          <div class="order-info-row">
            <span>Order #:</span>
            <span>${data.orderNumber}</span>
          </div>
          <div class="order-info-row">
            <span>Date:</span>
            <span>${formatReceiptDate(data.date)}</span>
          </div>
          <div class="order-info-row">
            <span>Cashier:</span>
            <span>POS Terminal</span>
          </div>
        </div>
        
        ${data.customer?.name ? `
          <div class="customer-info">
            <div class="order-info-row">
              <span>Customer:</span>
              <span>${data.customer.name}</span>
            </div>
            ${data.customer.phone ? `
              <div class="order-info-row">
                <span>Phone:</span>
                <span>${data.customer.phone}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${data.placement?.name ? `
          <div class="customer-info">
            <div class="order-info-row">
              <span>${data.placement.type === "table" ? "Table:" : "Section:"}</span>
              <span>${data.placement.name}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="items">
          <div class="item-header">
            <span class="item-qty">Qty</span>
            <span class="item-name">Item</span>
            <span class="item-price">Price</span>
            <span class="item-total">Total</span>
          </div>
          
          ${data.items.map(item => `
            <div>
              <div class="item-row">
                <span class="item-qty">${item.quantity}</span>
                <span class="item-name">
                  ${item.name}${item.variant ? ` (${item.variant})` : ''}
                </span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                <span class="item-total">${formatCurrency(item.total)}</span>
              </div>
              ${item.notes ? `<div class="item-notes">Note: ${item.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Tax (${(data.taxRate * 100).toFixed(0)}%):</span>
            <span>${formatCurrency(data.tax)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(data.total)}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="total-row">
            <span>Payment Method:</span>
            <span>${data.paymentMethod}</span>
          </div>
        </div>
        
        ${data.notes ? `
          <div class="totals">
            <div class="total-row">
              <span>Notes:</span>
            </div>
            <div class="total-row">
              <span>${data.notes}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="footer">
          <div>Thank you for dining with us!</div>
          <div>Please come again!</div>
          <div style="margin-top: 5px;">&nbsp;</div>
          <div>This is a computer generated receipt</div>
          <div>No signature required</div>
        </div>
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; margin: 10px;">Print Receipt</button>
        <button onclick="window.close()" style="padding: 10px 20px; margin: 10px;">Close</button>
      </div>
      
      <script>
        // Auto print when loaded
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 500);
        };
        
        // Close after print (optional)
        window.onafterprint = function() {
          // Uncomment to auto-close after print
          // window.close();
        };
      </script>
    </body>
    </html>
  `;
};

// // Generate Mobile Print Util URL scheme
// export const generateMobilePrintUrl = (data: PrintOrderData): string => {
//   // Format the receipt text for Mobile Print Util
//   const receiptLines: string[] = [];
  
//   // Header
//   receiptLines.push("=".repeat(32));
//   receiptLines.push("ALAYON RESTAURANT");
//   receiptLines.push("=".repeat(32));
//   receiptLines.push("123 Main Street, City");
//   receiptLines.push("Tel: (02) 1234 5678");
//   receiptLines.push("");
  
//   // Order info
//   receiptLines.push(`Order #: ${data.orderNumber}`);
//   receiptLines.push(`Date: ${formatReceiptDate(data.date)}`);
//   receiptLines.push("");
  
//   // Customer info
//   if (data.customer?.name) {
//     receiptLines.push(`Customer: ${data.customer.name}`);
//     if (data.customer.phone) receiptLines.push(`Phone: ${data.customer.phone}`);
//     receiptLines.push("");
//   }
  
//   // Table info
//   if (data.placement?.name) {
//     receiptLines.push(`${data.placement.type === "table" ? "Table" : "Section"}: ${data.placement.name}`);
//     receiptLines.push("");
//   }
  
//   // Items header
//   receiptLines.push("-".repeat(32));
//   receiptLines.push("QTY  ITEM                    TOTAL");
//   receiptLines.push("-".repeat(32));
  
//   // Items
//   for (const item of data.items) {
//     const qtyStr = item.quantity.toString().padEnd(4);
//     const nameStr = item.name.substring(0, 20).padEnd(20);
//     const totalStr = formatCurrency(item.total).padStart(8);
//     receiptLines.push(`${qtyStr} ${nameStr} ${totalStr}`);
    
//     if (item.variant) {
//       receiptLines.push(`     (${item.variant})`);
//     }
//     if (item.notes) {
//       receiptLines.push(`     Note: ${item.notes.substring(0, 30)}`);
//     }
//   }
  
//   receiptLines.push("-".repeat(32));
  
//   // Totals
//   receiptLines.push(`Subtotal:${formatCurrency(data.subtotal).padStart(24)}`);
//   receiptLines.push(`Tax (${(data.taxRate * 100).toFixed(0)}%):${formatCurrency(data.tax).padStart(24)}`);
//   receiptLines.push("=".repeat(32));
//   receiptLines.push(`TOTAL:${formatCurrency(data.total).padStart(27)}`);
//   receiptLines.push("=".repeat(32));
  
//   // Payment
//   receiptLines.push(`Payment: ${data.paymentMethod}`);
//   receiptLines.push("");
  
//   // Notes
//   if (data.notes) {
//     receiptLines.push("Notes:");
//     receiptLines.push(data.notes);
//     receiptLines.push("");
//   }
  
//   // Footer
//   receiptLines.push("Thank you!");
//   receiptLines.push("Please come again!");
//   receiptLines.push("=".repeat(32));
  
//   // Join with newlines and encode
//   const printText = receiptLines.join("\n");
  
//   // Create Mobile Print Util URL
//   // Format: com.samathosoft.webprint://#mling##sl#TEXT#/sl#
//   return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(printText)}#/sl#`;
// };

// Detect if running on mobile device
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// utils/receipt-content-generator.ts




// Create separator line
const getSeparator = (lineWidth: number, char: string = "-"): string => {
  return char.repeat(lineWidth);
};



// Main receipt content generator
export const generateReceiptContent = (
  data: PrintOrderData, 
  settings: PrinterSettings
): string => {
  // Set line width based on paper size
  const LINE_WIDTH = settings.paperSize === "58mm" ? 32 : 48;
  const SEPARATOR = getSeparator(LINE_WIDTH, "-");
  const DOUBLE_SEPARATOR = getSeparator(LINE_WIDTH, "=");
  const DOTTED_SEPARATOR = getSeparator(LINE_WIDTH, ".");
  
  const lines: string[] = [];
  
  // ========== HEADER SECTION ==========
  lines.push(DOUBLE_SEPARATOR);
  lines.push(centerText(data.merchant.name.toUpperCase(), LINE_WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  
  // Merchant address (wrap if needed)
  const addressLines = data.merchant.address.match(new RegExp(`.{1,${LINE_WIDTH}}`, 'g')) || [data.merchant.address];
  addressLines.forEach(line => lines.push(centerText(line, LINE_WIDTH)));
  
  lines.push(centerText(`Tel: ${data.merchant.phone}`, LINE_WIDTH));
  
  if (data.merchant.taxId) {
    lines.push(centerText(`TIN: ${data.merchant.taxId}`, LINE_WIDTH));
  }
  
  if (data.merchant.email) {
    const emailLine = data.merchant.email.length > LINE_WIDTH 
      ? data.merchant.email.substring(0, LINE_WIDTH - 3) + "..."
      : data.merchant.email;
    lines.push(centerText(emailLine, LINE_WIDTH));
  }
  
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  
  // ========== ORDER INFORMATION ==========
  lines.push(formatKeyValue("Order #", data.orderNumber, LINE_WIDTH));
  lines.push(formatKeyValue("Date", formatReceiptDate(data.date), LINE_WIDTH));
  
  // Order type with icon
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "🏠 Dine In" : 
                     data.placement.type === "takeaway" ? "📦 Takeaway" : "🚚 Delivery";
    lines.push(formatKeyValue(typeIcon, data.placement.name, LINE_WIDTH));
  }
  
  lines.push("");
  lines.push(SEPARATOR);
  
  // ========== CUSTOMER INFORMATION ==========
  if (data.customer?.name) {
    lines.push(formatKeyValue("Customer", data.customer.name, LINE_WIDTH));
    if (data.customer.phone) {
      lines.push(formatKeyValue("Phone", data.customer.phone, LINE_WIDTH));
    }
    if (data.customer.email) {
      const emailShort = data.customer.email.length > 25 
        ? data.customer.email.substring(0, 22) + "..."
        : data.customer.email;
      lines.push(formatKeyValue("Email", emailShort, LINE_WIDTH));
    }
    lines.push("");
  }
  
  // ========== ITEMS HEADER ==========
  lines.push(SEPARATOR);
  
  if (LINE_WIDTH === 32) {
    // 58mm paper compact header
    lines.push("ITEM                 QTY  TOTAL");
  } else {
    // 80mm paper detailed header
    lines.push("ITEM                          QTY     UNIT     TOTAL");
  }
  lines.push(SEPARATOR);
  
  // ========== ITEMS LIST ==========
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    if (LINE_WIDTH === 32) {
      // 58mm format
      lines.push(formatItemLine(item.name, item.quantity, item.total, LINE_WIDTH));
    } else {
      // 80mm format with more details
      const nameStr = item.name.substring(0, 26).padEnd(26);
      const qtyStr = item.quantity.toString().padStart(4);
      const unitStr = formatCurrency(item.unit_price).padStart(8);
      const totalStr = formatCurrency(item.total).padStart(8);
      lines.push(`${nameStr} ${qtyStr} ${unitStr} ${totalStr}`);
    }
    
    // Variant information
    if (item.variant) {
      const variantStr = `  ${item.variant}`;
      const wrappedVariants = variantStr.match(new RegExp(`.{1,${LINE_WIDTH - 2}}`, 'g')) || [variantStr];
      wrappedVariants.forEach(line => lines.push(line));
    }
    
    // Item notes
    if (item.notes) {
      const noteLines = item.notes.match(new RegExp(`.{1,${LINE_WIDTH - 4}}`, 'g')) || [item.notes];
      noteLines.forEach(line => {
        lines.push(`  * ${line}`);
      });
    }
    
    // Add spacing between items
    if (i < data.items.length - 1) {
      lines.push("");
    }
  }
  
  lines.push(SEPARATOR);
  
  // ========== TOTALS SECTION ==========
  // Subtotal
  const subtotalLine = `Subtotal:${formatCurrency(data.subtotal).padStart(LINE_WIDTH - 9)}`;
  lines.push(subtotalLine);
  
  // Discount
  if (data.discount_total > 0) {
    const discountLine = `Discount:-${formatCurrency(data.discount_total).padStart(LINE_WIDTH - 10)}`;
    lines.push(discountLine);
  }
  
  // Tax
  if (data.tax_total > 0) {
    const taxRate = data.subtotal > 0 
      ? ((data.tax_total / data.subtotal) * 100).toFixed(1)
      : "0";
    const taxLine = `Tax (${taxRate}%):${formatCurrency(data.tax_total).padStart(LINE_WIDTH - 13 - taxRate.length)}`;
    lines.push(taxLine);
  }
  
  // Shipping
  if (data.shipping_total && data.shipping_total > 0) {
    const shippingLine = `Shipping:${formatCurrency(data.shipping_total).padStart(LINE_WIDTH - 9)}`;
    lines.push(shippingLine);
  }
  
  lines.push(DOUBLE_SEPARATOR);
  
  // Grand Total (emphasized)
  const totalText = "TOTAL";
  const totalAmount = formatCurrency(data.total);
  const totalPadding = LINE_WIDTH - totalText.length - totalAmount.length;
  const totalLine = `${totalText}${" ".repeat(totalPadding)}${totalAmount}`;
  lines.push(totalLine);
  
  lines.push(DOUBLE_SEPARATOR);
  
  // ========== PAYMENT DETAILS ==========
  if (data.payments && data.payments.length > 0) {
    lines.push("");
    lines.push("PAYMENT BREAKDOWN:");
    lines.push(DOTTED_SEPARATOR);
    
    for (const payment of data.payments) {
      const method = payment.type.length > 15 
        ? payment.type.substring(0, 12) + "..."
        : payment.type;
      const amount = formatCurrency(payment.amount);
      const padding = LINE_WIDTH - method.length - amount.length - 2;
      lines.push(`  ${method}${" ".repeat(padding)}${amount}`);
    }
    
    // Calculate change if needed (assuming cash payment)
    const cashPayment = data.payments.find(p => p.type.toLowerCase().includes('cash'));
    if (cashPayment && cashPayment.amount > data.total) {
      const change = cashPayment.amount - data.total;
      lines.push(DOTTED_SEPARATOR);
      const changeLine = `  Change:${" ".repeat(LINE_WIDTH - 10)}${formatCurrency(change)}`;
      lines.push(changeLine);
    }
    
    lines.push(DOTTED_SEPARATOR);
  } else {
    lines.push("");
    lines.push(`Payment: ${data.paymentMethod}`);
  }
  
  // ========== NOTES SECTION ==========
  if (data.notes) {
    lines.push("");
    lines.push(SEPARATOR);
    lines.push("NOTES:");
    const noteLines = data.notes.match(new RegExp(`.{1,${LINE_WIDTH - 2}}`, 'g')) || [data.notes];
    noteLines.forEach(line => {
      lines.push(`  ${line}`);
    });
    lines.push(SEPARATOR);
  }
  
  // Staff note
  if (data.staff_note) {
    lines.push("");
    lines.push(`Staff: ${data.staff_note}`);
  }
  
  // ========== FOOTER SECTION ==========
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  
  // Thank you message
  const thankYouMessages = [
    "THANK YOU!",
    "Please come again",
    "Have a great day!"
  ];
  
  thankYouMessages.forEach(msg => {
    lines.push(centerText(msg, LINE_WIDTH));
  });
  
  lines.push(DOUBLE_SEPARATOR);
  
  // Barcode / Reference
  lines.push("");
  lines.push(centerText(`Order #${data.orderNumber}`, LINE_WIDTH));
  lines.push(centerText(formatReceiptDate(data.date), LINE_WIDTH));
  
  // Warranty / Return policy for 80mm
  if (LINE_WIDTH === 48) {
    lines.push("");
    lines.push(centerText("This serves as your official receipt", LINE_WIDTH));
    lines.push(centerText("Keep for warranty claims", LINE_WIDTH));
  }
  
  lines.push(DOUBLE_SEPARATOR);
  
  // ========== MULTIPLE COPIES ==========
  let finalContent = lines.join("\n");
  
  if (settings.copies > 1) {
    const copySeparator = `\n${getSeparator(LINE_WIDTH, "=")}\n${centerText(`COPY ${settings.copies - 1}`, LINE_WIDTH)}\n${getSeparator(LINE_WIDTH, "=")}\n\n`;
    finalContent = Array(settings.copies).fill(finalContent).join(copySeparator);
  }
  
  // ========== PAPER CUT COMMAND ==========
  if (settings.autoCut) {
    // Add form feed for thermal printer cut
    finalContent += "\n\n\n\x0C";
  } else {
    // Add manual cut indicator
    finalContent += "\n" + getSeparator(LINE_WIDTH, "✂") + "\n";
  }
  
  return finalContent;
};

// Generate kitchen ticket (simpler format, focused on preparation)
export const generateKitchenContent = (data: PrintOrderData): string => {
  const LINE_WIDTH = 32;
  const SEPARATOR = getSeparator(LINE_WIDTH, "-");
  const DOUBLE_SEPARATOR = getSeparator(LINE_WIDTH, "=");
  
  const lines: string[] = [];
  
  // Header
  lines.push(DOUBLE_SEPARATOR);
  lines.push(centerText("KITCHEN ORDER", LINE_WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  
  // Order info
  lines.push(`Order #: ${data.orderNumber}`);
  lines.push(`Time: ${formatReceiptDate(data.date)}`);
  
  if (data.placement) {
    const typeLabel = data.placement.type === "table" ? "Table" : 
                      data.placement.type === "takeaway" ? "Takeaway" : "Delivery";
    lines.push(`${typeLabel}: ${data.placement.name}`);
  }
  
  lines.push("");
  lines.push(SEPARATOR);
  lines.push("ITEM                     QTY");
  lines.push(SEPARATOR);
  
  // Items (simplified for kitchen)
  for (const item of data.items) {
    const nameStr = item.name.substring(0, 22).padEnd(22);
    const qtyStr = item.quantity.toString().padStart(4);
    lines.push(`${nameStr} ${qtyStr}`);
    
    if (item.variant) {
      lines.push(`  ${item.variant.substring(0, 28)}`);
    }
    
    if (item.notes) {
      lines.push(`  NOTE: ${item.notes.substring(0, 26)}`);
    }
    
    lines.push("");
  }
  
  lines.push(SEPARATOR);
  
  // Priority and special instructions
  if (data.notes) {
    lines.push("SPECIAL INSTRUCTIONS:");
    const noteLines = data.notes.match(/.{1,28}/g) || [data.notes];
    noteLines.forEach(line => {
      lines.push(`  ${line}`);
    });
    lines.push("");
  }
  
  lines.push(centerText("PRIORITY: STANDARD", LINE_WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  lines.push(centerText("THANK YOU", LINE_WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  
  return lines.join("\n");
};

// Generate RawBT content with ESC/POS commands
export const generateRawBTContent = (data: PrintOrderData, settings: PrinterSettings): string => {
  // For RawBT, we can use ESC/POS commands for better formatting
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // ESC/POS commands
  const INIT = `${ESC}@`; // Initialize printer
  const ALIGN_CENTER = `${ESC}a${0x01}`;
  const ALIGN_LEFT = `${ESC}a${0x00}`;
  const BOLD_ON = `${ESC}E${0x01}`;
  const BOLD_OFF = `${ESC}E${0x00}`;
  const FONT_DOUBLE_WIDTH = `${ESC}!${0x20}`;
  const FONT_DOUBLE_HEIGHT = `${ESC}!${0x10}`;
  const FONT_QUADRUPLE = `${ESC}!${0x30}`;
  const FONT_NORMAL = `${ESC}!${0x00}`;
  const CUT_PAPER = `${GS}V${0x00}`;
  
  // Paper size selection
  const PAPER_58MM = `${GS}r${0x00}`;
  const PAPER_80MM = `${GS}r${0x01}`;
  
  const paperCmd = settings.paperSize === "58mm" ? PAPER_58MM : PAPER_80MM;
  
  // Generate plain receipt content first
  const plainContent = generateReceiptContent(data, settings);
  
  // Wrap with ESC/POS commands
  let posContent = INIT + paperCmd;
  
  // Split into lines and apply formatting
  const lines = plainContent.split('\n');
  for (const line of lines) {
    if (line.includes(data.merchant.name.toUpperCase())) {
      // Merchant name - large and bold
      posContent += ALIGN_CENTER + FONT_QUADRUPLE + BOLD_ON + line + BOLD_OFF + FONT_NORMAL + '\n';
    } else if (line.includes('TOTAL:') || line.includes('TOTAL')) {
      // Total amount - bold and double width
      posContent += ALIGN_CENTER + FONT_DOUBLE_WIDTH + BOLD_ON + line + BOLD_OFF + FONT_NORMAL + '\n';
    } else if (line.includes('THANK YOU!') || line.includes('Please come again')) {
      // Footer - centered bold
      posContent += ALIGN_CENTER + BOLD_ON + line + BOLD_OFF + '\n';
    } else if (line.includes('='.repeat(32)) || line.includes('-'.repeat(32))) {
      // Separators - normal
      posContent += line + '\n';
    } else {
      // Regular text - left aligned
      posContent += ALIGN_LEFT + line + '\n';
    }
  }
  
  // Add paper cut
  if (settings.autoCut) {
    posContent += CUT_PAPER;
  }
  
  return posContent;
};

// For Mobile Print Util - similar Intent URL pattern
export const generateMobilePrintUtilIntentUrl = (content: string): string => {
  return `intent://print?text=${encodeURIComponent(content)}#Intent;scheme=com.samathosoft.webprint;package=com.samathosoft.mobileprintutil;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.samathosoft.mobileprintutil;end;`;
};

// Print using appropriate method
// Updated print function using Intent URLs
export const printOrder = async (data: PrintOrderData, settings: PrinterSettings): Promise<void> => {
  const content = generateReceiptContent(data, settings);
  
  let url: string;
  if (settings.printApp === "mobile-print-util") {
    url = generateMobilePrintUtilIntentUrl(content);
  } else {
    // Use RAW content for better ESC/POS support
    const rawContent = generateRawBTContent(data, settings);
    url = generateRawBTIntentUrl(rawContent);
  }
  
  // Direct navigation - no detection needed
  // If app is installed: opens RawBT/Mobile Print Util
  // If not installed: opens Play Store
  window.location.href = url;
  
  return new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
};

// Print kitchen receipt (simplified version for kitchen)
export const printKitchenReceipt = (data: PrintOrderData): void => {
  const kitchenLines: string[] = [];
  
  kitchenLines.push("=".repeat(32));
  kitchenLines.push("KITCHEN ORDER");
  kitchenLines.push("=".repeat(32));
  kitchenLines.push(`Order #: ${data.orderNumber}`);
  kitchenLines.push(`Time: ${formatReceiptDate(data.date)}`);
  
  if (data.placement?.name) {
    kitchenLines.push(`Table: ${data.placement.name}`);
  }
  
  kitchenLines.push("");
  kitchenLines.push("-".repeat(32));
  kitchenLines.push("ITEM                  QTY");
  kitchenLines.push("-".repeat(32));
  
  for (const item of data.items) {
    const nameStr = item.name.substring(0, 22).padEnd(22);
    const qtyStr = item.quantity.toString().padStart(4);
    kitchenLines.push(`${nameStr} ${qtyStr}`);
    
    if (item.variant) {
      kitchenLines.push(`  (${item.variant})`);
    }
    if (item.notes) {
      kitchenLines.push(`  Note: ${item.notes}`);
    }
  }
  
  kitchenLines.push("=".repeat(32));
  
  const printText = kitchenLines.join("\n");
  const printUrl = `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(printText)}#/sl#`;
  
  window.location.href = printUrl;
};


// types.ts
export interface PrintOrderData {
  // Merchant Details
  merchant: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    taxId?: string;
    website?: string;
  };
  
  // Order Details
  orderNumber: string;
  date: Date;
  
  // Customer Details
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Placement (for dine-in)
  placement?: {
    type: "table" | "takeaway" | "delivery";
    name: string;
  };
  
  // Order Items
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    variant?: string;
    notes?: string;
    is_giftcard?: boolean;
  }>;
  
  // Financials
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total?: number;
  total: number;
  
  // Payment
  paymentMethod: string;
  payments?: Array<{
    type: string;
    amount: number;
  }>;
  
  // Additional Info
  notes?: string;
  staff_note?: string;
}

// utils/formatting.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount).replace('PHP', '₱');
};



// For 58mm paper: 32 characters max per line
const LINE_WIDTH = 32;
const SEPARATOR = "-".repeat(LINE_WIDTH);
const DOUBLE_SEPARATOR = "=".repeat(LINE_WIDTH);

// Center text for 58mm paper
export const centerText = (text: string): string => {
  const padding = Math.max(0, (LINE_WIDTH - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Format item line with proper alignment
export const formatItemLine = (name: string, qty: number, total: number): string => {
  // Maximum name length that leaves room for qty (3 chars + space) and price (8 chars)
  const maxNameLen = LINE_WIDTH - 12; // 12 = 3(qty) + 1(space) + 8(price)
  const shortName = name.length > maxNameLen ? name.substring(0, maxNameLen - 3) + "..." : name;
  const qtyStr = qty.toString().padStart(3);
  const priceStr = formatCurrency(total).padStart(8);
  return `${qtyStr} ${shortName.padEnd(maxNameLen)}${priceStr}`;
};

// Format key-value pair for display
const formatKeyValue = (key: string, value: string, valueWidth?: number): string => {
  const maxKeyLen = 12;
  const shortKey = key.length > maxKeyLen ? key.substring(0, maxKeyLen - 2) + ":" : key + ":";
  const valWidth = valueWidth || LINE_WIDTH - shortKey.length - 1;
  const shortVal = value.length > valWidth ? value.substring(0, valWidth - 3) + "..." : value;
  return `${shortKey} ${shortVal}`;
};

// Main receipt generator
export const generateMobilePrintUrl = (data: PrintOrderData): string => {
  const receiptLines: string[] = [];
  
  // ========== HEADER ==========
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push(centerText('Belly Bytes'));
  receiptLines.push(DOUBLE_SEPARATOR);
  
  // Merchant details (wrapped for 58mm)
  const addressParts = '016 Dadison Street';
//   addressParts.forEach(line => receiptLines.push(centerText(line)));
  
//   receiptLines.push(centerText(`Tel: ${data.merchant.phone}`));
//   if (data.merchant.taxId) {
//     receiptLines.push(centerText(`TIN: ${data.merchant.taxId}`));
//   }
  receiptLines.push("");
  
  // ========== ORDER INFO ==========
  receiptLines.push(`Order #: ${data.orderNumber}`);
  receiptLines.push(`Date: ${formatReceiptDate(data.date)}`);
  
  // Order type indicator
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "🏠" : 
                     data.placement.type === "takeaway" ? "📦" : "🚚";
    receiptLines.push(`${typeIcon} ${data.placement.type.toUpperCase()}: ${data.placement.name}`);
  }
  receiptLines.push("");
  
  // ========== CUSTOMER INFO (if available) ==========
  if (data.customer?.name) {
    receiptLines.push(formatKeyValue("Customer", data.customer.name));
    if (data.customer.phone) {
      receiptLines.push(formatKeyValue("Phone", data.customer.phone));
    }
    if (data.customer.email) {
      receiptLines.push(formatKeyValue("Email", data.customer.email.substring(0, 25)));
    }
    receiptLines.push("");
  }
  
  // ========== ITEMS HEADER ==========
  receiptLines.push(SEPARATOR);
  receiptLines.push(" QTY ITEM                       TOTAL");
  receiptLines.push(SEPARATOR);
  
  // ========== ITEMS ==========
  for (const item of data.items) {
    // Main item line
    receiptLines.push(formatItemLine(item.name, item.quantity, item.total));
    
    // Variant if exists
    if (item.variant) {
      receiptLines.push(`    ${item.variant.substring(0, 28)}`);
    }
    
    // Item notes
    if (item.notes) {
      const noteLines = item.notes.match(/.{1,28}/g) || [item.notes];
      noteLines.forEach(line => {
        receiptLines.push(`    * ${line.substring(0, 26)}`);
      });
    }
    
    // Price breakdown for gift cards
    if (item.is_giftcard) {
      receiptLines.push(`    (Gift Card)`);
    }
  }
  
  receiptLines.push(SEPARATOR);
  
  // ========== TOTALS ==========
  // Subtotal
  receiptLines.push(`Subtotal:${formatCurrency(data.subtotal).padStart(LINE_WIDTH - 9)}`);
  
  // Discount (if any)
  if (data.discount_total > 0) {
    receiptLines.push(`Discount:-${formatCurrency(data.discount_total).padStart(LINE_WIDTH - 10)}`);
  }
  
  // Tax
  if (data.tax_total > 0) {
    const taxRate = ((data.tax_total / (data.subtotal - data.discount_total)) * 100).toFixed(1);
    receiptLines.push(`Tax(${taxRate}%):${formatCurrency(data.tax_total).padStart(LINE_WIDTH - 11)}`);
  }
  
  // Shipping
  if (data.shipping_total && data.shipping_total > 0) {
    receiptLines.push(`Shipping:${formatCurrency(data.shipping_total).padStart(LINE_WIDTH - 9)}`);
  }
  
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push(`TOTAL:${formatCurrency(data.total).padStart(LINE_WIDTH - 6)}`);
  receiptLines.push(DOUBLE_SEPARATOR);
  
  // ========== PAYMENT DETAILS ==========
  receiptLines.push("");
  receiptLines.push("PAYMENT BREAKDOWN:");
  
  if (data.payments && data.payments.length > 0) {
    for (const payment of data.payments) {
      const method = payment.type.length > 10 ? payment.type.substring(0, 10) : payment.type;
      receiptLines.push(`  ${method.padEnd(10)} ${formatCurrency(payment.amount).padStart(18)}`);
    }
  } else {
    receiptLines.push(`  ${data.paymentMethod.padEnd(10)} ${formatCurrency(data.total).padStart(18)}`);
  }
  
  receiptLines.push("");
  receiptLines.push(`Change: ${formatCurrency(0).padStart(26)}`); // Calculate if needed
  receiptLines.push("");
  
  // ========== NOTES ==========
  if (data.notes) {
    receiptLines.push(SEPARATOR);
    receiptLines.push("NOTES:");
    const noteLines = data.notes.match(/.{1,30}/g) || [data.notes];
    noteLines.forEach(line => {
      receiptLines.push(`  ${line}`);
    });
    receiptLines.push(SEPARATOR);
  }
  
  if (data.staff_note) {
    receiptLines.push("");
    receiptLines.push(`Staff: ${data.staff_note}`);
  }
  
  // ========== FOOTER ==========
  receiptLines.push("");
  receiptLines.push(centerText("Thank you!"));
  receiptLines.push(centerText("Please come again"));
  receiptLines.push("");
  receiptLines.push(centerText(`Order #${data.orderNumber}`));
  receiptLines.push(centerText(formatReceiptDate(data.date)));
  receiptLines.push(DOUBLE_SEPARATOR);
  
  // Add some spacing for cutting
  receiptLines.push("\n\n");
  
  // Join and encode for Mobile Print Util
  const printText = receiptLines.join("\n");
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(printText)}#/sl#`;
};

// utils/print-url-generator.ts

/**
 * Generate a RawBT Intent URL with automatic fallback to Play Store
 * This works without needing to detect if the app is installed first
 */
export const generateRawBTIntentUrl = (content: string): string => {
  // Escape special characters for the Intent URL
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '%3B')
    .replace(/#/g, '%23');
  
  // RawBT Intent URL with Play Store fallback
  // Format: intent://[DATA]#Intent;scheme=[SCHEME];package=[PACKAGE];S.browser_fallback_url=[FALLBACK];end;
  return `intent://print?data=${encodeURIComponent(escapedContent)}#Intent;scheme=rawbt;package=ru.a40k.rawbt;S.browser_fallback_url=https://play.google.com/store/apps/details?id=ru.a40k.rawbt;end;`;
};

// For kitchen receipts with simpler formatting
export const generateRawBTIntentUrlSimple = (content: string): string => {
  return `intent://print?text=${encodeURIComponent(content)}#Intent;scheme=rawbt;package=ru.a40k.rawbt;S.browser_fallback_url=https://play.google.com/store/apps/details?id=ru.a40k.rawbt;end;`;
};