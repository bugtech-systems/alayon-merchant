// components/orders/orders-client.tsx

'use client';

import React, { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ShoppingBag,
  MoreVertical,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Users,
  Filter,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ============================================
// STATUS CONFIGURATIONS
// ============================================

const ORDER_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { 
    label: 'Pending', 
    icon: <Clock className="h-3 w-3" />,
    variant: 'secondary' 
  },
  processing: { 
    label: 'Processing', 
    icon: <RefreshCw className="h-3 w-3" />,
    variant: 'default' 
  },
  completed: { 
    label: 'Completed', 
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'outline' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'destructive' 
  },
  refunded: { 
    label: 'Refunded', 
    icon: <RotateCcw className="h-3 w-3" />,
    variant: 'secondary' 
  },
  draft: { 
    label: 'Draft', 
    icon: <FileText className="h-3 w-3" />,
    variant: 'outline' 
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'outline' },
  not_paid: { label: 'Not Paid', variant: 'secondary' },
};

// ============================================
// BADGE COMPONENTS
// ============================================

const OrderStatusBadge = ({ status }: { status: string }) => {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || { 
    label: status, 
    icon: null, 
    variant: 'secondary' as const 
  };
  
  return (
    <Badge variant={config.variant} className="gap-1.5 capitalize">
      {config.icon}
      {config.label}
    </Badge>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config = PAYMENT_STATUS_CONFIG[status?.toLowerCase()] || { 
    label: status, 
    variant: 'secondary' as const 
  };
  
  return (
    <Badge variant={config.variant} className="gap-1.5 capitalize">
      {config.label}
    </Badge>
  );
};

// ============================================
// STATS CARDS
// ============================================

const StatsCards = ({ orders, orderType, isLoading }: { orders: any[]; orderType: string; isLoading?: boolean }) => {
  const stats = useMemo(() => {
    const total = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    
    return { total, totalValue, completed, pending };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      <div className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total {orderType === 'drafts' ? 'Drafts' : 'Orders'}</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold mt-1">₱{stats.totalValue.toFixed(2)}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>
      
      {orderType === 'orders' && (
        <>
          <div className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1 text-emerald-500">{stats.completed}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// PAGINATION
// ============================================

const Pagination = ({ 
  page, 
  totalPages, 
  hasNext, 
  hasPrevious, 
  total, 
  orderType,
  onPageChange,
  isLoading 
}: { 
  page: number; 
  totalPages: number; 
  hasNext: boolean; 
  hasPrevious: boolean;
  total: number;
  orderType: string;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}) => {
  // Generate page numbers to show
  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t mt-4">
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        Showing page {page} of {totalPages} • {total} total {orderType}
      </div>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious || isLoading}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {getPageNumbers().map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            disabled={isLoading}
            className={cn(
              "h-8 w-8 px-0",
              p === page && "pointer-events-none"
            )}
          >
            {p}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || isLoading}
          className="h-8 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================
// ACTION DROPDOWN MENU
// ============================================

const OrderActionsMenu = ({ 
  order, 
  orderType,
  onView,
  onStatusUpdate,
  onDelete,
  onConvert 
}: {
  order: any;
  orderType: string;
  onView: (order: any) => void;
  onStatusUpdate: (order: any) => void;
  onDelete: (order: any) => void;
  onConvert: (order: any) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(order)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        
        {orderType === 'drafts' ? (
          <DropdownMenuItem onClick={() => onConvert(order)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Convert to Order
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onStatusUpdate(order)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Status
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete(order)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {orderType === 'drafts' ? 'Draft' : 'Order'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================
// MOBILE ORDER CARD
// ============================================

const MobileOrderCard = ({ 
  order, 
  orderType, 
  onView, 
  onStatusUpdate, 
  onDelete, 
  onConvert 
}: any) => {
  const statusConfig = ORDER_STATUS_CONFIG[order.status?.toLowerCase()] || { 
    label: order.status, 
    icon: null,
    variant: 'secondary' as const 
  };

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-mono text-sm font-semibold">
              {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
            </span>
            <p className="text-xs text-muted-foreground">
              {order.created_at && format(new Date(order.created_at), 'MMM dd, yyyy h:mm a')}
            </p>
          </div>
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
        <span className="font-medium">
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
        <div className="flex items-center gap-3">
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
        <div className="relative">
          <OrderActionsMenu
            order={order}
            orderType={orderType}
            onView={onView}
            onStatusUpdate={onStatusUpdate}
            onDelete={onDelete}
            onConvert={onConvert}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN ORDERS CLIENT COMPONENT
// ============================================

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
  
  // State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [draftWizardOpen, setDraftWizardOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [orders, setOrders] = useState(
    orderType === 'drafts' ? initialData.draft_orders || [] : initialData.orders || []
  );
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    count: initialData.count,
    page: initialData.page,
    total_pages: initialData.total_pages,
    has_next: initialData.has_next,
    has_previous: initialData.has_previous
  });
  
  // Check mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update URL params
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

  // Fetch data
  const fetchData = useCallback(async (page?: number) => {
    const currentPage = page || parseInt(searchParams.get('page') || String(initialPage));
    const limit = parseInt(searchParams.get('limit') || String(initialLimit));
    const offset = (currentPage - 1) * limit;
    
    const filters: Record<string, any> = {};
    const search = searchParams.get('search');
    if (search) filters.search = search;
    if (user?.id) filters.seller_id = user.id;
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [user, searchParams, initialPage, initialLimit, orderType]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    updateUrlParams({ page });
    // Immediately update the UI
    fetchData(page);
  }, [updateUrlParams, fetchData]);

  // Handle search
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    const timeoutId = setTimeout(() => {
      updateUrlParams({ search: term || null, page: 1 });
      fetchData(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [updateUrlParams, fetchData]);

  // Handle actions
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    setStatusDialogOpen(false);
    setIsLoading(true);
    try {
      const result = await updateOrderStatus(selectedOrder.id, newStatus);
      if (result.success) {
        toast.success(`Order status updated to ${newStatus}`);
        await fetchData(pagination.page);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    setDeleteDialogOpen(false);
    setIsLoading(true);
    try {
      let result;
      if (orderType === 'drafts') {
        result = await deleteDraftOrder(selectedOrder.id);
      } else {
        result = await deletePosOrder(selectedOrder.id);
      }
      
      if (result.success) {
        toast.success(`${orderType === 'drafts' ? 'Draft order' : 'Order'} deleted successfully`);
        await fetchData(pagination.page);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to delete ${orderType === 'drafts' ? 'draft order' : 'order'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!selectedOrder) return;
    
    setConvertDialogOpen(false);
    setIsLoading(true);
    try {
      const result = await convertDraftToOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Draft order converted to regular order successfully');
        await fetchData(pagination.page);
        const params = new URLSearchParams(searchParams.toString());
        params.set('type', 'orders');
        router.push(`${pathname}?${params.toString()}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to convert draft order');
    } finally {
      setIsLoading(false);
    }
  };

  const { page, total_pages, has_next, has_previous, count } = pagination;

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
            className="pl-9 h-10"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {orderType === 'drafts' && (
          <Button onClick={() => setDraftWizardOpen(true)} className="gap-2 h-10">
            <Plus className="h-4 w-4" />
            Create Draft
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <StatsCards orders={orders} orderType={orderType} isLoading={isLoading} />

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No {orderType} found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      ) : !isMobile ? (
        /* Desktop Table View */
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-medium">Order ID</TableHead>
                  <TableHead className="font-medium">Customer</TableHead>
                  <TableHead className="font-medium text-right">Total</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-center">Items</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">
                      {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium">
                          {order.customer?.first_name || order.customer_name || 'Guest'}
                          {order.customer?.last_name && ` ${order.customer.last_name}`}
                        </div>
                        {order.email && (
                          <div className="text-xs text-muted-foreground">{order.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₱{(order.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <OrderStatusBadge status={order.status} />
                        {orderType === 'orders' && order.payment_status && (
                          <div className="mt-1">
                            <PaymentStatusBadge status={order.payment_status} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.items?.length || order.items_count || 0}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.created_at ? format(new Date(order.created_at), 'h:mm a') : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <OrderActionsMenu
                        order={order}
                        orderType={orderType}
                        onView={handleView}
                        onStatusUpdate={(o) => {
                          setSelectedOrder(o);
                          setNewStatus(o.status);
                          setStatusDialogOpen(true);
                        }}
                        onDelete={(o) => {
                          setSelectedOrder(o);
                          setDeleteDialogOpen(true);
                        }}
                        onConvert={(o) => {
                          setSelectedOrder(o);
                          setConvertDialogOpen(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Mobile Card View */
        <div className="space-y-3">
          {orders.map((order) => (
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
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={total_pages}
        hasNext={has_next}
        hasPrevious={has_previous}
        total={count}
        orderType={orderType}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />

      {/* Dialogs */}
      {/* <DraftOrderWizard 
        open={draftWizardOpen}
        onOpenChange={setDraftWizardOpen}
        onSuccess={() => {
          fetchData(1);
          toast.success('Draft order created successfully');
        }}
      /> */}

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
            <Button onClick={handleStatusUpdate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
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
            <AlertDialogAction onClick={handleConvertToOrder} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Convert to Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
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
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}