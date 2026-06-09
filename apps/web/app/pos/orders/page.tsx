// app/orders/page.tsx (Server Component)
import { Suspense } from 'react';
import { OrdersClient } from '@/components/orders/orders-client';
import { listOrders } from '@/lib/data/orders';
import { OrderTableSkeleton } from '@/components/ui/table-skeleton';
import { retrieveUser } from '@/lib/data';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort?: string;
    order?: string;
    search?: string;
    status?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await retrieveUser();
  
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const sortField = params.sort || 'created_at';
  const sortOrder = (params.order || 'desc') as 'asc' | 'desc';
  const searchTerm = params.search || '';
  const statusFilter = params.status || '';
  
  // Get customer group ID based on user role
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;

  // Extract filters from search params
  const filters: Record<string, any> = {};
  const excludeParams = ['page', 'limit', 'sort', 'order', 'search', 'status'];
  Object.keys(params).forEach(key => {
    if (!excludeParams.includes(key) && params[key]) {
      filters[key] = params[key];
    }
  });

  // Add status filter if present
  if (statusFilter) {
    filters.status = statusFilter;
  }

  // Fetch initial data on the server
  const initialData = await listOrders({
    limit,
    offset: (page - 1) * limit,
    order: `${sortField} ${sortOrder.toUpperCase()}`,
    q: searchTerm,
    ...filters,
    customer_group_id: customerGroupId
  });

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track all customer orders
        </p>
      </div>

      <Suspense fallback={<OrderTableSkeleton />}>
        <OrdersClient 
          initialData={initialData}
          initialPage={page}
          initialLimit={limit}
          initialSort={sortField}
          initialOrder={sortOrder}
          initialSearch={searchTerm}
          initialFilters={filters}
          initialStatus={statusFilter}
        />
      </Suspense>
    </div>
  );
}