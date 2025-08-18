// Xendit Service for Payment Processing
// Handles e-wallets, credit cards, bank transfers, and retail outlets

import xenditConfig from './config';

export interface XenditPaymentRequest {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  paymentMethodId: string;
  customerId: string;
}

export interface XenditEWalletPayment {
  ewallet_type: 'GCASH' | 'PAYMAYA' | 'DANA' | 'SHOPEEPAY';
  amount: number;
  currency: 'PHP';
  reference_id: string;
  redirect_url: string;
  metadata?: Record<string, any>;
}

export interface XenditVirtualAccountPayment {
  bank_code: 'BPI' | 'BDO' | 'BNC' | 'RCBC';
  amount: number;
  currency: 'PHP';
  reference_id: string;
  metadata?: Record<string, any>;
}

export interface XenditRetailOutletPayment {
  retail_outlet_name: 'SEVENELEVENCLIQQ';
  amount: number;
  currency: 'PHP';
  reference_id: string;
  payment_code: string;
  metadata?: Record<string, any>;
}

class XenditService {
  private baseUrl: string;
  private secretKey: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = xenditConfig.baseUrl;
    this.secretKey = xenditConfig.secretKey;
    this.isConfigured = xenditConfig.isConfigured();
  }

  private getHeaders() {
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest(endpoint: string, data: any) {
    if (!this.isConfigured) {
      throw new Error('Xendit is not configured. Please check your API keys.');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    return response.json();
  }

  async createEWalletPayment(paymentData: XenditEWalletPayment) {
    return this.makeRequest('/ewallets/charges', paymentData);
  }

  async createVirtualAccountPayment(paymentData: XenditVirtualAccountPayment) {
    return this.makeRequest('/callback_virtual_accounts', paymentData);
  }

  async createRetailOutletPayment(paymentData: XenditRetailOutletPayment) {
    return this.makeRequest('/fixed_payment_code', paymentData);
  }

  async createCreditCardPayment(amount: number, referenceId: string, metadata?: any) {
    return this.makeRequest('/credit_card_charges', {
      amount,
      currency: 'PHP',
      reference_id: referenceId,
      metadata
    });
  }

  async createSubscription(request: XenditPaymentRequest) {
    if (!this.isConfigured) {
      throw new Error('Xendit payment system is not configured');
    }

    const plan = xenditConfig.subscriptionPlans[request.planId];
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    let amount = plan.price;
    if (request.billingCycle === 'annual') {
      amount = Math.floor(plan.price * 12 * (1 - xenditConfig.annualDiscount));
    }

    const referenceId = `sub_${request.tenantId}_${request.planId}_${Date.now()}`;
    const redirectUrl = `${window.location.origin}/payment-success`;

    // Handle different payment methods
    switch (request.paymentMethodId) {
      case 'gcash':
        return this.createEWalletPayment({
          ewallet_type: 'GCASH',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          redirect_url: redirectUrl,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'paymaya':
        return this.createEWalletPayment({
          ewallet_type: 'PAYMAYA',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          redirect_url: redirectUrl,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'dana':
        return this.createEWalletPayment({
          ewallet_type: 'DANA',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          redirect_url: redirectUrl,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'shopeepay':
        return this.createEWalletPayment({
          ewallet_type: 'SHOPEEPAY',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          redirect_url: redirectUrl,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'bpi':
        return this.createVirtualAccountPayment({
          bank_code: 'BPI',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'bdo':
        return this.createVirtualAccountPayment({
          bank_code: 'BDO',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'seven_eleven':
        return this.createRetailOutletPayment({
          retail_outlet_name: 'SEVENELEVENCLIQQ',
          amount,
          currency: 'PHP',
          reference_id: referenceId,
          payment_code: referenceId.substring(0, 10),
          metadata: {
            tenant_id: request.tenantId,
            plan_id: request.planId,
            billing_cycle: request.billingCycle,
            customer_id: request.customerId
          }
        });

      case 'card':
        return this.createCreditCardPayment(amount, referenceId, {
          tenant_id: request.tenantId,
          plan_id: request.planId,
          billing_cycle: request.billingCycle,
          customer_id: request.customerId
        });

      default:
        throw new Error('Unsupported payment method');
    }
  }

  async getPaymentStatus(chargeId: string) {
    const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }

    return response.json();
  }
}

export const xenditService = new XenditService();
export default xenditService;
