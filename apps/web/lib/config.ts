// lib/medusa-client.ts
import Medusa from "@medusajs/js-sdk"

let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

// Simple singleton without complex interception
class MedusaClient {
  private static instance: Medusa;
  private static currentRegion: string = "ph";

  static getInstance(region?: string) {
    const targetRegion = region || this.currentRegion;
    
    // Create new instance if region changed or no instance exists
    if (!this.instance || (region && region !== this.currentRegion)) {
      if (region) {
        this.currentRegion = region;
      }
      
      this.instance = new Medusa({
        baseUrl: MEDUSA_BACKEND_URL,
        debug: process.env.NODE_ENV === "development",
        publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      });
    }
    
    return this.instance;
  }

  static getRegion() {
    return this.currentRegion;
  }

  static setRegion(region: string) {
    if (region !== this.currentRegion) {
      this.currentRegion = region;
      // Reset instance to force new client with new region
      this.instance = undefined;
      // Update cookie on client-side only
      if (typeof window !== 'undefined') {
        document.cookie = `user_region=${region}; path=/; max-age=${60 * 60 * 24 * 30}`;
      }
    }
  }
}

// Export singleton instance
export const sdk = MedusaClient.getInstance();

// Export helper functions
export const getMedusaClient = (region?: string) => {
  return MedusaClient.getInstance(region);
};

// Client-side helper to sync region
export const syncRegion = () => {
  if (typeof window === 'undefined') return;
  
  const getCookie = (name: string) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };
  
  const cookieRegion = getCookie('user_region');
  if (cookieRegion && cookieRegion !== MedusaClient.getRegion()) {
    MedusaClient.setRegion(cookieRegion);
  }
};

export default sdk;