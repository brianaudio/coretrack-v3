// PayPal Configuration for Philippine Payment Processing
// No DTI/BIR required, supports recurring subscriptions

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  isConfigured: () => boolean;
  environment: 'sandbox' | 'live';
  baseUrl: string;
  subscriptionPlans: {
    [key: string]: {
      name: string;
      price: number; // in PHP
      features: string[];
      paypalPlanId?: string; // Will be set after creating plans in PayPal
    };
  };
  annualDiscount: number;
  currency: string;
  country: string;
}

const paypalConfig: PayPalConfig = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com',
  currency: 'PHP',
  country: 'PH',
  
  isConfigured(): boolean {
    return !!(this.clientId && this.clientId.length > 0);
  },

  subscriptionPlans: {
    starter: {
      name: 'Starter',
      price: 89, // ₱89.00
      features: [
        'Up to 100 products',
        '2 staff accounts',
        'Basic inventory tracking',
        'Simple POS system',
        'WhatsApp support',
        '30-day free trial'
      ]
    },
    professional: {
      name: 'Professional',
      price: 199, // ₱199.00
      features: [
        'Up to 1,000 products',
        '5 staff accounts',
        'Advanced inventory management',
        'Full POS with receipts',
        'Purchase order management',
        'Basic analytics',
        'Priority email support'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price: 349, // ₱349.00
      features: [
        'Unlimited products',
        'Unlimited staff accounts',
        'Multi-branch management',
        'Advanced analytics & reports',
        'Custom integrations',
        'Bulk operations',
        'Dedicated phone support',
        'Custom training session'
      ]
    }
  },

  annualDiscount: 0.2 // 20% discount for annual billing
};

export default paypalConfig;
