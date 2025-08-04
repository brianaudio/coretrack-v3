// Enterprise Global Payment Configuration System
export interface PaymentMethod {
  id: string
  name: string
  displayName: string
  icon: string
  type: 'card' | 'digital_wallet' | 'bank_transfer' | 'cash' | 'crypto' | 'bnpl' | 'alternative'
  isPopular: boolean
  isEnabled: boolean
  processingFee: number
  currency: string[]
  countries: string[]
  requiresSetup: boolean
  setupUrl?: string
  apiCredentials?: {
    publicKey?: string
    secretKey?: string
    merchantId?: string
    webhookUrl?: string
  }
  compliance: {
    pciRequired: boolean
    kycRequired: boolean
    regulations: string[]
  }
  features: {
    instantPayment: boolean
    refundSupport: boolean
    recurringPayment: boolean
    partialRefund: boolean
    chargeback: boolean
  }
}

export interface Currency {
  code: string
  name: string
  symbol: string
  symbolPosition: 'before' | 'after'
  decimalPlaces: number
  thousandsSeparator: ',' | '.' | ' '
  decimalSeparator: '.' | ','
  isActive: boolean
  exchangeRate?: number
  lastUpdated?: Date
}

export interface CountryConfig {
  code: string
  name: string
  currency: Currency
  paymentMethods: PaymentMethod[]
  taxSettings: {
    type: 'VAT' | 'GST' | 'Sales Tax' | 'None'
    rate: number
    includedInPrice: boolean
    registrationRequired: boolean
    exemptions: string[]
  }
  compliance: {
    pciDssRequired: boolean
    gdprApplies: boolean
    localRegulations: string[]
    receiptRequirements: {
      businessName: boolean
      address: boolean
      taxId: boolean
      customerInfo: boolean
      itemizedList: boolean
    }
  }
  banking: {
    ibansRequired: boolean
    routingNumbers: boolean
    swiftCodes: boolean
    localBankingFormats: string[]
  }
}

// Global Currency Database (195+ countries)
export const GLOBAL_CURRENCIES: Currency[] = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  
  // Asia Pacific
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  
  // Americas
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  
  // Middle East & Africa
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  
  // Cryptocurrencies
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', symbolPosition: 'before', decimalPlaces: 8, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', symbolPosition: 'before', decimalPlaces: 6, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'USDC', name: 'USD Coin', symbol: 'USDC', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
]

// Global Payment Methods Database
export const GLOBAL_PAYMENT_METHODS: PaymentMethod[] = [
  // Universal Methods
  {
    id: 'cash',
    name: 'cash',
    displayName: 'Cash',
    icon: '💵',
    type: 'cash',
    isPopular: true,
    isEnabled: true,
    processingFee: 0,
    currency: ['*'], // Universal
    countries: ['*'], // Universal
    requiresSetup: false,
    compliance: { pciRequired: false, kycRequired: false, regulations: [] },
    features: { instantPayment: true, refundSupport: false, recurringPayment: false, partialRefund: false, chargeback: false }
  },
  {
    id: 'credit_card',
    name: 'credit_card',
    displayName: 'Credit/Debit Card',
    icon: '💳',
    type: 'card',
    isPopular: true,
    isEnabled: true,
    processingFee: 2.9,
    currency: ['*'],
    countries: ['*'],
    requiresSetup: true,
    compliance: { pciRequired: true, kycRequired: true, regulations: ['PCI DSS'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: true, partialRefund: true, chargeback: true }
  },
  
  // Region-Specific Methods
  
  // Philippines
  {
    id: 'gcash',
    name: 'gcash',
    displayName: 'GCash',
    icon: '📱',
    type: 'digital_wallet',
    isPopular: true,
    isEnabled: true,
    processingFee: 1.5,
    currency: ['PHP'],
    countries: ['PH'],
    requiresSetup: true,
    setupUrl: 'https://developer.gcash.com',
    compliance: { pciRequired: false, kycRequired: true, regulations: ['BSP'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: false, partialRefund: true, chargeback: false }
  },
  
  // China
  {
    id: 'wechat_pay',
    name: 'wechat_pay',
    displayName: 'WeChat Pay',
    icon: '💬',
    type: 'digital_wallet',
    isPopular: true,
    isEnabled: true,
    processingFee: 0.6,
    currency: ['CNY'],
    countries: ['CN'],
    requiresSetup: true,
    compliance: { pciRequired: false, kycRequired: true, regulations: ['PBOC'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: false, partialRefund: true, chargeback: false }
  },
  {
    id: 'alipay',
    name: 'alipay',
    displayName: 'Alipay',
    icon: '🅰️',
    type: 'digital_wallet',
    isPopular: true,
    isEnabled: true,
    processingFee: 0.6,
    currency: ['CNY'],
    countries: ['CN'],
    requiresSetup: true,
    compliance: { pciRequired: false, kycRequired: true, regulations: ['PBOC'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: false, partialRefund: true, chargeback: false }
  },
  
  // India
  {
    id: 'upi',
    name: 'upi',
    displayName: 'UPI',
    icon: '🇮🇳',
    type: 'bank_transfer',
    isPopular: true,
    isEnabled: true,
    processingFee: 0,
    currency: ['INR'],
    countries: ['IN'],
    requiresSetup: true,
    compliance: { pciRequired: false, kycRequired: true, regulations: ['RBI'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: true, partialRefund: true, chargeback: true }
  },
  
  // Europe
  {
    id: 'sepa',
    name: 'sepa',
    displayName: 'SEPA Direct Debit',
    icon: '🏦',
    type: 'bank_transfer',
    isPopular: true,
    isEnabled: true,
    processingFee: 0.35,
    currency: ['EUR'],
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'LU'],
    requiresSetup: true,
    compliance: { pciRequired: false, kycRequired: true, regulations: ['PSD2', 'GDPR'] },
    features: { instantPayment: false, refundSupport: true, recurringPayment: true, partialRefund: true, chargeback: true }
  },
  
  // Buy Now Pay Later
  {
    id: 'klarna',
    name: 'klarna',
    displayName: 'Klarna',
    icon: '💳',
    type: 'bnpl',
    isPopular: true,
    isEnabled: true,
    processingFee: 3.29,
    currency: ['USD', 'EUR', 'GBP', 'SEK', 'NOK', 'DKK'],
    countries: ['US', 'GB', 'DE', 'AT', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL'],
    requiresSetup: true,
    compliance: { pciRequired: true, kycRequired: true, regulations: ['PCI DSS'] },
    features: { instantPayment: true, refundSupport: true, recurringPayment: false, partialRefund: true, chargeback: true }
  }
]

// Country Configuration Examples
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  'PH': {
    code: 'PH',
    name: 'Philippines',
    currency: GLOBAL_CURRENCIES.find(c => c.code === 'PHP')!,
    paymentMethods: GLOBAL_PAYMENT_METHODS.filter(pm => 
      pm.countries.includes('*') || pm.countries.includes('PH')
    ),
    taxSettings: {
      type: 'VAT',
      rate: 12,
      includedInPrice: false,
      registrationRequired: true,
      exemptions: ['medical', 'education', 'basic_food']
    },
    compliance: {
      pciDssRequired: true,
      gdprApplies: false,
      localRegulations: ['BSP', 'BIR'],
      receiptRequirements: {
        businessName: true,
        address: true,
        taxId: true,
        customerInfo: false,
        itemizedList: true
      }
    },
    banking: {
      ibansRequired: false,
      routingNumbers: false,
      swiftCodes: true,
      localBankingFormats: ['BSB']
    }
  },
  
  'US': {
    code: 'US',
    name: 'United States',
    currency: GLOBAL_CURRENCIES.find(c => c.code === 'USD')!,
    paymentMethods: GLOBAL_PAYMENT_METHODS.filter(pm => 
      pm.countries.includes('*') || pm.countries.includes('US')
    ),
    taxSettings: {
      type: 'Sales Tax',
      rate: 8.25, // Varies by state
      includedInPrice: false,
      registrationRequired: true,
      exemptions: ['food', 'medical']
    },
    compliance: {
      pciDssRequired: true,
      gdprApplies: false,
      localRegulations: ['SOX', 'CCPA'],
      receiptRequirements: {
        businessName: true,
        address: true,
        taxId: true,
        customerInfo: false,
        itemizedList: true
      }
    },
    banking: {
      ibansRequired: false,
      routingNumbers: true,
      swiftCodes: true,
      localBankingFormats: ['ACH', 'Wire']
    }
  }
}

// Utility Functions
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return GLOBAL_CURRENCIES.find(currency => currency.code === code)
}

export const getPaymentMethodsByCountry = (countryCode: string): PaymentMethod[] => {
  return GLOBAL_PAYMENT_METHODS.filter(method => 
    method.countries.includes('*') || method.countries.includes(countryCode)
  )
}

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode)
  if (!currency) return amount.toString()
  
  const formattedAmount = amount.toFixed(currency.decimalPlaces)
    .replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator)
    .replace('.', currency.decimalSeparator)
  
  return currency.symbolPosition === 'before' 
    ? `${currency.symbol}${formattedAmount}`
    : `${formattedAmount} ${currency.symbol}`
}

export const validatePaymentMethodForRegion = (
  methodId: string, 
  countryCode: string, 
  currencyCode: string
): boolean => {
  const method = GLOBAL_PAYMENT_METHODS.find(m => m.id === methodId)
  if (!method) return false
  
  const countrySupported = method.countries.includes('*') || method.countries.includes(countryCode)
  const currencySupported = method.currency.includes('*') || method.currency.includes(currencyCode)
  
  return countrySupported && currencySupported
}
