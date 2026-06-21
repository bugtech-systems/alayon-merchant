// types/transactions.ts

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'expense' | 'bad_order' | 'other';
  category_id?: string;
  group_id?: string;
  date: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  company_id?: string;
  metadata?: Record<string, any>;
}

export interface TransactionGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface TransactionCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}