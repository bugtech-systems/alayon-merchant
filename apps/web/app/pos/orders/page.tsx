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
    [key: string]: string | undefined;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await retrieveUser();
  
  // Parse pagination
  const limit = parseInt(params.limit || '10');
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
  
  // Seller filter based on user role
  if (user && user?.id) {
    filters.seller_id = user.id;
   
  }
   if(user?.employee?.company?.id){
    filters.company_id = user?.employee?.company?.id;
   }
  // Customer group filter based on user role
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;
  
  // if (customerGroupId) {
  //   filters.customer_group_id = customerGroupId;
  // }
  
  // Additional dynamic filters from URL (exclude known params)
  const excludeParams = ['page', 'limit', 'sort_field', 'sort_order', 'search', 'status', 
                         'date_from', 'date_to', 'min_total', 'max_total', 'payment_status', 'customer_id'];
  Object.keys(params).forEach(key => {
    if (!excludeParams.includes(key) && params[key]) {
      filters[key] = params[key];
    }
  });

  if(user){
    filters.seller_id = user?.id
  }

  // Fetch initial data on the server
  const initialData = await listOrders(limit, offset, filters);
console.log(initialData, 'inittials')
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage and track all customer orders
        </p>
      </div>

      <Suspense fallback={<OrderTableSkeleton />}>
        <OrdersClient 
          initialData={initialData}
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
        />
      </Suspense>
    </div>
  );
}