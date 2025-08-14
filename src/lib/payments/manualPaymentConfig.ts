// Manual Payment Configuration - No DTI/BIR Required!
// Perfect for startups and small businesses

interface ManualPaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  instructions: string;
  accountInfo: string;
  enabled: boolean;
  popular: boolean;
}

interface ManualPaymentConfig {
  isConfigured: () => boolean;
  paymentMethods: { [key: string]: ManualPaymentMethod };
  subscriptionPlans: {
    [key: string]: {
      name: string;
      price: number; // in centavos (PHP)
      features: string[];
    };
  };
  annualDiscount: number;
  businessInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

const manualPaymentConfig: ManualPaymentConfig = {
  isConfigured(): boolean {
    // Always ready - no API keys needed!
    return true;
  },

  businessInfo: {
    name: process.env.NEXT_PUBLIC_BUSINESS_NAME || "CoreTrack",
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "payments@coretrack.dev",
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "+63 917 123 4567"
  },

  paymentMethods: {
    gcash: {
      id: 'gcash',
      name: 'GCash',
      icon: '💙',
      description: 'Send money via GCash app',
      instructions: 'Open GCash app, tap Send Money, enter the mobile number below, and use the reference number.',
      accountInfo: process.env.NEXT_PUBLIC_GCASH_NUMBER || '0917-123-4567',
      enabled: true,
      popular: true
    },
    maya: {
      id: 'maya',
      name: 'Maya (PayMaya)',
      icon: '💚',
      description: 'Send money via Maya app',
      instructions: 'Open Maya app, tap Send Money, enter the mobile number below, and use the reference number.',
      accountInfo: process.env.NEXT_PUBLIC_MAYA_NUMBER || '0917-123-4567',
      enabled: true,
      popular: true
    },
    bpi: {
      id: 'bpi',
      name: 'BPI Bank Transfer',
      icon: '🏦',
      description: 'Transfer to BPI account',
      instructions: 'Transfer to the BPI account below using online banking or over-the-counter.',
      accountInfo: process.env.NEXT_PUBLIC_BPI_ACCOUNT || 'Account: 1234-5678-90\nName: CoreTrack Business',
      enabled: true,
      popular: false
    },
    bdo: {
      id: 'bdo',
      name: 'BDO Bank Transfer',
      icon: '🏪',
      description: 'Transfer to BDO account',
      instructions: 'Transfer to the BDO account below using online banking or over-the-counter.',
      accountInfo: process.env.NEXT_PUBLIC_BDO_ACCOUNT || 'Account: 9876-5432-10\nName: CoreTrack Business',
      enabled: true,
      popular: false
    },
    unionbank: {
      id: 'unionbank',
      name: 'UnionBank Transfer',
      icon: '🏛️',
      description: 'Transfer to UnionBank account',
      instructions: 'Transfer to the UnionBank account below using online banking.',
      accountInfo: process.env.NEXT_PUBLIC_UB_ACCOUNT || 'Account: 1111-2222-3333\nName: CoreTrack Business',
      enabled: true,
      popular: false
    },
    instapay: {
      id: 'instapay',
      name: 'InstaPay',
      icon: '⚡',
      description: 'Real-time bank transfer',
      instructions: 'Use InstaPay to send to any of our bank accounts listed above.',
      accountInfo: 'Use any bank account above with InstaPay',
      enabled: true,
      popular: true
    }
  },

  subscriptionPlans: {
    starter: {
      name: 'Starter',
      price: 49900, // ₱499.00
      features: [
        'Up to 100 products',
        '2 staff accounts',
        'Basic inventory tracking',
        'Simple POS system',
        'Email support',
        '30-day free trial'
      ]
    },
    professional: {
      name: 'Professional',
      price: 99900, // ₱999.00
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
      price: 199900, // ₱1,999.00
      features: [
        'Unlimited products',
        'Unlimited staff accounts',
        'Multi-branch management',
        'Advanced analytics & reports',
        'Custom integrations',
        'Bulk operations',
        'Phone support',
        'Custom training session'
      ]
    }
  },

  annualDiscount: 0.2 // 20% discount for annual billing
};

export default manualPaymentConfig;
