// app/orders/page.tsx (Server Component)
import { Suspense } from 'react';
import { OrdersClient } from '@/components/orders/orders-client';
import { OrderTableSkeleton } from '@/components/ui/table-skeleton';
import { retrieveUser } from '@/lib/data';
import {  listOrders } from '@/lib/data/orders';
import { sortOrders } from '@/lib/utils/helpers';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort_field?: string;
    sort_order?: string;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    min_total?: string;
    max_total?: string;
    payment_status?: string;
    customer_id?: string;
    type?: 'orders' | 'drafts';
    [key: string]: string | undefined;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await retrieveUser();
  const orderType = params.type || 'orders';
  
  // Parse pagination
  const limit = parseInt(params.limit || '1000');
  const page = parseInt(params.page || '1');
  const offset = (page - 1) * limit;
  
  // Parse sorting
  const sortField = params.sort_field || 'created_at';
  const sortOrder = (params.sort_order || 'desc') as 'asc' | 'desc';
  
  // Build filters object
  const filters: Record<string, any> = {};
  
  // Search filter
  if (params.search) {
    filters.search = params.search;
  }
  
  // Status filter
  if (params.status && params.status !== 'all') {
    filters.status = params.status;
  }
  
  // Payment status filter
  if (params.payment_status && params.payment_status !== 'all') {
    filters.payment_status = params.payment_status;
  }
  
  // Date range filters
  if (params.date_from) {
    filters.date_from = params.date_from;
  }
  if (params.date_to) {
    filters.date_to = params.date_to;
  }
  
  // Total amount range filters
  if (params.min_total) {
    filters.min_total = parseFloat(params.min_total);
  }
  if (params.max_total) {
    filters.max_total = parseFloat(params.max_total);
  }
  
  // Customer filter
  if (params.customer_id) {
    filters.customer_id = params.customer_id;
  }
  
  // if(user?.employee?.company?.id){
  //   filters.company = user?.employee?.company?.id;
  // }




  

  if (user?.id) {
    filters.seller_id = user?.id; 
  } 


  // Fetch initial data based on order type
  let initialOrders = await listOrders(limit, offset, filters);
  let initialData = sortOrders(initialOrders.orders, 'created_at', 'desc')

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Orders Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage customer orders and create draft orders
        </p>
      </div>

      <Suspense fallback={<OrderTableSkeleton />}>
        <OrdersClient 
          initialData={{...initialOrders, orders: initialData}}
          initialPage={page}
          initialLimit={limit}
          initialSortField={sortField}
          initialSortOrder={sortOrder}
          initialSearch={params.search || ''}
          initialStatus={params.status || 'all'}
          initialPaymentStatus={params.payment_status || 'all'}
          initialDateFrom={params.date_from || ''}
          initialDateTo={params.date_to || ''}
          initialMinTotal={params.min_total || ''}
          initialMaxTotal={params.max_total || ''}
          initialCustomerId={params.customer_id || ''}
          user={user}
          orderType={orderType}
        />
      </Suspense>
    </div>
  );
}