// hooks/useMedusaShippingOptions.ts
import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";

interface UseMedusaShippingOptionsParams {
  limit?: number;
  offset?: number;
  region_id?: string;
}

export function useMedusaShippingOptions(params: UseMedusaShippingOptionsParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.region_id) queryParams.append('region_id', params.region_id);
  
  return useQuery({
    queryKey: ["medusa-shipping-options", params],
    queryFn: async () => {
      const response = await sdk.client.fetch(
        `/admin/shipping-options?${queryParams.toString()}`,
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