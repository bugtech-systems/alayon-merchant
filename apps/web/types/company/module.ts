export enum ModuleCompanySpendingLimitResetFrequency {
  NEVER = "never",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export type ModuleCompany = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  logo_url: string | null
  currency_code: string | null
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ModuleEmployee = {
  id: string
  company_id: string
  spending_limit: number
  is_admin: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}


// Admin Create Company Types
export interface AdminCreateCompany {
  name: string;
  handle: string;
  municipality: string;
  logo: File | null;
  banner: File | null;
  products: Array<{
    product_id: string;
    variants: Array<{
      variant_id: string;
      price: number;
    }>;
  }>;
}

export interface AdminUpdateCompany {
  name?: string;
  handle?: string;
  municipality?: string;
  logo?: File | string | null; // string for existing logo URL
  banner?: File | string | null; // string for existing banner URL
  products?: Array<{
    product_id: string;
    variants: Array<{
      variant_id: string;
      price: number;
    }>;
  }>;
}

// API Response Types
export interface AdminCompanyResponse {
  company: AdminCompany;
}

export interface AdminCompanyListResponse {
  companies: AdminCompany[];
  count: number;
  limit: number;
  offset: number;
}

export interface AdminCompany {
  id: string;
  name: string;
  handle: string;
  municipality: string;
  logo_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
  products?: CompanyProduct[];
}

export interface CompanyProduct {
  product_id: string;
  product_name: string;
  variants: CompanyVariant[];
}

export interface CompanyVariant {
  variant_id: string;
  variant_name: string;
  custom_price: number;
}