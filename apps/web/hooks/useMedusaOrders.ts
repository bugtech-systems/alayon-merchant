// hooks/useMedusaOrders.ts
import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies";
import { HttpTypes } from "@medusajs/types";
import medusaError from "@/lib/util/medusa-error";
import { listOrders } from "@/lib/data/orders";
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

interface UseMedusaOrdersParams {
  limit?: number;
  offset?: number;
  q?: string;
  order?: string;
  status?: string[];
  email?: string;
  created_at?: {
    gte?: string;
    lte?: string;
  };
}

export function useMedusaOrders(params: UseMedusaOrdersParams) {

 

  return useQuery({
    queryKey: ["medusa-orders", params],
    queryFn: async () => {
        let { limit, offset} = params;
      const headers = {
      ...(await getAuthHeaders()),
    }
  
    const next = {
      ...(await getCacheOptions("orders")),
    }


      const response = await listOrders();
      return response;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}