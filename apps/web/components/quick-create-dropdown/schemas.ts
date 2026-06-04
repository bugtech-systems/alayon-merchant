import { z } from 'zod';

export const customerSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const teamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'member', 'developer']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Add to existing schemas file
export const draftOrderSchema = z.object({
  email: z.string().email('Invalid email address'),
  region_id: z.string().min(1, 'Region is required'),
  sales_channel_id: z.string().optional(),
  customer_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  items: z.array(
    z.object({
      title: z.string().min(1, 'Title is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      price: z.number().min(0, 'Price must be positive'),
    })
  ).optional(),
  shipping_method: z.object({
    option_id: z.string().min(1, 'Shipping method is required'),
    price: z.number().optional(),
  }),
  shipping_address: z.object({
    address_1: z.string().min(1, 'Address is required'),
    address_2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    country_code: z.string().length(2, 'Country code must be 2 characters'),
    province: z.string().optional(),
    postal_code: z.string().min(1, 'Postal code is required'),
    phone: z.string().optional(),
  }),
  billing_address: z.object({
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    country_code: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().optional(),
    phone: z.string().optional(),
  }),
  use_same_billing_address: z.boolean().optional(),
  discount_code: z.string().optional(),
  no_notification: z.boolean().optional(),
});


export const transactionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  customer_id: z.string().min(1, 'Customer is required'),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type TeamMemberFormData = z.infer<typeof teamMemberSchema>;
export type DraftOrderFormData = z.infer<typeof draftOrderSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;