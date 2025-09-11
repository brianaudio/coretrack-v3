// PayPal Configuration for Philippine Payment Processing
// No DTI/BIR required, supports recurring subscriptions + Credit Cards

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  isConfigured: () => boolean;
  isLive: () => boolean;
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
  
  // PayPal.me fallback configuration
  paypalMe: {
    username: string;
    fallbackUrl: string;
    enabled: boolean;
  };

  // Webhook configuration for automatic subscription management
  webhook: {
    url: string;
    events: string[];
  };
  
  // Advanced Credit Card Processing Configuration
  sdkOptions: {
    'client-id': string;
    currency: string;
    intent: string;
    'enable-funding': string;
    'disable-funding': string;
    components: string;
  };
  
  // Credit Card Field Styling for Trust
  cardFieldStyles: {
    input: {
      'font-size': string;
      'font-family': string;
      'color': string;
      'padding': string;
    };
    '.valid': {
      'color': string;
    };
    '.invalid': {
      'color': string;
    };
    '::placeholder': {
      'color': string;
    };
  };
}

const paypalConfig: PayPalConfig = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  environment: process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
  baseUrl: process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'live' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com',
  currency: 'PHP',
  country: 'PH',
  
  // PayPal.me fallback configuration
  paypalMe: {
    username: process.env.NEXT_PUBLIC_PAYPAL_ME_USERNAME || 'CoreTrackPH',
    fallbackUrl: 'https://paypal.me/CoreTrackPH',
    enabled: process.env.NEXT_PUBLIC_ENABLE_PAYPAL_ME === 'true'
  },

  // Webhook configuration
  webhook: {
    url: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/paypal/webhook`
      : 'https://coretrack.vercel.app/api/paypal/webhook',
    events: [
      'BILLING.SUBSCRIPTION.ACTIVATED',
      'BILLING.SUBSCRIPTION.CANCELLED',
      'BILLING.SUBSCRIPTION.SUSPENDED',
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      'PAYMENT.SALE.COMPLETED'
    ]
  },
  
  isConfigured(): boolean {
    return !!(this.clientId && this.clientId.length > 0);
  },

  isLive(): boolean {
    return this.environment === 'live';
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

  annualDiscount: 0.2, // 20% discount for annual billing
  
  // PayPal SDK Configuration for Credit Card Processing
  sdkOptions: {
    'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: 'PHP',
    intent: 'subscription',
    'enable-funding': 'card,venmo,paylater',
    'disable-funding': '',
    components: 'buttons,hosted-fields,payment-fields'
  },
  
  // Professional Credit Card Field Styling for Maximum Trust
  cardFieldStyles: {
    input: {
      'font-size': '16px',
      'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'color': '#374151',
      'padding': '12px 16px'
    },
    '.valid': {
      'color': '#059669'
    },
    '.invalid': {
      'color': '#DC2626'
    },
    '::placeholder': {
      'color': '#9CA3AF'
    }
  }
};

export default paypalConfig;
