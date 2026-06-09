// components/customers/customers-client.tsx
'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CustomerForm } from './customer-form';
import { CustomerView } from './customer-view';
import { updateCustomer, deleteCustomer } from '@/lib/actions/customer';

// Table configuration with column visibility
const customerTableConfig: TableConfig = {
  pageSize: 10,
  enableSearch: true,
  enableColumnVisibility: true,
  sortField: 'created_at',
  sortOrder: 'desc',
  columns: [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      searchable: true,
      visible: false, // Hidden by default
      width: '100px',
      render: (value) => (
        <span className="font-mono text-xs">{value?.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      searchable: true,
      visible: true,
    },
    {
      key: 'first_name',
      header: 'First Name',
      sortable: true,
      searchable: true,
      visible: true,
      render: (value, row) => value || row.last_name || '—',
    },
    {
      key: 'last_name',
      header: 'Last Name',
      sortable: true,
      searchable: true,
      visible: true,
      render: (value) => value || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      searchable: true,
      visible: true,
      render: (value) => value || '—',
    },
    {
      key: 'has_account',
      header: 'Account',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Registered' : 'Guest'}
        </Badge>
      ),
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => value?.length || 0,
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => value ? format(new Date(value), 'MMM dd, yyyy') : '—',
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      sortable: true,
      searchable: false,
      visible: false, // Hidden by default
      render: (value) => value ? format(new Date(value), 'MMM dd, yyyy') : '—',
    },
  ],
};

interface CustomersClientProps {
  initialData?: {
    customers: any[];
    count: number;
  };
  initialPage: number;
  initialLimit: number;
  initialSort: string;
  initialOrder: 'asc' | 'desc';
  initialSearch: string;
  initialFilters: Record<string, any>;
}

export function CustomersClient({
  initialData,
  initialPage,
  initialLimit,
  initialSort,
  initialOrder,
  initialSearch,
  initialFilters,
}: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Local state for dialogs and optimistic updates
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customers, setCustomers] = useState(initialData.customers);
  const [total, setTotal] = useState(initialData.count);

  // Update URL with new params
  const updateUrlParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  // Handle sort change
  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    updateUrlParams({ sort: field, order, page: 1 });
  };

  // Handle search change
  const handleSearchChange = (term: string) => {
    updateUrlParams({ search: term || null, page: 1 });
  };

  // Handle view customer
  const handleView = (customer: any) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  // Handle edit customer
  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setEditDialogOpen(true);
  };

  // Handle delete customer with optimistic update
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    
    // Optimistic update
    const previousCustomers = [...customers];
    setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
    setTotal(total - 1);
    setDeleteDialogOpen(false);
    
    try {
      const result = await deleteCustomer(selectedCustomer.id);
      if (result.success) {
        toast.success('Customer deleted successfully');
        // Refresh the page data to ensure consistency
        refreshData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback on error
      setCustomers(previousCustomers);
      setTotal(total);
      toast.error('Failed to delete customer');
      console.error('Error deleting customer:', error);
    }
  };

  // Handle update customer with optimistic update
  const handleUpdateCustomer = async (data: Partial<any>) => {
    if (!selectedCustomer) return;
    
    // Optimistic update
    const previousCustomers = [...customers];
    const updatedCustomers = customers.map(c => 
      c.id === selectedCustomer.id ? { ...c, ...data } : c
    );
    setCustomers(updatedCustomers);
    setEditDialogOpen(false);
    
    try {
      const result = await updateCustomer(selectedCustomer.id, data);
      if (result.success) {
        toast.success('Customer updated successfully');
        setSelectedCustomer({ ...selectedCustomer, ...data });
        // Refresh to get latest data from server
        refreshData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback on error
      setCustomers(previousCustomers);
      toast.error('Failed to update customer');
      console.error('Error updating customer:', error);
    }
  };

  // Refresh data from server
  const refreshData = useCallback(async () => {
    // Preserve all current params including customer_group_id from server
    const params = new URLSearchParams(searchParams.toString());
    const response = await fetch(`/api/customers?${params.toString()}`);
    const data = await response.json();
    setCustomers(data.customers);
    setTotal(data.count);
  }, [searchParams]);

  return (
    <>
      <DataTable
        config={customerTableConfig}
        data={customers}
        total={total}
        currentPage={initialPage}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(customer) => {
          setSelectedCustomer(customer);
          setDeleteDialogOpen(true);
        }}
        loading={isPending}
      />

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View complete customer information
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerView customer={selectedCustomer} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerForm
              customer={selectedCustomer}
              onSubmit={handleUpdateCustomer}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              customer account and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}