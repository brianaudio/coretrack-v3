// PayPal Service for Subscription Management
// Uses server-side API routes for secure authentication

import paypalConfig from './config';

interface PayPalSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  customerId: string;
  customerEmail: string;
}

interface PayPalSubscription {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

class PayPalService {
  async createSubscription(request: PayPalSubscriptionRequest): Promise<PayPalSubscription> {
    if (!paypalConfig.isConfigured()) {
      throw new Error('PayPal is not configured. Please add valid NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your environment variables.');
    }

    try {
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`PayPal API Error: ${errorData.error || 'Failed to create subscription'}`);
      }

      const subscriptionData = await response.json();
      return subscriptionData;
    } catch (error: any) {
      console.error('PayPal service error:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation'): Promise<void> {
    try {
      const response = await fetch('/api/paypal/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId, reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel PayPal subscription');
      }
    } catch (error: any) {
      console.error('PayPal subscription cancellation error:', error);
      throw new Error(error.message || 'Failed to cancel PayPal subscription');
    }
  }
}

export const paypalService = new PayPalService();
