// components/orders/orders-client-wrapper.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { OrdersClient } from '@/components/orders/orders-client';
import { listOrders, listDraftOrders, listPosOrders } from '@/lib/data/orders';
import { OrderTableSkeleton } from '@/components/ui/table-skeleton';

interface OrdersClientWrapperProps {
  initialPage: number;
  initialLimit: number;
  initialSortField: string;
  initialSortOrder: 'asc' | 'desc';
  initialSearch: string;
  initialStatus: string;
  initialPaymentStatus: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialMinTotal: string;
  initialMaxTotal: string;
  initialCustomerId: string;
  user: any;
  initialOrderType: 'orders' | 'drafts';
  filters: Record<string, any>;
  limit: number;
  offset: number;
}

export function OrdersClientWrapper({
  initialPage,
  initialLimit,
  initialSortField,
  initialSortOrder,
  initialSearch,
  initialStatus,
  initialPaymentStatus,
  initialDateFrom,
  initialDateTo,
  initialMinTotal,
  initialMaxTotal,
  initialCustomerId,
  user,
  initialOrderType,
  filters,
  limit,
  offset
}: OrdersClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orderType, setOrderType] = useState<'orders' | 'drafts'>(initialOrderType);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [draftsData, setDraftsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data for both tabs
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [ordersResult, draftsResult] = await Promise.all([
          listPosOrders(limit, offset, filters),
          listDraftOrders(limit, offset, filters)
        ]);


        setOrdersData(ordersResult);
        setDraftsData(draftsResult);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [limit, offset, filters]);

  const handleTabChange = (value: string) => {
    const newType = value as 'orders' | 'drafts';
    setOrderType(newType);
    
    // Update URL with new type
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', newType);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (loading && !ordersData && !draftsData) {
    return <OrderTableSkeleton />;
  }

  const currentData = orderType === 'orders' ? ordersData : draftsData;
console.log(currentData, 'currrnt', filters)
  return (
    <Tabs value={orderType} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="orders">
          Regular Orders
        </TabsTrigger>
        <TabsTrigger value="drafts">
          Draft Orders
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="orders">
        {currentData && (
          <OrdersClient 
            initialData={currentData}
            initialPage={initialPage}
            initialLimit={initialLimit}
            initialSortField={initialSortField}
            initialSortOrder={initialSortOrder}
            initialSearch={initialSearch}
            initialStatus={initialStatus}
            initialPaymentStatus={initialPaymentStatus}
            initialDateFrom={initialDateFrom}
            initialDateTo={initialDateTo}
            initialMinTotal={initialMinTotal}
            initialMaxTotal={initialMaxTotal}
            initialCustomerId={initialCustomerId}
            user={user}
            orderType="orders"
          />
        )}
      </TabsContent>
      
      <TabsContent value="drafts">
        {currentData && (
          <OrdersClient 
            initialData={currentData}
            initialPage={initialPage}
            initialLimit={initialLimit}
            initialSortField={initialSortField}
            initialSortOrder={initialSortOrder}
            initialSearch={initialSearch}
            initialStatus={initialStatus}
            initialPaymentStatus={initialPaymentStatus}
            initialDateFrom={initialDateFrom}
            initialDateTo={initialDateTo}
            initialMinTotal={initialMinTotal}
            initialMaxTotal={initialMaxTotal}
            initialCustomerId={initialCustomerId}
            user={user}
            orderType="drafts"
          />
        )}
      </TabsContent>
    </Tabs>
  );
}