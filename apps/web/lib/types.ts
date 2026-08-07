import {
  CartDTO,
  CartLineItemDTO,
  OrderDTO,
  OrderLineItemDTO,
  ProductDTO,
} from "@medusajs/types";

// types/print.types.ts

export interface PrintOrderData {
  // Merchant Details
  merchant: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    taxId?: string;
    website?: string;
  };
  
  // Order Details
  orderNumber: string;
  date: Date;
  
  // Customer Details
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Placement (for dine-in)
  placement?: {
    type: "table" | "takeaway" | "delivery";
    name: string;
  };
  
  // Order Items
  items: Array<{
    id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    variant?: string;
    notes?: string;
    is_giftcard?: boolean;
  }>;
  
  // Financials
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total?: number;
  total: number;
  
  // Payment
  paymentMethod: string;
  payments?: Array<{
    type: string;
    amount: number;
  }>;
  
  // Additional Info
  notes?: string;
  staff_note?: string;
}

export interface PrinterSettings {
  printerName?: string;
  paperSize: "58mm" | "80mm";
  copies: number;
  autoCut: boolean;
  printType: boolean;
}

export enum DeliveryStatus {
  PENDING = "pending",
  COMPANY_DECLINED = "company_declined",
  COMPANY_ACCEPTED = "company_accepted",
  PICKUP_CLAIMED = "pickup_claimed",
  COMPANY_PREPARING = "company_preparing",
  READY_FOR_PICKUP = "ready_for_pickup",
  IN_TRANSIT = "in_transit",
  DELIVERED = "delivered",
}

export interface CompanyDTO {
  id: string;
  handle: string;
  is_open: boolean;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
  products?: ProductDTO[];
  deliveries: DeliveryDTO[];
}

export interface CompanyDTO {
  id: string;
  handle: string;
  is_open: boolean;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
  products?: ProductDTO[];
  deliveries: DeliveryDTO[];
}

export interface RestaurantAdminDTO {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyProductDTO {
  company_id: string;
  product_id: string;
}

export interface CreateCompanyDTO {
  name: string;
  handle: string;
  address: string;
  phone: string;
  email: string;
  image_url?: string;
  is_open?: boolean;
}

export type UpdateRestaurantDTO = Partial<CreateCompanyDTO>;

export interface CreateRestaurantAdminDTO {
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
}

export interface CreateAdminInviteDTO {
  resadm_id: string;
  role?: string | null;
  email?: string;
}

export interface DeliveryDTO {
  id: string;
  transaction_id: string;
  driver_id?: string;
  cart: CartDTO;
  order?: OrderDTO;
  company: CompanyDTO;
  delivered_at?: Date;
  delivery_status: DeliveryStatus;
  created_at: Date;
  updated_at: Date;
  eta?: Date;
  items: DeliveryItemDTO[];
}

export type DeliveryItemDTO = (CartLineItemDTO | OrderLineItemDTO) & {
  quantity: number;
};

export interface DriverDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryDriverDTO {
  id: string;
  delivery_id: string;
  driver_id: string;
}

export interface CreateDeliveryDTO {
  company_id: string;
  cart_id: string;
}

export interface UpdateDeliveryDTO extends Partial<DeliveryDTO> {
  id: string;
}

export interface CreateDriverDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
}

export interface UpdateDriverDTO extends Partial<DriverDTO> {
  id: string;
}

export interface CreateDeliveryDriverDTO {
  delivery_id: string;
  driver_id: string;
}


// lib/water-production/types.ts
export interface ProductionRecord {
  id: string;
  timestamp: number;
  date: string;
  hour: number;
  containerSize: string;
  quantity: number;
  volumeLiters: number;
  machineId: string;
  operatorId: string;
  batchId: string;
  backwashCount: number;
  status: 'active' | 'completed';
}

export interface ProductionRefillInput {
  containerSize?: string;
  quantity: number;
  machineId?: string;
  operatorId?: string;
  batchId?: string;
  locationId?: string;
  itemId?: any;
}

export interface ProductionRefillResponse {
  success: boolean;
  data: {
    record: ProductionRecord;
    currentCount: number;
    backwashLimit: number;
    backwashNeeded: boolean;
    remaining: number;
  };
  message: string;
}

export interface BackwashInput {
  reason?: 'manual' | 'limit_reached' | 'scheduled';
  operatorId?: string;
}

export interface BackwashRecord {
  id: string;
  timestamp: number;
  date: string;
  previousCount: number;
  reason: string;
  operatorId: string;
}

export interface BackwashResponse {
  success: boolean;
  data: {
    previousCount: number;
    newCount: number;
    backwashRecord: BackwashRecord;
  };
  message: string;
}

export interface RealtimeStats {
  currentCount: number;
  backwashLimit: number;
  backwashNeeded: boolean;
  todayTotal: number;
  lastRefillTime: number | null;
  lastBackwashTime: number | null;
  lastContainerSize: string;
  lastQuantity: number;
}

export interface DailySummary {
  date: string;
  totalQuantity: number;
  totalVolume: number;
  totalRecords: number;
  backwashCount: number;
  peakHour: number;
  averagePerHour: number;
  containerSizes: Record<string, number>;
  hourlyBreakdown: HourlyStats[];
  machineState: {
    lastRefillTime: string | null;
    lastBackwashTime: string | null;
    currentCount: number;
  };
}

export interface HourlyStats {
  hour: number;
  quantity: number;
  volume: number;
  backwashCount: number;
}

export interface WeeklyTrendItem {
  date: string;
  totalQuantity: number;
  totalVolume: number;
  backwashCount: number;
}

export interface EfficiencyMetrics {
  averageDailyProduction: number;
  backwashFrequency: number;
  peakProductionHour: number;
  containerSizeDistribution: Record<string, number>;
  todayTotal: number;
  todayVolume: number;
}

export interface BackwashLimitResponse {
  success: boolean;
  data: {
    limit: number;
  };
}

export interface BackwashHistoryItem {
  id: string;
  timestamp: number;
  date: string;
  previousCount: number;
  reason: string;
  operatorId: string;
}

export interface ProductionRecordsResponse {
  success: boolean;
  data: ProductionRecord[];
  count: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  success: false;
  error: string;
}