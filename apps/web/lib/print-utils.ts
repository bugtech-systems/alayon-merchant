// lib/print-utils.ts
// Enhanced print utilities for mobile thermal printer with proper formatting

export interface PrintOrderData {
  merchant?: {
    name: string;
    address: string;
    phone: string;
    tax_id?: string;
  };
  orderNumber: string;
  date: Date;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  placement?: {
    type: "table" | "takeaway" | "delivery";
    name: string;
    tables?: string[];
  };
  items: Array<{
    id?: string;
    name: string;
    quantity: number;
    price: number;
    unit_price?: number;
    total: number;
    notes?: string;
    variant?: string;
    is_giftcard?: boolean;
    is_custom_priced?: boolean;
    original_price?: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount_total?: number;
  shipping_total?: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  autoCut?: boolean;
  copies?: number;
  pricing_info?: {
    strategy?: string;
    has_custom_prices?: boolean;
    price_list_applied?: boolean;
    total_discount?: number;
    custom_prices_count?: number;
  };
}

export interface PrinterSettings {
  printerName?: string;
  paperSize: "58mm" | "80mm";
  copies: number;
  autoCut: boolean;
  printReceipt?: boolean;
  printKitchen?: boolean;
  printCustomerCopy?: boolean;
  isCustomerCopy?: boolean;
}

// ============================================
// FORMATTING HELPERS
// ============================================

export const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
};

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

// ============================================
// RECEIPT TEXT GENERATOR
// ============================================

export const generateReceiptText = (data: PrintOrderData & { isCustomerCopy?: boolean }): string => {
  const lines: string[] = [];
  
  // Helper to add line with proper spacing
  const addLine = (text: string = '') => {
    lines.push(text);
  };
  
  // Helper to add centered text (32 chars width)
  const addCentered = (text: string) => {
    const padding = Math.max(0, 32 - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    lines.push(' '.repeat(leftPad) + text + ' '.repeat(rightPad));
  };
  
  // Helper to add padded text (left and right)
  const addPadded = (left: string, right: string, leftWidth: number = 24, rightWidth: number = 8) => {
    const leftStr = left.length > leftWidth ? left.substring(0, leftWidth - 3) + '...' : left;
    const rightStr = right.length > rightWidth ? right.substring(0, rightWidth) : right;
    lines.push(leftStr.padEnd(leftWidth) + rightStr.padStart(rightWidth));
  };
  
  // ========================================
  // HEADER
  // ========================================
  addLine('================================');
  addCentered('★ BELLY BYTES ★');
  addLine('================================');
  addCentered('016 Dadison Street');
  addCentered('Barangay 56, Tacloban City');
  addCentered('Tel: (02) 8123 4567');
  addCentered('TIN: 123-456-789-000');
  addLine('--------------------------------');
  addLine('');
  
  // Customer Copy Label
  if (data.isCustomerCopy) {
    addCentered('*** CUSTOMER COPY ***');
    addLine('--------------------------------');
    addLine('');
  }
  
  // ========================================
  // ORDER INFORMATION
  // ========================================
  addLine('ORDER #: ' + data.orderNumber);
  addLine('DATE: ' + formatReceiptDate(data.date));
  addLine('TIME: ' + data.date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));
  
  if (data.placement) {
    const typeLabel = data.placement.type === 'table' ? 'DINE-IN' : 
                     data.placement.type === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY';
    addLine(typeLabel + ': ' + data.placement.name);
    if (data.placement.tables && data.placement.tables.length > 0) {
      addLine('TABLE: ' + data.placement.tables.join(', '));
    }
  }
  addLine('');
  
  // ========================================
  // CUSTOMER INFORMATION
  // ========================================
  if (data.customer) {
    if (data.customer.name) {
      addLine('CUSTOMER: ' + (data.customer.name.length > 25 ? data.customer.name.substring(0, 22) + '...' : data.customer.name));
    }
    if (data.customer.phone) {
      addLine('PHONE: ' + data.customer.phone);
    }
    if (data.customer.email) {
      const email = data.customer.email.length > 25 ? data.customer.email.substring(0, 22) + '...' : data.customer.email;
      addLine('EMAIL: ' + email);
    }
    addLine('');
  }
  
  // ========================================
  // ITEMS HEADER
  // ========================================
  addLine('--------------------------------');
  addPadded('ITEM', 'TOTAL', 20, 12);
  addLine('--------------------------------');
  
  // ========================================
  // ITEMS LIST
  // ========================================
  let itemCount = 0;
  for (const item of data.items) {
    itemCount++;
    
    // Item name with quantity
    const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
    const totalStr = formatCurrency(item.total);
    addPadded(itemName, totalStr, 20, 12);
    
    // Price per unit
    const priceStr = formatCurrency(item.price) + ' each';
    lines.push('  ' + (priceStr.length > 26 ? priceStr.substring(0, 26) : priceStr.padEnd(26)));
    
    // Variant
    if (item.variant) {
      const variantStr = '* ' + item.variant;
      lines.push('  ' + (variantStr.length > 28 ? variantStr.substring(0, 28) : variantStr.padEnd(28)));
    }
    
    // Notes
    if (item.notes) {
      const noteStr = 'Note: ' + item.notes;
      lines.push('  ' + (noteStr.length > 28 ? noteStr.substring(0, 28) : noteStr.padEnd(28)));
    }
    
    // Custom price indicator
    if (item.is_custom_priced && item.original_price) {
      const originalTotal = formatCurrency(item.original_price * item.quantity);
      lines.push('  ' + ('Original: ' + originalTotal).padEnd(28));
    }
    
    // Gift card indicator
    if (item.is_giftcard) {
      lines.push('  ' + '** GIFT CARD **'.padEnd(28));
    }
    
    // Blank line between items except last
    if (itemCount < data.items.length) {
      addLine('');
    }
  }
  
  addLine('');
  addLine('--------------------------------');
  
  // ========================================
  // TOTALS
  // ========================================
  addPadded('Subtotal', formatCurrency(data.subtotal));
  
  if (data.discount_total && data.discount_total > 0) {
    addPadded('Discount', '-' + formatCurrency(data.discount_total));
  }
  
  if (data.shipping_total && data.shipping_total > 0) {
    addPadded('Shipping', formatCurrency(data.shipping_total));
  }
  
  if (data.tax > 0) {
    const taxPercent = (data.taxRate * 100).toFixed(1);
    addPadded('Tax (' + taxPercent + '%)', formatCurrency(data.tax));
  }
  
  addLine('================================');
  addPadded('TOTAL', formatCurrency(data.total));
  addLine('================================');
  addLine('');
  
  // ========================================
  // PAYMENT
  // ========================================
  addLine('PAYMENT: ' + data.paymentMethod);
  addLine('AMOUNT: ' + formatCurrency(data.total));
  addLine('');
  
  // ========================================
  // NOTES
  // ========================================
  if (data.notes) {
    addLine('NOTES:');
    const noteLines = data.notes.match(/.{1,32}/g) || [data.notes];
    for (const line of noteLines) {
      addLine('  ' + line);
    }
    addLine('');
  }
  
  // ========================================
  // PRICING INFO
  // ========================================
  if (data.pricing_info) {
    if (data.pricing_info.has_custom_prices) {
      addPadded('Custom Priced Items:', String(data.pricing_info.custom_prices_count));
    }
    if (data.pricing_info.price_list_applied) {
      addLine('Price List Applied'.padEnd(32));
    }
    if (data.pricing_info.total_discount && data.pricing_info.total_discount > 0) {
      addPadded('Total Discount:', formatCurrency(data.pricing_info.total_discount));
    }
    addLine('');
  }
  
  // ========================================
  // FOOTER
  // ========================================
  addLine('================================');
  addCentered('THANK YOU!');
  addCentered('Please come again!');
  addLine('--------------------------------');
  addCentered('Order #' + data.orderNumber);
  addCentered(formatReceiptDate(data.date));
  addLine('================================');
  
  // Paper cut command
  if (data.autoCut !== false) {
    addLine('');
    addLine('\x1D\x56\x41'); // ESC/POS cut command (full cut)
  }
  
  return lines.join('\n');
};

// ============================================
// KITCHEN TICKET GENERATOR
// ============================================

export const generateKitchenText = (data: PrintOrderData): string => {
  const lines: string[] = [];
  
  const addLine = (text: string = '') => {
    lines.push(text);
  };
  
  const addCentered = (text: string) => {
    const padding = Math.max(0, 32 - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    lines.push(' '.repeat(leftPad) + text + ' '.repeat(rightPad));
  };
  
  const addPadded = (left: string, right: string, leftWidth: number = 24, rightWidth: number = 6) => {
    const leftStr = left.length > leftWidth ? left.substring(0, leftWidth - 3) + '...' : left;
    const rightStr = right.length > rightWidth ? right.substring(0, rightWidth) : right;
    lines.push(leftStr.padEnd(leftWidth) + rightStr.padStart(rightWidth));
  };
  
  // ========================================
  // HEADER
  // ========================================
  addLine('================================');
  addCentered('★★★ KITCHEN ORDER ★★★');
  addLine('================================');
  addLine('');
  
  // ========================================
  // ORDER INFO
  // ========================================
  addPadded('ORDER #:', data.orderNumber, 12, 20);
  addPadded('TIME:', formatReceiptDate(data.date), 12, 20);
  
  if (data.placement) {
    const typeLabel = data.placement.type === 'table' ? 'TABLE' : 
                     data.placement.type === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY';
    addPadded(typeLabel + ':', data.placement.name, 12, 20);
    if (data.placement.tables && data.placement.tables.length > 0) {
      addPadded('TABLE:', data.placement.tables.join(', '), 12, 20);
    }
  }
  
  if (data.customer?.name) {
    const name = data.customer.name.length > 20 ? data.customer.name.substring(0, 17) + '...' : data.customer.name;
    addPadded('CUSTOMER:', name, 12, 20);
  }
  
  addLine('');
  addLine('--------------------------------');
  addLine('');
  
  // ========================================
  // ITEMS LIST
  // ========================================
  addPadded('ITEM', 'QTY', 24, 6);
  addLine('................................');
  
  let itemCount = 0;
  for (const item of data.items) {
    itemCount++;
    
    // Item name
    const itemName = item.name.length > 24 ? item.name.substring(0, 21) + '...' : item.name;
    addPadded(itemName, 'x' + item.quantity, 24, 6);
    
    // Variant
    if (item.variant) {
      const variantStr = '  ' + item.variant;
      lines.push(variantStr.length > 30 ? variantStr.substring(0, 30) : variantStr);
    }
    
    // Special instructions
    if (item.notes) {
      const noteStr = '  ** ' + item.notes + ' **';
      lines.push(noteStr.length > 30 ? noteStr.substring(0, 30) : noteStr);
    }
    
    // Gift card
    if (item.is_giftcard) {
      lines.push('  ** GIFT CARD **');
    }
    
    // Blank line between items
    if (itemCount < data.items.length) {
      addLine('');
    }
  }
  
  addLine('');
  addLine('--------------------------------');
  
  // ========================================
  // SUMMARY
  // ========================================
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
  addPadded('Total Items:', String(totalItems), 24, 6);
  addPadded('Items Count:', String(data.items.length), 24, 6);
  addLine('');
  
  // ========================================
  // NOTES
  // ========================================
  if (data.notes) {
    addLine('NOTES:');
    const noteLines = data.notes.match(/.{1,32}/g) || [data.notes];
    for (const line of noteLines) {
      addLine('  ' + line);
    }
    addLine('');
  }
  
  // ========================================
  // FOOTER
  // ========================================
  addLine('================================');
  addCentered('PRIORITY: HIGH');
  addCentered('PLEASE PREPARE');
  addCentered('THANK YOU!');
  addLine('================================');
  
  // Paper cut command
  if (data.autoCut !== false) {
    addLine('');
    addLine('\x1D\x56\x41'); // ESC/POS cut command (full cut)
  }
  
  return lines.join('\n');
};

// ============================================
// MOBILE PRINT URL GENERATORS
// ============================================

export const generateMobilePrintUrl = (
  data: PrintOrderData, 
  settings?: Partial<PrinterSettings>
): string => {
  let receiptText = generateReceiptText({
    ...data,
    isCustomerCopy: settings?.isCustomerCopy || false
  });
  
  // Handle multiple copies
  if (settings?.copies && settings.copies > 1) {
    let multiCopyText = '';
    for (let i = 0; i < settings.copies; i++) {
      multiCopyText += receiptText;
      if (i < settings.copies - 1) {
        multiCopyText += '\n';
        multiCopyText += '================================\n';
        multiCopyText += '          COPY ' + (i + 1) + ' of ' + settings.copies + '          \n';
        multiCopyText += '================================\n';
        multiCopyText += '\n\n';
      }
    }
    receiptText = multiCopyText;
  }
  
  const encodedText = encodeURIComponent(receiptText);
  return `com.samathosoft.webprint://#mling##sl#${encodedText}#/sl#`;
};

export const generateKitchenPrintUrl = (
  data: PrintOrderData, 
  settings?: Partial<PrinterSettings>
): string => {
  let kitchenText = generateKitchenText(data);
  
  if (settings?.copies && settings.copies > 1) {
    let multiCopyText = '';
    for (let i = 0; i < settings.copies; i++) {
      multiCopyText += kitchenText;
      if (i < settings.copies - 1) {
        multiCopyText += '\n';
        multiCopyText += '================================\n';
        multiCopyText += '          COPY ' + (i + 1) + ' of ' + settings.copies + '          \n';
        multiCopyText += '================================\n';
        multiCopyText += '\n\n';
      }
    }
    kitchenText = multiCopyText;
  }
  
  const encodedText = encodeURIComponent(kitchenText);
  return `com.samathosoft.webprint://#mling##sl#${encodedText}#/sl#`;
};

// ============================================
// FORMAT CART DATA FOR PRINT
// ============================================

export const formatCartToPrintData = (
  cart: any, 
  receiptData?: any
): PrintOrderData | null => {
  const data = receiptData || cart;
  if (!data) return null;

  const taxRate = data?.tax_rate || 0;
  const taxTotal = data?.tax_total || 0;
  const subtotal = data?.subtotal || 0;
  
  let calculatedTaxRate = 0;
  if (subtotal > 0 && taxTotal > 0) {
    calculatedTaxRate = taxTotal / subtotal;
  }

  const items = data?.items?.map((item: any) => ({
    id: item.id,
    name: item.title || item.product_title || item.name || 'Item',
    subtitle: item.subtitle,
    description: item.description,
    quantity: item.quantity || 1,
    price: item.unit_price || item.price || 0,
    unit_price: item.unit_price || item.price || 0,
    total: item.subtotal || (item.unit_price * item.quantity) || 0,
    variant: item.variant?.title || item.variant_title || item.variant,
    notes: item.note || item.notes,
    is_giftcard: item.is_giftcard || false,
    is_custom_priced: item.is_custom_priced || false,
    original_price: item.original_unit_price || item.original_price,
  })) || [];

  const customerName = data?.customer 
    ? `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim()
    : data?.metadata?.customer_name;

  let placementType: "table" | "takeaway" | "delivery" = "takeaway";
  let placementName = "Takeaway";
  let tables: string[] = [];
  
  if (data?.metadata?.table_ids && data.metadata.table_ids.length > 0) {
    placementType = "table";
    tables = data.metadata.table_ids;
    placementName = `Table ${tables.join(', ')}`;
  } else if (data?.metadata?.placement_type) {
    placementType = data.metadata.placement_type;
    placementName = data.metadata.placement_name || placementType;
  } else if (data?.shipping_methods && data.shipping_methods.length > 0) {
    placementType = "delivery";
    placementName = data.shipping_methods[0].shipping_option?.name || "Delivery";
  }

  let paymentMethod = "Cash";
  if (data?.payment_session?.provider_id) {
    const provider = data.payment_session.provider_id;
    if (provider === "cash") paymentMethod = "Cash";
    else if (provider.includes("stripe")) paymentMethod = "Card";
    else if (provider === "gcash") paymentMethod = "GCash";
    else if (provider === "paypal") paymentMethod = "PayPal";
    else paymentMethod = provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  const customPricedItems = items.filter((i: any) => i.is_custom_priced) || [];
  const totalDiscount = items.reduce((sum: number, item: any) => {
    if (item.original_price && item.original_price > item.price) {
      return sum + ((item.original_price - item.price) * item.quantity);
    }
    return sum;
  }, 0) || 0;

  return {
    merchant: {
      name: "BELLY BYTES",
      address: "016 Dadison Street, Barangay 56, Tacloban City",
      phone: "(02) 8123 4567",
      tax_id: "123-456-789-000",
    },
    orderNumber: data?.id?.slice(-8).toUpperCase() || '00000000',
    date: new Date(data?.updated_at || data?.created_at || Date.now()),
    customer: customerName ? {
      name: customerName,
      email: data?.customer?.email || data?.metadata?.customer_email,
      phone: data?.customer?.phone,
    } : undefined,
    placement: {
      type: placementType,
      name: placementName,
      tables: tables,
    },
    items: items,
    subtotal: subtotal,
    tax: taxTotal,
    taxRate: calculatedTaxRate || 0.12,
    discount_total: data?.discount_total || totalDiscount,
    shipping_total: data?.shipping_total || 0,
    total: data?.total || subtotal + taxTotal,
    paymentMethod: paymentMethod,
    notes: data?.metadata?.notes || data?.notes,
    autoCut: true,
    copies: 1,
    pricing_info: {
      strategy: data?.metadata?.pricing_strategy,
      has_custom_prices: customPricedItems.length > 0,
      price_list_applied: !!data?.metadata?.price_list_id,
      total_discount: totalDiscount,
      custom_prices_count: customPricedItems.length,
    },
  };
};

// ============================================
// MAIN PRINT FUNCTION
// ============================================

export const printOrder = async (
  data: PrintOrderData,
  type: "receipt" | "kitchen",
  settings: PrinterSettings
): Promise<{ success: boolean; message: string }> => {
  try {
    const printData = {
      ...data,
      copies: settings.copies,
      autoCut: settings.autoCut,
      paperSize: settings.paperSize,
      isCustomerCopy: settings.isCustomerCopy || false,
    };
    
    let printUrl: string;
    if (type === "receipt") {
      printUrl = generateMobilePrintUrl(printData, settings);
    } else {
      printUrl = generateKitchenPrintUrl(printData, settings);
    }
    
    // Check if we're in a mobile environment
    const isMobileApp = typeof window !== 'undefined' && 
                       (navigator.userAgent.includes('Mobile') || 
                        !!(window as any).Android || 
                        !!(window as any).webkit);
    
    if (isMobileApp) {
      // Use intent for mobile app
      window.location.href = printUrl;
    } else {
      // Fallback for web preview
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        const printText = type === "receipt" 
          ? generateReceiptText(printData)
          : generateKitchenText(printData);
          
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Preview - ${type === 'receipt' ? 'Receipt' : 'Kitchen'}</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  white-space: pre-wrap;
                  font-size: 12px;
                  margin: 0;
                  padding: 20px;
                  background: #f5f5f5;
                }
                .paper {
                  background: white;
                  padding: 20px;
                  max-width: ${settings.paperSize === '58mm' ? '300' : '400'}px;
                  margin: 0 auto;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  min-height: 500px;
                }
                @media print {
                  body { background: white; margin: 0; padding: 0; }
                  .paper { box-shadow: none; padding: 10px; max-width: 100%; }
                }
              </style>
            </head>
            <body>
              <div class="paper">${printText.replace(/\n/g, '<br>').replace(/\x1D\x56\x41/g, '')}</div>
              <script>
                setTimeout(() => {
                  window.print();
                }, 800);
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
    
    return {
      success: true,
      message: `Print job sent successfully!`
    };
  } catch (error) {
    console.error("Print error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Print failed"
    };
  }
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  formatCartToPrintData,
  generateReceiptText,
  generateKitchenText,
  generateMobilePrintUrl,
  generateKitchenPrintUrl,
  printOrder,
  formatCurrency,
  formatReceiptDate,
};