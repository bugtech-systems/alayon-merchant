// app/api/deliveries/route.ts
import { getAuthHeaders } from "@/lib/data/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";
    const delivery_status = searchParams.get("delivery_status");
    const driver_id = searchParams.get("driver_id");
    
    // Build query string for Medusa backend
    const queryParams = new URLSearchParams();
    queryParams.set("limit", limit);
    queryParams.set("offset", offset);
    
    if (delivery_status) {
      queryParams.set("delivery_status", delivery_status);
    }
    
    if (driver_id) {
      queryParams.set("driver_id", driver_id);
    }
    
    // Get Medusa backend URL from environment
    const medusaBackendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
    const url = `${medusaBackendUrl}/dashboard/deliveries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log("Proxying request to:", url);
    
    // Forward request to Medusa backend
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward any authorization headers if needed
        ...(await getAuthHeaders())
      },
    });

    
    if (!response.ok) {
      throw new Error(`Medusa backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch deliveries",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    }
  );
}