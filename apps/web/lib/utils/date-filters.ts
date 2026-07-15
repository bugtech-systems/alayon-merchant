// lib/utils/date-filters.ts
export function buildDateFilters(dateFrom?: string, dateTo?: string) {
  const filters: Record<string, string> = {};
  
  if (dateFrom) {
    // Ensure date is in ISO format with timezone
    const fromDate = new Date(dateFrom);
    if (!isNaN(fromDate.getTime())) {
      filters['created_at[gte]'] = fromDate.toISOString();
    }
  }
  
  if (dateTo) {
    // Set to end of day if only date is provided
    let toDate = new Date(dateTo);
    if (!isNaN(toDate.getTime())) {
      // If no time component, set to end of day
      if (!dateTo.includes('T')) {
        toDate.setHours(23, 59, 59, 999);
      }
      filters['created_at[lte]'] = toDate.toISOString();
    }
  }
  
  return filters;
}

// For date ranges like "today", "this_week", "this_month"
export function getDateRangePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  
  switch (preset) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case 'this_week':
      const day = from.getDay();
      from.setDate(from.getDate() - day);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() + (6 - day));
      to.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setMonth(to.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    default:
      break;
  }
  
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}