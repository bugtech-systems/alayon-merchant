// components/orders/orders-client.tsx
'use client';

import React, { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DataTable, TableConfig } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { OrderView } from './order-view';
import { updateOrderStatus, deleteOrder } from '@/lib/actions/orders';
import { listOrders } from '@/lib/data/orders';

import { 
  Package, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Filter, 
  Calendar as CalendarIcon,
  X,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Status badge component
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'default' },
    completed: { label: 'Completed', variant: 'outline' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    refunded: { label: 'Refunded', variant: 'secondary' },
  };
  
  const config = statusConfig[status?.toLowerCase()] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

// Payment status badge
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    paid: { label: 'Paid', variant: 'default' },
    pending: { label: 'Pending', variant: 'secondary' },
    failed: { label: 'Failed', variant: 'destructive' },
    refunded: { label: 'Refunded', variant: 'outline' },
  };
  
  const badgeConfig = config[status?.toLowerCase()] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={badgeConfig.variant}>
      {badgeConfig.label}
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
      key: 'display_id',
      header: 'Order #',
      sortable: true,
      searchable: true,
      visible: true,
      width: '100px',
      render: (value) => (
        <span className="font-mono text-sm font-medium">
          #{value}
        </span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      searchable: true,
      visible: true,
      render: (value, row) => {
        const name = row.customer?.first_name || row.customer_name || '';
        const lastName = row.customer?.last_name || '';
        return name || lastName ? `${name} ${lastName}`.trim() : 'Guest';
      },
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => (
        <span className="font-semibold">
          ₱{(value).toFixed(2)}
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
      key: 'payment_status',
      header: 'Payment',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => <PaymentStatusBadge status={value} />,
    },
    {
      key: 'items_count',
      header: 'Items',
      sortable: false,
      searchable: false,
      visible: true,
      render: (value) => value || 0,
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      searchable: false,
      visible: true,
      render: (value) => value ? format(new Date(value), 'MMM dd, yyyy h:mm a') : '—',
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      searchable: true,
      visible: false,
      render: (value) => value || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      searchable: true,
      visible: false,
      render: (value) => value || '—',
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

const paymentStatusOptions = [
  { value: 'all', label: 'All Payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

interface OrdersClientProps {
  initialData: {
    orders: any[];
    count: number;
    page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
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
}

export function OrdersClient({
  initialData,
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
  user
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Local state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [orders, setOrders] = useState(initialData.orders);
  const [pagination, setPagination] = useState({
    count: initialData.count,
    page: initialData.page,
    total_pages: initialData.total_pages,
    has_next: initialData.has_next,
    has_previous: initialData.has_previous
  });
  
  // Filter states
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(initialPaymentStatus);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(initialDateFrom ? new Date(initialDateFrom) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(initialDateTo ? new Date(initialDateTo) : undefined);
  const [minTotal, setMinTotal] = useState(initialMinTotal);
  const [maxTotal, setMaxTotal] = useState(initialMaxTotal);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [customerId, setCustomerId] = useState(initialCustomerId);

  // Update URL with new params
  const updateUrlParams = useCallback((updates: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 0 || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  // Fetch data from server based on current params
  const fetchData = useCallback(async () => {
    const page = parseInt(searchParams.get('page') || String(initialPage));
    const limit = parseInt(searchParams.get('limit') || String(initialLimit));
    const offset = (page - 1) * limit;
    
    const sortField = searchParams.get('sort_field') || initialSortField;
    const sortOrder = (searchParams.get('sort_order') || initialSortOrder) as 'asc' | 'desc';
    
    // Build filters
    const filters: Record<string, any> = {};
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const status = searchParams.get('status');
    if (status && status !== 'all') filters.status = status;
    
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus && paymentStatus !== 'all') filters.payment_status = paymentStatus;
    
    const dateFromParam = searchParams.get('date_from');
    if (dateFromParam) filters.date_from = dateFromParam;
    
   if (user && user?.id) {
    filters.seller_id = user.id;
    }

    const dateToParam = searchParams.get('date_to');
    if (dateToParam) filters.date_to = dateToParam;
    
    const minTotalParam = searchParams.get('min_total');
    if (minTotalParam) filters.min_total = parseFloat(minTotalParam);
    
    const maxTotalParam = searchParams.get('max_total');
    if (maxTotalParam) filters.max_total = parseFloat(maxTotalParam);
    
    const customerIdParam = searchParams.get('customer_id');
    if (customerIdParam) filters.customer_id = customerIdParam;
    
    const sort = {
      field: sortField,
      order: sortOrder
    };
    
    try {
      const response = await listOrders(limit, offset, filters);
      console.log(response, 'RESSP')
      setOrders(response.orders);
      setPagination({
        count: response.count,
        page: response.page,
        total_pages: response.total_pages,
        has_next: response.has_next,
        has_previous: response.has_previous
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    }
  }, [user, searchParams, initialPage, initialLimit, initialSortField, initialSortOrder]);

  // Refetch when search params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  // Handle sort change
  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    updateUrlParams({ sort_field: field, sort_order: order, page: 1 });
  };

  // Handle search change with debounce
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    const timeoutId = setTimeout(() => {
      updateUrlParams({ search: term || null, page: 1 });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [updateUrlParams]);

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setCurrentStatus(status);
    updateUrlParams({ status: status === 'all' ? null : status, page: 1 });
  };

  // Handle payment status filter
  const handlePaymentStatusFilter = (status: string) => {
    setCurrentPaymentStatus(status);
    updateUrlParams({ payment_status: status === 'all' ? null : status, page: 1 });
  };

  // Apply filters
  const applyFilters = () => {
    updateUrlParams({ 
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : null,
      min_total: minTotal || null,
      max_total: maxTotal || null,
      customer_id: customerId || null,
      page: 1
    });
    setFilterDialogOpen(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setCurrentStatus('all');
    setCurrentPaymentStatus('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinTotal('');
    setMaxTotal('');
    setCustomerId('');
    setSearchTerm('');
    updateUrlParams({
      status: null,
      payment_status: null,
      date_from: null,
      date_to: null,
      min_total: null,
      max_total: null,
      customer_id: null,
      search: null,
      page: 1
    });
    setFilterDialogOpen(false);
  };

  // Handle view order
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
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
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setOrders(previousOrders);
      toast.error('Failed to update order status');
    }
  };

  // Handle delete order
  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    const previousOrders = [...orders];
    setOrders(orders.filter(o => o.id !== selectedOrder.id));
    setDeleteDialogOpen(false);
    
    try {
      const result = await deleteOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Order deleted successfully');
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setOrders(previousOrders);
      toast.error('Failed to delete order');
    }
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (currentStatus !== 'all') count++;
    if (currentPaymentStatus !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (minTotal || maxTotal) count++;
    if (customerId) count++;
    if (searchTerm) count++;
    return count;
  };

  // Custom actions for orders table
  const renderCustomActions = () => (
    <div className="flex gap-2">
      <Popover open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-1">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter Orders</h4>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select value={currentStatus} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={currentPaymentStatus} onValueChange={handlePaymentStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Customer ID</Label>
              <Input
                placeholder="Enter customer ID"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Total Amount Range (₱)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={applyFilters} className="w-full">
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  // Active filters display
  const ActiveFilters = () => {
    const filters = [];
    if (currentStatus !== 'all') filters.push({ label: `Status: ${currentStatus}`, key: 'status' });
    if (currentPaymentStatus !== 'all') filters.push({ label: `Payment: ${currentPaymentStatus}`, key: 'payment' });
    if (dateFrom) filters.push({ label: `From: ${format(dateFrom, 'MMM dd, yyyy')}`, key: 'date_from' });
    if (dateTo) filters.push({ label: `To: ${format(dateTo, 'MMM dd, yyyy')}`, key: 'date_to' });
    if (minTotal) filters.push({ label: `Min: ₱${minTotal}`, key: 'min_total' });
    if (maxTotal) filters.push({ label: `Max: ₱${maxTotal}`, key: 'max_total' });
    if (customerId) filters.push({ label: `Customer: ${customerId.slice(0, 8)}...`, key: 'customer_id' });
    if (searchTerm) filters.push({ label: `Search: ${searchTerm}`, key: 'search' });
    
    if (filters.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((filter) => (
          <Badge key={filter.key} variant="secondary" className="gap-1">
            {filter.label}
            <button
              onClick={() => {
                if (filter.key === 'status') handleStatusFilter('all');
                if (filter.key === 'payment') handlePaymentStatusFilter('all');
                if (filter.key === 'date_from') setDateFrom(undefined);
                if (filter.key === 'date_to') setDateTo(undefined);
                if (filter.key === 'min_total') setMinTotal('');
                if (filter.key === 'max_total') setMaxTotal('');
                if (filter.key === 'customer_id') setCustomerId('');
                if (filter.key === 'search') {
                  setSearchTerm('');
                  updateUrlParams({ search: null, page: 1 });
                }
                updateUrlParams({
                  [filter.key]: null,
                  page: 1
                });
              }}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs">
            Clear all
          </Button>
        )}
      </div>
    );
  };

    const { page, total_pages, has_next, has_previous } = pagination;


  // Pagination component
  const Pagination = () => {
    
    if (total_pages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing page {page} of {total_pages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={!has_previous || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!has_next || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Custom filters bar */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search orders by ID, customer, email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        {renderCustomActions()}
      </div>
      
      {/* Active filters display */}
      <ActiveFilters />

      <DataTable
        config={orderTableConfig}
        data={orders}
        total={pagination.count}
        currentPage={page}
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
        )}
      />
      
      <Pagination />

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