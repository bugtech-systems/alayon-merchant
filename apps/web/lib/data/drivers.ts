"use server"


import { sdk } from "@/lib/config";
import { DriverDTO } from "@/lib/types";
import { getAuthHeaders, getCacheHeaders } from "./cookies";


// Types
export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  activeDeliveries: number;
  status: "available" | "busy" | "offline";
  assignedOrders: number;
  location: string;
}

export interface DriverAssignmentResponse {
  success: boolean;
  message: string;
  data?: {
    orderId: string;
    driverId: string;
    driverName: string;
    assignedAt: string;
  };
}

export async function retrieveDriver(driverId: string): Promise<DriverDTO> {
  const {
    driver,
  }: {
    driver: DriverDTO;
  } = await sdk.client.fetch(`/store/drivers/${driverId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders("drivers")),
    } as any,
  });

  return driver;
}


export async function retrieveDriverStocks(customerId: any, locationId: string): Promise<any> {
  console.log(customerId, locationId, 'rettrr')
      const headers = await getAuthHeaders();
 
  const queryParams = new URLSearchParams();
    if (customerId) queryParams.append("customer_id", customerId);
    if (locationId) queryParams.append("stock_location_id", locationId);
    const url = `/dashboard/drivers/stocks-progress?${queryParams.toString()}`;
    
    const response = await sdk.client.fetch(url, {
      method: "GET",
      headers,
    });


  // const stocksData = await sdk.client.fetch(`/dashboard/drivers/stocks-progress?${queryParams.toString()}`, {
  //   method: "GET",
  //   headers: {
  //     ...(await getAuthHeaders()),
  //     // ...(await getCacheHeaders("stocks")),
  //   } as any,
  // });


  console.log(response, 'STOCKS')
  return response;
}

// lib/data.ts



// Fetch all available drivers
export async function fetchAvailableDrivers(locationId?: string): Promise<Driver[]> {
  try {
    const queryParams = new URLSearchParams();
    if (locationId) {
      queryParams.append('location_id', locationId);
    }
    
    const response = await sdk.client.fetch(`/dashboard/company/drivers?${queryParams.toString()}`);
    return response.data?.drivers || [];
  } catch (error) {
    console.error("Error fetching drivers:", error);
    throw error;
  }
}

// Fetch driver by ID
export async function fetchDriverById(driverId: string): Promise<Driver | null> {
  try {
    const response = await sdk.client.fetch(`/store/drivers/${driverId}`);
    return response.data?.driver || null;
  } catch (error) {
    console.error(`Error fetching driver ${driverId}:`, error);
    return null;
  }
}

// Assign driver to order
export async function assignDriverToOrder(
  orderId: string,
  driverId: string | null
): Promise<DriverAssignmentResponse> {
  try {
    const response = await sdk.client.fetch(`/store/orders/${orderId}/assign-driver`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response;
  } catch (error) {
    console.error(`Error assigning driver ${driverId} to order ${orderId}:`, error);
    throw error;
  }
}

// Get current driver assignment for an order
export async function getOrderDriver(orderId: string): Promise<Driver | null> {
  try {
    const response = await sdk.client.fetch(`/store/orders/${orderId}/driver`);
    return response.data?.driver || null;
  } catch (error) {
    console.error(`Error fetching driver for order ${orderId}:`, error);
    return null;
  }
}