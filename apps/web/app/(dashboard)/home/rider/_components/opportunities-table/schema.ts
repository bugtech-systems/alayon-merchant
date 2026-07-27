import z from "zod";

// Status enum for validation
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

export const waterDeliveryOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.string(),
  status: orderStatusSchema,
  remainingStock: z.number().min(0),
  previousOrderQty: z.number().positive(),
  quantity: z.number().positive(),
  total: z.number().positive(),
});

// Type for a single order
export type WaterDeliveryOrder = z.infer<typeof waterDeliveryOrderSchema>;

// Array of orders
export const waterDeliveryOrdersSchema = z.array(waterDeliveryOrderSchema);

// Optional: Export status type for reuse
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Helper to get human-readable status label
export const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    pending: "Pending",
    company_declined: "Company Declined",
    company_accepted: "Accepted",
    pickup_claimed: "Pickup Claimed",
    company_preparing: "Company Preparing",
    ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
  };
  return labels[status];
};

// Helper to get stock health level
export const getStockHealthLevel = (remainingStock: number, previousOrderQty: number): "high" | "medium" | "low" => {
  const percentage = (remainingStock / previousOrderQty) * 100;
  if (percentage >= 60) return "high";
  if (percentage >= 30) return "medium";
  return "low";
};

// Helper to get stock health score (0-10)
export const getStockHealthScore = (remainingStock: number, previousOrderQty: number): number => {
  if (remainingStock <= 0) return 0;
  const percentage = (remainingStock / previousOrderQty) * 100;
  if (percentage >= 80) return 10;
  if (percentage >= 60) return 8;
  if (percentage >= 40) return 6;
  if (percentage >= 20) return 4;
  return 2;
};