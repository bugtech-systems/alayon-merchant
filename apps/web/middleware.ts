import { NextRequest, NextResponse } from "next/server";

// Your default region (Philippines) - used as fallback only
const DEFAULT_REGION = "ph";

// Reserved paths that should NOT be treated as region/country codes
const RESERVED_PATHS = new Set([
  "admin",
  "leo",
  "api",
  "auth",
  "checkout",
  "account",
  "cart",
  "collections",
  "products",
  "categories",
  "search",
  "orders",
  "order",
  "payment",
  "store",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "images",
  "icons",
  "fonts"
]);

// Valid country codes (ISO 3166-1 alpha-2)
// You can expand this list based on your Medusa regions
const VALID_COUNTRIES = new Set([
  "ph", "us", "gb", "ca", "au", "de", "fr", "jp", "cn", "in"
  // Add more as needed
]);

async function setCacheId(request: NextRequest, response: NextResponse) {
  const cacheId = request.cookies.get("_medusa_cache_id")?.value;

  if (cacheId) {
    return cacheId;
  }

  const newCacheId = crypto.randomUUID();
  response.cookies.set("_medusa_cache_id", newCacheId, {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return newCacheId;
}

function shouldSkipMiddleware(pathname: string): boolean {
  // Skip static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return true;
  }
  
  // Skip reserved paths that shouldn't be treated as country codes
  const firstPathSegment = pathname.split("/")[1];
  if (firstPathSegment && RESERVED_PATHS.has(firstPathSegment)) {
    return true;
  }
  
  return false;
}

function isValidCountryCode(code: string): boolean {
  return VALID_COUNTRIES.has(code.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets, API routes, and reserved paths
  if (shouldSkipMiddleware(pathname)) {
    return response;
  }

  // Set the cache ID header
  const cacheId = await setCacheId(request, response);
  response.headers.set("x-medusa-cache-id", cacheId);

  // Get user's stored region preference
  let userRegion = request.cookies.get("user_region")?.value;
  
  // Parse the URL to check for Medusa's default region/country handling
  const pathSegments = pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0];
  
  // Check if the first path segment is a valid country code
  const hasValidCountryInPath = firstSegment && isValidCountryCode(firstSegment);
  
  // Medusa's default behavior: if there's a valid country in the path, use that as region
  if (hasValidCountryInPath) {
    // Medusa will handle the region resolution based on the country in path
    // Just ensure the user_region cookie matches this preference
    if (userRegion !== firstSegment) {
      response.cookies.set("user_region", firstSegment, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
    
    // Add region info to headers
    response.headers.set("x-user-region", firstSegment);
  } else {
    // No country in path - Medusa will use default region
    // Set PH as the default region for the store (cookie-only, not in URL)
    if (!userRegion) {
      userRegion = DEFAULT_REGION;
      response.cookies.set("user_region", userRegion, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
    
    // Add region info to headers (PH by default)
    response.headers.set("x-user-region", userRegion || DEFAULT_REGION);
    
    // IMPORTANT: Do NOT rewrite or redirect - let Medusa handle the default region
    // Medusa will internally use the user_region cookie to determine pricing,
    // shipping options, and available countries
  }

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
};