// components/orders/orders-client.tsx
'use client';

import React, { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { DraftOrderWizard } from '../../app/pos/_components/draft-wizard';
import { updateOrderStatus, deleteOrder, convertDraftToOrder, deleteDraftOrder, deletePosOrder } from '@/lib/actions/orders';
import { listOrders, listDraftOrders, listPosOrders } from '@/lib/data/orders';

import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  ChevronLeft,
  ChevronRight,
  Plus,
  CreditCard,
  Search,
  X,
  Package,
  User,
  Calendar,
  DollarSign,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// Status badge component
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'default' },
    completed: { label: 'Completed', variant: 'outline' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    refunded: { label: 'Refunded', variant: 'secondary' },
    draft: { label: 'Draft', variant: 'outline' },
  };
  
  const config = statusConfig[status?.toLowerCase()] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={config.variant} className="capitalize">
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
    not_paid: { label: 'Not Paid', variant: 'secondary' },
  };
  
  const badgeConfig = config[status?.toLowerCase()] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={badgeConfig.variant} className="capitalize">
      {badgeConfig.label}
    </Badge>
  );
};

// Badge component
const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };
  
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
      {children}
    </span>
  );
};

// Mobile Order Card Component
const MobileOrderCard = ({ order, orderType, onView, onStatusUpdate, onDelete, onConvert }: any) => {
  return (
    <div className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold">
              {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {order.created_at && format(new Date(order.created_at), 'MMM dd, yyyy h:mm a')}
          </p>
        </div>
        {orderType === 'drafts' ? (
          <Badge variant="outline">Draft</Badge>
        ) : (
          <OrderStatusBadge status={order.status} />
        )}
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-2 text-sm">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-foreground">
          {order.customer?.first_name || order.customer_name || order.email?.split('@')[0] || 'Guest'}
        </span>
      </div>

      {/* Email */}
      {order.email && (
        <div className="text-xs text-muted-foreground truncate">
          {order.email}
        </div>
      )}

      {/* Total and Items */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {order.items?.length || order.items_count || 0} items
            </span>
          </div>
          {orderType === 'orders' && order.payment_status && (
            <PaymentStatusBadge status={order.payment_status} />
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">
            ₱{(order.total || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onView(order)}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
        {orderType === 'drafts' ? (
          <Button size="sm" variant="default" className="flex-1" onClick={() => onConvert(order)}>
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Convert
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onStatusUpdate(order)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Update
          </Button>
        )}
        <Button size="sm" variant="destructive" className="flex-1" onClick={() => onDelete(order)}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};

// Desktop Table Row Component
const DesktopOrderRow = ({ order, orderType, onView, onStatusUpdate, onDelete, onConvert }: any) => {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      {/* Order ID */}
      <td className="p-4 align-middle">
        <div className="font-mono text-sm font-medium">
          {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
        </div>
      </td>
      
      {/* Customer */}
      <td className="p-4 align-middle">
        <div className="space-y-1">
          <div className="font-medium">
            {order.customer?.first_name || order.customer_name || 'Guest'}
            {order.customer?.last_name && ` ${order.customer.last_name}`}
          </div>
          {order.email && (
            <div className="text-xs text-muted-foreground">{order.email}</div>
          )}
        </div>
      </td>
      
      {/* Total */}
      <td className="p-4 align-middle">
        <div className="font-semibold">₱{(order.total || 0).toFixed(2)}</div>
      </td>
      
      {/* Status */}
      <td className="p-4 align-middle">
        {orderType === 'drafts' ? (
          <Badge variant="outline">Draft</Badge>
        ) : (
          <div className="space-y-1">
            <OrderStatusBadge status={order.status} />
            {order.payment_status && (
              <div className="mt-1">
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            )}
          </div>
        )}
      </td>
      
      {/* Items */}
      <td className="p-4 align-middle">
        <div className="text-center">{order.items?.length || order.items_count || 0}</div>
      </td>
      
      {/* Date */}
      <td className="p-4 align-middle">
        <div className="text-sm">
          {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : '—'}
        </div>
        <div className="text-xs text-muted-foreground">
          {order.created_at ? format(new Date(order.created_at), 'h:mm a') : ''}
        </div>
      </td>
      
      {/* Actions */}
      <td className="p-4 align-middle">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(order)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {orderType === 'drafts' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConvert(order)}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusUpdate(order)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(order)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

interface OrdersClientProps {
  initialData: {
    orders?: any[];
    draft_orders?: any[];
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
  orderType: 'orders' | 'drafts';
}

export function OrdersClient({
  initialData,
  initialPage,
  initialLimit,
  initialSortField,
  initialSortOrder,
  initialSearch,
  user,
  orderType
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
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [draftWizardOpen, setDraftWizardOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [orders, setOrders] = useState(orderType === 'drafts' ? initialData.draft_orders || [] : initialData.orders || []);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    count: initialData.count,
    page: initialData.page,
    total_pages: initialData.total_pages,
    has_next: initialData.has_next,
    has_previous: initialData.has_previous
  });
  
  // Check if mobile view
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update URL with new params
  const updateUrlParams = useCallback((updates: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    params.set('type', orderType);
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams, orderType]);

  // Fetch data from server based on current params
  const fetchData = useCallback(async () => {
    const page = parseInt(searchParams.get('page') || String(initialPage));
    const limit = parseInt(searchParams.get('limit') || String(initialLimit));
    const offset = (page - 1) * limit;
    
    // Build filters
    const filters: Record<string, any> = {};
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    if (user && user?.id) {
      filters.seller_id = user.id;
    }
    
    try {
      let response;
      if (orderType === 'drafts') {
        response = await listDraftOrders(limit, offset, filters);
        setOrders(response.draft_orders || []);
      } else {
        response = await listPosOrders(limit, offset, filters);
        setOrders(response.orders || []);
      }
      
      setPagination({
        count: response.count,
        page: response.page,
        total_pages: response.total_pages,
        has_next: response.has_next,
        has_previous: response.has_previous
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to fetch ${orderType}`);
    }
  }, [user, searchParams, initialPage, initialLimit, orderType]);

  // Refetch when search params change
  // useEffect(() => {
  //   fetchData();
  // }, [fetchData]);

  // Handle page change
  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  // Handle search change with debounce
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    const timeoutId = setTimeout(() => {
      updateUrlParams({ search: term || null, page: 1 });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [updateUrlParams]);

  // Handle view order
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
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
      toast.error('Failed to update order status');
    }
  };

  // Handle delete order
  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    setDeleteDialogOpen(false);
    
    try {
      let result;
      if (orderType === 'drafts') {
        result = await deleteDraftOrder(selectedOrder.id);
      } else {
        result = await deletePosOrder(selectedOrder.id);
      }
      
      if (result.success) {
        toast.success(`${orderType === 'drafts' ? 'Draft order' : 'Order'} deleted successfully`);
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to delete ${orderType === 'drafts' ? 'draft order' : 'order'}`);
    }
  };

  // Handle convert draft to order
  const handleConvertToOrder = async () => {
    if (!selectedOrder) return;
    
    setConvertDialogOpen(false);
    
    try {
      const result = await convertDraftToOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Draft order converted to regular order successfully');
        fetchData();
        const params = new URLSearchParams(searchParams.toString());
        params.set('type', 'orders');
        router.push(`${pathname}?${params.toString()}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to convert draft order');
      console.error(error);
    }
  };

  const { page, total_pages, has_next, has_previous } = pagination;

  // Pagination component
  const Pagination = () => {
    if (total_pages <= 1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          Showing page {page} of {total_pages} • {pagination.count} total {orderType}
        </div>
        <div className="flex gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={!has_previous || isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!has_next || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Stats Cards
  const StatsCards = () => {
    const totalOrders = pagination.count;
    const totalValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total {orderType === 'drafts' ? 'Drafts' : 'Orders'}</p>
              <p className="text-2xl font-bold mt-1">{totalOrders}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold mt-1">₱{totalValue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        
        {orderType === 'orders' && (
          <>
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold mt-1">
                    {orders.filter(o => o.status === 'completed').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold mt-1">
                    {orders.filter(o => o.status === 'pending').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${orderType === 'drafts' ? 'draft orders' : 'orders'} by ID, customer, email...`}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {orderType === 'drafts' && (
          <Button onClick={() => setDraftWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Draft Order
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Orders List - Desktop Table View */}
      {!isMobile ? (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Order ID</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Total</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-center p-4 font-medium">Items</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-center p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No {orderType} found</p>
                      <p className="text-sm mt-1">Try adjusting your search</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <DesktopOrderRow
                      key={order.id}
                      order={order}
                      orderType={orderType}
                      onView={handleView}
                      onStatusUpdate={(o: any) => {
                        setSelectedOrder(o);
                        setNewStatus(o.status);
                        setStatusDialogOpen(true);
                      }}
                      onDelete={(o: any) => {
                        setSelectedOrder(o);
                        setDeleteDialogOpen(true);
                      }}
                      onConvert={(o: any) => {
                        setSelectedOrder(o);
                        setConvertDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile Card View */
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No {orderType} found</p>
              <p className="text-sm mt-1">Try adjusting your search</p>
            </div>
          ) : (
            orders.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                orderType={orderType}
                onView={handleView}
                onStatusUpdate={(o: any) => {
                  setSelectedOrder(o);
                  setNewStatus(o.status);
                  setStatusDialogOpen(true);
                }}
                onDelete={(o: any) => {
                  setSelectedOrder(o);
                  setDeleteDialogOpen(true);
                }}
                onConvert={(o: any) => {
                  setSelectedOrder(o);
                  setConvertDialogOpen(true);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <Pagination />

      {/* Draft Order Wizard */}
      <DraftOrderWizard 
        open={draftWizardOpen}
        onOpenChange={setDraftWizardOpen}
        onSuccess={() => {
          fetchData();
          toast.success('Draft order created successfully');
        }}
      />

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{orderType === 'drafts' ? 'Draft Order' : 'Order'} Details</DialogTitle>
            <DialogDescription>
              Complete {orderType === 'drafts' ? 'draft order' : 'order'} information and items
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <OrderView order={selectedOrder} isDraft={orderType === 'drafts'} />
          )}
          <DialogFooter>
            {orderType === 'drafts' && selectedOrder && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                setConvertDialogOpen(true);
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Convert to Order
              </Button>
            )}
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
                  {['pending', 'processing', 'completed', 'cancelled', 'refunded'].map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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

      {/* Convert Draft to Order Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Order</AlertDialogTitle>
            <AlertDialogDescription>
              This will convert the draft order into a regular order. 
              The customer will be notified and the order will be ready for fulfillment.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrder}>
              Convert to Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {orderType === 'drafts' ? ' draft order' : ` order #${selectedOrder?.display_id}`} 
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}