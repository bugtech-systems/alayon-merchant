// lib/print-utils.ts - RawBT removed, only Mobile Print Util

import { PrintOrderData, PrinterSettings } from "./types";

// ============================================
// PAPER WIDTH CONFIGURATION
// ============================================

const getPaperWidth = (paperSize: string): number => {
  return paperSize === "58mm" ? 32 : 48;
};

// Helper: Center text
const center = (text: string, width: number): string => {
  const padding = Math.max(0, (width - text.length) / 2);
  return " ".repeat(Math.floor(padding)) + text;
};

// Helper: Wrap text to multiple lines
const wrapText = (text: string, maxLength: number): string[] => {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines;
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return `₱${amount.toFixed(2)}`;
};

// Format date
export const formatReceiptDate = (date: Date): string => {
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\//g, '-');
};

// ============================================
// RECEIPT CONTENT GENERATOR
// ============================================

export const generateReceiptContent = (
  data: PrintOrderData, 
  settings: PrinterSettings
): string => {
  const WIDTH = getPaperWidth(settings.paperSize);
  const SEPARATOR = "-".repeat(WIDTH);
  const DOUBLE_SEPARATOR = "=".repeat(WIDTH);
  const DOTTED_LINE = ".".repeat(WIDTH);
  
  const lines: string[] = [];

  // HEADER SECTION
  lines.push(DOUBLE_SEPARATOR);
  lines.push(center(data.merchant?.name || "ALAYON RESTAURANT", WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  
  // Merchant address
  const address = data.merchant?.address || "016 Dadison Street, City";
  const addressLines = wrapText(address, WIDTH);
  addressLines.forEach(line => lines.push(center(line, WIDTH)));
  
  // Merchant contact
  const phone = data.merchant?.phone || "(02) 1234 5678";
  lines.push(center(phone, WIDTH));
  
  if (data.merchant?.taxId) {
    lines.push(center(`TIN: ${data.merchant.taxId}`, WIDTH));
  }
  
  lines.push("");
  lines.push(SEPARATOR);

  // ORDER INFO SECTION
  lines.push(`ORD #: ${data.orderNumber}`);
  lines.push(`DATE: ${formatReceiptDate(data.date)}`);
  
  if (data.placement) {
    const typeBadge = data.placement.type === "table" ? "DINE-IN" : 
                      data.placement.type === "takeaway" ? "TAKEAWAY" : "DELIVERY";
    lines.push(`${typeBadge}: ${data.placement.name}`);
  }
  
  lines.push(SEPARATOR);

  // CUSTOMER SECTION
  if (data.customer?.name) {
    const customerName = data.customer.name;
    if (customerName.length > WIDTH - 10) {
      lines.push(`CUST: ${customerName.substring(0, WIDTH - 10)}`);
    } else {
      lines.push(`CUST: ${customerName}`);
    }
    
    if (data.customer.phone) {
      lines.push(`PHONE: ${data.customer.phone}`);
    }
    lines.push(SEPARATOR);
  }

  // ITEMS HEADER
  lines.push("");
  lines.push("ITEM               QTY    AMOUNT");
  lines.push(SEPARATOR);

  // ITEMS LIST
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    
    const qtySpace = 5;
    const priceSpace = 8;
    const maxNameLen = WIDTH - qtySpace - priceSpace;
    
    let nameDisplay = item.name;
    if (nameDisplay.length > maxNameLen) {
      nameDisplay = nameDisplay.substring(0, maxNameLen - 3) + "...";
    }
    
    const namePart = nameDisplay.padEnd(maxNameLen);
    const qtyPart = `x${item.quantity}`.padStart(qtySpace);
    const pricePart = formatCurrency(item.total).padStart(priceSpace);
    
    lines.push(`${namePart}${qtyPart}${pricePart}`);
    
    if (item.variant) {
      const variantText = `  ${item.variant}`;
      const variantLines = wrapText(variantText, WIDTH - 2);
      variantLines.forEach(line => lines.push(line));
    }
    
    if (item.notes) {
      const noteText = `  * ${item.notes}`;
      const noteLines = wrapText(noteText, WIDTH - 2);
      noteLines.forEach(line => lines.push(line));
    }
    
    if (i < data.items.length - 1) {
      lines.push("");
    }
  }

  lines.push(SEPARATOR);
  lines.push("");

  // TOTALS SECTION
  const subtotalValue = formatCurrency(data.subtotal);
  lines.push(`SUBTOTAL${" ".repeat(WIDTH - 9 - subtotalValue.length)}${subtotalValue}`);
  
  if (data.discount_total > 0) {
    const discountValue = `-${formatCurrency(data.discount_total)}`;
    lines.push(`DISCOUNT${" ".repeat(WIDTH - 9 - discountValue.length)}${discountValue}`);
  }
  
  if (data.tax_total > 0) {
    const taxValue = formatCurrency(data.tax_total);
    lines.push(`TAX${" ".repeat(WIDTH - 4 - taxValue.length)}${taxValue}`);
  }
  
  if (data.shipping_total && data.shipping_total > 0) {
    const shippingValue = formatCurrency(data.shipping_total);
    lines.push(`SHIPPING${" ".repeat(WIDTH - 9 - shippingValue.length)}${shippingValue}`);
  }
  
  lines.push(DOUBLE_SEPARATOR);
  const totalValue = formatCurrency(data.total);
  lines.push(`TOTAL${" ".repeat(WIDTH - 6 - totalValue.length)}${totalValue}`);
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");

  // PAYMENT SECTION
  lines.push("PAYMENT");
  lines.push(DOTTED_LINE);
  
  if (data.payments && data.payments.length > 0) {
    for (const payment of data.payments) {
      const method = payment.type.toUpperCase().substring(0, 10);
      const amount = formatCurrency(payment.amount);
      const padding = WIDTH - method.length - amount.length;
      lines.push(`${method}${" ".repeat(padding)}${amount}`);
    }
  } else {
    const method = data.paymentMethod.toUpperCase().substring(0, 10);
    const amount = formatCurrency(data.total);
    const padding = WIDTH - method.length - amount.length;
    lines.push(`${method}${" ".repeat(padding)}${amount}`);
  }
  
  lines.push(DOTTED_LINE);
  lines.push("");

  // NOTES SECTION
  if (data.notes) {
    lines.push("NOTES:");
    const noteLines = wrapText(data.notes, WIDTH - 2);
    noteLines.forEach(line => {
      lines.push(`  ${line}`);
    });
    lines.push("");
  }
  
  if (data.staff_note) {
    lines.push(`STAFF: ${data.staff_note}`);
    lines.push("");
  }

  // FOOTER SECTION
  lines.push(SEPARATOR);
  lines.push(center("THANK YOU!", WIDTH));
  lines.push(center("PLEASE COME AGAIN", WIDTH));
  lines.push(SEPARATOR);
  lines.push("");
  lines.push(center(`#${data.orderNumber}`, WIDTH));
  lines.push(center(formatReceiptDate(data.date), WIDTH));
  lines.push("");
  lines.push(DOUBLE_SEPARATOR);
  
  // Paper cut spacing
  if (settings.autoCut) {
    lines.push("");
    lines.push("");
    lines.push("--- CUT HERE ---");
    lines.push("");
  }
  
  let finalContent = lines.join("\n");
  
  // HANDLE MULTIPLE COPIES
  if (settings.copies > 1) {
    const copySeparator = `\n${DOUBLE_SEPARATOR}\n${center(`COPY ${settings.copies}`, WIDTH)}\n${DOUBLE_SEPARATOR}\n\n`;
    finalContent = Array(settings.copies).fill(finalContent).join(copySeparator);
  }
  
  return finalContent;
};

// ============================================
// KITCHEN RECEIPT CONTENT GENERATOR
// ============================================

export const generateKitchenContent = (
  data: PrintOrderData,
  settings: PrinterSettings
): string => {
  const WIDTH = getPaperWidth(settings.paperSize);
  const SEPARATOR = "-".repeat(WIDTH);
  const DOUBLE_SEPARATOR = "=".repeat(WIDTH);
  
  const lines: string[] = [];

  lines.push(DOUBLE_SEPARATOR);
  lines.push(center("KITCHEN ORDER", WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  lines.push("");
  lines.push(`ORDER #: ${data.orderNumber}`);
  lines.push(`TIME: ${formatReceiptDate(data.date)}`);
  
  if (data.placement) {
    const typeLabel = data.placement.type === "table" ? "TABLE" : 
                      data.placement.type === "takeaway" ? "TAKEAWAY" : "DELIVERY";
    lines.push(`${typeLabel}: ${data.placement.name}`);
  }
  
  lines.push("");
  lines.push(SEPARATOR);
  lines.push("ITEM                 QTY");
  lines.push(SEPARATOR);
  
  for (const item of data.items) {
    const maxNameLen = WIDTH - 8;
    let nameDisplay = item.name;
    if (nameDisplay.length > maxNameLen) {
      nameDisplay = nameDisplay.substring(0, maxNameLen - 3) + "...";
    }
    const namePart = nameDisplay.padEnd(maxNameLen);
    const qtyPart = `x${item.quantity}`.padStart(6);
    lines.push(`${namePart}${qtyPart}`);
    
    if (item.variant) {
      lines.push(`  ${item.variant.substring(0, WIDTH - 4)}`);
    }
    
    if (item.notes) {
      lines.push(`  * ${item.notes.substring(0, WIDTH - 6)}`);
    }
    
    lines.push("");
  }
  
  lines.push(SEPARATOR);
  lines.push(center("PRIORITY: NORMAL", WIDTH));
  lines.push(DOUBLE_SEPARATOR);
  
  let finalContent = lines.join("\n");
  
  if (settings.copies > 1) {
    const copySeparator = `\n${DOUBLE_SEPARATOR}\n${center(`COPY ${settings.copies}`, WIDTH)}\n${DOUBLE_SEPARATOR}\n\n`;
    finalContent = Array(settings.copies).fill(finalContent).join(copySeparator);
  }
  
  return finalContent;
};

// ============================================
// INTENT URL GENERATOR (Mobile Print Util only)
// ============================================

const generateMobilePrintUtilIntentUrl = (content: string): string => {
  const encodedContent = encodeURIComponent(content);
  return `intent://print?text=${encodedContent}#Intent;scheme=com.samathosoft.webprint;package=com.samathosoft.mobileprintutil;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.samathosoft.mobileprintutil;end;`;
};

// ============================================
// MAIN PRINT FUNCTION
// ============================================

export const printOrder = async (
  data: PrintOrderData,
  type: "receipt" | "kitchen",
  settings: PrinterSettings
): Promise<{ success: boolean; message?: string }> => {
  try {
    // Generate content based on type and settings
    const content = type === "receipt" 
      ? generateReceiptContent(data, settings)
      : generateKitchenContent(data, settings);
    
    // Generate Mobile Print Util intent URL
    const url = generateMobilePrintUtilIntentUrl(content);
    
    // Attempt to open the app
    window.location.href = url;
    
    return { 
      success: true, 
      message: "Print job sent to Mobile Print Util"
    };
    
  } catch (error) {
    console.error("Print error:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
};