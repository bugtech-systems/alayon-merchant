import { z } from "zod";

// Order status enum - aligned with the 8 statuses
export const orderStatusSchema = z.enum([
  "pending",
  "company_declined",
  "company_accepted",
  "pickup_claimed",
  "company_preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
]);

// Water order row schema - specifically for table display
export const waterOrderRowSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.string(),
  customerPhone: z.string().regex(/^\+63\d{10}$/, "Invalid Philippine phone number format"),
  location: z.string(),
  address: z.string(),
  status: orderStatusSchema,
  quantity: z.number().positive().int(),
  total: z.number().positive(),
  assignedDriver: z.string().nullable().default(null),
  assignedDriverId: z.string().nullable().default(null),
  orderDate: z.string(),
  remainingStock: z.number().min(0).default(0),
  previousOrderQty: z.number().positive().default(0),
  notes: z.string().optional(),
});

// Export type for use in components
export type WaterOrderRow = z.infer<typeof waterOrderRowSchema>;

// Helper: Get status label for display
export const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    pending: "Pending",
    company_declined: "Declined",
    company_accepted: "Accepted",
    pickup_claimed: "Pickup Claimed",
    company_preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
  };
  return labels[status];
};

// Helper: Get status color classes for table badges
export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    company_declined: "bg-red-100 text-red-800 border-red-200",
    company_accepted: "bg-blue-100 text-blue-800 border-blue-200",
    pickup_claimed: "bg-purple-100 text-purple-800 border-purple-200",
    company_preparing: "bg-indigo-100 text-indigo-800 border-indigo-200",
    ready_for_pickup: "bg-cyan-100 text-cyan-800 border-cyan-200",
    in_transit: "bg-emerald-100 text-emerald-800 border-emerald-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
  };
  return colors[status];
};

// Helper: Format currency to PHP
export const formatPHP = (amount: number): string => {
  return `₱${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper: Check if order needs driver assignment
export const needsDriverAssignment = (order: WaterOrderRow): boolean => {
  return (order.status === "ready_for_pickup" || order.status === "company_accepted") && !order.assignedDriver;
};

// Helper: Get stock health level
export const getStockHealthLevel = (remainingStock: number, previousOrderQty: number): "high" | "medium" | "low" => {
  if (previousOrderQty === 0) return "medium";
  const percentage = (remainingStock / previousOrderQty) * 100;
  if (percentage >= 60) return "high";
  if (percentage >= 30) return "medium";
  return "low";
};

// Helper: Get stock health percentage
export const getStockHealthPercentage = (remainingStock: number, previousOrderQty: number): number => {
  if (previousOrderQty === 0) return 0;
  return Math.min(100, (remainingStock / previousOrderQty) * 100);
};