// app/orders/page.tsx (Server Component)
import { Suspense } from 'react';
import { OrdersClient } from '@/components/orders/orders-client';
import { OrderTableSkeleton } from '@/components/ui/table-skeleton';
import { retrieveUser } from '@/lib/data';

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
  
  // Parse initial params for client component
  const limit = parseInt(params.limit || '1000');
  const page = parseInt(params.page || '1');
  const sortField = params.sort_field || 'created_at';
  const sortOrder = (params.sort_order || 'desc') as 'asc' | 'desc';
  
  // Build filters object for initial state
  const filters: Record<string, any> = {};
  
  if (params.search) filters.search = params.search;
  if (params.status && params.status !== 'all') filters.status = params.status;
  if (params.payment_status && params.payment_status !== 'all') filters.payment_status = params.payment_status;
  if (params.date_from) filters.date_from = params.date_from;
  if (params.date_to) filters.date_to = params.date_to;
  if (params.min_total) filters.min_total = parseFloat(params.min_total);
  if (params.max_total) filters.max_total = parseFloat(params.max_total);
  if (params.customer_id) filters.customer_id = params.customer_id;
  
  if (user?.id) {
    filters.seller_id = user.id;
  }

  // Don't fetch data here - pass initial filters to client
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
          initialFilters={filters}
          initialPage={page}
          initialLimit={limit}
          initialSortField={sortField}
          initialSortOrder={sortOrder}
          user={user}
          orderType={orderType}
        />
      </Suspense>
    </div>
  );
}