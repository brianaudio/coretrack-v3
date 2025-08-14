/**
 * Stripe Payment Service
 * Handles payment processing and Stripe API integration
 */

import { Stripe } from 'stripe';
import { Stripe as StripeJS } from '@stripe/stripe-js';
import { stripePromise, formatAmountForStripe, formatAmountFromStripe } from './config';

// Server-side Stripe instance (for API routes)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

export interface CreatePaymentIntentRequest {
  amount: number; // in PHP
  currency: string;
  orderId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  customerData?: Record<string, any>;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

/**
 * Create a payment intent for processing payments
 */
export async function createPaymentIntent(
  data: CreatePaymentIntentRequest
): Promise<PaymentIntentResponse> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(data.amount),
      currency: data.currency.toLowerCase(),
      metadata: {
        orderId: data.orderId || 'no-order',
        customerEmail: data.customerEmail || '',
        customerName: data.customerName || '',
        ...(data.customerData || {}),
      },
      description: data.description || `CoreTrack POS Payment`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: formatAmountFromStripe(paymentIntent.amount),
      currency: paymentIntent.currency.toUpperCase(),
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: formatAmountFromStripe(paymentIntent.amount),
      currency: paymentIntent.currency.toUpperCase(),
      created: paymentIntent.created,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw new Error('Failed to confirm payment intent');
  }
}

/**
 * Create a customer in Stripe
 */
export async function createStripeCustomer(
  email: string, 
  name?: string, 
  phone?: string
) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        source: 'coretrack_pos',
      },
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
    };
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Get payment method details
 */
export async function getPaymentMethod(paymentMethodId: string) {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      } : undefined,
    };
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    throw new Error('Failed to retrieve payment method');
  }
}

/**
 * Process refund
 */
export async function createRefund(
  paymentIntentId: string, 
  amount?: number,
  reason?: string
) {
  try {
    const refundData: any = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
    };

    if (amount) {
      refundData.amount = formatAmountForStripe(amount);
    }

    const refund = await stripe.refunds.create(refundData);

    return {
      id: refund.id,
      status: refund.status,
      amount: formatAmountFromStripe(refund.amount),
      currency: refund.currency?.toUpperCase(),
      reason: refund.reason,
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
}

// Client-side payment processing
export class StripePaymentProcessor {
  private stripe: StripeJS | null = null;

  async initialize() {
    this.stripe = await stripePromise;
    if (!this.stripe) {
      throw new Error('Failed to initialize Stripe');
    }
  }

  async processPayment(
    clientSecret: string,
    elements: any,
    customerDetails?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ) {
    if (!this.stripe) {
      await this.initialize();
    }

    const { error, paymentIntent } = await this.stripe!.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: customerDetails?.email,
        return_url: window.location.origin + '/payment-success',
      },
      redirect: 'if_required',
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: paymentIntent?.id,
      status: paymentIntent?.status,
      amount: paymentIntent?.amount ? formatAmountFromStripe(paymentIntent.amount) : 0,
    };
  }
}

export default stripe;
