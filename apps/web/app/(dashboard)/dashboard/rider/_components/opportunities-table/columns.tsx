"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Status variants for badges
const statusConfig = {
  pending: { label: "Pending", variant: "secondary" },
  company_declined: { label: "Company Declined", variant: "destructive" },
  company_accepted: { label: "Company Accepted", variant: "default" },
  pickup_claimed: { label: "Pickup Claimed", variant: "outline" },
  company_preparing: { label: "Company Preparing", variant: "outline" },
  ready_for_pickup: { label: "Ready for Pickup", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
} as const;

// Stock health bar slots
const stockHealthSlots = Array.from({ length: 10 }, (_, index) => ({
  id: `stock-slot-${index + 1}`,
  threshold: index + 1,
}));

// Helper to convert remaining stock to health score (0-10)
function getStockHealthScore(remainingStock: number, previousOrderQty: number) {
  if (remainingStock <= 0) return 0;
  const percentage = (remainingStock / previousOrderQty) * 100;
  if (percentage >= 80) return 10;
  if (percentage >= 60) return 8;
  if (percentage >= 40) return 6;
  if (percentage >= 20) return 4;
  return 2;
}

export interface WaterDeliveryOrder {
  id: string;
  orderNumber: string;
  customer: string;
  status: keyof typeof statusConfig;
  remainingStock: number; // from previous order
  previousOrderQty: number;
  quantity: number;
  total: number;
}

export const waterDeliveryColumns: ColumnDef<WaterDeliveryOrder>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all orders"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.orderNumber}`}
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => (
      <div className="font-mono text-sm font-medium">
        {row.original.orderNumber}
      </div>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="font-medium text-sm">{row.original.customer}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusConfig[status];
      return (
        <Badge variant={config.variant as any} className="rounded-full px-2.5">
          {config.label}
        </Badge>
      );
    },
    filterFn: "equalsString",
  },
  {
    accessorKey: "stockHealth",
    header: "Stock Bar",
    cell: ({ row }) => {
      const { remainingStock, previousOrderQty } = row.original;
      const healthScore = getStockHealthScore(remainingStock, previousOrderQty);
      
      return (
        <div className="flex items-end gap-0.5" title={`${remainingStock} units remaining from previous order`}>
          <span className="sr-only">
            Stock health: {Math.round((remainingStock / previousOrderQty) * 100)}% remaining
          </span>
          {stockHealthSlots.map((slot) => (
            <div
              key={`${row.original.id}-${slot.id}`}
              className={cn(
                "h-5 w-1.5 rounded-full transition-colors",
                slot.threshold <= healthScore 
                  ? "bg-emerald-500/85" 
                  : healthScore <= 2 
                    ? "bg-red-500/15"
                    : "bg-emerald-500/15"
              )}
            />
          ))}
        </div>
      );
    },
    filterFn: (row, id, filterValue: string) => {
      const { remainingStock, previousOrderQty } = row.original;
      const percentage = (remainingStock / previousOrderQty) * 100;
      
      switch (filterValue) {
        case "high":
          return percentage >= 60;
        case "medium":
          return percentage >= 30 && percentage < 60;
        case "low":
          return percentage < 30;
        default:
          return true;
      }
    },
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => (
      <div className="text-sm tabular-nums">
        {row.original.quantity.toLocaleString()} units
      </div>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <div className="font-medium text-sm tabular-nums">
        ₱{row.original.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
  },
];