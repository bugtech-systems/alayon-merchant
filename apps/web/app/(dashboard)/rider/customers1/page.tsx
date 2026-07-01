// app/customers/page.tsx (Server Component)
import { Suspense } from 'react';
import { CustomersClient } from '@/components/customers/customers-client';
import { listCustomerGroupCustomers } from '@/lib/data/customer';
import { CustomerTableSkeleton } from '@/components/ui/table-skeleton';
import { retrieveUser } from '@/lib/data';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort?: string;
    order?: string;
    search?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await retrieveUser()
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const sortField = params.sort || 'created_at';
  const sortOrder = (params.order || 'desc') as 'asc' | 'desc';
  const searchTerm = params.search || '';
  
    console.log(user, 'USER')
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;
    console.log(user, 'USER', customerGroupId)

  // Extract filters from search params (excluding pagination/sort params)
  const filters: Record<string, any> = {};
  const excludeParams = ['page', 'limit', 'sort', 'order', 'search'];
  Object.keys(params).forEach(key => {
    if (!excludeParams.includes(key) && params[key]) {
      filters[key] = params[key];
    }
  });

  // Fetch initial data on the server
  const initialData = await listCustomerGroupCustomers(customerGroupId);


  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-2">
          Manage and view all your customers
        </p>
      </div>

      <Suspense fallback={<CustomerTableSkeleton />}>
        <CustomersClient 
          initialData={initialData}
          initialPage={page}
          initialLimit={limit}
          initialSort={sortField}
          initialOrder={sortOrder}
          initialSearch={searchTerm}
          initialFilters={filters}
        />
      </Suspense>
    </div>
  );
}