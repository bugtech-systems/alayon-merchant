export function findObjectsByIds(ids, objects, idField = 'id') {
    return ids.map(id => objects.find(obj => obj[idField] === id)).filter(obj => obj);
}


export function sortByDateOldestFirst(items, dateField = 'created_at') {
    return [...items].sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
}

// Helper to safely get nested values
const getNestedValue = (obj: any, path: string): any => {
  if (!obj) return null;
  if (!path.includes('.')) return obj[path];
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    if (typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  
  return current;
};

/**
 * Gets nested value from object using path array
 * @param {object} obj - Source object
 * @param {string[]} pathParts - Path segments
 * @returns {any} Found value or undefined
 */


function formatToTenDigits(str: any) {
    if (!str || typeof str !== 'string') return str; // default fallback

    if (str[0] !== '9') str = '9' + str;
    while (str.length < 10) {
        str += '0';
    }
    return str.slice(0, 10); // In case it's longer than 10
}


export function sanitizePhoneNumber(phoneNumber: any) {
    // Remove any non-numeric characters from the phone number
    if(!phoneNumber) return null;
    const sanitized = String(phoneNumber).replace(/\D/g, '');

    if (sanitized.length > 12) throw Error('Invalid phone number format');

    // Check for common prefixes and remove them
    if (sanitized.startsWith('09')) {
        return sanitized.slice(1); // Remove the '09' prefix
    } else if (sanitized.startsWith('639')) {
        return sanitized.slice(2); // Remove the '639' prefix
    } else if (sanitized.startsWith('+639')) {
        return sanitized.slice(3); // Remove the '+639' prefix
    } else if (sanitized.length === 10) {
        return sanitized; // Already a 10-digit number
    } else {
        return formatToTenDigits(sanitized)
    }
    // If the number is not in a valid format, return null or throw an error
}


// Helper to compare values
const compareValues = (a: any, b: any, direction: any): number => {
  // Handle null/undefined values
  if (a === null || a === undefined) return direction === 'asc' ? -1 : 1;
  if (b === null || b === undefined) return direction === 'asc' ? 1 : -1;
  
  // Handle different types
  if (typeof a === 'string' && typeof b === 'string') {
    return direction === 'asc' 
      ? a.localeCompare(b) 
      : b.localeCompare(a);
  }
  
  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }
  
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return direction === 'asc' 
      ? (a === b ? 0 : a ? 1 : -1)
      : (a === b ? 0 : a ? -1 : 1);
  }
  
  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return direction === 'asc' 
      ? a.getTime() - b.getTime()
      : b.getTime() - a.getTime();
  }
  
  // Handle date strings
  if (typeof a === 'string' && typeof b === 'string' && 
      !isNaN(Date.parse(a)) && !isNaN(Date.parse(b))) {
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  }
  
  // Fallback to string comparison
  const strA = String(a);
  const strB = String(b);
  return direction === 'asc' 
    ? strA.localeCompare(strB) 
    : strB.localeCompare(strA);
};

// ============================================
// MAIN SORT FUNCTION
// ============================================

export function sortOrders(
  orders: any[],
  sortField: any,
  sortDirection: any = 'asc'
): any[] {
  if (!orders || orders.length === 0) return orders;

  return [...orders].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    // Handle special field mappings
    switch (sortField) {
      case 'id':
        valueA = a.id;
        valueB = b.id;
        break;
        
      case 'display_id':
        valueA = a.display_id;
        valueB = b.display_id;
        break;
        
      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;
        
      case 'payment_status':
        valueA = a.payment_status;
        valueB = b.payment_status;
        break;
        
      case 'fulfillment_status':
        valueA = a.fulfillment_status;
        valueB = b.fulfillment_status;
        break;
        
      case 'total':
        valueA = a.total;
        valueB = b.total;
        break;
        
      case 'created_at':
        valueA = a.created_at;
        valueB = b.created_at;
        break;
        
      case 'updated_at':
        valueA = a.updated_at;
        valueB = b.updated_at;
        break;
        
      case 'customer_name':
        valueA = a.metadata?.customer_name || a.customer?.first_name || '';
        valueB = b.metadata?.customer_name || b.customer?.first_name || '';
        break;
        
      case 'customer_email':
        valueA = a.metadata?.customer_email || a.email || '';
        valueB = b.metadata?.customer_email || b.email || '';
        break;
        
      case 'items_count':
        valueA = a.items?.length || 0;
        valueB = b.items?.length || 0;
        break;
        
      case 'metadata.seller_id':
        valueA = getNestedValue(a, 'metadata.seller_id');
        valueB = getNestedValue(b, 'metadata.seller_id');
        break;
        
      case 'metadata.customer_id':
        valueA = getNestedValue(a, 'metadata.customer_id');
        valueB = getNestedValue(b, 'metadata.customer_id');
        break;
        
      case 'metadata.table_ids':
        valueA = getNestedValue(a, 'metadata.table_ids')?.length || 0;
        valueB = getNestedValue(b, 'metadata.table_ids')?.length || 0;
        break;
        
      case 'metadata.pos_payment.method':
        valueA = getNestedValue(a, 'metadata.pos_payment.method') || '';
        valueB = getNestedValue(b, 'metadata.pos_payment.method') || '';
        break;
        
      case 'metadata.pos_payment.amount':
        valueA = getNestedValue(a, 'metadata.pos_payment.amount') || 0;
        valueB = getNestedValue(b, 'metadata.pos_payment.amount') || 0;
        break;
        
      case 'metadata.customer_group_id':
        valueA = getNestedValue(a, 'metadata.customer_group_id') || '';
        valueB = getNestedValue(b, 'metadata.customer_group_id') || '';
        break;
        
      case 'metadata.pricing_strategy':
        valueA = getNestedValue(a, 'metadata.pricing_strategy') || '';
        valueB = getNestedValue(b, 'metadata.pricing_strategy') || '';
        break;
        
      default:
        // Try to get nested value for any field
        valueA = getNestedValue(a, sortField);
        valueB = getNestedValue(b, sortField);
    }

    return compareValues(valueA, valueB, sortDirection);
  });
}