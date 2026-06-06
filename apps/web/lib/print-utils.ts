// lib/print-utils.ts - REFINED WITH BETTER SPACING & VISUAL ENHANCEMENTS

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
const THIN_SEPARATOR = "·".repeat(LINE_WIDTH);

// Enhanced center text with spacing
const centerText = (text: string): string => {
  const padding = Math.max(0, (LINE_WIDTH - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Create emphasized text (using ASCII art style)
const emphasizeText = (text: string): string => {
  return `▶ ${text} ◀`;
};

// Create large-looking text using spacing
const makeLargeText = (text: string): string => {
  return `  ${text.split('').join(' ')}  `;
};

// Format product with clear spacing
const formatProductWithSpacing = (name: string, total: string): string => {
  const maxNameLen = LINE_WIDTH - 12; // Reserve space for price
  let displayName = name;
  if (displayName.length > maxNameLen) {
    displayName = displayName.substring(0, maxNameLen - 3) + "...";
  }
  const namePart = displayName.padEnd(maxNameLen);
  const pricePart = total.padStart(12);
  return `${namePart}${pricePart}`;
};

// Format quantity with visual indicators
const formatQuantityWithIcon = (quantity: number): string => {
  const qtyIcon = quantity > 1 ? "🔹" : "▪";
  return `${qtyIcon} QTY: ${quantity}`;
};

// ============================================
// MAIN RECEIPT GENERATOR WITH ENHANCED SPACING
// ============================================

export const generateMobilePrintUrl = (data: PrintOrderData): string => {
  const receiptLines: string[] = [];
  
  // ========================================
  // HEADER SECTION (Emphasized)
  // ========================================
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  receiptLines.push(centerText("★ B E L L Y   B Y T E S ★"));
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  receiptLines.push(centerText("016 Dadison Street"));
  receiptLines.push(centerText("San Antonio, Pasig City"));
  receiptLines.push(centerText("Tel: (02) 8123 4567"));
  receiptLines.push("");
  receiptLines.push(THIN_SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // ORDER INFORMATION
  // ========================================
  receiptLines.push(`📋 ORDER #: ${data.orderNumber}`);
  receiptLines.push(`📅 DATE: ${formatReceiptDate(data.date)}`);
  receiptLines.push("");
  
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "🏠" : 
                     data.placement.type === "takeaway" ? "📦" : "🚚";
    receiptLines.push(`${typeIcon} ${data.placement.type.toUpperCase()}: ${data.placement.name}`);
    receiptLines.push("");
  }
  
  receiptLines.push(THIN_SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // CUSTOMER INFORMATION
  // ========================================
  if (data.customer?.name) {
    receiptLines.push(`👤 CUSTOMER:`);
    receiptLines.push(`   ${data.customer.name}`);
    if (data.customer.phone) {
      receiptLines.push(`📞 ${data.customer.phone}`);
    }
    receiptLines.push("");
    receiptLines.push(THIN_SEPARATOR);
    receiptLines.push("");
  }
  
  // ========================================
  // ITEMS SECTION (Enhanced with spacing)
  // ========================================
  receiptLines.push(centerText("═══ I T E M S ═══"));
  receiptLines.push("");
  receiptLines.push("ITEM                      TOTAL");
  receiptLines.push(SEPARATOR);
  receiptLines.push("");
  
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    // Product name and total on same line
    receiptLines.push(formatProductWithSpacing(item.name, formatCurrency(item.total)));
    
    // Quantity with visual icon (separate line with spacing)
    receiptLines.push(`   ${formatQuantityWithIcon(item.quantity)}`);
    
    // Unit price (for clarity)
    receiptLines.push(`   @ ${formatCurrency(item.price)} each`);
    
    // Variant if exists
    if (item.variant) {
      receiptLines.push(`   📌 ${item.variant}`);
    }
    
    // Item notes if exists
    if (item.notes) {
      receiptLines.push(`   📝 ${item.notes}`);
    }
    
    // Add spacing between items (2 blank lines for better separation)
    if (i < data.items.length - 1) {
      receiptLines.push("");
      receiptLines.push("");
    }
  }
  
  receiptLines.push("");
  receiptLines.push(SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // TOTALS SECTION (Emphasized)
  // ========================================
  receiptLines.push(centerText("═══ S U M M A R Y ═══"));
  receiptLines.push("");
  
  // Subtotal
  receiptLines.push(`Subtotal` + " ".repeat(20) + `${formatCurrency(data.subtotal)}`);
  
  // Tax
  if (data.tax > 0) {
    const taxPercent = (data.taxRate * 100).toFixed(0);
    receiptLines.push(`Tax (${taxPercent}%)` + " ".repeat(15) + `${formatCurrency(data.tax)}`);
  }
  
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  
  // Total (emphasized with larger look)
  receiptLines.push(centerText(makeLargeText("TOTAL")));
  receiptLines.push(centerText(makeLargeText(formatCurrency(data.total))));
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // PAYMENT SECTION
  // ========================================
  receiptLines.push(centerText("═══ P A Y M E N T ═══"));
  receiptLines.push("");
  receiptLines.push(`💳 ${data.paymentMethod}` + " ".repeat(12) + `${formatCurrency(data.total)}`);
  receiptLines.push("");
  receiptLines.push(THIN_SEPARATOR);
  receiptLines.push("");
  
  // ========================================
  // NOTES SECTION
  // ========================================
  if (data.notes) {
    receiptLines.push("📋 NOTES:");
    receiptLines.push("");
    const noteLines = data.notes.match(/.{1,28}/g) || [data.notes];
    noteLines.forEach(line => {
      receiptLines.push(`   ${line}`);
    });
    receiptLines.push("");
    receiptLines.push(THIN_SEPARATOR);
    receiptLines.push("");
  }
  
  // ========================================
  // FOOTER (Highly Emphasized)
  // ========================================
  receiptLines.push("");
  receiptLines.push(centerText("════════════════════════════"));
  receiptLines.push(centerText("★★★  T H A N K   Y O U  ★★★"));
  receiptLines.push(centerText("════════════════════════════"));
  receiptLines.push("");
  receiptLines.push(centerText("Please come again!"));
  receiptLines.push("");
  receiptLines.push(centerText(`#${data.orderNumber}`));
  receiptLines.push(centerText(formatReceiptDate(data.date)));
  receiptLines.push("");
  receiptLines.push(DOUBLE_SEPARATOR);
  receiptLines.push("");
  receiptLines.push("");
  
  // Paper cut spacing
  if (data.autoCut) {
    receiptLines.push("─ CUT HERE ─");
    receiptLines.push("");
  }
  
  // Handle multiple copies
  let finalText = receiptLines.join("\n");
  if (data.copies && data.copies > 1) {
    const copySeparator = `\n\n${DOUBLE_SEPARATOR}\n${centerText(`📄 COPY ${data.copies} 📄`)}\n${DOUBLE_SEPARATOR}\n\n`;
    finalText = Array(data.copies).fill(finalText).join(copySeparator);
  }
  
  // Generate Mobile Print Util URL
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(finalText)}#/sl#`;
};

// ============================================
// KITCHEN RECEIPT (Enhanced for readability)
// ============================================

export const generateKitchenPrintUrl = (data: PrintOrderData): string => {
  const lines: string[] = [];
  
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(centerText("👨‍🍳 K I T C H E N   O R D E R 👩‍🍳"));
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(`🔖 ORDER #: ${data.orderNumber}`);
  lines.push(`⏰ TIME: ${formatReceiptDate(data.date)}`);
  lines.push("");
  
  if (data.placement) {
    const typeIcon = data.placement.type === "table" ? "🏠" : 
                     data.placement.type === "takeaway" ? "📦" : "🚚";
    lines.push(`${typeIcon} ${data.placement.type.toUpperCase()}: ${data.placement.name}`);
    lines.push("");
  }
  
  lines.push(SEPARATOR);
  lines.push("");
  lines.push("ITEM                          QTY");
  lines.push(SEPARATOR);
  lines.push("");
  
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    // Item name
    const maxNameLen = 26;
    let nameDisplay = item.name;
    if (nameDisplay.length > maxNameLen) {
      nameDisplay = nameDisplay.substring(0, maxNameLen - 3) + "...";
    }
    const namePart = nameDisplay.padEnd(maxNameLen);
    const qtyPart = `x${item.quantity}`.padStart(4);
    lines.push(`${namePart}${qtyPart}`);
    
    // Variant
    if (item.variant) {
      lines.push(`   📌 ${item.variant}`);
    }
    
    // Notes
    if (item.notes) {
      lines.push(`   📝 ${item.notes}`);
    }
    
    // Spacing between items
    if (i < data.items.length - 1) {
      lines.push("");
      lines.push("");
    }
  }
  
  lines.push("");
  lines.push(SEPARATOR);
  lines.push("");
  lines.push(centerText("⚡ PRIORITY: NORMAL ⚡"));
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(centerText("PLEASE PREPARE"));
  lines.push(centerText("THANK YOU!"));
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  
  const printText = lines.join("\n");
  return `com.samathosoft.webprint://#mling##sl#${encodeURIComponent(printText)}#/sl#`;
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
    // Add settings to data for the generator
    const printData = { 
      ...data, 
      copies: settings.copies,
      autoCut: settings.autoCut,
      paperSize: settings.paperSize 
    };
    
    const printUrl = type === "receipt" 
      ? generateMobilePrintUrl(printData)
      : generateKitchenPrintUrl(printData);
    
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

export const printKitchenReceipt = (data: PrintOrderData): void => {
  const printUrl = generateKitchenPrintUrl(data);
  window.location.href = printUrl;
};