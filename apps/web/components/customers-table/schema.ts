// schema.ts
import { z } from "zod";

// ==================== Enums ====================

export const customerStatusSchema = z.enum([
  "active",
  "inactive",
  "vip",
  "at_risk",
  "pending",
  "suspended",
  "blocked",
]);

export const customerRoleSchema = z.enum([
  "customer",
  "admin",
  "company_admin",
  "company_employee",
  "guest",
]);

export const customerSegmentSchema = z.enum([
  "premium",
  "regular",
  "new",
  "at_risk",
  "churned",
  "vip",
  "wholesale",
]);

export const customerTierSchema = z.enum([
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

export const customerLifecycleStageSchema = z.enum([
  "new",
  "active",
  "engaged",
  "at_risk",
  "churned",
  "reactivated",
]);

// ==================== Address Schema ====================

export const customerAddressSchema = z.object({
  id: z.string().optional(),
  address_1: z.string().min(1, "Address line 1 is required"),
  address_2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province/State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country_code: z.string().length(2, "Country code must be 2 characters"),
  phone: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
  is_shipping: z.boolean().default(true),
  is_billing: z.boolean().default(false),
});

// ==================== Metadata Schema ====================

export const customerMetadataSchema = z.object({
  role: customerRoleSchema.default("customer"),
  company_id: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  status: customerStatusSchema.default("active"),
  segment: customerSegmentSchema.optional(),
  tier: customerTierSchema.default("bronze"),
  tags: z.array(z.string()).default([]),
  total_spent: z.number().min(0).default(0),
  order_count: z.number().int().min(0).default(0),
  last_order_date: z.string().datetime().optional().nullable(),
  average_order_value: z.number().min(0).default(0),
  lifetime_value: z.number().min(0).default(0),
  preferred_payment_method: z.string().optional(),
  preferred_shipping_method: z.string().optional(),
  marketing_consent: z.boolean().default(false),
  email_verified: z.boolean().default(false),
  phone_verified: z.boolean().default(false),
  notes: z.string().optional(),
  birth_date: z.string().date().optional().nullable(),
  tax_id: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
});

// ==================== Customer Schema ====================

export const customerSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email format"),
  first_name: z.string().min(1, "First name is required").optional().nullable(),
  last_name: z.string().min(1, "Last name is required").optional().nullable(),
  phone: z.string().regex(/^\+63\d{10}$/, "Invalid Philippine phone number format").optional().nullable(),
  has_account: z.boolean().default(true),
  metadata: customerMetadataSchema.optional().nullable(),
  addresses: z.array(customerAddressSchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional().nullable(),
});

// ==================== Table Row Schema ====================

export const customerRowSchema = customerSchema.extend({
  // Computed fields for table display
  full_name: z.string().optional(),
  display_name: z.string().optional(),
  city: z.string().optional(),
  total_orders: z.number().int().min(0).default(0),
  total_spent: z.number().min(0).default(0),
  status: customerStatusSchema.default("active"),
  joined_date: z.string(),
  last_order_date: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  
  // Additional computed fields
  average_order_value: z.number().min(0).default(0),
  days_since_last_order: z.number().int().nullable(),
  lifecycle_stage: customerLifecycleStageSchema.default("new"),
  is_active: z.boolean().default(false),
  is_vip: z.boolean().default(false),
});

// ==================== Filter and Query Schemas ====================

export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(customerStatusSchema).optional(),
  role: z.array(customerRoleSchema).optional(),
  segment: z.array(customerSegmentSchema).optional(),
  tier: z.array(customerTierSchema).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  tags: z.array(z.string()).optional(),
  min_spent: z.number().min(0).optional(),
  max_spent: z.number().min(0).optional(),
  min_orders: z.number().int().min(0).optional(),
  max_orders: z.number().int().min(0).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  last_order_from: z.string().datetime().optional(),
  last_order_to: z.string().datetime().optional(),
  has_company: z.boolean().optional(),
  company_id: z.string().optional(),
  sort_by: z.enum([
    "created_at",
    "updated_at",
    "email",
    "first_name",
    "last_name",
    "total_spent",
    "total_orders",
    "last_order_date",
    "average_order_value",
  ]).default("created_at"),
  sort_order: z.enum(["ASC", "DESC"]).default("DESC"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const customerBulkActionSchema = z.object({
  customer_ids: z.array(z.string()).min(1, "At least one customer must be selected"),
  action: z.enum([
    "activate",
    "deactivate",
    "mark_vip",
    "remove_vip",
    "add_tags",
    "remove_tags",
    "change_status",
    "change_segment",
    "change_tier",
    "send_email",
    "export",
    "delete",
  ]),
  data: z.record(z.any()).optional(),
});

// ==================== Export Types ====================

export type CustomerStatus = z.infer<typeof customerStatusSchema>;
export type CustomerRole = z.infer<typeof customerRoleSchema>;
export type CustomerSegment = z.infer<typeof customerSegmentSchema>;
export type CustomerTier = z.infer<typeof customerTierSchema>;
export type CustomerLifecycleStage = z.infer<typeof customerLifecycleStageSchema>;
export type CustomerAddress = z.infer<typeof customerAddressSchema>;
export type CustomerMetadata = z.infer<typeof customerMetadataSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CustomerRow = z.infer<typeof customerRowSchema>;
export type CustomerFilters = z.infer<typeof customerFiltersSchema>;
export type CustomerBulkAction = z.infer<typeof customerBulkActionSchema>;

// ==================== Helper Functions ====================

/**
 * Get full name from customer
 */
export const getFullName = (customer: Customer | CustomerRow): string => {
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return customer.email.split('@')[0];
};

/**
 * Get display name (full name or email)
 */
export const getDisplayName = (customer: Customer | CustomerRow): string => {
  const fullName = getFullName(customer);
  return fullName !== customer.email ? fullName : customer.email;
};

/**
 * Get customer initials for avatar
 */
export const getCustomerInitials = (customer: Customer | CustomerRow): string => {
  const fullName = getFullName(customer);
  const names = fullName.split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get status label for display
 */
export const getCustomerStatusLabel = (status: CustomerStatus): string => {
  const labels: Record<CustomerStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    vip: "VIP",
    at_risk: "At Risk",
    pending: "Pending",
    suspended: "Suspended",
    blocked: "Blocked",
  };
  return labels[status];
};

/**
 * Get status color classes for table badges
 */
export const getCustomerStatusColor = (status: CustomerStatus): string => {
  const colors: Record<CustomerStatus, string> = {
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-gray-100 text-gray-800 border-gray-200",
    vip: "bg-amber-100 text-amber-800 border-amber-200",
    at_risk: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    suspended: "bg-orange-100 text-orange-800 border-orange-200",
    blocked: "bg-gray-200 text-gray-800 border-gray-300",
  };
  return colors[status];
};

/**
 * Get status icon name
 */
export const getCustomerStatusIcon = (status: CustomerStatus): string => {
  const icons: Record<CustomerStatus, string> = {
    active: "CheckCircle2",
    inactive: "XCircle",
    vip: "Star",
    at_risk: "AlertCircle",
    pending: "Clock",
    suspended: "Ban",
    blocked: "ShieldX",
  };
  return icons[status];
};

/**
 * Get customer tier label
 */
export const getCustomerTierLabel = (tier: CustomerTier): string => {
  const labels: Record<CustomerTier, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
    diamond: "Diamond",
  };
  return labels[tier];
};

/**
 * Get customer tier color
 */
export const getCustomerTierColor = (tier: CustomerTier): string => {
  const colors: Record<CustomerTier, string> = {
    bronze: "bg-amber-600 text-white",
    silver: "bg-gray-400 text-white",
    gold: "bg-yellow-500 text-white",
    platinum: "bg-slate-300 text-slate-900",
    diamond: "bg-cyan-500 text-white",
  };
  return colors[tier];
};

/**
 * Get customer segment label
 */
export const getCustomerSegmentLabel = (segment: CustomerSegment): string => {
  const labels: Record<CustomerSegment, string> = {
    premium: "Premium",
    regular: "Regular",
    new: "New",
    at_risk: "At Risk",
    churned: "Churned",
    vip: "VIP",
    wholesale: "Wholesale",
  };
  return labels[segment];
};

/**
 * Get customer segment color
 */
export const getCustomerSegmentColor = (segment: CustomerSegment): string => {
  const colors: Record<CustomerSegment, string> = {
    premium: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
    regular: "bg-blue-100 text-blue-800",
    new: "bg-emerald-100 text-emerald-800",
    at_risk: "bg-red-100 text-red-800",
    churned: "bg-gray-100 text-gray-800",
    vip: "bg-purple-100 text-purple-800",
    wholesale: "bg-indigo-100 text-indigo-800",
  };
  return colors[segment];
};

/**
 * Get lifecycle stage label
 */
export const getLifecycleStageLabel = (stage: CustomerLifecycleStage): string => {
  const labels: Record<CustomerLifecycleStage, string> = {
    new: "New",
    active: "Active",
    engaged: "Engaged",
    at_risk: "At Risk",
    churned: "Churned",
    reactivated: "Reactivated",
  };
  return labels[stage];
};

/**
 * Get lifecycle stage color
 */
export const getLifecycleStageColor = (stage: CustomerLifecycleStage): string => {
  const colors: Record<CustomerLifecycleStage, string> = {
    new: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    engaged: "bg-teal-100 text-teal-800",
    at_risk: "bg-orange-100 text-orange-800",
    churned: "bg-red-100 text-red-800",
    reactivated: "bg-purple-100 text-purple-800",
  };
  return colors[stage];
};

/**
 * Calculate customer tier based on total spent
 */
export const calculateCustomerTier = (totalSpent: number): CustomerTier => {
  if (totalSpent >= 500000) return "diamond";
  if (totalSpent >= 100000) return "platinum";
  if (totalSpent >= 50000) return "gold";
  if (totalSpent >= 10000) return "silver";
  return "bronze";
};

/**
 * Calculate lifecycle stage based on orders and last order date
 */
export const calculateLifecycleStage = (
  totalOrders: number,
  lastOrderDate: string | null
): CustomerLifecycleStage => {
  if (totalOrders === 0) return "new";
  if (!lastOrderDate) return "churned";
  
  const lastOrder = new Date(lastOrderDate);
  const now = new Date();
  const daysSinceLastOrder = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastOrder <= 7) return "engaged";
  if (daysSinceLastOrder <= 30) return "active";
  if (daysSinceLastOrder <= 60) return "at_risk";
  if (daysSinceLastOrder <= 180) return "churned";
  return "churned";
};

/**
 * Calculate days since last order
 */
export const getDaysSinceLastOrder = (lastOrderDate: string | null): number | null => {
  if (!lastOrderDate) return null;
  const lastOrder = new Date(lastOrderDate);
  const now = new Date();
  return Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if customer is active (ordered in last 90 days)
 */
export const isCustomerActive = (lastOrderDate: string | null): boolean => {
  if (!lastOrderDate) return false;
  const daysSince = getDaysSinceLastOrder(lastOrderDate);
  return daysSince !== null && daysSince <= 90;
};

/**
 * Format currency to PHP
 */
export const formatPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return '';
  // Convert +639123456789 to +63 912 345 6789
  if (phone.startsWith('+63')) {
    const national = phone.slice(3);
    if (national.length === 10) {
      return `+63 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
    }
  }
  return phone;
};

/**
 * Validate Philippine phone number
 */
export const isValidPhilippinePhone = (phone: string): boolean => {
  const phoneRegex = /^\+63\d{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Calculate average order value
 */
export const calculateAverageOrderValue = (totalSpent: number, totalOrders: number): number => {
  if (totalOrders === 0) return 0;
  return totalSpent / totalOrders;
};

/**
 * Get customer summary for tooltips
 */
export const getCustomerSummary = (customer: CustomerRow): string => {
  const fullName = getFullName(customer);
  const avgOrder = calculateAverageOrderValue(customer.total_spent, customer.total_orders);
  const lastOrder = customer.last_order_date 
    ? new Date(customer.last_order_date).toLocaleDateString() 
    : "No orders yet";
  
  return `${fullName} • ${customer.total_orders} orders • ${formatPHP(customer.total_spent)} total • Last order: ${lastOrder} • Avg order: ${formatPHP(avgOrder)}`;
};

/**
 * Get suggested tags based on customer behavior
 */
export const getSuggestedTags = (customer: CustomerRow): string[] => {
  const suggestions: string[] = [];
  
  if (customer.total_spent >= 50000) suggestions.push("high-spender");
  if (customer.total_orders >= 20) suggestions.push("frequent-buyer");
  if (isCustomerActive(customer.last_order_date)) suggestions.push("recently-active");
  if (customer.total_orders === 0) suggestions.push("no-orders");
  if (customer.status === "vip") suggestions.push("vip");
  if (customer.metadata?.segment === "wholesale") suggestions.push("wholesale");
  if (customer.metadata?.has_company) suggestions.push("b2b");
  
  const daysSince = getDaysSinceLastOrder(customer.last_order_date);
  if (daysSince && daysSince > 180) suggestions.push("lapsed");
  
  return suggestions;
};

/**
 * Get customer analytics summary
 */
export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  atRiskCustomers: number;
  newCustomers30d: number;
  averageOrderValue: number;
  totalRevenue: number;
  topTiers: Record<CustomerTier, number>;
  topSegments: Record<CustomerSegment, number>;
  topCities: Array<{ city: string; count: number }>;
}

/**
 * Generate customer analytics from array of customers
 */
export const generateCustomerAnalytics = (customers: CustomerRow[]): CustomerAnalytics => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
  
  const analytics: CustomerAnalytics = {
    totalCustomers: customers.length,
    activeCustomers: 0,
    vipCustomers: 0,
    atRiskCustomers: 0,
    newCustomers30d: 0,
    averageOrderValue: 0,
    totalRevenue: 0,
    topTiers: {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    },
    topSegments: {
      premium: 0,
      regular: 0,
      new: 0,
      at_risk: 0,
      churned: 0,
      vip: 0,
      wholesale: 0,
    },
    topCities: [],
  };
  
  const cityCount = new Map<string, number>();
  let totalRevenue = 0;
  let totalOrders = 0;
  
  customers.forEach(customer => {
    // Count active customers
    if (isCustomerActive(customer.last_order_date)) {
      analytics.activeCustomers++;
    }
    
    // Count VIP customers
    if (customer.status === "vip") {
      analytics.vipCustomers++;
    }
    
    // Count at-risk customers
    if (customer.status === "at_risk") {
      analytics.atRiskCustomers++;
    }
    
    // Count new customers (joined in last 30 days)
    if (new Date(customer.created_at) >= thirtyDaysAgo) {
      analytics.newCustomers30d++;
    }
    
    // Calculate revenue and orders
    totalRevenue += customer.total_spent;
    totalOrders += customer.total_orders;
    
    // Count tiers
    const tier = customer.metadata?.tier || calculateCustomerTier(customer.total_spent);
    analytics.topTiers[tier]++;
    
    // Count segments
    const segment = customer.metadata?.segment || "regular";
    if (segment in analytics.topSegments) {
      analytics.topSegments[segment as CustomerSegment]++;
    }
    
    // Count cities
    if (customer.city) {
      cityCount.set(customer.city, (cityCount.get(customer.city) || 0) + 1);
    }
  });
  
  analytics.totalRevenue = totalRevenue;
  analytics.averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  analytics.topCities = Array.from(cityCount.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return analytics;
};

/**
 * Validate and clean customer data for API submission
 */
export const prepareCustomerForApi = (data: Partial<CustomerRow>) => {
  return {
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    metadata: {
      ...data.metadata,
      status: data.status,
      tags: data.tags,
      total_spent: data.total_spent,
      order_count: data.total_orders,
      last_order_date: data.last_order_date,
    },
  };
};

/**
 * Convert Medusa customer to CustomerRow format
 */
export const convertMedusaCustomerToRow = (medusaCustomer: any): CustomerRow => {
  const metadata = medusaCustomer.metadata || {};
  const totalSpent = metadata.total_spent || 0;
  const totalOrders = metadata.order_count || 0;
  const lastOrderDate = metadata.last_order_date || null;
  
  return {
    id: medusaCustomer.id,
    email: medusaCustomer.email,
    first_name: medusaCustomer.first_name,
    last_name: medusaCustomer.last_name,
    phone: medusaCustomer.phone,
    has_account: true,
    metadata,
    addresses: medusaCustomer.addresses || [],
    created_at: medusaCustomer.created_at,
    updated_at: medusaCustomer.updated_at,
    deleted_at: medusaCustomer.deleted_at,
    full_name: getFullName(medusaCustomer),
    display_name: getDisplayName(medusaCustomer),
    city: metadata.city,
    total_orders: totalOrders,
    total_spent: totalSpent,
    status: metadata.status || "active",
    joined_date: medusaCustomer.created_at,
    last_order_date: lastOrderDate,
    tags: metadata.tags || [],
    average_order_value: calculateAverageOrderValue(totalSpent, totalOrders),
    days_since_last_order: getDaysSinceLastOrder(lastOrderDate),
    lifecycle_stage: calculateLifecycleStage(totalOrders, lastOrderDate),
    is_active: isCustomerActive(lastOrderDate),
    is_vip: metadata.status === "vip",
  };
};