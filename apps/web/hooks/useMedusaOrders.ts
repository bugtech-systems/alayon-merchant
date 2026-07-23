// hooks/useMedusaOrders.ts
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies";
import { listOrders, listPosOrders } from "@/lib/data/orders";
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

interface UseMedusaOrdersParams {
  limit?: number;
  offset?: number;
  q?: string;
  order?: string;
  status?: string[];
  email?: string;
  filters?: any;
  created_at?: {
    gte?: string;
    lte?: string;
  };
}

export function useMedusaOrders(params: UseMedusaOrdersParams) {


  return useQuery({
    queryKey: ["medusa-orders", params],
    queryFn: async () => {
        let { limit, offset, filters} = params;
      const response = await listOrders(limit, offset, filters);
      return response;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export function usePosOrders(params: UseMedusaOrdersParams) {

 

  return useQuery({
    queryKey: ["pos-orders", params],
    queryFn: async () => {
        let { limit, offset} = params;
      const response = await listPosOrders(limit, offset, params.filters);
      return response;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}