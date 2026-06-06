// lib/print-utils.ts - CORRECT LINE BREAKS FOR MOBILE PRINT UTIL

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

// Format currency
export const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
};

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

// ============================================
// 58mm PAPER OPTIMIZED (32 characters max)
// ============================================

const LINE_WIDTH = 32;
const SEPARATOR = "-".repeat(LINE_WIDTH);
const DOUBLE_SEPARATOR = "=".repeat(LINE_WIDTH);
const THIN_SEPARATOR = ".".repeat(LINE_WIDTH);

// Center text
const centerText = (text: string): string => {
  const padding = Math.max(0, (LINE_WIDTH - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Format product line
const formatProductLine = (name: string, total: string): string => {
  const maxNameLen = LINE_WIDTH - 12;
  let displayName = name;
  if (displayName.length > maxNameLen) {
    displayName = displayName.substring(0, maxNameLen - 3) + "...";
  }
  const namePart = displayName.padEnd(maxNameLen);
  const pricePart = total.padStart(12);
  return `${namePart}${pricePart}`;
};

// ============================================
// RECEIPT GENERATOR WITH LITERAL LINE BREAKS
// ============================================

export const generateMobilePrintUrl = (data: PrintOrderData): string => {
  // Build the receipt text with literal line breaks using template literals
  let receiptText = "";
  
  // ========================================
  // HEADER SECTION
  // ========================================
  receiptText += `\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `${centerText("★ BELLY BYTES ★")}\n`;
  receiptText += `\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `${centerText("016 Dadison Street")}\n`;
  receiptText += `${centerText("San Antonio, Pasig City")}\n`;
  receiptText += `${centerText("Tel: (02) 8123 4567")}\n`;
  receiptText += `\n`;
  receiptText += `${THIN_SEPARATOR}\n`;
  receiptText += `\n`;
  
  // ========================================
  // ORDER INFORMATION
  // ========================================
  receiptText += `ORDER #: ${data.orderNumber}\n`;
  receiptText += `DATE: ${formatReceiptDate(data.date)}\n`;
  receiptText += `\n`;
  
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "DINE-IN" : 
                     data.placement.type === "takeaway" ? "TAKEAWAY" : "DELIVERY";
    receiptText += `${typeIcon}: ${data.placement.name}\n`;
    receiptText += `\n`;
  }
  
  receiptText += `${THIN_SEPARATOR}\n`;
  receiptText += `\n`;
  
  // ========================================
  // CUSTOMER INFORMATION
  // ========================================
  if (data.customer?.name) {
    receiptText += `CUSTOMER: ${data.customer.name}\n`;
    if (data.customer.phone) {
      receiptText += `PHONE: ${data.customer.phone}\n`;
    }
    receiptText += `\n`;
    receiptText += `${THIN_SEPARATOR}\n`;
    receiptText += `\n`;
  }
  
  // ========================================
  // ITEMS SECTION
  // ========================================
  receiptText += `ITEMS\n`;
  receiptText += `\n`;
  receiptText += `ITEM                      TOTAL\n`;
  receiptText += `${SEPARATOR}\n`;
  receiptText += `\n`;
  
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    // Main item line
    receiptText += `${formatProductLine(item.name, formatCurrency(item.total))}\n`;
    
    // Quantity line
    receiptText += `  x${item.quantity}\n`;
    
    // Unit price
    receiptText += `    @ ${formatCurrency(item.price)} each\n`;
    
    // Variant if exists
    if (item.variant) {
      receiptText += `    * ${item.variant}\n`;
    }
    
    // Notes if exists
    if (item.notes) {
      receiptText += `    Note: ${item.notes}\n`;
    }
    
    // Add blank lines between items
    if (i < data.items.length - 1) {
      receiptText += `\n`;
      receiptText += `\n`;
    }
  }
  
  receiptText += `\n`;
  receiptText += `${SEPARATOR}\n`;
  receiptText += `\n`;
  
  // ========================================
  // TOTALS SECTION
  // ========================================
  receiptText += `SUMMARY\n`;
  receiptText += `\n`;
  receiptText += `Subtotal${" ".repeat(20)}${formatCurrency(data.subtotal)}\n`;
  
  if (data.tax > 0) {
    const taxPercent = (data.taxRate * 100).toFixed(0);
    receiptText += `Tax (${taxPercent}%)${" ".repeat(15)}${formatCurrency(data.tax)}\n`;
  }
  
  receiptText += `\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `TOTAL${" ".repeat(23)}${formatCurrency(data.total)}\n`;
  receiptText += `\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  
  // ========================================
  // PAYMENT SECTION
  // ========================================
  receiptText += `PAYMENT\n`;
  receiptText += `${THIN_SEPARATOR}\n`;
  receiptText += `${data.paymentMethod}${" ".repeat(18)}${formatCurrency(data.total)}\n`;
  receiptText += `${THIN_SEPARATOR}\n`;
  receiptText += `\n`;
  
  // ========================================
  // NOTES SECTION
  // ========================================
  if (data.notes) {
    receiptText += `NOTES:\n`;
    const noteLines = data.notes.match(/.{1,28}/g) || [data.notes];
    noteLines.forEach(line => {
      receiptText += `  ${line}\n`;
    });
    receiptText += `\n`;
  }
  
  // ========================================
  // FOOTER
  // ========================================
  receiptText += `${SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `${centerText("THANK YOU!")}\n`;
  receiptText += `${centerText("Please come again")}\n`;
  receiptText += `\n`;
  receiptText += `${centerText(`#${data.orderNumber}`)}\n`;
  receiptText += `${centerText(formatReceiptDate(data.date))}\n`;
  receiptText += `\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `\n`;
  
  // Paper cut indicator
  if (data.autoCut) {
    receiptText += `- CUT HERE -\n`;
    receiptText += `\n`;
  }
  
  // Handle multiple copies
  let finalText = receiptText;
  if (data.copies && data.copies > 1) {
    let multiCopyText = "";
    for (let i = 0; i < data.copies; i++) {
      multiCopyText += receiptText;
      if (i < data.copies - 1) {
        multiCopyText += `\n${DOUBLE_SEPARATOR}\n`;
        multiCopyText += `${centerText(`COPY ${i + 2}`)}\n`;
        multiCopyText += `${DOUBLE_SEPARATOR}\n`;
        multiCopyText += `\n\n`;
      }
    }
    finalText = multiCopyText;
  }
  
  // IMPORTANT: Use the literal text WITHOUT additional encoding
  // The #mling##sl# tag handles the line breaks automatically
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(finalText)}#/sl#`;
};

// ============================================
// KITCHEN RECEIPT WITH LITERAL LINE BREAKS
// ============================================

export const generateKitchenPrintUrl = (data: PrintOrderData): string => {
  let receiptText = "";
  
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `${centerText("KITCHEN ORDER")}\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  receiptText += `ORDER #: ${data.orderNumber}\n`;
  receiptText += `TIME: ${formatReceiptDate(data.date)}\n`;
  receiptText += `\n`;
  
  if (data.placement) {
    const typeLabel = data.placement.type === "table" ? "TABLE" : 
                      data.placement.type === "takeaway" ? "TAKEAWAY" : "DELIVERY";
    receiptText += `${typeLabel}: ${data.placement.name}\n`;
    receiptText += `\n`;
  }
  
  receiptText += `${SEPARATOR}\n`;
  receiptText += `ITEM                 QTY\n`;
  receiptText += `${SEPARATOR}\n`;
  receiptText += `\n`;
  
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    const maxNameLen = 22;
    let nameDisplay = item.name;
    if (nameDisplay.length > maxNameLen) {
      nameDisplay = nameDisplay.substring(0, maxNameLen - 3) + "...";
    }
    const namePart = nameDisplay.padEnd(maxNameLen);
    const qtyPart = `x${item.quantity}`.padStart(4);
    receiptText += `${namePart} ${qtyPart}\n`;
    
    if (item.variant) {
      receiptText += `  ${item.variant}\n`;
    }
    
    if (item.notes) {
      receiptText += `  Note: ${item.notes}\n`;
    }
    
    if (i < data.items.length - 1) {
      receiptText += `\n`;
      receiptText += `\n`;
    }
  }
  
  receiptText += `\n`;
  receiptText += `${SEPARATOR}\n`;
  receiptText += `${centerText("PRIORITY: NORMAL")}\n`;
  receiptText += `${DOUBLE_SEPARATOR}\n`;
  receiptText += `\n`;
  
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(receiptText)}#/sl#`;
};

// ============================================
// PRINT FUNCTIONS
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
      paperSize: settings.paperSize 
    };
    
    const printUrl = type === "receipt" 
      ? generateMobilePrintUrl(printData)
      : generateKitchenPrintUrl(printData);
    
    // Open the URL to trigger the print app
    window.location.href = printUrl;
    
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