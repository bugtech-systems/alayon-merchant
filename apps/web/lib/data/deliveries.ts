import { sdk } from "../medusa/config";
import { DeliveryDTO } from "../types";
import { getAuthHeaders, getCacheHeaders } from "./cookies";


interface ListDeliveriesOptions {
  filter?: Record<string, string>;
  includeDriverId?: boolean;
  statuses?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}


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
          ...getAuthHeaders(),
          ...getCacheHeaders("deliveries"), // Cache for 30 seconds
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
