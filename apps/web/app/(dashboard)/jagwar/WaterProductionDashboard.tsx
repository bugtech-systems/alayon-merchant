// components/dashboard/water-production-dashboard.tsx
"use client"

import { useState, useCallback, useMemo } from 'react';
import { useWaterProduction } from '@/hooks/use-water-production';
import { RefillButton } from './_components/dashboard/refill-button';
import { BackwashSettings } from './_components/dashboard/backwash-settings';
import { JagsMonitoringChart } from './_components/dashboard/jags-monitoring-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Container, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Factory,
  BarChart3,
  Droplets,
  Clock,
  Zap,
  Gauge,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { fetchInventoryItemsByLocation } from '@/lib/actions';
import { sampleJagsData } from '@/data/jags-sample-data';

interface User {
  id: string;
  stockLocationId: string;
  name?: string;
  role?: string;
}

interface WaterProductionDashboardProps {
  user: User;
}

function WaterProductionDashboard({ user }: WaterProductionDashboardProps) {
  const {
    realtimeStats,
    dailySummary,
    weeklyTrend,
    efficiencyMetrics,
    backwashLimit,
    isLoading,
    isRefreshing,
    error,
    handleRefill,
    handleBackwash,
    handleSetBackwashLimit,
    refreshAll,
    refreshRealtime,
  } = useWaterProduction();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('production');

  // Memoized stats
  const currentCount = useMemo(() => realtimeStats?.currentCount || 0, [realtimeStats]);
  const limit = useMemo(() => realtimeStats?.backwashLimit || 250, [realtimeStats]);
  const todayTotal = useMemo(() => realtimeStats?.todayTotal || 0, [realtimeStats]);
  const isBackwashNeeded = useMemo(() => realtimeStats?.backwashNeeded || false, [realtimeStats]);
  const remainingCapacity = useMemo(() => Math.max(0, limit - currentCount), [limit, currentCount]);
  const progressPercentage = useMemo(() => 
    Math.min((currentCount / limit) * 100, 100), [currentCount, limit]
  );

  // Handlers
  const onRefill = useCallback(async (quantity: number, containerSize: string, item?: any) => {
    try {
      await handleRefill(quantity, containerSize, item?.id, user?.stockLocationId);
      
      // Toast is handled by the refill button now, but we can add additional feedback
      console.log(`Refill recorded: ${quantity} ${containerSize}`, { item });
    } catch (error: any) {
      toast({
        title: "Refill Failed",
        description: error.message || "Failed to record production. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [handleRefill, user?.stockLocationId, toast]);

  const onBackwash = useCallback(async () => {
    try {
      const reason = isBackwashNeeded ? 'limit_reached' : 'manual';
      await handleBackwash(reason);
      toast({
        title: "✅ Backwash Completed",
        description: `Machine has been backwashed. Counter reset from ${currentCount} to 0.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast({
        title: "Backwash Failed",
        description: error.message || "Failed to record backwash. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [handleBackwash, isBackwashNeeded, currentCount, toast]);

  const onUpdateBackwashLimit = useCallback(async (limit: number) => {
    try {
      await handleSetBackwashLimit(limit);
      toast({
        title: "Limit Updated",
        description: `Backwash limit set to ${limit} containers.`,
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update backwash limit.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [handleSetBackwashLimit, toast]);

  const onInventoryItemChange = useCallback((item: any) => {
    console.log('Inventory item changed:', item);
    // You can store this in state or context if needed elsewhere
  }, []);

  // Loading skeleton
  if (isLoading && !realtimeStats) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] md:col-span-2" />
          <Skeleton className="h-[600px]" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !realtimeStats) {
    return (
      <Card className="border-red-200 bg-red-50 shadow-lg">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700">Connection Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Check if the production API server is running
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={refreshAll}
                className="border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-red-300 hover:bg-red-100"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            Water Production Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time production monitoring
            {user?.name && <span className="ml-2">· {user.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <Badge 
            variant={isBackwashNeeded ? "destructive" : "default"}
            className={cn(
              "px-3 py-1.5 text-sm transition-all duration-300",
              isBackwashNeeded && "animate-pulse"
            )}
          >
            {isBackwashNeeded ? (
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isBackwashNeeded ? 'Backwash Required' : 'Normal Operation'}
          </Badge>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAll} 
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>



      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="production" className="gap-2">
            <Factory className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="jags" className="gap-2">
            <Droplets className="h-4 w-4" />
            Jags
          </TabsTrigger>
        </TabsList>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <RefillButton
                backwashLimit={limit}
                currentCount={currentCount}
                onRefill={onRefill}
                containerSize="20L"
                stockLocationId={user?.stockLocationId}
                onInventoryItemChange={onInventoryItemChange}
                fetchInventoryItemsFn={() => fetchInventoryItemsByLocation(user?.stockLocationId)}
              />
            </div>
            <BackwashSettings
              currentCount={currentCount}
              lastBackwashDate={
                realtimeStats?.lastBackwashTime 
                  ? new Date(realtimeStats.lastBackwashTime) 
                  : null
              }
              onUpdateLimit={onUpdateBackwashLimit}
              onBackwash={onBackwash}
            />
          </div>

          {/* Daily Summary */}
          {dailySummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Daily Production Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total Containers</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">
                      {dailySummary.totalQuantity}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total Volume</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">
                      {dailySummary.totalVolume}L
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Peak Hour</p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">
                      {dailySummary.peakHour}:00
                    </p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium">Avg/Hour</p>
                    <p className="text-3xl font-bold text-amber-700 mt-1">
                      {dailySummary.averagePerHour}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Efficiency Metrics */}
          {efficiencyMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Efficiency Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Avg Daily</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">
                      {efficiencyMetrics.averageDailyProduction}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">containers</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Backwash/Day</p>
                    <p className="text-3xl font-bold text-red-700 mt-1">
                      {efficiencyMetrics.backwashFrequency}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Today's Volume</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">
                      {efficiencyMetrics.todayVolume}L
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Peak Hour</p>
                    <p className="text-3xl font-bold text-purple-700 mt-1">
                      {efficiencyMetrics.peakProductionHour}:00
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Trend */}
          {weeklyTrend && weeklyTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Production Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weeklyTrend.map((day, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "text-center p-3 rounded-lg transition-colors",
                        day.totalQuantity > 0 
                          ? "bg-blue-50 hover:bg-blue-100" 
                          : "bg-gray-50"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-bold mt-1">
                        {day.totalQuantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.totalVolume}L
                      </p>
                      {day.backwashCount > 0 && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {day.backwashCount} BW
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Jags Tab */}
        <TabsContent value="jags" className="space-y-6">
          <JagsMonitoringChart data={sampleJagsData} />
        </TabsContent>
      </Tabs>
            {/* Real-time Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Count */}
        <Card className={cn(
          "bg-gradient-to-br transition-all duration-300",
          isBackwashNeeded 
            ? "from-red-50 to-red-100 border-red-200" 
            : "from-blue-50 to-blue-100 border-blue-200"
        )}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isBackwashNeeded ? "text-red-600" : "text-blue-600"
                )}>
                  Current Count
                </p>
                <p className={cn(
                  "text-3xl font-bold transition-all duration-300",
                  isBackwashNeeded ? "text-red-700" : "text-blue-700"
                )}>
                  {currentCount}
                </p>
              </div>
              <Container className={cn(
                "h-8 w-8",
                isBackwashNeeded ? "text-red-400" : "text-blue-400"
              )} />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className={isBackwashNeeded ? "text-red-500" : "text-blue-500"}>
                  Limit: {limit}
                </span>
                <span className={isBackwashNeeded ? "text-red-500" : "text-blue-500"}>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className={cn(
                "h-1.5 rounded-full overflow-hidden",
                isBackwashNeeded ? "bg-red-200" : "bg-blue-200"
              )}>
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isBackwashNeeded ? "bg-red-500 animate-pulse" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Total */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-600">Today's Production</p>
                <p className="text-3xl font-bold text-green-700">{todayTotal}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-green-600">
                Containers produced today
              </p>
              <p className="text-xs text-green-500">
                Volume: {todayTotal * 20}L
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Last Refill */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-600">Last Refill</p>
                <p className="text-3xl font-bold text-purple-700">
                  {realtimeStats?.lastQuantity || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-purple-600">
                {realtimeStats?.lastContainerSize || '20L'} containers
              </p>
              {realtimeStats?.lastRefillTime && (
                <p className="text-xs text-purple-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(realtimeStats.lastRefillTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Backwash Status */}
        <Card className={cn(
          "bg-gradient-to-br transition-all duration-300",
          isBackwashNeeded 
            ? 'from-red-50 to-red-100 border-red-200' 
            : 'from-amber-50 to-amber-100 border-amber-200'
        )}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isBackwashNeeded ? 'text-red-600' : 'text-amber-600'
                )}>
                  Backwash Status
                </p>
                <p className={cn(
                  "text-3xl font-bold",
                  isBackwashNeeded ? 'text-red-700' : 'text-amber-700'
                )}>
                  {isBackwashNeeded ? 'Required' : 'OK'}
                </p>
              </div>
              <Activity className={cn(
                "h-8 w-8",
                isBackwashNeeded ? 'text-red-400' : 'text-amber-400'
              )} />
            </div>
            <div className="mt-3">
              <p className={cn(
                "text-xs",
                isBackwashNeeded ? 'text-red-600 font-medium' : 'text-amber-600'
              )}>
                {isBackwashNeeded 
                  ? '⚠️ Backwash immediately' 
                  : `${remainingCapacity} containers remaining`}
              </p>
              {realtimeStats?.lastBackwashTime && (
                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last: {new Date(realtimeStats.lastBackwashTime).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WaterProductionDashboard;