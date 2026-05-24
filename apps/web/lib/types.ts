import {
  CartDTO,
  CartLineItemDTO,
  OrderDTO,
  OrderLineItemDTO,
  ProductDTO,
} from "@medusajs/types";

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
