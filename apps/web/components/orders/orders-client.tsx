// components/orders/orders-client.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderView } from './order-view';
import { updateOrderStatus, deleteOrder } from '@/lib/actions/orders';
import { Package, Eye, Trash2, RefreshCw } from 'lucide-react';

// Status badge component
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'default' },
    completed: { label: 'Completed', variant: 'outline' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    refunded: { label: 'Refunded', variant: 'secondary' },
  };
  
  const config = statusConfig[status.toLowerCase()] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

// Table configuration with column visibility
const orderTableConfig: TableConfig = {
  pageSize: 10,
  enableSearch: true,
  enableColumnVisibility: true,
  sortField: 'created_at',
  sortOrder: 'desc',
  columns: [
    {
      key: 'id',
      header: 'Order ID',
      sortable: true,
      searchable: true,
      visible: true,
      width: '120px',
      render: (value) => (
        <span className="font-mono text-xs">{value?.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'display_id',
      header: '#',
      sortable: true,
      searchable: true,
      visible: true,
      width: '70px',
    },
    {
      key: 'email',
      header: 'Customer Email',
      sortable: true,
      searchable: true,
      visible: true,
    },
    {
      key: 'customer',
      header: 'Customer Name',
      sortable: false,
      searchable: true,
      visible: true,
      render: (value, row) => {
        const firstName = row.customer?.first_name || '';
        const lastName = row.customer?.last_name || '';
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : '—';
      },
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => (
        <span className="font-medium">
          ${(value / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => <OrderStatusBadge status={value} />,
    },
    {
      key: 'items',
      header: 'Items',
      sortable: false,
      searchable: false,
      visible: true,
      render: (value) => value?.length || 0,
    },
    {
      key: 'created_at',
      header: 'Date',
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
      visible: false,
      render: (value) => value ? format(new Date(value), 'MMM dd, yyyy') : '—',
    },
    {
      key: 'shipping_address',
      header: 'Shipping Address',
      sortable: false,
      searchable: true,
      visible: false,
      render: (value) => {
        if (!value) return '—';
        const parts = [value.address_1, value.city, value.country_code].filter(Boolean);
        return parts.join(', ');
      },
    },
    {
      key: 'payment_status',
      header: 'Payment',
      sortable: true,
      searchable: false,
      visible: false,
      render: (value) => (
        <Badge variant={value === 'paid' ? 'default' : 'secondary'}>
          {value || 'pending'}
        </Badge>
      ),
    },
  ],
};

// Status filter options
const statusOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

interface OrdersClientProps {
  initialData: {
    orders: any[];
    count: number;
  };
  initialPage: number;
  initialLimit: number;
  initialSort: string;
  initialOrder: 'asc' | 'desc';
  initialSearch: string;
  initialFilters: Record<string, any>;
  initialStatus: string;
}

export function OrdersClient({
  initialData,
  initialPage,
  initialLimit,
  initialSort,
  initialOrder,
  initialSearch,
  initialFilters,
  initialStatus,
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Local state for dialogs and optimistic updates
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [orders, setOrders] = useState(initialData.orders);
  const [total, setTotal] = useState(initialData.count);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  // Update URL with new params
  const updateUrlParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 0 || value === 'all') {
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

  // Handle status filter change
  const handleStatusFilter = (status: string) => {
    setCurrentStatus(status);
    updateUrlParams({ status: status === 'all' ? null : status, page: 1 });
  };

  // Handle view order
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    // Optimistic update
    const previousOrders = [...orders];
    const updatedOrders = orders.map(order => 
      order.id === selectedOrder.id ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    setStatusDialogOpen(false);
    
    try {
      const result = await updateOrderStatus(selectedOrder.id, newStatus);
      if (result.success) {
        toast.success(`Order status updated to ${newStatus}`);
        setSelectedOrder({ ...selectedOrder, status: newStatus });
        refreshData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback on error
      setOrders(previousOrders);
      toast.error('Failed to update order status');
      console.error('Error updating order status:', error);
    }
  };

  // Handle delete order
  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    // Optimistic update
    const previousOrders = [...orders];
    setOrders(orders.filter(o => o.id !== selectedOrder.id));
    setTotal(total - 1);
    setDeleteDialogOpen(false);
    
    try {
      const result = await deleteOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Order deleted successfully');
        refreshData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback on error
      setOrders(previousOrders);
      setTotal(total);
      toast.error('Failed to delete order');
      console.error('Error deleting order:', error);
    }
  };

  // Refresh data from server
  const refreshData = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    const response = await fetch(`/api/orders?${params.toString()}`);
    const data = await response.json();
    setOrders(data.orders);
    setTotal(data.count);
  }, [searchParams]);

  // Custom actions for orders table
  const renderCustomActions = () => (
    <div className="flex gap-2">
      <Select value={currentStatus} onValueChange={handleStatusFilter}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      {/* Custom filters bar */}
      <div className="mb-4 flex justify-end">
        {renderCustomActions()}
      </div>

      <DataTable
        config={orderTableConfig}
        data={orders}
        total={total}
        currentPage={initialPage}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        onView={handleView}
        onEdit={(order) => {
          setSelectedOrder(order);
          setNewStatus(order.status);
          setStatusDialogOpen(true);
        }}
        onDelete={(order) => {
          setSelectedOrder(order);
          setDeleteDialogOpen(true);
        }}
        loading={isPending}
        customActions={(order) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setNewStatus(order.status);
                setStatusDialogOpen(true);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete order information and items
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <OrderView order={selectedOrder} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order #{selectedOrder?.display_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.filter(opt => opt.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              order #{selectedOrder?.display_id} and remove all associated data.
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