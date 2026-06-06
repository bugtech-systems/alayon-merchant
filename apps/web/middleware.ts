// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_REGION = "ph";

// Dynamic routes - these will NEVER be treated as country codes
const DYNAMIC_ROUTES = new Set([
  "store",
  "merchant",
  "user",
  "shop",
  "products",
  "admin",
  "api",
  "auth",
  "cart",
  "checkout",
  "account",
  "categories",
  "search",
  "leo",
  "your-order",
  "pos"
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }
  
  // Get region from cookie only - NO URL path checking
  let userRegion = request.cookies.get("user_region")?.value;
  
  // Set default region if not exists
  if (!userRegion) {
    userRegion = DEFAULT_REGION;
  }
  
  // Create response
  const response = NextResponse.next();
  
  // Set/update cookie only if needed (prevents unnecessary writes)
  if (!request.cookies.get("user_region")?.value) {
    response.cookies.set("user_region", DEFAULT_REGION, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  
  // Add headers for Medusa SDK
  response.headers.set("x-user-region", userRegion);
  response.headers.set("x-medusa-region", userRegion);
  response.headers.set("x-medusa-region-handled", "true");
  
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};