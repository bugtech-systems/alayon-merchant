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

// Print using appropriate method
export const printOrder = async (
  data: PrintOrderData, 
  settings: PrinterSettings = { paperSize: "80mm", copies: 1, autoCut: true }
): Promise<void> => {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // Mobile: Use Mobile Print Util app
    const printUrl = generateMobilePrintUrl(data);
    window.location.href = printUrl;
    
    // Fallback: If app not installed, open HTML print
    setTimeout(() => {
      const printWindow = window.open();
      if (printWindow) {
        printWindow.document.write(generatePrintHtml(data));
        printWindow.document.close();
      }
    }, 1000);
  } else {
    // Desktop: Use browser print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHtml(data));
      printWindow.document.close();
    }
  }
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
const centerText = (text: string): string => {
  const padding = Math.max(0, (LINE_WIDTH - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Format item line with proper alignment
const formatItemLine = (name: string, qty: number, total: number): string => {
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