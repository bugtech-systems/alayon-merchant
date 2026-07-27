// app/transactions/page.tsx

import { Suspense } from 'react';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { retrieveUser } from '@/lib/data';
import { listTransactions } from '@/lib/actions/transactions';
import { OrderTableSkeleton } from '@/components/ui/table-skeleton';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    type?: string;
    group?: string;
    category?: string;
    transactionType?: string; // New: expense, capital, payroll, revenue, adjustment
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
    status?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await retrieveUser();

  const limit = parseInt(params.limit || '10000');
  const page = parseInt(params.page || '1');
  const offset = (page - 1) * limit;

  const filters: Record<string, any> = {};
  
  // Search and basic filters
  if (params.search) filters.search = params.search;
  if (params.type && params.type !== 'all') filters.type = params.type;
  if (params.group && params.group !== 'all') filters.group_id = params.group;
  if (params.category && params.category !== 'all') filters.category_id = params.category;
  
  // Enhanced transaction type filter
  if (params.transactionType && params.transactionType !== 'all') {
    filters.transaction_type = params.transactionType;
  }
  
  // Date range filters
  if (params.dateFrom) filters.date_from = params.dateFrom;
  if (params.dateTo) filters.date_to = params.dateTo;
  
  // Amount range filters
  if (params.minAmount) filters.min_amount = parseFloat(params.minAmount);
  if (params.maxAmount) filters.max_amount = parseFloat(params.maxAmount);
  
  // Status filter
  if (params.status && params.status !== 'all') filters.status = params.status;

  // Company and user filters
  if (user?.employee?.company?.id) {
    filters.company_id = user.employee.company.id;
  }

  if (user?.id) {
    filters.customer_id = user?.id;
  }

  const initialData = await listTransactions(limit, offset, filters);

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<OrderTableSkeleton />}>
        <TransactionsClient 
          initialData={initialData} 
          user={user} 
          filters={filters}
        />
      </Suspense>
    </div>
  );
}