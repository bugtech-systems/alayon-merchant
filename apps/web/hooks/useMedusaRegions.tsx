// hooks/useMedusaRegions.ts
import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";

interface UseMedusaRegionsParams {
  limit?: number;
  offset?: number;
}

export function useMedusaRegions(params: UseMedusaRegionsParams = {}) {
  return useQuery({
    queryKey: ["medusa-regions", params],
    queryFn: async () => {
      const response = await sdk.client.fetch(
        `/admin/regions?limit=${params.limit || 100}&offset=${params.offset || 0}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}