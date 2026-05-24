// hooks/useURLFilters.ts

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useCallback, useRef, useEffect } from "react";
import { resolveRange } from "@/lib/utils/resolveRange";
import { format, parse, isValid, subMonths, startOfDay, endOfDay } from "date-fns";

export interface Filters {
  [key: string]: any;
  page: number;
  limit: number;
}

export interface UseURLFiltersOptions {
  defaultPage?: number;
  defaultRange: string;
  defaultLimit?: number;
  defaultDateRange?: {
    from?: Date;
    to?: Date;
    fromKey?: string;  // URL parameter key for start date (default: 'from')
    toKey?: string;    // URL parameter key for end date (default: 'to')
  };
}

function formatDateString(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function getDefaultFromDate(): string {
  const oneMonthAgo = subMonths(new Date(), 1);
  return format(startOfDay(oneMonthAgo), "yyyy-MM-dd");
}

function getDefaultToDate(): string {
  return format(endOfDay(new Date()), "yyyy-MM-dd");
}

export function useURLFilters(options: UseURLFiltersOptions = {}) {
  const { 
    defaultPage = 1, 
    defaultLimit = 10,
    defaultRange = '30d',
    defaultDateRange = {
      fromKey: 'from',
      toKey: 'to',
    }
  } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Track initialization to avoid overriding URL params on first load
  const isInitializedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize default date filters if not present in URL
  useEffect(() => {
    if (!isInitializedRef.current) {
      const currentParams = new URLSearchParams(searchParams.toString());
      let needsUpdate = false;
      
      // Check if date filters are missing
      const hasFrom = currentParams.has(defaultDateRange.fromKey!);
      const hasTo = currentParams.has(defaultDateRange.toKey!);
      
      if (!hasFrom || !hasTo) {
        if (!hasFrom) {
          currentParams.set(defaultDateRange.fromKey!, getDefaultFromDate());
        }
        if (!hasTo) {
          currentParams.set(defaultDateRange.toKey!, getDefaultToDate());
        }
        needsUpdate = true;
      }
      
      // Also check if page/limit are missing
      if (!currentParams.has("page")) {
        currentParams.set("page", String(defaultPage));
        needsUpdate = true;
      }
      if (!currentParams.has("limit")) {
        currentParams.set("limit", String(defaultLimit));
        needsUpdate = true;
      }

      
      if (!currentParams.has("range")) {
        currentParams.set("range", defaultRange);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const newUrl = `${pathname}?${currentParams.toString()}`;
        router.replace(newUrl, { scroll: false });
      }


   
      isInitializedRef.current = true;
    }
  }, [searchParams, router, pathname, defaultDateRange.fromKey, defaultDateRange.toKey, defaultPage, defaultLimit, defaultRange]);

  // Get current filters as a stable object
  const filters = useMemo(() => {
    const result: Filters = {
      page: Number(searchParams.get("page") || defaultPage),
      limit: Number(searchParams.get("limit") || defaultLimit),
      range: searchParams.get('range') || defaultRange
    };
    
    // Copy all other params
    searchParams.forEach((value, key) => {
      if (key !== "page" && key !== "limit") {
        result[key] = value;
      }
    });
    
    // Ensure date filters exist (use defaults if still missing)
    if (!result[defaultDateRange.fromKey!]) {
      result[defaultDateRange.fromKey!] = getDefaultFromDate();
    }
    if (!result[defaultDateRange.toKey!]) {
      result[defaultDateRange.toKey!] = getDefaultToDate();
    }
    
    return result;
  }, [searchParams, defaultPage, defaultLimit, defaultDateRange.fromKey, defaultDateRange.toKey]);

  // Set filters with loop protection
  const setFilters = useCallback(
    (updates: Partial<Filters>) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const currentParams = new URLSearchParams(searchParams.toString());
      
      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          currentParams.delete(key);
        } else {
          currentParams.set(key, String(value));
        }
      });

      // Handle special case: when page changes, keep it
      // When other filters change, reset to page 1
      const hasPageUpdate = updates.page !== undefined;
      const hasOtherUpdates = Object.keys(updates).some(k => k !== "page" && k !== "limit");
      
      if (hasOtherUpdates && !hasPageUpdate && updates.page !== 1) {
        currentParams.set("page", "1");
      }

      const newUrl = `${pathname}?${currentParams.toString()}`;
      const currentUrl = `${pathname}?${searchParams.toString()}`;
      
      // Only update if URL actually changed
      if (newUrl !== currentUrl) {
        // Debounce the update
        timeoutRef.current = setTimeout(() => {
          router.replace(newUrl, { scroll: false });
        }, 50);
      }
    },
    [searchParams, router, pathname]
  );

  // Clear all filters and reset to defaults
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(defaultPage));
    params.set("limit", String(defaultLimit));
    params.set(defaultDateRange.fromKey!, getDefaultFromDate());
    params.set(defaultDateRange.toKey!, getDefaultToDate());
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, defaultPage, defaultLimit, defaultDateRange.fromKey, defaultDateRange.toKey]);

  // Helper to reset date range to last 1 month
  const resetDateRange = useCallback(() => {
    setFilters({
      [defaultDateRange.fromKey!]: getDefaultFromDate(),
      [defaultDateRange.toKey!]: getDefaultToDate(),
      page: 1,
    });
  }, [setFilters, defaultDateRange.fromKey, defaultDateRange.toKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    filters,
    setFilters,
    clearFilters,
    resetDateRange,  // Convenience method to reset just the date range
  };
}