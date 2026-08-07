// lib/water-production/actions.ts
"use server"

import { productionApiConfig } from "../config";
import {
  ProductionRefillInput,
  ProductionRefillResponse,
  BackwashInput,
  BackwashResponse,
  RealtimeStats,
  DailySummary,
  WeeklyTrendItem,
  EfficiencyMetrics,
  BackwashLimitResponse,
  BackwashHistoryItem,
  ProductionRecordsResponse,
  ApiError,
} from "../types";

/**
 * Helper function to make API requests
 */
async function productionApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${productionApiConfig.baseUrl}${endpoint}`;
  console.log(url, "URLL")
  const response = await fetch(url, {
    ...options,
    headers: {
      ...productionApiConfig.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Record a production refill
 */
export async function recordProduction(
  input: ProductionRefillInput
): Promise<ProductionRefillResponse> {
  try {
    const data = await productionApiFetch<ProductionRefillResponse>('/api/production/record', {
      method: 'POST',
      body: JSON.stringify({
        containerSize: input.containerSize || '20L',
        quantity: input.quantity,
        machineId: input.machineId,
        operatorId: input.operatorId,
        batchId: input.batchId,
        locationId: input?.locationId,
        itemId: input?.itemId
      }),
    });

    return data;
  } catch (error) {
    console.error('Failed to record production:', error);
    throw error;
  }
}

/**
 * Record a backwash event
 */
export async function recordBackwash(
  input: BackwashInput = {}
): Promise<BackwashResponse> {
  try {
    const data = await productionApiFetch<BackwashResponse>('/api/production/backwash', {
      method: 'POST',
      body: JSON.stringify({
        reason: input.reason || 'manual',
        operatorId: input.operatorId || 'system',
      }),
    });

    return data;
  } catch (error) {
    console.error('Failed to record backwash:', error);
    throw error;
  }
}

/**
 * Get real-time production stats
 */
export async function getRealtimeStats(): Promise<RealtimeStats> {
  try {
    const response = await productionApiFetch<{ success: boolean; data: RealtimeStats }>(
      '/api/production/stats/realtime',
      {
        method: 'GET',
        next: { revalidate: 5 }, // Revalidate every 5 seconds for real-time data
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get realtime stats:', error);
    // Return default stats on error
    return {
      currentCount: 0,
      backwashLimit: 250,
      backwashNeeded: false,
      todayTotal: 0,
      lastRefillTime: null,
      lastBackwashTime: null,
      lastContainerSize: '20L',
      lastQuantity: 0,
    };
  }
}

/**
 * Get daily production summary
 */
export async function getDailySummary(
  date?: string
): Promise<DailySummary> {
  try {
    const queryParams = date ? `?date=${date}` : '';
    const response = await productionApiFetch<{ success: boolean; data: DailySummary }>(
      `/api/production/stats/daily${queryParams}`,
      {
        method: 'GET',
        next: { revalidate: 30 }, // Revalidate every 30 seconds
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get daily summary:', error);
    throw error;
  }
}

/**
 * Get weekly production trend
 */
export async function getWeeklyTrend(): Promise<WeeklyTrendItem[]> {
  try {
    const response = await productionApiFetch<{ success: boolean; data: WeeklyTrendItem[] }>(
      '/api/production/stats/weekly',
      {
        method: 'GET',
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get weekly trend:', error);
    return [];
  }
}

/**
 * Get efficiency metrics
 */
export async function getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
  try {
    const response = await productionApiFetch<{ success: boolean; data: EfficiencyMetrics }>(
      '/api/production/stats/efficiency',
      {
        method: 'GET',
        next: { revalidate: 60 }, // Revalidate every minute
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get efficiency metrics:', error);
    throw error;
  }
}

/**
 * Get production records with pagination
 */
export async function getProductionRecords(
  options: {
    date?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ProductionRecordsResponse> {
  try {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const endpoint = `/api/production/records${queryString ? `?${queryString}` : ''}`;

    const data = await productionApiFetch<ProductionRecordsResponse>(endpoint, {
      method: 'GET',
      next: { revalidate: 30 },
    });

    return data;
  } catch (error) {
    console.error('Failed to get production records:', error);
    throw error;
  }
}

/**
 * Get backwash history
 */
export async function getBackwashHistory(
  options: {
    date?: string;
    limit?: number;
  } = {}
): Promise<BackwashHistoryItem[]> {
  try {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const endpoint = `/api/production/backwash/history${queryString ? `?${queryString}` : ''}`;

    const response = await productionApiFetch<{ success: boolean; data: BackwashHistoryItem[] }>(
      endpoint,
      {
        method: 'GET',
        next: { revalidate: 60 },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get backwash history:', error);
    return [];
  }
}

/**
 * Get backwash limit
 */
export async function getBackwashLimit(): Promise<number> {
  try {
    const response = await productionApiFetch<BackwashLimitResponse>(
      '/api/production/backwash/limit',
      {
        method: 'GET',
        next: { revalidate: 300 },
      }
    );

    return response.data.limit;
  } catch (error) {
    console.error('Failed to get backwash limit:', error);
    return 250; // Default limit
  }
}

/**
 * Set backwash limit
 */
export async function setBackwashLimit(limit: number): Promise<BackwashLimitResponse> {
  try {
    const data = await productionApiFetch<BackwashLimitResponse>('/backwash/limit', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });

    return data;
  } catch (error) {
    console.error('Failed to set backwash limit:', error);
    throw error;
  }
}

/**
 * Cleanup old production data
 */
export async function cleanupProductionData(): Promise<{ deletedCount: number }> {
  try {
    const response = await productionApiFetch<{ success: boolean; data: { deletedCount: number } }>(
      '/cleanup',
      {
        method: 'POST',
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to cleanup production data:', error);
    throw error;
  }
}