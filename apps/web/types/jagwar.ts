// types/index.ts
export interface WaterProduction {
  id: string;
  bottle_size: '350ml' | '500ml' | '1000ml' | '2000ml' | '5000ml';
  quantity: number;
  production_date: Date;
  batch_number: string;
  status: 'produced' | 'in_inventory' | 'sold' | 'returned';
  backwash_count: number;
  machine_id: string;
}

export interface BackwashSettings {
  id: string;
  machine_id: string;
  backwash_limit: number;
  current_count: number;
  last_backwash_date: Date | null;
  is_active: boolean;
}

export interface Sale {
  id: string;
  customer_id: string;
  sale_date: Date;
  items: SaleItem[];
  total_amount: number;
  payment_method: 'cash' | 'credit' | 'mobile_money';
  payment_status: 'paid' | 'pending' | 'partial';
  delivery_status: 'pending' | 'delivered' | 'returned';
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  bottle_type: 'own_brand' | 'other_brand';
  jags_borrowed: number;
  jags_returned: number;
}

export interface ReturnedJag {
  id: string;
  sale_id: string;
  customer_id: string;
  quantity: number;
  return_date: Date;
  condition: 'good' | 'damaged';
  brand_type: 'own_brand' | 'other_brand';
}

export interface BorrowedJag {
  id: string;
  customer_id: string;
  quantity: number;
  borrow_date: Date;
  expected_return_date: Date;
  actual_return_date?: Date;
  status: 'borrowed' | 'returned' | 'overdue';
}