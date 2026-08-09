// lib/actions/customer.ts
'use server';

import { getAdminSdk } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { adminFetch } from '../apiClient';

// Helper to get admin client
const getAdminClient = () => {
  const sdk = getAdminSdk();
  return sdk.admin;
};

export async function retrieveCustomer(id: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.retrieve(id);
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error retrieving customer:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerOrders(customerId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.order.list({
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
    const admin = getAdminClient();
    const response = await admin.customer.listAddresses(customerId);
    return { success: true, addresses: response.addresses };
  } catch (error: any) {
    console.error('Error listing customer addresses:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerPaymentCollections(customerId: string) {
  try {
    const admin = getAdminClient();
    
    // Try SDK first
    try {
      const response = await admin.paymentCollection.list({
        customer_id: customerId,
      });
      return { success: true, paymentCollections: response.payment_collections || [] };
    } catch (sdkError) {
      // Fallback to adminFetch if SDK method doesn't exist
      console.log('SDK paymentCollection.list not available, using adminFetch fallback');
      const response = await adminFetch(`/admin/payment-collections?customer_id=${customerId}`, {
        method: 'GET',
      });
      
      let paymentCollections = [];
      if (response && response.payment_collections) {
        paymentCollections = response.payment_collections;
      } else if (response && Array.isArray(response)) {
        paymentCollections = response;
      } else if (response && response.collections) {
        paymentCollections = response.collections;
      }
      
      return { success: true, paymentCollections };
    }
  } catch (error: any) {
    console.error('Error listing customer payment collections:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: string, data: any) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.update(id, data);
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const admin = getAdminClient();
    await admin.customer.delete(id);
    revalidatePath('/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message };
  }
}

export async function addCustomerToGroup(customerId: string, groupId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.addToGroup(customerId, groupId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error adding customer to group:', error);
    return { success: false, error: error.message };
  }
}

export async function removeCustomerFromGroup(customerId: string, groupId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.removeFromGroup(customerId, groupId);
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
    const admin = getAdminClient();
    
    // Try SDK first
    try {
      const response = await admin.paymentCollection.create(data);
      revalidatePath(`/customers/${data.customer_id}`);
      return { success: true, paymentCollection: response.payment_collection };
    } catch (sdkError) {
      // Fallback to adminFetch
      console.log('SDK paymentCollection.create not available, using adminFetch fallback');
      const response = await adminFetch(`/admin/payment-collections`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      revalidatePath(`/customers/${data.customer_id}`);
      return { success: true, paymentCollection: response.payment_collection || response };
    }
  } catch (error: any) {
    console.error('Error creating payment collection:', error);
    return { success: false, error: error.message };
  }
}

export async function capturePayment(paymentCollectionId: string, customerId: string) {
  try {
    const admin = getAdminClient();
    
    // Try SDK first
    try {
      const response = await admin.paymentCollection.capture(paymentCollectionId);
      revalidatePath(`/customers/${customerId}`);
      return { success: true, paymentCollection: response.payment_collection };
    } catch (sdkError) {
      // Fallback to adminFetch
      console.log('SDK paymentCollection.capture not available, using adminFetch fallback');
      const response = await adminFetch(`/admin/payment-collections/${paymentCollectionId}/capture`, {
        method: 'POST',
      });
      
      revalidatePath(`/customers/${customerId}`);
      return { success: true, paymentCollection: response.payment_collection || response };
    }
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
    const admin = getAdminClient();
    
    // First get the current customer
    const customerResponse = await admin.customer.retrieve(customerId);
    const customer = customerResponse.customer;
    
    const currentRefillCredits = customer.metadata?.refill_credits || 0;
    const updatedMetadata = {
      ...customer.metadata,
      refill_credits: currentRefillCredits + amount,
    };

    const response = await admin.customer.update(customerId, {
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
    const admin = getAdminClient();
    
    // First get the current customer
    const customerResponse = await admin.customer.retrieve(customerId);
    const customer = customerResponse.customer;
    
    const metadata = {
      ...customer.metadata,
      own_brand: {
        ...customer.metadata?.own_brand,
        borrowed: customer.metadata?.own_brand?.borrowed || 0,
        returned: customer.metadata?.own_brand?.returned || 0,
      },
      other_brand: {
        ...customer.metadata?.other_brand,
        borrowed: customer.metadata?.other_brand?.borrowed || 0,
        returned: customer.metadata?.other_brand?.returned || 0,
      },
      borrowed_jugs: customer.metadata?.borrowed_jugs || 0,
      total_jags_borrowed: customer.metadata?.total_jags_borrowed || 0,
      total_jags_returned: customer.metadata?.total_jags_returned || 0,
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

    const response = await admin.customer.update(customerId, {
      metadata,
    });
    
    revalidatePath(`/customers/${customerId}`);
    return { success: true, customer: response.customer };
  } catch (error: any) {
    console.error('Error updating container balance:', error);
    return { success: false, error: error.message };
  }
}

// Additional utility functions

export async function getCustomerPaymentHistory(customerId: string) {
  try {
    // Fetch payment collections
    const collectionsResult = await listCustomerPaymentCollections(customerId);
    if (!collectionsResult.success) {
      return collectionsResult;
    }
    
    // Fetch orders to get payment information
    const ordersResult = await listCustomerOrders(customerId);
    if (!ordersResult.success) {
      return ordersResult;
    }
    
    // Combine payment data from collections and orders
    const paymentCollections = collectionsResult.paymentCollections || [];
    const orders = ordersResult.orders || [];
    
    // Extract payment data from orders
    const orderPayments = orders
      .filter((order: any) => order.payments && order.payments.length > 0)
      .flatMap((order: any) => 
        order.payments.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount || 0,
          created_at: payment.created_at || new Date().toISOString(),
          status: payment.status || 'pending',
          payment_method: payment.payment_method || payment.provider_id || 'unknown',
          reference: payment.id,
          metadata: {
            payment_type: payment.payment_method || payment.provider_id || 'unknown',
            reference: payment.id,
            notes: payment.metadata?.notes || '',
          },
        }))
      );
    
    // Combine and deduplicate
    const allPayments = [...paymentCollections, ...orderPayments];
    const uniquePayments = Array.from(
      new Map(allPayments.map((p: any) => [p.id, p])).values()
    );
    
    return { success: true, paymentCollections: uniquePayments };
  } catch (error: any) {
    console.error('Error getting customer payment history:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerGroups(customerId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.listGroups(customerId);
    return { success: true, groups: response.groups || [] };
  } catch (error: any) {
    console.error('Error listing customer groups:', error);
    return { success: false, error: error.message };
  }
}

export async function searchCustomers(query: string, limit: number = 20) {
  try {
    const admin = getAdminClient();
    const response = await admin.customer.list({
      q: query,
      limit,
    });
    return { success: true, customers: response.customers || [] };
  } catch (error: any) {
    console.error('Error searching customers:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerStats(customerId: string) {
  try {
    const admin = getAdminClient();
    
    // Get customer details
    const customerResponse = await admin.customer.retrieve(customerId);
    const customer = customerResponse.customer;
    
    // Get customer orders
    const ordersResponse = await admin.order.list({
      customer_id: customerId,
      limit: 100,
    });
    const orders = ordersResponse.orders || [];
    
    // Calculate stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const completedOrders = orders.filter((o: any) => o.status === 'completed' || o.status === 'delivered');
    const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing');
    
    return {
      success: true,
      stats: {
        totalOrders,
        totalSpent,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        lastOrderDate: orders.length > 0 ? orders[0].created_at : null,
      }
    };
  } catch (error: any) {
    console.error('Error getting customer stats:', error);
    return { success: false, error: error.message };
  }
}

// lib/actions/customer.ts - Add these new functions

export async function listCustomerJagTransactions(customerId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.jagTransaction.list({
      customer_id: customerId,
    });
    return { success: true, transactions: response.transactions || [] };
  } catch (error: any) {
    console.error('Error listing jag transactions:', error);
    return { success: false, error: error.message, transactions: [] };
  }
}

export async function createJagTransaction(data: {
  customer_id: string;
  order_id: string | null;
  type: any;
  brand: any;
  quantity: number;
  note?: string;
}) {
  try {
    const admin = getAdminClient();
    
    // Create the transaction
    const response = await admin.jagTransaction.create(data);
    
    // Update customer credit counters
    const creditUpdate = await updateCustomerCredit(data.customer_id, {
      borrowed_own: data.type === 'borrow' && data.brand === 'own' ? data.quantity : 0,
      returned_other: data.type === 'return' && data.brand === 'other' ? data.quantity : 0,
    });
    
    revalidatePath(`/customers/${data.customer_id}`);
    return { 
      success: true, 
      transaction: response.transaction,
      credit: creditUpdate.credit 
    };
  } catch (error: any) {
    console.error('Error creating jag transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function listCustomerRefillTransactions(customerId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.refillCreditTransaction.list({
      customer_id: customerId,
    });
    return { success: true, transactions: response.transactions || [] };
  } catch (error: any) {
    console.error('Error listing refill transactions:', error);
    return { success: false, error: error.message, transactions: [] };
  }
}

export async function createRefillTransaction(data: {
  customer_id: string;
  type: any;
  amount: number;
  source: any;
  reference: string | null;
  description: string | null;
}) {
  try {
    const admin = getAdminClient();
    
    // Create the transaction
    const response = await admin.refillCreditTransaction.create(data);
    
    // Update customer credit
    const creditUpdate = await updateCustomerCredit(data.customer_id, {
      refill_credit_balance: data.type === 'earn' ? data.amount : -data.amount,
      total_earned: data.type === 'earn' ? data.amount : 0,
      total_used: data.type === 'use' ? data.amount : 0,
    });
    
    revalidatePath(`/customers/${data.customer_id}`);
    return { 
      success: true, 
      transaction: response.transaction,
      credit: creditUpdate.credit 
    };
  } catch (error: any) {
    console.error('Error creating refill transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerCredit(customerId: string) {
  try {
    const admin = getAdminClient();
    const response = await admin.customerCredit.retrieveByCustomer(customerId);
    return { success: true, credit: response.credit };
  } catch (error: any) {
    console.error('Error getting customer credit:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomerCredit(customerId: string, data: Partial<CustomerCredit>) {
  try {
    const admin = getAdminClient();
    const response = await admin.customerCredit.updateByCustomer(customerId, data);
    revalidatePath(`/customers/${customerId}`);
    return { success: true, credit: response.credit };
  } catch (error: any) {
    console.error('Error updating customer credit:', error);
    return { success: false, error: error.message };
  }
}