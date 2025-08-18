// Xendit Configuration for Philippine Payment Processing
// Alternative to PayMongo with lower barriers to entry

interface XenditConfig {
  publicKey: string;
  secretKey: string;
  isConfigured: () => boolean;
  webhookToken: string;
  baseUrl: string;
  paymentMethods: {
    [key: string]: {
      name: string;
      icon: string;
      description: string;
      enabled: boolean;
      type: 'ewallet' | 'virtual_account' | 'credit_card' | 'retail_outlet';
    };
  };
  subscriptionPlans: {
    [key: string]: {
      name: string;
      price: number; // in centavos (PHP)
      features: string[];
    };
  };
  annualDiscount: number;
}

const xenditConfig: XenditConfig = {
  publicKey: process.env.XENDIT_PUBLIC_KEY || '',
  secretKey: process.env.XENDIT_SECRET_KEY || '',
  webhookToken: process.env.XENDIT_WEBHOOK_TOKEN || '',
  baseUrl: 'https://api.xendit.co',
  
  isConfigured(): boolean {
    const hasKeys = !!(this.publicKey && this.secretKey);
    const isValidFormat = this.publicKey.startsWith('xnd_public_') && this.secretKey.startsWith('xnd_');
    return hasKeys && isValidFormat;
  },

  paymentMethods: {
    gcash: {
      name: 'GCash',
      icon: '💙',
      description: 'Pay with GCash e-wallet',
      enabled: true,
      type: 'ewallet'
    },
    paymaya: {
      name: 'Maya (PayMaya)',
      icon: '💚',
      description: 'Pay with Maya e-wallet',
      enabled: true,
      type: 'ewallet'
    },
    dana: {
      name: 'DANA',
      icon: '🔵',
      description: 'Pay with DANA e-wallet',
      enabled: true,
      type: 'ewallet'
    },
    shopeepay: {
      name: 'ShopeePay',
      icon: '🧡',
      description: 'Pay with ShopeePay e-wallet',
      enabled: true,
      type: 'ewallet'
    },
    card: {
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, JCB',
      enabled: true,
      type: 'credit_card'
    },
    bpi: {
      name: 'BPI Online',
      icon: '🏦',
      description: 'Bank transfer via BPI',
      enabled: true,
      type: 'virtual_account'
    },
    bdo: {
      name: 'BDO Online',
      icon: '🏪',
      description: 'Bank transfer via BDO',
      enabled: true,
      type: 'virtual_account'
    },
    seven_eleven: {
      name: '7-Eleven',
      icon: '🏪',
      description: 'Pay at 7-Eleven stores',
      enabled: true,
      type: 'retail_outlet'
    }
  },

  subscriptionPlans: {
    starter: {
      name: 'Starter',
      price: 8900, // ₱89.00
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
      price: 19900, // ₱199.00
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
      price: 34900, // ₱349.00
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

export default xenditConfig;
