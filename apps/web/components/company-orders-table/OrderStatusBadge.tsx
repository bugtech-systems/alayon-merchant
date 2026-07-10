
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  X,
  Building,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Status configuration with colors, labels, and icons
export const ORDER_STATUS_CONFIG: Record<string, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
  },
  driver_accepted: {
    label: "Driver Accepted",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  company_accepted: {
    label: "Accepted",
    icon: <Building className="h-3.5 w-3.5" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  preparing: {
    label: "Preparing",
    icon: <Package className="h-3.5 w-3.5" />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-200",
  },
  // ready_for_pickup: {
  //   label: "Ready for Pickup",
  //   icon: <Package className="h-3.5 w-3.5" />,
  //   color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  //   bgColor: "bg-cyan-100",
  //   textColor: "text-cyan-800",
  //   borderColor: "border-cyan-200",
  // },
  ready_for_pickup: {
    label: "Ready",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-800",
    borderColor: "border-cyan-200",
  },
  in_transit: {
    label: "In Transit",
    icon: <Truck className="h-3.5 w-3.5" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    borderColor: "border-emerald-200",
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-green-50 text-green-700 border-green-200",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-green-50 text-green-700 border-green-200",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  declined: {
    label: "Declined",
    icon: <X className="h-3.5 w-3.5" />,
    color: "bg-red-50 text-red-700 border-red-200",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: <X className="h-3.5 w-3.5" />,
    color: "bg-red-50 text-red-700 border-red-200",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-200",
  },
  refunded: {
    label: "Refunded",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",
  },
  // Default for unknown statuses
  default: {
    label: "Unknown",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    borderColor: "border-gray-200",
  },
};

interface OrderStatusBadgeProps {
  status: string;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "outline" | "soft";
}

export function OrderStatusBadge({
  status,
  showLabel = true,
  showIcon = true,
  size = "md",
  className,
  variant = "default",
}: OrderStatusBadgeProps) {
  const statusKey = status?.toLowerCase() || "default";
  const config = ORDER_STATUS_CONFIG[statusKey] || ORDER_STATUS_CONFIG.default as any;

  // Size mappings
  const sizeClasses = {
    sm: {
      badge: "px-2 py-0.5 text-xs",
      icon: "h-3 w-3",
      gap: "gap-1",
    },
    md: {
      badge: "px-2.5 py-0.5 text-sm",
      icon: "h-3.5 w-3.5",
      gap: "gap-1.5",
    },
    lg: {
      badge: "px-3 py-1 text-base",
      icon: "h-4 w-4",
      gap: "gap-2",
    },
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Variant styles
  const variantClasses = {
    default: `${config.bgColor} ${config.textColor} border ${config.borderColor}`,
    outline: "bg-transparent border-2",
    soft: `${config.bgColor} ${config.textColor}`,
  };

  return (
    <Badge
      className={cn(
        "font-medium whitespace-nowrap",
        variantClasses[variant],
        sizeClass.badge,
        sizeClass.gap,
        className
      )}
    >
      {showIcon && (
        <span className={cn("flex-shrink-0", sizeClass.icon)}>
          {config.icon}
        </span>
      )}
      {showLabel && (
        <span className="capitalize">{config.label}</span>
      )}
    </Badge>
  );
}

// ==================== Helper function to get status color ====================

export function getStatusColor(status: string): string {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || ORDER_STATUS_CONFIG.default as any;
  return config.color;
}

// ==================== Helper function to get status label ====================

export function getStatusLabel(status: string): string {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || ORDER_STATUS_CONFIG.default  as any; 
  return config.label;
}

// ==================== Helper function to get status icon ====================

export function getStatusIcon(status: string): React.ReactNode {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || ORDER_STATUS_CONFIG.default  as any;
  return config.icon;
}

// ==================== Status Dot Indicator (for compact views) ====================

interface StatusDotProps {
  status: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusDot({ status, size = "md", className }: StatusDotProps) {
  const config = ORDER_STATUS_CONFIG[status?.toLowerCase()] || ORDER_STATUS_CONFIG.default  as any;
  
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        sizeClasses[size],
        config.bgColor,
        className
      )}
    />
  );
}
