// React hook for real-time production data
// hooks/use-redis-production.ts
"use client"

import { useState, useEffect, useCallback } from 'react';
import { useMedusa } from 'medusa-react';

interface RealtimeStats {
  currentCount: number;
  backwashLimit: number;
  backwashNeeded: boolean;
  todayTotal: number;
  lastRefillTime: number | null;
  lastBackwashTime: number | null;
}

interface DailySummary {
  date: string;
  totalQuantity: number;
  totalVolume: number;
  backwashCount: number;
  peakHour: number;
  averagePerHour: number;
  containerSizes: Record<string, number>;
  hourlyBreakdown: Array<{
    hour: number;
    quantity: number;
    volume: number;
    backwashCount: number;
  }>;
}

export function useRedisProduction() {
  const { client } = useMedusa();
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRealtimeStats = useCallback(async () => {
    try {
      const response = await client.admin.redisProduction.getStats('realtime');
      setRealtimeStats(response.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [client]);

  const fetchDailySummary = useCallback(async (date?: string) => {
    setIsLoading(true);
    try {
      const response = await client.admin.redisProduction.getStats('daily', date);
      setDailySummary(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const fetchWeeklyTrend = useCallback(async () => {
    try {
      const response = await client.admin.redisProduction.getStats('weekly');
      setWeeklyTrend(response.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [client]);

  const recordProduction = useCallback(async (data: {
    containerSize: string;
    quantity: number;
    machineId?: string;
    operatorId?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await client.admin.redisProduction.record(data);
      await fetchRealtimeStats(); // Refresh stats after recording
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchRealtimeStats]);

  const recordBackwash = useCallback(async (data: {
    reason: 'limit_reached' | 'manual' | 'scheduled';
    operatorId?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await client.admin.redisProduction.backwash(data);
      await fetchRealtimeStats(); // Refresh stats after backwash
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchRealtimeStats]);

  // Set up polling for real-time updates
  useEffect(() => {
    fetchRealtimeStats();
    fetchDailySummary();
    fetchWeeklyTrend();

    const interval = setInterval(() => {
      fetchRealtimeStats();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [fetchRealtimeStats, fetchDailySummary, fetchWeeklyTrend]);

  return {
    realtimeStats,
    dailySummary,
    weeklyTrend,
    isLoading,
    error,
    recordProduction,
    recordBackwash,
    refreshStats: fetchRealtimeStats,
    refreshDaily: fetchDailySummary,
    refreshWeekly: fetchWeeklyTrend,
  };
}