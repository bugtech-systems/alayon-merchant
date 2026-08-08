// lib/actions/customer.ts
'use server';

import { sdk } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { adminFetch } from '../apiClient';

export async function retrieveCustomer(id: string) {
  try {
    const response = await sdk.admin.customers.retrieve(id);
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error retrieving customer:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerOrders(customerId: string) {
  try {
    const response = await sdk.admin.orders.list({
      customer_id: customerId,
      limit: 100,
    });
    return { success: true, orders: response.orders };
  } catch (error: any) {
    console.error('Error listing customer orders:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerAddresses(customerId: string) {
  try {
    const response = await sdk.admin.customers.listAddresses(customerId);
    return { success: true, addresses: response.addresses };
  } catch (error: any) {
    console.error('Error listing customer addresses:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerPaymentCollections(customerId: string) {
  try {
    const response = await sdk.admin.paymentCollections.list({
      customer_id: customerId,
    });
    return { success: true, paymentCollections: response.payment_collections };
  } catch (error: any) {
    console.error('Error listing customer payment collections:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: string, data: any) {
  try {
    const response = await sdk.admin.customers.update(id, data);
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await sdk.admin.customers.delete(id);
    revalidatePath('/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message };
  }
}

export async function addCustomerToGroup(customerId: string, groupId: string) {
  try {
    const response = await sdk.admin.customers.addToGroup(customerId, groupId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error adding customer to group:', error);
    return { success: false, error: error.message };
  }
}

export async function removeCustomerFromGroup(customerId: string, groupId: string) {
  try {
    const response = await sdk.admin.customers.removeFromGroup(customerId, groupId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error removing customer from group:', error);
    return { success: false, error: error.message };
  }
}

export async function createPaymentCollection(data: {
  customer_id: string;
  amount: number;
  currency_code: string;
  metadata?: any;
}) {
  try {
    const response = await sdk.admin.paymentCollections.create(data);
    revalidatePath(`/customers/${data.customer_id}`);
    return { success: true, paymentCollection: response.payment_collection };
  } catch (error: any) {
    console.error('Error creating payment collection:', error);
    return { success: false, error: error.message };
  }
}

export async function capturePayment(paymentCollectionId: string, customerId: string) {
  try {
    const response = await sdk.admin.paymentCollections.capture(paymentCollectionId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true, paymentCollection: response.payment_collection };
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomerMetadata(id: string, metadata: any) {
  try {
    const response = await adminFetch(`/admin/customers/${id}`, {
      method: 'POST',
      body: JSON.stringify({ metadata }),
    });
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error updating customer metadata:', error);
    return { success: false, error: error.message };
  }
}

export async function addRefillCredits(customerId: string, amount: number) {
  try {
    const customerResponse = await sdk.admin.customers.retrieve(customerId);
    const customer = customerResponse.customer;
    
    const currentRefillCredits = customer.metadata?.refill_credits || 0;
    const updatedMetadata = {
      ...customer.metadata,
      refill_credits: currentRefillCredits + amount,
    };

    const response = await sdk.admin.customers.update(customerId, {
      metadata: updatedMetadata,
    });
    
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error adding refill credits:', error);
    return { success: false, error: error.message };
  }
}

export async function updateContainerBalance(
  customerId: string,
  action: 'borrow' | 'return',
  brand: 'own_brand' | 'other_brand',
  quantity: number
) {
  try {
    const customerResponse = await sdk.admin.customers.retrieve(customerId);
    const customer = customerResponse.customer;
    
    const metadata = {
      ...customer.metadata,
      own_brand: {
        ...customer.metadata?.own_brand,
      },
      other_brand: {
        ...customer.metadata?.other_brand,
      },
    };

    const brandData = brand === 'own_brand' ? metadata.own_brand : metadata.other_brand;

    if (action === 'borrow') {
      brandData.borrowed = (brandData.borrowed || 0) + quantity;
      metadata.borrowed_jugs = (metadata.borrowed_jugs || 0) + quantity;
      metadata.total_jags_borrowed = (metadata.total_jags_borrowed || 0) + quantity;
    } else {
      const available = metadata.borrowed_jugs || 0;
      const actualReturn = Math.min(quantity, available);
      brandData.borrowed = Math.max(0, (brandData.borrowed || 0) - actualReturn);
      brandData.returned = (brandData.returned || 0) + actualReturn;
      metadata.borrowed_jugs = Math.max(0, (metadata.borrowed_jugs || 0) - actualReturn);
      metadata.total_jags_returned = (metadata.total_jags_returned || 0) + actualReturn;
    }

    const response = await sdk.admin.customers.update(customerId, {
      metadata,
    });
    
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error updating container balance:', error);
    return { success: false, error: error.message };
  }
}