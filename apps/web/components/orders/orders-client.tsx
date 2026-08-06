// components/orders/orders-client.tsx

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow, isToday, startOfDay, endOfDay, isYesterday, parseISO } from 'date-fns';
import { toast } from 'sonner';

// UI Components
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Package,
  User,
  Calendar as CalendarIcon,
  DollarSign,
  ShoppingBag,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Loader2,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Check,
  Banknote,
  CalendarDays,
  Tag,
  Percent,
  Timer,
  CalendarClock,
  Notebook,
  Building,
  Store,
  CreditCard,
} from 'lucide-react';

// Utils & Actions
import { cn } from '@/lib/utils';
import { sortOrders } from '@/lib/utils/helpers';
import { updatePosOrderStatus, deletePosOrder, deleteDraftOrder, convertDraftToOrder } from '@/lib/actions/orders';
import { captureOrderPayment, markAsPaid } from '@/lib/actions/capture-payments';
import { listPosOrders } from '@/lib/data/orders';

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
  company_accepted: {
    label: 'Pending',
    icon: <Clock className="h-3 w-3" />,
    variant: 'warning',
    priority: 1
  },
  company_preparing: {
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
  delivered: {
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
// CAPTURE PAYMENT DIALOG
// ============================================

interface CapturePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onCapture: (amount: number, discountCode?: string) => Promise<void>;
  isCapturing?: boolean;
}

const CapturePaymentDialog = ({
  open,
  onOpenChange,
  order,
  onCapture,
  isCapturing = false
}: CapturePaymentDialogProps) => {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');
  const [change, setChange] = useState<number>(0);

  const totalAmount = order?.total || 0;
  const formattedTotal = `₱${totalAmount.toFixed(2)}`;

  useEffect(() => {
    const received = parseFloat(amountReceived);
    if (!isNaN(received) && received > 0) {
      const changeAmount = Math.max(0, received - totalAmount);
      setChange(changeAmount);
    } else {
      setChange(0);
    }
  }, [amountReceived, totalAmount]);

  useEffect(() => {
    if (open) {
      setAmountReceived(order?.total?.toString() || '');
    }
  }, [open, order]);

  const handleCapture = async () => {
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (received < totalAmount) {
      toast.error('Amount received must be at least the total amount');
      return;
    }

    await onCapture(received, discountCode.trim() || undefined);
    setAmountReceived('');
    setDiscountCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Capture Payment
          </DialogTitle>
          <DialogDescription>
            Complete the payment for order #{order?.display_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Total</span>
              <span className="font-bold text-lg">{formattedTotal}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Amount Received
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                ₱
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="pl-8 h-10"
                min={0}
                step="0.01"
              />
            </div>
          </div>

          {change > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Change</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  ₱{change.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="bg-primary/5 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Due</span>
              <span className="font-medium">{formattedTotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Received</span>
              <span className="font-medium">
                {amountReceived ? `₱${parseFloat(amountReceived).toFixed(2)}` : '—'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCapturing}>
            Cancel
          </Button>
          <Button
            onClick={handleCapture}
            disabled={isCapturing || !amountReceived || parseFloat(amountReceived) < totalAmount}
            className="min-w-[120px]"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Capture Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// STATUS DROPDOWN
// ============================================

const StatusDropdown = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  paymentStatus,
  canCapturePayment = false,
  onCapturePayment,
  onMarkAsPaid
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
  paymentStatus?: string;
  canCapturePayment?: boolean;
  onCapturePayment?: () => void;
  onMarkAsPaid?: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const statuses = ['pending', 'company_preparing', 'completed'];

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
              className={cn("gap-2 capitalize cursor-pointer", isActive && "bg-muted")}
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
            <DropdownMenuItem onClick={onCapturePayment} className="gap-2 text-blue-600 cursor-pointer">
              <Banknote className="h-4 w-4" />
              Capture Payment
            </DropdownMenuItem>
          </>
        )}
        {canCapturePayment && paymentStatus === 'not_paid' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMarkAsPaid} className="gap-2 text-blue-600 cursor-pointer">
              <Banknote className="h-4 w-4" />
              Mark As Paid
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================
// STATS CARDS
// ============================================

const StatsCards = ({ orders, orderType, isLoading }: { orders: any[]; orderType: string; isLoading?: boolean }) => {
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o =>
      o.status !== 'canceled' && o.status !== 'refunded'
    );

    const total = activeOrders.length;
    const totalValue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completed = activeOrders.filter(o => o.status === 'completed').length;
    const pending = activeOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;

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

  const statCards = [
    {
      label: `Active ${orderType === 'drafts' ? 'Drafts' : 'Orders'}`,
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
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
// DATE RANGE FILTER - Refined for smooth updates
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

  // Sync temp state when props change
  useEffect(() => {
    setTempFrom(dateFrom || null);
    setTempTo(dateTo || null);
  }, [dateFrom, dateTo]);

  const hasDates = dateFrom || dateTo;

  // Apply filter immediately without waiting for popover to close
  const applyFilter = useCallback(() => {
    onDateChange(tempFrom, tempTo);
    setIsOpen(false);
  }, [tempFrom, tempTo, onDateChange]);

  const clearFilter = useCallback(() => {
    setTempFrom(null);
    setTempTo(null);
    onDateChange(null, null);
    setIsOpen(false);
  }, [onDateChange]);

  const presetRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
  ];

  const applyPreset = useCallback((preset: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (preset) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case 'thisWeek':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        from = startOfDay(startOfWeek);
        to = endOfDay(now);
        break;
      case 'thisMonth':
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        to = endOfDay(now);
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = startOfDay(lastMonth);
        to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      default:
        break;
    }

    setTempFrom(from);
    setTempTo(to);
    // Apply immediately
    onDateChange(from, to);
    setIsOpen(false);
  }, [onDateChange]);

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
          className={cn("h-10 gap-2", hasDates && "border-primary/50 bg-primary/5")}
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
                      onSelect={(date) => {
                        setTempFrom(date || null);
                        // Auto-apply if both dates are selected
                        if (date && tempTo) {
                          onDateChange(date, tempTo);
                          setIsOpen(false);
                        }
                      }}
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
                      onSelect={(date) => {
                        setTempTo(date || null);
                        // Auto-apply if both dates are selected
                        if (date && tempFrom) {
                          onDateChange(tempFrom, date);
                          setIsOpen(false);
                        }
                      }}
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
        <span className="font-medium">{total}</span> active {orderType}
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
            className={cn("h-8 w-8 px-0", p === page && "pointer-events-none")}
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
// DETAILED ORDER VIEW COMPONENT
// ============================================

interface DetailedOrderViewProps {
  order: any;
  isDraft?: boolean;
  onStatusUpdate?: (status: string) => void;
  onCapturePayment?: () => void;
  isCapturing?: boolean;
}

const DetailedOrderView = ({
  order,
  isDraft = false,
  onStatusUpdate,
  onCapturePayment,
  isCapturing = false
}: DetailedOrderViewProps) => {
  const [newStatus, setNewStatus] = useState(order?.status || 'pending');

  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return `₱${(amount || 0).toFixed(2)}`;
  };

  const calculateItemTotal = (item: any) => {
    const unitPrice = item.unit_price || item.price || 0;
    const quantity = item.quantity || 1;
    const discount = item.discount_amount || 0;
    return (unitPrice * quantity) - discount;
  };

  const getPaymentBreakdown = () => {
    const payments = order.payments || [];
    const totalPaid = order?.metadata?.pos_payment?.amount || payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const paymentMethod = payments.length > 0 ? payments[0]?.payment_method : null;
    return {
      totalPaid,
      paymentMethod,
      changeAmount: order.total > 0 ? Math.max(0, totalPaid - order.total) : 0,
      remainingBalance: order.total > 0 ? Math.max(0, order.total - totalPaid) : 0,
      payments
    };
  };

  const paymentBreakdown = getPaymentBreakdown();

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            {isDraft ? 'Draft Order' : `Order #${order.display_id}`}
            {order?.metadata?.beeper_ids?.length && ` | ${order?.metadata?.beeper_ids.join(',')}`}
            {isDraft && <Badge variant="outline" className="ml-2">Draft</Badge>}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              <span>Order Date: {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            {order.eta && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Timer className="h-4 w-4" />
                <span>ETA: {format(new Date(order.eta), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isDraft && onStatusUpdate && (
            <Select value={newStatus} onValueChange={(value) => {
              setNewStatus(value);
              onStatusUpdate(value);
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Update status" />
              </SelectTrigger>
              <SelectContent>
                {['pending', 'processing', 'completed'].map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {ORDER_STATUS_CONFIG[status]?.icon}
                      {ORDER_STATUS_CONFIG[status]?.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <OrderStatusBadge status={order.status} />
          {!isDraft && <PaymentStatusBadge status={order.payment_status} />}
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Customer Details</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customer?.first_name || order.customer_name || 'Guest'}</span>
              {order.customer?.last_name && <span>{order.customer.last_name}</span>}
            </div>
            {order.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.email}</span>
              </div>
            )}
            {order.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Shipping Address</h4>
          {order.shipping_address ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div>{order.shipping_address.address_1}</div>
                  {order.shipping_address.address_2 && (
                    <div>{order.shipping_address.address_2}</div>
                  )}
                  <div>
                    {order.shipping_address.city}, {order.shipping_address.province || order.shipping_address.state}
                  </div>
                  <div>{order.shipping_address.country_code?.toUpperCase()}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No shipping address provided</div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h4>
          {order?.metadata?.notes && (
            <div className="space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <Notebook className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div>{order?.metadata?.notes}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Order Items</h4>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.items || []).map((item: any, index: number) => {
                const itemTotal = calculateItemTotal(item);
                const unitPrice = item.unit_price || item.price || 0;
                const discount = item.discount_amount || 0;
                const quantity = item.quantity || 1;

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.title || item.name || item.product_name}</div>
                        {item.variant_title && (
                          <div className="text-xs text-muted-foreground">{item.variant_title}</div>
                        )}
                        {item.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(unitPrice)}</TableCell>
                    <TableCell className="text-center">{quantity}</TableCell>
                    <TableCell className="text-right">
                      {discount > 0 ? (
                        <div className="flex items-center justify-end gap-1 text-emerald-600">
                          <Percent className="h-3 w-3" />
                          {formatCurrency(discount)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(itemTotal)}</TableCell>
                  </TableRow>
                );
              })}
              {order.discount_total > 0 && (
                <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/10">
                  <TableCell colSpan={4} className="text-right font-medium text-emerald-600">
                    <div className="flex items-center justify-end gap-2">
                      <Tag className="h-4 w-4" />
                      Order Discount
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    -{formatCurrency(order.discount_total)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Summary & Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Order Summary</h4>
          <div className="bg-muted/20 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-emerald-600">-{formatCurrency(order.discount_total || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(order.shipping_total || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.tax_total || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between py-1 font-bold text-base">
              <span>Total</span>
              <span className="text-lg">{formatCurrency(order.total || 0)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Payment Details</h4>
          <div className="bg-muted/20 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium capitalize">
                {paymentBreakdown.paymentMethod || order.payment_method || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Total Amount</span>
              <span>{formatCurrency(order.total || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="text-emerald-600">{formatCurrency(paymentBreakdown.totalPaid || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Change</span>
              <span className="text-emerald-600 font-medium">
                {paymentBreakdown.changeAmount > 0 ? formatCurrency(paymentBreakdown.changeAmount) : '—'}
              </span>
            </div>
            {paymentBreakdown.remainingBalance > 0 && (
              <div className="flex justify-between py-1 text-amber-600">
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="font-medium">{formatCurrency(paymentBreakdown.remainingBalance)}</span>
              </div>
            )}
            {order.payment_status === 'authorized' && onCapturePayment && (
              <div className="mt-3">
                <Button
                  onClick={onCapturePayment}
                  disabled={isCapturing}
                  className="w-full"
                  size="sm"
                >
                  {isCapturing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4 mr-2" />
                  )}
                  Capture Payment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
  onCapturePayment,
  onMarkAsPaid,
  isLoading,
  captureLoading
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
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
          ) : orderType === 'orders' ?
            <StatusDropdown
              currentStatus={order.status != 'completed' ? order?.delivery?.delivery_status != 'delivered' ? order?.delivery?.delivery_status : order.status : order.status}
              paymentStatus={order.payment_status}
              onStatusChange={(status) => onStatusUpdate(order.id, status)}
              onCapturePayment={() => onCapturePayment(order)}
              onMarkAsPaid={() => onMarkAsPaid(order)}
              canCapturePayment={order.payment_status === 'authorized' || order.payment_status === 'not_paid'}
              disabled={isLoading || captureLoading}
            />
            : (
              <OrderStatusBadge status={order.status} />
            )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm bg-muted/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            {order.customer?.first_name || order.customer_name || order.email?.split('@')[0] || 'Guest'}
          </span>
          {order?.metadata?.beeper_ids?.length && ` | ${order?.metadata?.beeper_ids.join(',')}`}
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
            {order.discount_total > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium ml-1 text-emerald-600">-₱{(order.discount_total || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <div className="text-lg font-bold">
            ₱{(order.total || 0).toFixed(2)}
          </div>
          {order.eta && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              ETA: {format(new Date(order.eta), 'h:mm a')}
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => onView(order)}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
};

// ============================================
// MAIN ORDERS CLIENT COMPONENT
// ============================================

interface OrdersClientProps {
  initialFilters: Record<string, any>;
  initialPage: number;
  initialLimit: number;
  initialSortField: string;
  initialSortOrder: 'asc' | 'desc';
  user: any;
  orderType: 'orders' | 'drafts';
}

export function OrdersClient({
  initialFilters,
  initialPage,
  initialLimit,
  initialSortField,
  initialSortOrder,
  user,
  orderType
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  
  // Debounce timer ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get today's date for default filter
  const getTodayDefault = useCallback(() => {
    const today = new Date();
    return {
      from: startOfDay(today),
      to: endOfDay(today)
    };
  }, []);

  // Initialize state from URL params or defaults
  const [searchTerm, setSearchTerm] = useState(() => {
    const urlSearch = searchParams.get('search');
    return urlSearch || initialFilters?.search || '';
  });

  const [dateFrom, setDateFrom] = useState<Date | null>(() => {
    const urlDateFrom = searchParams.get('date_from');
    if (urlDateFrom) {
      const parsed = parseISO(urlDateFrom);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (initialFilters?.date_from) {
      const parsed = parseISO(initialFilters.date_from);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Default to today
    return getTodayDefault().from;
  });

  const [dateTo, setDateTo] = useState<Date | null>(() => {
    const urlDateTo = searchParams.get('date_to');
    if (urlDateTo) {
      const parsed = parseISO(urlDateTo);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (initialFilters?.date_to) {
      const parsed = parseISO(initialFilters.date_to);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Default to today
    return getTodayDefault().to;
  });

  const [pagination, setPagination] = useState({
    count: 0,
    page: initialPage,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });

  // Get pagination params from URL
  const page = parseInt(searchParams.get('page') || String(initialPage));
  const limit = parseInt(searchParams.get('limit') || String(initialLimit));

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

  // Build filters
  const buildFilters = useCallback(() => {
    const filters: Record<string, any> = {
      seller_id: user?.id,
      company_id: user?.employee?.company_id || user?.driver?.company_id,
      status_not_in: ['canceled', 'refunded']
    };

    if (orderType === 'drafts') {
      filters.is_draft = true;
    }

    if (searchTerm) {
      filters.search = searchTerm;
    }

    // Date filtering with timezone handling (Philippine Time UTC+8)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setUTCHours(16, 0, 0, 0); // 16:00 UTC = 00:00 PHT next day
      filters.created_at_gte = fromDate.toISOString();
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setUTCHours(15, 59, 59, 999); // 15:59:59 UTC = 23:59 PHT
      filters.created_at_lte = toDate.toISOString();
    }

    // If no date filters are explicitly set, default to today
    if (!dateFrom && !dateTo) {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setUTCHours(16, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setUTCHours(15, 59, 59, 999);
      filters.created_at_gte = startOfDay.toISOString();
      filters.created_at_lte = endOfDay.toISOString();
    }

    return filters;
  }, [user, orderType, searchTerm, dateFrom, dateTo]);

  // Fetch orders - immediate with no artificial delay
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = buildFilters();
      const offset = (page - 1) * limit;

      const response = await listPosOrders(limit, offset, filters);

      const sortedOrders = sortOrders(response.orders || [], initialSortField, initialSortOrder);

      setOrders(sortedOrders);
      setPagination({
        count: response.count || 0,
        page: response.page || 1,
        total_pages: response.total_pages || 1,
        has_next: response.has_next || false,
        has_previous: response.has_previous || false
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [buildFilters, limit, page, initialSortField, initialSortOrder]);

  // Fetch immediately when dependencies change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Update URL params - immediate update
  const updateUrlParams = useCallback((updates: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '' || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    // Preserve the type param
    params.set('type', orderType);

    // If date filters are being removed, ensure we keep the default today filter
    if (updates.date_from === null && updates.date_to === null) {
      const today = getTodayDefault();
      params.set('date_from', format(today.from, 'yyyy-MM-dd'));
      params.set('date_to', format(today.to, 'yyyy-MM-dd'));
    }

    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, orderType, getTodayDefault]);

  // Handlers - immediate updates without artificial delays
  const handlePageChange = useCallback((newPage: number) => {
    updateUrlParams({ page: newPage });
  }, [updateUrlParams]);

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    
    // Clear existing debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Debounce search to avoid too many requests
    searchDebounceRef.current = setTimeout(() => {
      updateUrlParams({ search: term || null, page: 1 });
    }, 300);
  }, [updateUrlParams]);

  // Immediate date change - no debounce
  const handleDateChange = useCallback((from: Date | null, to: Date | null) => {
    setDateFrom(from);
    setDateTo(to);

    if (!from && !to) {
      // If clearing dates, reset to today's default
      const today = getTodayDefault();
      updateUrlParams({
        date_from: format(today.from, 'yyyy-MM-dd'),
        date_to: format(today.to, 'yyyy-MM-dd'),
        page: 1
      });
    } else {
      updateUrlParams({
        date_from: from ? format(from, 'yyyy-MM-dd') : null,
        date_to: to ? format(to, 'yyyy-MM-dd') : null,
        page: 1
      });
    }
  }, [updateUrlParams, getTodayDefault]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const result = await updatePosOrderStatus(orderId, status);
      if (result.success) {
        toast.success(`Order status updated to ${status}`);
        await fetchOrders();
        setViewDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleCapturePayment = async (amount: number, discountCode?: string) => {
    setCaptureLoading(true);
    try {
      const result = await captureOrderPayment({
        order_id: selectedOrder?.id,
        payment_method: 'cash',
        payment_data: {
          amount: amount,
          received: amount,
          change: amount - (selectedOrder?.total || 0),
          discount_code: discountCode
        }
      });

      if (result?.id) {
        toast.success('Payment captured successfully');
        await fetchOrders();
        setCaptureDialogOpen(false);
        setViewDialogOpen(false);
      }
    } catch (error) {
      toast.error('Failed to capture payment');
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleMarkAsPaid = async (orderData: any) => {
    try {
      const response = await markAsPaid(orderData?.payment_collections[0].id, orderData?.id);
      if (response) {
        toast.success('Order marked as paid');
        await fetchOrders();
      }
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };

  const handleDelete = async (order: any) => {
    try {
      let result;
      if (orderType === 'drafts') {
        result = await deleteDraftOrder(order.id);
      } else {
        result = await deletePosOrder(order.id);
      }

      if (result.success) {
        toast.success(`${orderType === 'drafts' ? 'Draft order' : 'Order'} deleted successfully`);
        await fetchOrders();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to delete ${orderType === 'drafts' ? 'draft order' : 'order'}`);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleConvertToOrder = async (order: any) => {
    try {
      const result = await convertDraftToOrder(order.id);
      if (result.success) {
        toast.success('Draft order converted to regular order successfully');
        await fetchOrders();
        const params = new URLSearchParams(searchParams.toString());
        params.set('type', 'orders');
        router.push(`${pathname}?${params.toString()}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to convert draft order');
    } finally {
      setConvertDialogOpen(false);
    }
  };

  const handleView = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleDeleteDialog = (order: any) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleConvertDialog = (order: any) => {
    setSelectedOrder(order);
    setConvertDialogOpen(true);
  };

  const handleCaptureDialog = (order: any) => {
    setSelectedOrder(order);
    setCaptureDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Search Section */}
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
            <DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={handleDateChange}
              onClear={() => handleDateChange(null, null)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOrders();
                toast.success('Orders refreshed');
              }}
              disabled={isLoading}
              className="h-10 gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
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
                    <TableHead className="font-medium text-left min-w-[60px]">Items</TableHead>
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
                              {order?.metadata?.beeper_ids?.length && ` | ${order?.metadata?.beeper_ids.join(',')}`}
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
                              currentStatus={order.status != 'completed' ? order?.delivery?.delivery_status != 'delivered' ? order?.delivery?.delivery_status : order.status : order.status}
                              paymentStatus={order.payment_status}
                              onStatusChange={(status) => handleStatusUpdate(order.id, status)}
                              onCapturePayment={() => handleCaptureDialog(order)}
                              onMarkAsPaid={() => handleMarkAsPaid(order)}
                              canCapturePayment={order.payment_status === 'authorized' || order.payment_status === 'not_paid'}
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
                      <TableCell>
                        <div className="flex flex-col items-center justify-center">
                          <div className="font-medium">
                            {order.items?.length || order.items_count || 0}
                          </div>
                          <div className={`text-xs text-muted-foreground flex items-center gap-1 ${order?.metadata?.isTakeOut ? 'text-primary' : ''}`}>
                            {order?.metadata?.isTakeOut ? 'TAKE-OUT' : 'DINE-IN'}
                          </div>
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
                                {order?.delivery?.eta ? formatDistanceToNow(new Date(order?.delivery?.eta), { addSuffix: true }) : format(new Date(order.created_at), 'h:mm a')}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {order.created_at && formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(order)}
                          className="h-8 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                onStatusUpdate={handleStatusUpdate}
                onCapturePayment={handleCaptureDialog}
                onMarkAsPaid={handleMarkAsPaid}
                isLoading={isLoading}
                captureLoading={captureLoading}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={pagination.total_pages}
          hasNext={pagination.has_next}
          hasPrevious={pagination.has_previous}
          total={pagination.count}
          orderType={orderType}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />

        {/* View Order Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {orderType === 'drafts' ? 'Draft Order Details' : 'Order Details'}
              </DialogTitle>
              <DialogDescription>
                Complete order information including items, payments, and notes
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <DetailedOrderView
                order={selectedOrder}
                isDraft={orderType === 'drafts'}
                onStatusUpdate={(status) => handleStatusUpdate(selectedOrder.id, status)}
                onCapturePayment={() => handleCaptureDialog(selectedOrder)}
                isCapturing={captureLoading}
              />
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex-1 flex gap-2">
                {orderType === 'drafts' && selectedOrder && (
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      setConvertDialogOpen(true);
                    }}
                    variant="default"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Convert to Order
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Capture Payment Dialog */}
        <CapturePaymentDialog
          open={captureDialogOpen}
          onOpenChange={setCaptureDialogOpen}
          order={selectedOrder}
          onCapture={handleCapturePayment}
          isCapturing={captureLoading}
        />

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
              <AlertDialogAction onClick={() => selectedOrder && handleConvertToOrder(selectedOrder)}>
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
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}