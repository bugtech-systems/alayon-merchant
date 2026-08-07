// hooks/use-water-production.ts
"use client"

import { useState, useEffect, useCallback } from 'react';
import {
  recordProduction,
  recordBackwash,
  getRealtimeStats,
  getDailySummary,
  getWeeklyTrend,
  getEfficiencyMetrics,
  setBackwashLimit,
  getBackwashLimit,
} from '@/lib/actions/water-production';
import {
  RealtimeStats,
  DailySummary,
  WeeklyTrendItem,
  EfficiencyMetrics,
  ProductionRefillInput,
} from '@/lib/types';

interface UseWaterProductionReturn {
  // State
  realtimeStats: RealtimeStats | null;
  dailySummary: DailySummary | null;
  weeklyTrend: WeeklyTrendItem[];
  efficiencyMetrics: EfficiencyMetrics | null;
  backwashLimit: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  handleRefill: (quantity: number, containerSize?: string, itemId?: any, locationId?: any) => Promise<void>;
  handleBackwash: (reason?: 'manual' | 'limit_reached' | 'scheduled') => Promise<void>;
  handleSetBackwashLimit: (limit: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshRealtime: () => Promise<void>;
  refreshDaily: (date?: string) => Promise<void>;
}

export function useWaterProduction(): UseWaterProductionReturn {
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendItem[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);
  const [backwashLimit, setBackwashLimitState] = useState(250);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real-time stats
  const refreshRealtime = useCallback(async () => {
    try {
      const stats = await getRealtimeStats();
      setRealtimeStats(stats);
      setBackwashLimitState(stats.backwashLimit);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch daily summary
  const refreshDaily = useCallback(async (date?: string) => {
    try {
      const summary = await getDailySummary(date);
      setDailySummary(summary);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch weekly trend
  const refreshWeekly = useCallback(async () => {
    try {
      const trend = await getWeeklyTrend();
      setWeeklyTrend(trend);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch efficiency metrics
  const refreshEfficiency = useCallback(async () => {
    try {
      const metrics = await getEfficiencyMetrics();
      setEfficiencyMetrics(metrics);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch backwash limit
  const refreshBackwashLimit = useCallback(async () => {
    try {
      const limit = await getBackwashLimit();
      setBackwashLimitState(limit);
    } catch (err: any) {
      console.error('Failed to fetch backwash limit:', err);
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshRealtime(),
        refreshDaily(),
        refreshWeekly(),
        refreshEfficiency(),
        refreshBackwashLimit(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshRealtime, refreshDaily, refreshWeekly, refreshEfficiency, refreshBackwashLimit]);

  // Handle production refill
  const handleRefill = useCallback(async (quantity: number, containerSize: string = '20L', itemId?: any, locationId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const input: ProductionRefillInput = {
        quantity,
        containerSize,
        machineId: 'main-machine-01',
        operatorId: 'current-operator',
        itemId,
        locationId
      };

      await recordProduction(input);
      
      // Refresh stats after recording
      await refreshRealtime();
      await refreshDaily();
      
      return;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRealtime, refreshDaily]);

  // Handle backwash
  const handleBackwash = useCallback(async (reason: 'manual' | 'limit_reached' | 'scheduled' = 'manual') => {
    setIsLoading(true);
    setError(null);
    try {
      await recordBackwash({ reason });
      
      // Refresh stats after backwash
      await Promise.all([
        refreshRealtime(),
        refreshDaily(),
        refreshWeekly(),
      ]);
      
      return;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRealtime, refreshDaily, refreshWeekly]);

  // Handle set backwash limit
  const handleSetBackwashLimit = useCallback(async (limit: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await setBackwashLimit(limit);
      setBackwashLimitState(limit);
      
      // Refresh stats to reflect new limit
      await refreshRealtime();
      
      return;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRealtime]);

  // Initial data fetch and polling
  useEffect(() => {
    refreshAll();

    // Poll real-time stats every 5 seconds
    const realtimeInterval = setInterval(() => {
      refreshRealtime();
    }, 5000);

    // Poll daily summary every 30 seconds
    const dailyInterval = setInterval(() => {
      refreshDaily();
    }, 30000);

    // Poll weekly trend every 5 minutes
    const weeklyInterval = setInterval(() => {
      refreshWeekly();
    }, 300000);

    return () => {
      clearInterval(realtimeInterval);
      clearInterval(dailyInterval);
      clearInterval(weeklyInterval);
    };
  }, [refreshAll, refreshRealtime, refreshDaily, refreshWeekly]);

  return {
    realtimeStats,
    dailySummary,
    weeklyTrend,
    efficiencyMetrics,
    backwashLimit,
    isLoading,
    error,
    handleRefill,
    handleBackwash,
    handleSetBackwashLimit,
    refreshAll,
    refreshRealtime,
    refreshDaily,
  };
}