// components/orders/orders-client.tsx

'use client';

import React, { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
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
  DropdownMenuLabel,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { OrderView } from './order-view';
import { updateOrderStatus, deleteOrder, convertDraftToOrder, deleteDraftOrder, deletePosOrder } from '@/lib/actions/orders';
import { captureOrderPayment } from '@/lib/actions/capture-payments';
import { listDraftOrders, listPosOrders } from '@/lib/data/orders';

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
  Calendar as CalendarIcon,
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
  Loader2,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  Building,
  MapPin,
  Phone,
  Mail,
  Hash,
  ShoppingCart,
  Check,
  DollarSign as DollarIcon,
  Banknote,
  Receipt,
  Store,
  CalendarDays,
  ArrowUpDown,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { sortOrders } from '@/lib/utils/helpers';
import { useMedusaOrders } from '@/hooks/useMedusaOrders';

// ============================================
// STATUS CONFIGURATIONS
// ============================================

const ORDER_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; priority: number }> = {
  pending: { 
    label: 'Pending', 
    icon: <Clock className="h-3 w-3" />,
    variant: 'warning',
    priority: 1
  },
  processing: { 
    label: 'Processing', 
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    variant: 'default',
    priority: 2
  },
  completed: { 
    label: 'Completed', 
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'success',
    priority: 3
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'destructive',
    priority: 0
  },
  refunded: { 
    label: 'Refunded', 
    icon: <RotateCcw className="h-3 w-3" />,
    variant: 'secondary',
    priority: 0
  },
  draft: { 
    label: 'Draft', 
    icon: <FileText className="h-3 w-3" />,
    variant: 'outline',
    priority: 0
  },
  requires_action: { 
    label: 'Requires Action', 
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: 'destructive',
    priority: 0
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: React.ReactNode }> = {
  paid: { label: 'Paid', variant: 'success', icon: <Check className="h-3 w-3" /> },
  authorized: { label: 'Authorized', variant: 'default', icon: <CreditCardIcon className="h-3 w-3" /> },
  pending: { label: 'Pending', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  refunded: { label: 'Refunded', variant: 'secondary', icon: <RotateCcw className="h-3 w-3" /> },
  partially_refunded: { label: 'Partial Refund', variant: 'secondary', icon: <RotateCcw className="h-3 w-3" /> },
  not_paid: { label: 'Not Paid', variant: 'secondary', icon: <X className="h-3 w-3" /> },
};

// ============================================
// BADGE COMPONENTS
// ============================================

const OrderStatusBadge = ({ status, showLabel = true }: { status: string; showLabel?: boolean }) => {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || { 
    label: status || 'Unknown', 
    icon: null, 
    variant: 'secondary' as const,
    priority: 0
  };
  
  const variantStyles = {
    default: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
    secondary: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20',
    destructive: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20',
    outline: 'bg-transparent border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
    success: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 capitalize font-medium transition-all",
        variantStyles[config.variant as keyof typeof variantStyles] || variantStyles.secondary
      )}
    >
      {config.icon}
      {showLabel && config.label}
    </Badge>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config = PAYMENT_STATUS_CONFIG[status?.toLowerCase()] || { 
    label: status || 'Unknown', 
    variant: 'secondary' as const,
    icon: null
  };
  
  const variantStyles = {
    default: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
    secondary: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20',
    destructive: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20',
    outline: 'bg-transparent border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
    success: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 capitalize font-medium",
        variantStyles[config.variant as keyof typeof variantStyles] || variantStyles.secondary
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

// ============================================
// STATUS DROPDOWN (Shows 1 status, shows all on hover)
// ============================================

const StatusDropdown = ({ 
  currentStatus, 
  onStatusChange,
  disabled = false,
  paymentStatus,
  canCapturePayment = false,
  onCapturePayment
}: { 
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
  paymentStatus?: string;
  canCapturePayment?: boolean;
  onCapturePayment?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const statuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
  const currentConfig = ORDER_STATUS_CONFIG[currentStatus?.toLowerCase()];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 px-2 hover:bg-transparent"
          disabled={disabled}
        >
          <div className="flex items-center gap-1.5">
            <OrderStatusBadge status={currentStatus} showLabel={!isOpen} />
            {!isOpen && currentConfig?.icon && (
              <span className="text-muted-foreground">{currentConfig.icon}</span>
            )}
            <ChevronDown className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map((status) => {
          const config = ORDER_STATUS_CONFIG[status];
          const isActive = currentStatus?.toLowerCase() === status;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "gap-2 capitalize cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <span className="flex items-center gap-2 flex-1">
                {config?.icon}
                {config?.label}
              </span>
              {isActive && <Check className="h-3 w-3 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {canCapturePayment && paymentStatus === 'authorized' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCapturePayment}
              className="gap-2 text-blue-600 cursor-pointer"
            >
              <Banknote className="h-4 w-4" />
              Capture Payment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================
// DATE RANGE FILTER
// ============================================

const DateRangeFilter = ({ 
  dateFrom, 
  dateTo, 
  onDateChange,
  onClear
}: { 
  dateFrom?: Date | null;
  dateTo?: Date | null;
  onDateChange: (from: Date | null, to: Date | null) => void;
  onClear: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | null>(dateFrom || null);
  const [tempTo, setTempTo] = useState<Date | null>(dateTo || null);
  const hasDates = dateFrom || dateTo;

  const applyFilter = () => {
    onDateChange(tempFrom, tempTo);
    setIsOpen(false);
  };

  const clearFilter = () => {
    setTempFrom(null);
    setTempTo(null);
    onDateChange(null, null);
    setIsOpen(false);
  };

  const presetRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
  ];

  const applyPreset = (preset: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.setHours(0, 0, 0, 0));
        to = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'thisWeek':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        from = new Date(startOfWeek.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        break;
    }

    setTempFrom(from);
    setTempTo(to);
    onDateChange(from, to);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!dateFrom && !dateTo) return 'All Dates';
    if (dateFrom && dateTo) {
      if (isToday(dateFrom) && isToday(dateTo)) return 'Today';
      if (isYesterday(dateFrom) && isYesterday(dateTo)) return 'Yesterday';
      return `${format(dateFrom, 'MMM d')} - ${format(dateTo, 'MMM d, yyyy')}`;
    }
    if (dateFrom) return `From ${format(dateFrom, 'MMM d, yyyy')}`;
    return `Until ${format(dateTo, 'MMM d, yyyy')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-10 gap-2",
            hasDates && "border-primary/50 bg-primary/5"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{formatDateRange()}</span>
          {hasDates && (
            <X 
              className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer ml-1"
              onClick={(e) => {
                e.stopPropagation();
                clearFilter();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Range</h4>
            <div className="flex flex-wrap gap-1.5">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.value)}
                  className="h-8 text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Custom Range</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !tempFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {tempFrom ? format(tempFrom, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempFrom || undefined}
                      onSelect={(date) => setTempFrom(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !tempTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {tempTo ? format(tempTo, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempTo || undefined}
                      onSelect={(date) => setTempTo(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={clearFilter}>
              Clear
            </Button>
            <Button size="sm" className="flex-1" onClick={applyFilter}>
              Apply Filter
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ============================================
// STATS CARDS (Enhanced)
// ============================================

const StatsCards = ({ orders, orderType, isLoading }: { orders: any[]; orderType: string; isLoading?: boolean }) => {
  const stats = useMemo(() => {
    const total = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const avgOrderValue = total > 0 ? totalValue / total : 0;
    
    return { total, totalValue, completed, pending, cancelled, avgOrderValue };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: `Total ${orderType === 'drafts' ? 'Drafts' : 'Orders'}`,
      value: stats.total,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      label: 'Total Value',
      value: `₱${stats.totalValue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Avg Order Value',
      value: `₱${stats.avgOrderValue.toFixed(2)}`,
      icon: Receipt,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
  ];

  if (orderType === 'orders') {
    statCards.push(
      {
        label: 'Completed',
        value: stats.completed,
        icon: CheckCircle,
        color: 'text-green-500',
        bg: 'bg-green-500/10'
      },
      {
        label: 'Pending',
        value: stats.pending,
        icon: Clock,
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10'
      }
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
      {statCards.map((card, index) => (
        <div 
          key={index} 
          className="bg-card rounded-lg border p-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-default"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", card.bg)}>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PAGINATION (Enhanced)
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
  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisible = 7;
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
        Showing <span className="font-medium">{((page - 1) * 10) + 1}</span> to{' '}
        <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
        <span className="font-medium">{total}</span> {orderType}
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
  onConvert,
  onCapturePayment
}: {
  order: any;
  orderType: string;
  onView: (order: any) => void;
  onStatusUpdate: (order: any) => void;
  onDelete: (order: any) => void;
  onConvert: (order: any) => void;
  onCapturePayment: (order: any) => void;
}) => {
  const canCapture = order.payment_status === 'authorized' && 
                     order.status !== 'cancelled' && 
                     order.status !== 'refunded';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onView(order)} className="gap-2">
          <Eye className="h-4 w-4" />
          View Details
        </DropdownMenuItem>
        
        {orderType === 'drafts' ? (
          <DropdownMenuItem onClick={() => onConvert(order)} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Convert to Order
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onStatusUpdate(order)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Update Status
            </DropdownMenuItem>
            {canCapture && (
              <DropdownMenuItem onClick={() => onCapturePayment(order)} className="gap-2 text-blue-600">
                <Banknote className="h-4 w-4" />
                Capture Payment
              </DropdownMenuItem>
            )}
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete(order)}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete {orderType === 'drafts' ? 'Draft' : 'Order'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================
// MOBILE ORDER CARD (Enhanced)
// ============================================

const MobileOrderCard = ({ 
  order, 
  orderType, 
  onView, 
  onStatusUpdate, 
  onDelete, 
  onConvert,
  onCapturePayment
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = ORDER_STATUS_CONFIG[order.status?.toLowerCase()] || { 
    label: order.status, 
    icon: null,
    variant: 'secondary' as const,
    priority: 0
  };

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {orderType === 'drafts' ? (
              <FileText className="h-4 w-4 text-primary" />
            ) : (
              <Package className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">
                {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
              </span>
              {orderType === 'orders' && (
                <PaymentStatusBadge status={order.payment_status} />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {order.created_at && formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orderType === 'drafts' ? (
            <Badge variant="outline">Draft</Badge>
          ) : (
            <OrderStatusBadge status={order.status} />
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="flex flex-wrap items-center gap-3 text-sm bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            {order.customer?.first_name || order.customer_name || order.email?.split('@')[0] || 'Guest'}
          </span>
        </div>
        {order.email && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="text-xs truncate max-w-[120px]">{order.email}</span>
          </div>
        )}
        {order.shipping_address?.city && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">{order.shipping_address.city}</span>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
        <span className="ml-1">{isExpanded ? 'Show less' : 'Show more'}</span>
      </button>

      {isExpanded && (
        <div className="space-y-2 text-sm bg-muted/20 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium ml-1">{order.items?.length || order.items_count || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium ml-1">₱{(order.subtotal || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Shipping:</span>
              <span className="font-medium ml-1">₱{(order.shipping_total || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-medium ml-1">₱{(order.tax_total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Total and Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-lg font-bold">
          ₱{(order.total || 0).toFixed(2)}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onView(order)}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          <OrderActionsMenu
            order={order}
            orderType={orderType}
            onView={onView}
            onStatusUpdate={onStatusUpdate}
            onDelete={onDelete}
            onConvert={onConvert}
            onCapturePayment={onCapturePayment}
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
  initialDateFrom,
  initialDateTo,
  user,
  orderType
}: OrdersClientProps) {
  
  const pricingContext = React.useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    companyId: user?.metadata?.role == 'company' ? user.employee?.company_id : user?.driver?.company_id,
    stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);

    // Fetch orders with pagination and filters
    const { data, refetch } = useMedusaOrders({
      filters: { 
        company_id: pricingContext.companyId,
      }
    }) as any;
  
console.log(data, 'DATAA')
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
  const [captureLoading, setCaptureLoading] = useState(false);
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | null>(
    initialDateFrom ? new Date(initialDateFrom) : null
  );
  const [dateTo, setDateTo] = useState<Date | null>(
    initialDateTo ? new Date(initialDateTo) : null
  );
  
  const [orders, setOrders] = useState(
    data?.orders || []
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
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setOrders(data?.orders || [])

  }, [data])

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
  // const fetchData = useCallback(async (page?: number) => {
  //   const currentPage = page || parseInt(searchParams.get('page') || String(initialPage));
  //   const limit = parseInt(searchParams.get('limit') || String(initialLimit));
  //   const offset = (currentPage - 1) * limit;
    
  //   const filters: Record<string, any> = {};
  //   const search = searchParams.get('search');
  //   if (search) filters.search = search;
  //   if (user?.id) filters.seller_id = user.id;
    
  //   // Date filters
  //   const dateFromParam = searchParams.get('date_from');
  //   const dateToParam = searchParams.get('date_to');
  //   if (dateFromParam) filters.date_from = dateFromParam;
  //   if (dateToParam) filters.date_to = dateToParam;
    
  //   setIsLoading(true);
  //   try {
  //     let response;
  //     if (orderType === 'drafts') {
  //       response = await listDraftOrders(limit, offset, filters);
  //       setOrders(response.draft_orders || []);
  //     } else {
  //       response = await listPosOrders(limit, offset, filters);
  //       console.log(response, "RESSSPSP")
  //       let orders = sortOrders(response.orders, initialSortField, 'desc')
  //       console.log(orders, 'ORDERSS')
  //       setOrders(orders || []);
  //     }
      
  //     setPagination({
  //       count: response.count,
  //       page: response.page,
  //       total_pages: response.total_pages,
  //       has_next: response.has_next,
  //       has_previous: response.has_previous
  //     });
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //     toast.error(`Failed to fetch ${orderType}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [user, searchParams, initialPage, initialLimit, orderType]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    updateUrlParams({ page });
    refetch();
  }, [updateUrlParams, refetch]);

  // Handle search
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    const timeoutId = setTimeout(() => {
      updateUrlParams({ search: term || null, page: 1 });
      refetch();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [updateUrlParams, refetch]);

  // Handle date change
  const handleDateChange = useCallback((from: Date | null, to: Date | null) => {
    setDateFrom(from);
    setDateTo(to);
    updateUrlParams({ 
      date_from: from ? format(from, 'yyyy-MM-dd') : null,
      date_to: to ? format(to, 'yyyy-MM-dd') : null,
      page: 1
    });
    refetch();
  }, [updateUrlParams, refetch]);

  // Handle status update
  const handleStatusUpdate = async (orderId: string, status: string) => {
    setIsLoading(true);
    try {
      const result = await updateOrderStatus(orderId, status);
      if (result.success) {
        toast.success(`Order status updated to ${status}`);
        await refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle capture payment
  const handleCapturePayment = async (order: any) => {
    setCaptureLoading(true);
    try {
      console.log(order, 'ORDD')
      const result = await captureOrderPayment({
            order_id: order?.id,
            payment_method: 'cash',
            payment_data: {
                amount: order?.total
            }
      });

      console.log(result, 'RESLL')
        if(result?.id){
        toast.success('Payment captured successfully');
        await refetch();

        }
             
    } catch (error) {
      toast.error('Failed to capture payment');
    } finally {
      setCaptureLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (order: any) => {
    setIsLoading(true);
    try {
      let result;
      if (orderType === 'drafts') {
        result = await deleteDraftOrder(order.id);
      } else {
        result = await deletePosOrder(order.id);
      }
      
      if (result.success) {
        toast.success(`${orderType === 'drafts' ? 'Draft order' : 'Order'} deleted successfully`);
        await refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to delete ${orderType === 'drafts' ? 'draft order' : 'order'}`);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Handle convert to order
  const handleConvertToOrder = async (order: any) => {
    setIsLoading(true);
    try {
      const result = await convertDraftToOrder(order.id);
      if (result.success) {
        toast.success('Draft order converted to regular order successfully');
        await refetch();
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
      setConvertDialogOpen(false);
    }
  };

  // View handlers
  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleStatusDialog = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleDeleteDialog = (order: any) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleConvertDialog = (order: any) => {
    setSelectedOrder(order);
    setConvertDialogOpen(true);
  };

  const { page, total_pages, has_next, has_previous, count } = pagination;
console.log(orders, 'oRDDS', data?.orders)
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
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
          
          <div className="flex items-center gap-2">
            {/* Date Range Filter */}
            <DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={handleDateChange}
              onClear={() => handleDateChange(null, null)}
            />
            
            {orderType === 'drafts' && (
              <Button onClick={() => setDraftWizardOpen(true)} className="gap-2 h-10">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Draft</span>
                <span className="sm:hidden">Draft</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards orders={orders} orderType={orderType} isLoading={isLoading} />

        {/* Orders List */}
        {isLoading && orders.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-lg border">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">No {orderType} found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : !isMobile ? (
          /* Desktop Table View */
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-medium min-w-[100px]">Order</TableHead>
                    <TableHead className="font-medium min-w-[150px]">Customer</TableHead>
                    <TableHead className="font-medium text-right min-w-[100px]">Total</TableHead>
                    <TableHead className="font-medium min-w-[140px]">Status</TableHead>
                    <TableHead className="font-medium text-center min-w-[60px]">Items</TableHead>
                    <TableHead className="font-medium min-w-[120px]">Date</TableHead>
                    <TableHead className="font-medium text-right min-w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {orderType === 'drafts' ? (
                              <FileText className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono text-sm font-semibold">
                              {orderType === 'drafts' ? order.id.slice(0, 8) : `#${order.display_id}`}
                            </div>
                            {orderType === 'orders' && order.payment_status && (
                              <div className="mt-0.5">
                                <PaymentStatusBadge status={order.payment_status} />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {order.customer?.first_name || order.customer_name || 'Guest'}
                            {order.customer?.last_name && ` ${order.customer.last_name}`}
                          </div>
                          {order.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {order.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-lg">₱{(order.total || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.items?.length || order.items_count || 0} items
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          {orderType === 'orders' ? (
                            <StatusDropdown
                              currentStatus={order.status}
                              paymentStatus={order.payment_status}
                              onStatusChange={(status) => handleStatusUpdate(order.id, status)}
                              onCapturePayment={() => handleCapturePayment(order)}
                              canCapturePayment={order.payment_status === 'authorized'}
                              disabled={isLoading || captureLoading}
                            />
                          ) : (
                            <OrderStatusBadge status={order.status} />
                          )}
                          {orderType === 'orders' && order.requires_action && (
                            <div className="flex items-center gap-1 text-xs text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              Action Required
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium">
                          {order.items?.length || order.items_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <div className="text-sm font-medium">
                                {order.created_at ? format(new Date(order.created_at), 'MMM d, yyyy') : '—'}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {order.created_at ? format(new Date(order.created_at), 'h:mm a') : ''}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {order.created_at && formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <OrderActionsMenu
                          order={order}
                          orderType={orderType}
                          onView={handleView}
                          onStatusUpdate={handleStatusDialog}
                          onDelete={handleDeleteDialog}
                          onConvert={handleConvertDialog}
                          onCapturePayment={handleCapturePayment}
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
                onStatusUpdate={handleStatusDialog}
                onDelete={handleDeleteDialog}
                onConvert={handleConvertDialog}
                onCapturePayment={handleCapturePayment}
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



        {/* View Order Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {orderType === 'drafts' ? 'Draft Order' : 'Order'} Details
              </DialogTitle>
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
              {orderType === 'orders' && selectedOrder?.payment_status === 'authorized' && (
                <Button 
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleCapturePayment(selectedOrder);
                  }}
                  disabled={captureLoading}
                >
                  {captureLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Banknote className="mr-2 h-4 w-4" />
                  )}
                  Capture Payment
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
                        <div className="flex items-center gap-2">
                          {ORDER_STATUS_CONFIG[status]?.icon}
                          {ORDER_STATUS_CONFIG[status]?.label || status}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedOrder?.payment_status === 'authorized' && (
                <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm">
                  <p className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    This order has an authorized payment that can be captured.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (selectedOrder) {
                  handleStatusUpdate(selectedOrder.id, newStatus);
                  setStatusDialogOpen(false);
                }
              }} disabled={isLoading}>
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
              <AlertDialogAction onClick={() => selectedOrder && handleConvertToOrder(selectedOrder)} disabled={isLoading}>
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
                onClick={() => selectedOrder && handleDelete(selectedOrder)} 
                className="bg-destructive hover:bg-destructive/90"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}