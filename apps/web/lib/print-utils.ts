// lib/print-utils.ts - REFINED VERSION

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
const SEPARATOR = "─".repeat(LINE_WIDTH);
const DOUBLE_SEPARATOR = "═".repeat(LINE_WIDTH);
const DOTTED_LINE = "·".repeat(LINE_WIDTH);

// Center text
const centerText = (text: string): string => {
  const padding = Math.max(0, (LINE_WIDTH - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Right align text
const rightAlign = (text: string): string => {
  return " ".repeat(LINE_WIDTH - text.length) + text;
};

// Left align with padding
const leftAlign = (text: string, width: number = LINE_WIDTH): string => {
  return text.padEnd(width);
};

// Format product line (2 columns: product name + total)
const formatProductLine = (name: string, total: string): string => {
  const maxNameLen = LINE_WIDTH - 10; // Reserve 10 chars for price
  let displayName = name;
  if (displayName.length > maxNameLen) {
    displayName = displayName.substring(0, maxNameLen - 3) + "...";
  }
  const namePart = displayName.padEnd(maxNameLen);
  const pricePart = total.padStart(10);
  return `${namePart}${pricePart}`;
};

// Format quantity line (indented)
const formatQuantityLine = (quantity: number, variant?: string, notes?: string): string[] => {
  const lines: string[] = [];
  const qtyText = `  x${quantity}`;
  lines.push(qtyText);
  
  if (variant) {
    const variantText = `    ${variant}`;
    if (variantText.length > LINE_WIDTH - 2) {
      lines.push(variantText.substring(0, LINE_WIDTH - 2));
    } else {
      lines.push(variantText);
    }
  }
  
  if (notes) {
    const noteText = `    * ${notes}`;
    if (noteText.length > LINE_WIDTH - 2) {
      lines.push(noteText.substring(0, LINE_WIDTH - 2));
    } else {
      lines.push(noteText);
    }
  }
  
  return lines;
};

// ============================================
// MAIN RECEIPT GENERATOR
// ============================================

export const generateMobilePrintUrl = (data: PrintOrderData): string => {
  const receiptLines: string[] = [];
  
  // ========================================
  // HEADER SECTION
  // ========================================
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push(centerText("★ BELLY BYTES ★"));
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push(centerText("016 Dadison Street"));
  receiptLines.push(centerText("San Antonio, Pasig City"));
  receiptLines.push(centerText("Tel: (02) 8123 4567"));
  receiptLines.push("");
  receiptLines.push(SEPARATOR);
  
  // ========================================
  // ORDER INFORMATION
  // ========================================
  receiptLines.push(`ORDER #: ${data.orderNumber}`);
  receiptLines.push(`DATE: ${formatReceiptDate(data.date)}`);
  
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "🏠 DINE IN" : 
                     data.placement.type === "takeaway" ? "📦 TAKEAWAY" : "🚚 DELIVERY";
    receiptLines.push(`${typeIcon}: ${data.placement.name}`);
  }
  receiptLines.push(SEPARATOR);
  
  // ========================================
  // CUSTOMER INFORMATION
  // ========================================
  if (data.customer?.name) {
    receiptLines.push(`CUSTOMER: ${data.customer.name}`);
    if (data.customer.phone) {
      receiptLines.push(`PHONE: ${data.customer.phone}`);
    }
    receiptLines.push(SEPARATOR);
  }
  
  // ========================================
  // ITEMS SECTION - 2 COLUMN LAYOUT
  // ========================================
  receiptLines.push("");
  receiptLines.push("ITEM                 TOTAL");
  receiptLines.push(SEPARATOR);
  
  for (const item of data.items) {
    // Product name and total on same line
    receiptLines.push(formatProductLine(item.name, formatCurrency(item.total)));
    
    // Quantity on its own line (indented)
    const quantityLines = formatQuantityLine(item.quantity, item.variant, item.notes);
    quantityLines.forEach(line => receiptLines.push(line));
    
    // Add spacing between items
    receiptLines.push("");
  }
  
  receiptLines.push(SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // TOTALS SECTION (EMPHASIZED)
  // ========================================
  receiptLines.push("SUBTOTAL" + " ".repeat(14) + formatCurrency(data.subtotal));
  
  if (data.tax > 0) {
    const taxPercent = (data.taxRate * 100).toFixed(0);
    receiptLines.push(`TAX (${taxPercent}%)` + " ".repeat(9) + formatCurrency(data.tax));
  }
  
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push(`TOTAL` + " ".repeat(16) + formatCurrency(data.total));
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // PAYMENT SECTION
  // ========================================
  receiptLines.push("PAYMENT");
  receiptLines.push(DOTTED_LINE);
  receiptLines.push(`${data.paymentMethod}` + " ".repeat(12) + formatCurrency(data.total));
  receiptLines.push(DOTTED_LINE);
  receiptLines.push("");
  
  // ========================================
  // NOTES SECTION
  // ========================================
  if (data.notes) {
    receiptLines.push("NOTES:");
    const noteLines = data.notes.match(/.{1,28}/g) || [data.notes];
    noteLines.forEach(line => {
      receiptLines.push(`  ${line}`);
    });
    receiptLines.push("");
  }
  
  // ========================================
  // FOOTER (EMPHASIZED)
  // ========================================
  receiptLines.push(SEPARATOR);
  receiptLines.push(centerText("★★★ THANK YOU! ★★★"));
  receiptLines.push(centerText("Please come again"));
  receiptLines.push(SEPARATOR);
  receiptLines.push("");
  receiptLines.push(centerText(data.orderNumber));
  receiptLines.push(centerText(formatReceiptDate(data.date)));
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  
  // Paper cut spacing
  receiptLines.push("\n\n");
  
  // Handle multiple copies
  let finalText = receiptLines.join("\n");
  if (data.copies && data.copies > 1) {
    const copySeparator = `\n${DOUBLE_SEPARATOR}\n${centerText(`COPY ${data.copies}`)}\n${DOUBLE_SEPARATOR}\n\n`;
    finalText = Array(data.copies).fill(finalText).join(copySeparator);
  }
  
  // Generate Mobile Print Util URL
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(finalText)}#/sl#`;
};

// ============================================
// KITCHEN RECEIPT (Simplified)
// ============================================

export const generateKitchenPrintUrl = (data: PrintOrderData): string => {
  const lines: string[] = [];
  
  lines.push(DOUBLE_SEPARATOR);
  lines.push(centerText("👨‍🍳 KITCHEN ORDER 👩‍🍳"));
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(`ORDER #: ${data.orderNumber}`);
  lines.push(`TIME: ${formatReceiptDate(data.date)}`);
  
  if (data.placement) {
    lines.push(`TYPE: ${data.placement.type.toUpperCase()} - ${data.placement.name}`);
  }
  
  lines.push("");
  lines.push(SEPARATOR);
  lines.push("ITEM                 QTY");
  lines.push(SEPARATOR);
  
  for (const item of data.items) {
    const maxNameLen = 22;
    let nameDisplay = item.name;
    if (nameDisplay.length > maxNameLen) {
      nameDisplay = nameDisplay.substring(0, maxNameLen - 3) + "...";
    }
    const namePart = nameDisplay.padEnd(maxNameLen);
    const qtyPart = `x${item.quantity}`.padStart(4);
    lines.push(`${namePart}${qtyPart}`);
    
    if (item.variant) {
      lines.push(`  ${item.variant.substring(0, 26)}`);
    }
    
    if (item.notes) {
      lines.push(`  * ${item.notes.substring(0, 26)}`);
    }
    
    lines.push("");
  }
  
  lines.push(SEPARATOR);
  lines.push(centerText("⚡ PRIORITY: NORMAL ⚡"));
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(centerText("PLEASE PREPARE"));
  lines.push(centerText("THANK YOU!"));
  lines.push(DOUBLE_SEPARATOR);
  
  const printText = lines.join("\n");
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(printText)}#/sl#`;
};

// ============================================
// PRINT FUNCTION
// ============================================

export const printOrder = async (
  data: any, 
  settings: PrinterSettings = { paperSize: "58mm", copies: 1, autoCut: true }
): Promise<void> => {
  // Add copies to data for multi-print support
  const printData = { ...data, copies: settings.copies };
  
  const printUrl = generateMobilePrintUrl(printData);
  window.location.href = printUrl;
};

export const printKitchenReceipt = (data: any): void => {
  const printUrl = generateKitchenPrintUrl(data);
  window.location.href = printUrl;
};

// Detect mobile device
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};