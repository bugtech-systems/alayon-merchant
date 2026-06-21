import { sdk } from "../medusa/config";
import { DeliveryDTO } from "../types";
import { getAuthHeaders, getCacheHeaders } from "./cookies";

export async function listDeliveries(
  params: any = {}
): Promise<DeliveryDTO[]> {
  const {
    driver_id,
    delivery_status,
    has_driver,
    limit = 50,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "desc",
    ...additionalFilters
  } = params;

  // Build query parameters
  const queryParams: Record<string, any> = {
    limit,
    offset,
    order: `${sortBy}:${sortOrder}`,
    ...additionalFilters,
  };

  // Handle delivery status filter
  if (delivery_status) {
    queryParams.delivery_status = Array.isArray(delivery_status) 
      ? delivery_status.join(",") 
      : delivery_status;
  }

  // Handle has_driver filter
  if (has_driver) {
    queryParams.has_driver = has_driver;
  }

  // Handle specific driver_id filter
  if (driver_id) {
    queryParams.driver_id = driver_id;
  }

  // Convert query params to string
  const queryString = new URLSearchParams(queryParams).toString();
  
  try {
    const {deliveries} = await sdk.client.fetch(
      `/store/deliveries${queryString ? `?${queryString}` : ''}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("deliveries")), // Cache for 30 seconds
        },
      }
    ) as any;

    // Client-side filtering for driver_id if server doesn't support it
  
    console.log(deliveries, 'DELLL NMESSS')
    return deliveries;
  } catch (error) {
    console.error("Failed to fetch deliveries:", error);
    throw new Error("Unable to fetch deliveries. Please try again later.");
  }
}

export async function retrieveDelivery(
  deliveryId: string
): Promise<DeliveryDTO> {
  const { delivery }: { delivery: DeliveryDTO } = await sdk.client.fetch(
    `/store/deliveries/${deliveryId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...getCacheHeaders("deliveries"),
      } as any,
    }
  );
  return delivery;
}



interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  totalRevenue: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  inTransitDeliveries: number;
  trends?: {
    totalDeliveries: number;
    completedDeliveries: number;
    onTimeRate: number;
    totalRevenue: number;
  };
}

interface DeliveryMetricsOptions {
  dateFrom?: Date;
  dateTo?: Date;
  driverId?: string;
  statuses?: string[];
}

// Helper function to calculate days between dates
function calculateDaysDifference(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to check if delivery is on-time (within 3 days)
function isOnTimeDelivery(createdAt: string, deliveredAt: string): boolean {
  const created = new Date(createdAt);
  const delivered = new Date(deliveredAt);
  const daysToDeliver = calculateDaysDifference(created, delivered);
  return daysToDeliver <= 3;
}

// Fetch all deliveries with filters using Next.js API route
async function fetchDeliveriesForMetrics(options: DeliveryMetricsOptions): Promise<DeliveryDTO[]> {
  const { dateFrom, dateTo, driverId, statuses } = options;
  
  const params: any = {
    limit: 9999,
    offset: 0,
  };
  
  // Apply status filter
  if (statuses && statuses.length > 0) {
    params.delivery_status = statuses.join(",");
  }
  
  // Apply driver filter
  if (driverId && driverId !== "all") {
    params.driver_id = driverId;
  }
  
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/deliveries${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Don't cache to ensure fresh data
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    let filteredDeliveries = result.deliveries || [];
    
    // Apply date range filtering client-side
    if (dateFrom || dateTo) {
      filteredDeliveries = filteredDeliveries.filter((delivery: DeliveryDTO) => {
        const deliveryDate = new Date(delivery.created_at);
        
        if (dateFrom && deliveryDate < dateFrom) return false;
        if (dateTo && deliveryDate > dateTo) return false;
        
        return true;
      });
    }
    
    return filteredDeliveries;
  } catch (error) {
    console.error("Failed to fetch deliveries for metrics:", error);
    return [];
  }
}

// Calculate trends by comparing with previous period
async function calculateTrends(
  currentMetrics: DeliveryMetrics,
  options: DeliveryMetricsOptions
): Promise<DeliveryMetrics['trends']> {
  const { dateFrom, dateTo, driverId } = options;
  
  if (!dateFrom || !dateTo) {
    return undefined;
  }
  
  // Calculate previous period (same duration)
  const periodDuration = dateTo.getTime() - dateFrom.getTime();
  const previousDateTo = new Date(dateFrom);
  previousDateTo.setDate(previousDateTo.getDate() - 1);
  const previousDateFrom = new Date(previousDateTo);
  previousDateFrom.setTime(previousDateFrom.getTime() - periodDuration);
  
  const previousDeliveries = await fetchDeliveriesForMetrics({
    dateFrom: previousDateFrom,
    dateTo: previousDateTo,
    driverId,
  });
  
  // Calculate previous metrics
  let previousTotalDeliveries = previousDeliveries.length;
  let previousCompletedDeliveries = 0;
  let previousTotalRevenue = 0;
  let previousOnTimeDeliveries = 0;
  
  previousDeliveries.forEach((delivery: DeliveryDTO) => {
    // Count completed deliveries
    if (delivery.delivery_status === "delivered") {
      previousCompletedDeliveries++;
      
      // Calculate revenue (assuming delivery fee is stored in metadata or has associated order)
      const deliveryRevenue = delivery.metadata?.delivery_fee || 0;
      previousTotalRevenue += deliveryRevenue;
      
      // Check on-time delivery
      if (isOnTimeDelivery(delivery.created_at, delivery.delivered_at!)) {
        previousOnTimeDeliveries++;
      }
    }
  });
  
  const previousOnTimeRate = previousCompletedDeliveries > 0
    ? (previousOnTimeDeliveries / previousCompletedDeliveries) * 100
    : 0;
  
  // Calculate trend percentages
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };
  
  return {
    totalDeliveries: calculateTrend(currentMetrics.totalDeliveries, previousTotalDeliveries),
    completedDeliveries: calculateTrend(currentMetrics.completedDeliveries, previousCompletedDeliveries),
    onTimeRate: calculateTrend(currentMetrics.onTimeRate, previousOnTimeRate),
    totalRevenue: calculateTrend(currentMetrics.totalRevenue, previousTotalRevenue),
  };
}

// Main function to get delivery metrics
export async function getDeliveryMetrics(
  options: DeliveryMetricsOptions = {}
): Promise<{ success: boolean; data?: DeliveryMetrics; error?: string }> {
  try {
    const { dateFrom, dateTo, driverId, statuses } = options;
    
    // Fetch deliveries based on filters
    const deliveries = await fetchDeliveriesForMetrics({
      dateFrom,
      dateTo,
      driverId,
      statuses,
    });
    
    // Initialize counters
    let totalDeliveries = deliveries.length;
    let completedDeliveries = 0;
    let cancelledDeliveries = 0;
    let pendingDeliveries = 0;
    let inTransitDeliveries = 0;
    let totalRevenue = 0;
    let totalDeliveryTime = 0;
    let onTimeDeliveries = 0;
    
    // Process each delivery
    deliveries.forEach((delivery: DeliveryDTO) => {
      // Count by status
      switch (delivery.delivery_status) {
        case "delivered":
          completedDeliveries++;
          
          // Calculate delivery time
          if (delivery.delivered_at) {
            const deliveryDays = calculateDaysDifference(
              new Date(delivery.created_at),
              new Date(delivery.delivered_at)
            );
            totalDeliveryTime += deliveryDays;
            
            // Check if on-time
            if (isOnTimeDelivery(delivery.created_at, delivery.delivered_at)) {
              onTimeDeliveries++;
            }
          }
          break;
        case "cancelled":
        case "restaurant_declined":
          cancelledDeliveries++;
          break;
        case "in_transit":
        case "ready_for_pickup":
          inTransitDeliveries++;
          break;
        default:
          pendingDeliveries++;
          break;
      }
      
      // Calculate revenue from delivery fees (stored in metadata or from associated order)
      // Adjust this based on where you store delivery fees
      const deliveryRevenue = delivery.metadata?.delivery_fee || 
                              delivery.metadata?.shipping_fee || 
                              0;
      totalRevenue += deliveryRevenue;
    });
    
    // Calculate rates
    const onTimeRate = completedDeliveries > 0
      ? parseFloat(((onTimeDeliveries / completedDeliveries) * 100).toFixed(1))
      : 0;
      
    const avgDeliveryTime = completedDeliveries > 0
      ? parseFloat((totalDeliveryTime / completedDeliveries).toFixed(1))
      : 0;
    
    const metrics: DeliveryMetrics = {
      totalDeliveries,
      completedDeliveries,
      onTimeRate,
      avgDeliveryTime,
      totalRevenue,
      pendingDeliveries,
      cancelledDeliveries,
      inTransitDeliveries,
    };
    
    // Calculate trends if date range is provided
    if (dateFrom && dateTo) {
      metrics.trends = await calculateTrends(metrics, options);
    }
    
    return {
      success: true,
      data: metrics,
    };
  } catch (error) {
    console.error("Error calculating delivery metrics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate delivery metrics",
    };
  }
}

// Function to get available drivers/riders for filtering
export async function getAvailableDrivers(): Promise<{ id: string; name: string; email?: string; phone?: string }[]> {
  try {

    const url = `/api/deliveries`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Don't cache to ensure fresh data
    });
    

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
        let deliveries = result.deliveries || [];

    // Extract unique drivers from deliveries
    const driversMap = new Map();
    
    (deliveries || []).forEach((delivery: DeliveryDTO) => {
      if (delivery.driver_id && delivery.driver) {
        driversMap.set(delivery.driver_id, {
          id: delivery.driver_id,
          name: delivery.driver?.full_name || delivery.driver?.name || `Driver ${delivery.driver_id.slice(-6)}`,
          email: delivery.driver?.email,
          phone: delivery.driver?.phone,
        });
      }
    });
    
    return Array.from(driversMap.values());
  } catch (error) {
    console.log(error, 'ERRRR')
    console.error("Failed to fetch drivers:", error);
    return [];
  }
}