// Advanced Payment Method Management - Enterprise Grade System
export interface PaymentMethod {
  id: string
  name: string
  displayName: string
  icon: string
  type: 'digital_wallet' | 'bank_transfer' | 'card' | 'bnpl' | 'crypto' | 'cash'
  category: 'instant' | 'delayed' | 'offline'
  
  // Regional Support
  supportedCountries: string[]
  popularInCountries: string[]
  
  // Business Information
  processingFee: {
    percentage?: number
    fixed?: number
    currency?: string
  }
  limits: {
    daily?: number
    monthly?: number
    perTransaction?: {
      min: number
      max: number
    }
  }
  
  // Technical Details
  integrationStatus: 'ready' | 'beta' | 'coming_soon' | 'requires_setup'
  integrationDifficulty: 'easy' | 'medium' | 'complex'
  setupTimeEstimate: string // e.g., "2-3 days"
  
  // Compliance
  requiresLicense: boolean
  complianceRequirements: string[]
  kycRequired: boolean
  
  // Business Intelligence
  popularity: 'high' | 'medium' | 'low'
  recommendedFor: string[] // business types
  competitorTo: string[] // competing payment method IDs
  
  // Features
  features: {
    refunds: boolean
    partialRefunds: boolean
    subscriptions: boolean
    installments: boolean
    internationalPayments: boolean
    mobileOptimized: boolean
  }
  
  // Documentation
  documentationUrl?: string
  apiDocumentationUrl?: string
  supportUrl?: string
}

// Comprehensive Global Payment Methods Database
export const GLOBAL_PAYMENT_METHODS: PaymentMethod[] = [
  // === CASH & CARDS (Universal) ===
  {
    id: 'cash',
    name: 'cash',
    displayName: 'Cash',
    icon: '💵',
    type: 'cash',
    category: 'offline',
    supportedCountries: ['*'], // Universal
    popularInCountries: ['*'],
    processingFee: { percentage: 0 },
    limits: { perTransaction: { min: 0, max: 999999999 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: 'Immediate',
    requiresLicense: false,
    complianceRequirements: [],
    kycRequired: false,
    popularity: 'high',
    recommendedFor: ['restaurant', 'retail', 'convenience_store'],
    competitorTo: [],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: false,
      installments: false,
      internationalPayments: false,
      mobileOptimized: false
    }
  },
  {
    id: 'credit_card',
    name: 'credit_card',
    displayName: 'Credit/Debit Card',
    icon: '💳',
    type: 'card',
    category: 'instant',
    supportedCountries: ['*'],
    popularInCountries: ['*'],
    processingFee: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
    limits: { perTransaction: { min: 1, max: 999999 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '1-2 days',
    requiresLicense: true,
    complianceRequirements: ['PCI DSS'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['*'],
    competitorTo: ['paypal', 'stripe'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: true,
      internationalPayments: true,
      mobileOptimized: true
    },
    documentationUrl: 'https://stripe.com/docs',
    apiDocumentationUrl: 'https://stripe.com/docs/api'
  },

  // === ASIA PACIFIC DIGITAL WALLETS ===
  {
    id: 'gcash',
    name: 'gcash',
    displayName: 'GCash',
    icon: '📱',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['PH'],
    popularInCountries: ['PH'],
    processingFee: { percentage: 2.5 },
    limits: { 
      daily: 500000, 
      monthly: 2000000,
      perTransaction: { min: 1, max: 500000 }
    },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '1 day',
    requiresLicense: false,
    complianceRequirements: ['BSP registration'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['restaurant', 'retail', 'convenience_store', 'grocery'],
    competitorTo: ['maya', 'grab_pay'],
    features: {
      refunds: true,
      partialRefunds: false,
      subscriptions: false,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    },
    documentationUrl: 'https://www.gcash.com/gcashapp-for-merchants',
    supportUrl: 'https://help.gcash.com/hc/en-us'
  },
  {
    id: 'maya',
    name: 'maya',
    displayName: 'Maya (PayMaya)',
    icon: '💚',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['PH'],
    popularInCountries: ['PH'],
    processingFee: { percentage: 3.5 },
    limits: { 
      daily: 500000,
      perTransaction: { min: 1, max: 500000 }
    },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '1-2 days',
    requiresLicense: false,
    complianceRequirements: ['BSP registration'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['restaurant', 'retail', 'e-commerce'],
    competitorTo: ['gcash', 'grab_pay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    },
    documentationUrl: 'https://developers.paymaya.com/',
    apiDocumentationUrl: 'https://developers.paymaya.com/blog/entry/api-documentation'
  },
  {
    id: 'grab_pay',
    name: 'grab_pay',
    displayName: 'GrabPay',
    icon: '🚗',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['PH', 'SG', 'MY', 'TH', 'VN', 'ID'],
    popularInCountries: ['SG', 'MY', 'TH'],
    processingFee: { percentage: 2.8 },
    limits: { perTransaction: { min: 1, max: 100000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '3-5 days',
    requiresLicense: false,
    complianceRequirements: ['Local registration'],
    kycRequired: true,
    popularity: 'medium',
    recommendedFor: ['restaurant', 'transportation', 'delivery'],
    competitorTo: ['gcash', 'maya', 'shopee_pay'],
    features: {
      refunds: true,
      partialRefunds: false,
      subscriptions: false,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    }
  },
  {
    id: 'shopee_pay',
    name: 'shopee_pay',
    displayName: 'ShopeePay',
    icon: '🛒',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['PH', 'SG', 'MY', 'TH', 'VN', 'ID'],
    popularInCountries: ['PH', 'SG', 'MY'],
    processingFee: { percentage: 2.8 },
    limits: { perTransaction: { min: 1, max: 200000 } },
    integrationStatus: 'beta',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '5-7 days',
    requiresLicense: false,
    complianceRequirements: ['Merchant verification'],
    kycRequired: true,
    popularity: 'medium',
    recommendedFor: ['retail', 'e-commerce', 'grocery'],
    competitorTo: ['gcash', 'grab_pay'],
    features: {
      refunds: true,
      partialRefunds: false,
      subscriptions: false,
      installments: true,
      internationalPayments: false,
      mobileOptimized: true
    }
  },

  // === CHINA PAYMENTS ===
  {
    id: 'wechat_pay',
    name: 'wechat_pay',
    displayName: 'WeChat Pay',
    icon: '💬',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['CN', 'HK', 'SG', 'MY'],
    popularInCountries: ['CN'],
    processingFee: { percentage: 0.6 },
    limits: { perTransaction: { min: 1, max: 1000000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'complex',
    setupTimeEstimate: '2-3 weeks',
    requiresLicense: true,
    complianceRequirements: ['Chinese business license', 'Bank account in China'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['retail', 'restaurant', 'tourism'],
    competitorTo: ['alipay', 'unionpay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: false,
      installments: false,
      internationalPayments: true,
      mobileOptimized: true
    }
  },
  {
    id: 'alipay',
    name: 'alipay',
    displayName: 'Alipay',
    icon: '🅰️',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['CN', 'HK', 'SG', 'MY', 'TH'],
    popularInCountries: ['CN'],
    processingFee: { percentage: 0.55 },
    limits: { perTransaction: { min: 1, max: 2000000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'complex',
    setupTimeEstimate: '2-3 weeks',
    requiresLicense: true,
    complianceRequirements: ['Chinese business license', 'Ant Group approval'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['retail', 'e-commerce', 'tourism'],
    competitorTo: ['wechat_pay', 'unionpay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: true,
      internationalPayments: true,
      mobileOptimized: true
    }
  },

  // === INDIA PAYMENTS ===
  {
    id: 'upi',
    name: 'upi',
    displayName: 'UPI (Unified Payments Interface)',
    icon: '🇮🇳',
    type: 'bank_transfer',
    category: 'instant',
    supportedCountries: ['IN'],
    popularInCountries: ['IN'],
    processingFee: { percentage: 0 }, // Government mandated free
    limits: { 
      perTransaction: { min: 1, max: 100000 },
      daily: 100000
    },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '1 day',
    requiresLicense: false,
    complianceRequirements: ['NPCI registration'],
    kycRequired: false,
    popularity: 'high',
    recommendedFor: ['*'],
    competitorTo: ['paytm', 'phonepe', 'google_pay'],
    features: {
      refunds: true,
      partialRefunds: false,
      subscriptions: false,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    }
  },
  {
    id: 'paytm',
    name: 'paytm',
    displayName: 'Paytm',
    icon: '💙',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['IN'],
    popularInCountries: ['IN'],
    processingFee: { percentage: 2.0 },
    limits: { perTransaction: { min: 10, max: 200000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '2-3 days',
    requiresLicense: false,
    complianceRequirements: ['RBI guidelines'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['retail', 'restaurant', 'grocery', 'fuel'],
    competitorTo: ['phonepe', 'google_pay', 'upi'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    }
  },

  // === GLOBAL DIGITAL WALLETS ===
  {
    id: 'paypal',
    name: 'paypal',
    displayName: 'PayPal',
    icon: '💰',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['*'], // 200+ countries
    popularInCountries: ['US', 'GB', 'DE', 'FR', 'AU', 'CA'],
    processingFee: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
    limits: { perTransaction: { min: 0.01, max: 10000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '1 day',
    requiresLicense: false,
    complianceRequirements: ['PayPal merchant agreement'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['e-commerce', 'services', 'digital_goods'],
    competitorTo: ['stripe', 'apple_pay', 'google_pay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: true,
      internationalPayments: true,
      mobileOptimized: true
    },
    documentationUrl: 'https://developer.paypal.com/',
    apiDocumentationUrl: 'https://developer.paypal.com/docs/api/overview/'
  },
  {
    id: 'apple_pay',
    name: 'apple_pay',
    displayName: 'Apple Pay',
    icon: '🍎',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['US', 'GB', 'CA', 'AU', 'FR', 'DE', 'IT', 'ES', 'JP', 'SG', 'HK'],
    popularInCountries: ['US', 'GB', 'CA', 'AU'],
    processingFee: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
    limits: { perTransaction: { min: 1, max: 50000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '3-5 days',
    requiresLicense: false,
    complianceRequirements: ['Apple Developer Account', 'SSL certificate'],
    kycRequired: false,
    popularity: 'high',
    recommendedFor: ['retail', 'restaurant', 'e-commerce'],
    competitorTo: ['google_pay', 'samsung_pay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: false,
      internationalPayments: true,
      mobileOptimized: true
    },
    documentationUrl: 'https://developer.apple.com/apple-pay/'
  },
  {
    id: 'google_pay',
    name: 'google_pay',
    displayName: 'Google Pay',
    icon: '🔴',
    type: 'digital_wallet',
    category: 'instant',
    supportedCountries: ['US', 'GB', 'IN', 'SG', 'AU', 'DE', 'FR', 'ES'],
    popularInCountries: ['US', 'IN', 'SG'],
    processingFee: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
    limits: { perTransaction: { min: 1, max: 50000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '3-5 days',
    requiresLicense: false,
    complianceRequirements: ['Google Pay API access'],
    kycRequired: false,
    popularity: 'high',
    recommendedFor: ['retail', 'restaurant', 'e-commerce'],
    competitorTo: ['apple_pay', 'samsung_pay'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: true,
      installments: false,
      internationalPayments: true,
      mobileOptimized: true
    },
    documentationUrl: 'https://developers.google.com/pay'
  },

  // === EUROPEAN PAYMENTS ===
  {
    id: 'klarna',
    name: 'klarna',
    displayName: 'Klarna',
    icon: '🌸',
    type: 'bnpl',
    category: 'delayed',
    supportedCountries: ['SE', 'NO', 'DK', 'FI', 'DE', 'AT', 'NL', 'BE', 'GB', 'US'],
    popularInCountries: ['SE', 'NO', 'DK', 'DE', 'GB'],
    processingFee: { percentage: 3.29, fixed: 0.30, currency: 'USD' },
    limits: { perTransaction: { min: 35, max: 10000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'medium',
    setupTimeEstimate: '1-2 weeks',
    requiresLicense: false,
    complianceRequirements: ['Credit assessment', 'GDPR compliance'],
    kycRequired: true,
    popularity: 'high',
    recommendedFor: ['e-commerce', 'fashion', 'electronics'],
    competitorTo: ['afterpay', 'sezzle'],
    features: {
      refunds: true,
      partialRefunds: true,
      subscriptions: false,
      installments: true,
      internationalPayments: true,
      mobileOptimized: true
    }
  },
  {
    id: 'ideal',
    name: 'ideal',
    displayName: 'iDEAL',
    icon: '🇳🇱',
    type: 'bank_transfer',
    category: 'instant',
    supportedCountries: ['NL'],
    popularInCountries: ['NL'],
    processingFee: { percentage: 0.29, fixed: 0.29, currency: 'EUR' },
    limits: { perTransaction: { min: 1, max: 50000 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'easy',
    setupTimeEstimate: '1-2 days',
    requiresLicense: false,
    complianceRequirements: ['Dutch bank integration'],
    kycRequired: false,
    popularity: 'high',
    recommendedFor: ['e-commerce', 'services'],
    competitorTo: ['sepa', 'bancontact'],
    features: {
      refunds: true,
      partialRefunds: false,
      subscriptions: false,
      installments: false,
      internationalPayments: false,
      mobileOptimized: true
    }
  },

  // === CRYPTOCURRENCY ===
  {
    id: 'bitcoin',
    name: 'bitcoin',
    displayName: 'Bitcoin',
    icon: '₿',
    type: 'crypto',
    category: 'delayed',
    supportedCountries: ['*'], // Where legally allowed
    popularInCountries: ['US', 'DE', 'JP', 'SG'],
    processingFee: { percentage: 1.0 },
    limits: { perTransaction: { min: 0.0001, max: 999999 } },
    integrationStatus: 'ready',
    integrationDifficulty: 'complex',
    setupTimeEstimate: '1-2 weeks',
    requiresLicense: true,
    complianceRequirements: ['Crypto license', 'AML compliance', 'Tax reporting'],
    kycRequired: true,
    popularity: 'medium',
    recommendedFor: ['digital_services', 'international_trade'],
    competitorTo: ['ethereum', 'usdc'],
    features: {
      refunds: false,
      partialRefunds: false,
      subscriptions: false,
      installments: false,
      internationalPayments: true,
      mobileOptimized: true
    }
  }
]

// Regional Payment Discovery Functions
export const getPaymentMethodsByCountry = (countryCode: string): PaymentMethod[] => {
  return GLOBAL_PAYMENT_METHODS.filter(method => 
    method.supportedCountries.includes('*') || 
    method.supportedCountries.includes(countryCode)
  )
}

export const getPopularPaymentMethods = (countryCode: string): PaymentMethod[] => {
  return GLOBAL_PAYMENT_METHODS.filter(method => 
    (method.supportedCountries.includes('*') || method.supportedCountries.includes(countryCode)) &&
    (method.popularInCountries.includes('*') || method.popularInCountries.includes(countryCode)) &&
    method.popularity === 'high'
  )
}

export const getPaymentMethodsByBusinessType = (countryCode: string, businessType: string): PaymentMethod[] => {
  return getPaymentMethodsByCountry(countryCode).filter(method =>
    method.recommendedFor.includes('*') || method.recommendedFor.includes(businessType)
  )
}

export const getPaymentMethodById = (id: string): PaymentMethod | undefined => {
  return GLOBAL_PAYMENT_METHODS.find(method => method.id === id)
}

export const getPaymentMethodsByType = (type: PaymentMethod['type']): PaymentMethod[] => {
  return GLOBAL_PAYMENT_METHODS.filter(method => method.type === type)
}

// Business Intelligence Functions
export const calculateProcessingFee = (amount: number, paymentMethodId: string, currency: string = 'USD'): number => {
  const method = getPaymentMethodById(paymentMethodId)
  if (!method) return 0
  
  let fee = 0
  if (method.processingFee.percentage) {
    fee += (amount * method.processingFee.percentage) / 100
  }
  if (method.processingFee.fixed) {
    fee += method.processingFee.fixed
  }
  
  return fee
}

export const getCompetingMethods = (paymentMethodId: string): PaymentMethod[] => {
  const method = getPaymentMethodById(paymentMethodId)
  if (!method) return []
  
  return method.competitorTo.map(id => getPaymentMethodById(id)).filter(Boolean) as PaymentMethod[]
}

export const getMethodsByIntegrationDifficulty = (difficulty: PaymentMethod['integrationDifficulty']): PaymentMethod[] => {
  return GLOBAL_PAYMENT_METHODS.filter(method => method.integrationDifficulty === difficulty)
}
