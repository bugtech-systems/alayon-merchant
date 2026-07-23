// lib/actions/messages.ts

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sanitizePhoneNumber } from '../utils/helpers';

const API_URL = process.env.SMS_URL || 'http://192.168.1.120:3500';

export async function getConversations(filters: {
  phoneNumber?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await fetch(
      `${API_URL}/api/sms/conversations?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      }
    );


    return await response.json();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

export async function getConversation(
  phoneNumber: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  try {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await fetch(
      `${API_URL}/api/sms/conversation/${phoneNumber}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );


    let conversation = await response.json()

    return conversation;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
}

export async function sendMessage(data: {
  sender: string;
  phoneNumber: string;
  message: string;
  flash?: any;
}) {
  try {
    const response = await fetch(`${API_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const result = await response.json();
    
    // Revalidate the messages page to show new message
    revalidatePath('/dashboard/messages');
    
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function sendFlastMessage(data: {
  sender: string;
  phoneNumber: string;
  message: string;
}) {
  try {
    const response = await fetch(`${API_URL}/api/sms/send-flash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const result = await response.json();
    
    // Revalidate the messages page to show new message
    revalidatePath('/dashboard/messages');
    
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function sendBulkMessage(data: {
  phoneNumbers: string[];
  message: string;
  flash: boolean;
}) {
  try {

    console.log(data, "DATAASSB")
    const response = await fetch(`${API_URL}/api/sms/send-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });


    console.log(response, 'RESPPPS BYKJ')
  

    const result = await response.json();
        console.log(result, 'RESSS BYKJ')

    // Revalidate the messages page to show new message
    revalidatePath('/dashboard/messages');
    
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function markMessagesAsRead(data: {
  conversationId: string;
  phoneNumber: string;
}) {
  try {

    console.log(data, ' READ PHONNEE')
    const response = await fetch(`${API_URL}/api/sms/read?phoneNumber=${sanitizePhoneNumber(data.conversationId || data.phoneNumber)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

export async function getLatestConversations(phoneNumber: string, limit = 20) {
  try {
    const response = await fetch(
      `${API_URL}/api/sms/latest-conversations?phone_number=${phoneNumber}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch latest conversations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching latest conversations:', error);
    throw error;
  }
}