// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { HttpTypes } from "@medusajs/types";

// ---------- Configuration ----------
const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const DEFAULT_COUNTRY = "ph";            // fallback country code
const DEFAULT_CURRENCY = "php";          // fallback currency

// Dynamic route prefixes – these will NEVER be treated as country codes
const DYNAMIC_ROUTES = new Set([
  "store", "merchant", "user", "shop", "products", "checkout",
  "cart", "admin", "leo", "api", "auth", "your-order", "pos", "_next"
]);

// Cache for Medusa regions
let regionCache: {
  countryToRegion: Map<string, HttpTypes.StoreRegion>;
  regionIdToRegion: Map<string, HttpTypes.StoreRegion>;
  lastUpdated: number;
} = {
  countryToRegion: new Map(),
  regionIdToRegion: new Map(),
  lastUpdated: 0,
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ---------- Helper: Fetch regions from Medusa ----------
async function fetchRegionMap(): Promise<{
  countryToRegion: Map<string, HttpTypes.StoreRegion>;
  regionIdToRegion: Map<string, HttpTypes.StoreRegion>;
}> {
  if (!BACKEND_URL) {
    throw new Error("MEDUSA_BACKEND_URL is not defined");
  }

  const response = await fetch(`${BACKEND_URL}/store/regions`, {
    headers: PUBLISHABLE_API_KEY
      ? { "x-publishable-api-key": PUBLISHABLE_API_KEY }
      : {},
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.statusText}`);
  }

  const { regions }: { regions: HttpTypes.StoreRegion[] } = await response.json();

  const countryToRegion = new Map<string, HttpTypes.StoreRegion>();
  const regionIdToRegion = new Map<string, HttpTypes.StoreRegion>();

  for (const region of regions) {
    regionIdToRegion.set(region.id, region);
    for (const country of region.countries || []) {
      if (country.iso_2) {
        countryToRegion.set(country.iso_2.toLowerCase(), region);
      }
    }
  }

  return { countryToRegion, regionIdToRegion };
}

async function getRegionCache(): Promise<{
  countryToRegion: Map<string, HttpTypes.StoreRegion>;
  regionIdToRegion: Map<string, HttpTypes.StoreRegion>;
}> {
  const now = Date.now();
  if (now - regionCache.lastUpdated > CACHE_TTL_MS) {
    try {
      const fresh = await fetchRegionMap();
      regionCache = { ...fresh, lastUpdated: now };
    } catch (error) {
      console.error("Proxy: Failed to refresh region cache", error);
      if (regionCache.countryToRegion.size === 0) throw error;
    }
  }
  return {
    countryToRegion: regionCache.countryToRegion,
    regionIdToRegion: regionCache.regionIdToRegion,
  };
}

// ---------- Determine country code (NO URL path inspection) ----------
function detectCountryCode(request: NextRequest): string {
  // 1. Cookie (previous region selection)
  const cookieRegionId = request.cookies.get("medusa_region_id")?.value;
  if (cookieRegionId && regionCache.regionIdToRegion.has(cookieRegionId)) {
    const region = regionCache.regionIdToRegion.get(cookieRegionId)!;
    const primaryCountry = region.countries?.[0]?.iso_2;
    if (primaryCountry) return primaryCountry.toLowerCase();
  }

  // 2. Vercel geolocation (if deployed on Vercel)
  const geoCountry = request.headers.get("x-vercel-ip-country")?.toLowerCase();
  if (geoCountry && regionCache.countryToRegion.has(geoCountry)) {
    return geoCountry;
  }

  // 3. Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0].split("-")[1]?.toLowerCase();
    if (preferred && regionCache.countryToRegion.has(preferred)) {
      return preferred;
    }
  }

  // 4. Default
  return DEFAULT_COUNTRY;
}

// ---------- Proxy (Middleware renamed) ----------
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CRITICAL FIX: Immediately return for static assets - NO processing
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Create base response
  let response = NextResponse.next();

  try {
    const { countryToRegion, regionIdToRegion } = await getRegionCache();
    
    // Check if this is a dynamic route that shouldn't trigger region detection
    const firstSegment = pathname.split("/")[1];
    const isDynamicRoute = firstSegment && DYNAMIC_ROUTES.has(firstSegment);
    
    // For dynamic routes, only set minimal cookies if they don't exist
    if (isDynamicRoute) {
      const existingRegionId = request.cookies.get("medusa_region_id")?.value;
      if (!existingRegionId) {
        const defaultRegion = countryToRegion.get(DEFAULT_COUNTRY);
        if (defaultRegion) {
          response.cookies.set("medusa_region_id", defaultRegion.id, {
            maxAge: 30 * 24 * 60 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
          response.cookies.set("medusa_currency_code", defaultRegion.currency_code, {
            maxAge: 30 * 24 * 60 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        }
      }
      
      // Set headers without refreshing
      response.headers.set("x-medusa-region-handled", "true");
      return response;
    }
    
    // Normal path - resolve region from country
    const countryCode = detectCountryCode(request);
    const region = countryToRegion.get(countryCode);
    
    // Get current cookies to check if we need to update
    const currentRegionId = request.cookies.get("medusa_region_id")?.value;
    const currentCurrency = request.cookies.get("medusa_currency_code")?.value;
    
    if (region) {
      // Only set cookies if they've changed or don't exist
      if (currentRegionId !== region.id) {
        response.cookies.set("medusa_region_id", region.id, {
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      
      if (currentCurrency !== region.currency_code) {
        response.cookies.set("medusa_currency_code", region.currency_code, {
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
    } else {
      // Fallback to any region if country not found
      console.warn(`No region found for country: ${countryCode}`);
      const fallbackRegion = regionIdToRegion.values().next().value;
      if (fallbackRegion && !currentRegionId) {
        response.cookies.set("medusa_region_id", fallbackRegion.id, {
          maxAge: 30 * 24 * 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
    }
    
    // Set response headers
    response.headers.set("x-medusa-region-handled", "true");
    response.headers.set("x-medusa-country", countryCode);
    
  } catch (error) {
    console.error("Proxy region resolution error:", error);
    response.headers.set("x-medusa-region-handled", "error");
  }
  
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};