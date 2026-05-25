// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_REGION = "ph";

// Your dynamic route prefixes - these will NEVER be treated as country codes
const DYNAMIC_ROUTES = new Set([
  "store",      // for /[storeId]
  "merchant",   // for /[merchantId] 
  "user",       // for /[userId]
  "shop",       // for /[shopId]
  // Add all your dynamic route prefixes here
  "products",
  "admin",
  "leo",
  "api",
  "auth",
  "your-order",
  "_next",
]);

// Valid country codes (if you ever want to use them)
const VALID_COUNTRIES = new Set([
  "ph", "us", "gb", "ca", "au", "de", "fr", "jp", "cn", "in"
]);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  
  // Get first path segment
  const firstSegment = pathname.split("/")[1];
  
  // Check if this is a dynamic route (NOT a country)
  if (firstSegment && DYNAMIC_ROUTES.has(firstSegment)) {
    // Still set region cookie if not exists
    const userRegion = request.cookies.get("user_region")?.value;
    if (!userRegion) {
      response.cookies.set("user_region", DEFAULT_REGION, {
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
    
    // Add headers for SDK
    response.headers.set("x-user-region", userRegion || DEFAULT_REGION);
    response.headers.set("x-medusa-region-handled", "true");
    
    return response;
  }
  
  // Handle root path or actual country paths
  const userRegion = request.cookies.get("user_region")?.value;
  
  if (!userRegion) {
    response.cookies.set("user_region", DEFAULT_REGION, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  
  response.headers.set("x-user-region", userRegion || DEFAULT_REGION);
  response.headers.set("x-medusa-region-handled", "true");
  
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
};