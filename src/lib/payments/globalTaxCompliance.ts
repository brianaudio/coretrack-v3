// Regional Tax & Compliance Engine - Enterprise Grade System
export interface TaxRule {
  id: string
  name: string
  displayName: string
  type: 'vat' | 'gst' | 'sales_tax' | 'service_tax' | 'withholding_tax' | 'customs_duty'
  rate: number
  isPercentage: boolean
  
  // Regional Application
  countryCode: string
  stateProvince?: string
  city?: string
  
  // Business Rules
  applicableBusinessTypes: string[]
  minimumAmount?: number
  maximumAmount?: number
  exemptCategories?: string[]
  
  // Calculation Rules
  taxBasis: 'subtotal' | 'total_with_fees' | 'item_level'
  compounding: boolean // Does this tax apply on top of other taxes?
  roundingMethod: 'up' | 'down' | 'nearest'
  
  // Compliance Requirements
  requiresRegistration: boolean
  registrationThreshold?: number
  filingFrequency: 'monthly' | 'quarterly' | 'annually' | 'real_time'
  filingDeadline: number // Days after period end
  
  // Receipt Requirements
  mustShowOnReceipt: boolean
  receiptLabel: string
  breakdownRequired: boolean
  
  // Reporting
  reportingFormat: 'standard' | 'detailed' | 'government_specific'
  auditTrailRequired: boolean
  
  // Status
  isActive: boolean
  effectiveDate: string
  expiryDate?: string
}

export interface ComplianceRequirement {
  id: string
  countryCode: string
  type: 'receipt' | 'reporting' | 'registration' | 'audit' | 'documentation'
  title: string
  description: string
  mandatory: boolean
  businessTypes: string[]
  threshold?: {
    amount: number
    currency: string
    period: 'daily' | 'monthly' | 'annually'
  }
  penalty?: {
    type: 'fixed' | 'percentage'
    amount: number
    description: string
  }
  resources: {
    documentationUrl?: string
    formUrl?: string
    contactInfo?: string
  }
}

// Comprehensive Global Tax Database
export const GLOBAL_TAX_RULES: TaxRule[] = [
  // === PHILIPPINES ===
  {
    id: 'ph_vat',
    name: 'ph_vat',
    displayName: 'Value Added Tax (VAT)',
    type: 'vat',
    rate: 12,
    isPercentage: true,
    countryCode: 'PH',
    applicableBusinessTypes: ['*'],
    minimumAmount: 0,
    exemptCategories: ['basic_commodities', 'medicines', 'educational_materials'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 3000000, // PHP 3M annually
    filingFrequency: 'monthly',
    filingDeadline: 20,
    mustShowOnReceipt: true,
    receiptLabel: 'VAT (12%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },
  {
    id: 'ph_withholding_tax',
    name: 'ph_withholding_tax',
    displayName: 'Withholding Tax',
    type: 'withholding_tax',
    rate: 1, // Varies by service type
    isPercentage: true,
    countryCode: 'PH',
    applicableBusinessTypes: ['services', 'professional'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'down',
    requiresRegistration: true,
    filingFrequency: 'monthly',
    filingDeadline: 10,
    mustShowOnReceipt: true,
    receiptLabel: 'Withholding Tax',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },

  // === UNITED STATES ===
  {
    id: 'us_ca_sales_tax',
    name: 'us_ca_sales_tax',
    displayName: 'California Sales Tax',
    type: 'sales_tax',
    rate: 7.25, // Base rate
    isPercentage: true,
    countryCode: 'US',
    stateProvince: 'CA',
    applicableBusinessTypes: ['retail', 'restaurant', 'e-commerce'],
    exemptCategories: ['groceries', 'prescription_drugs'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'up',
    requiresRegistration: true,
    registrationThreshold: 100000, // $100K annually
    filingFrequency: 'quarterly',
    filingDeadline: 30,
    mustShowOnReceipt: true,
    receiptLabel: 'Sales Tax',
    breakdownRequired: false,
    reportingFormat: 'standard',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },
  {
    id: 'us_ny_sales_tax',
    name: 'us_ny_sales_tax',
    displayName: 'New York Sales Tax',
    type: 'sales_tax',
    rate: 8.0,
    isPercentage: true,
    countryCode: 'US',
    stateProvince: 'NY',
    applicableBusinessTypes: ['retail', 'restaurant', 'services'],
    exemptCategories: ['clothing_under_110', 'groceries'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 100000,
    filingFrequency: 'quarterly',
    filingDeadline: 20,
    mustShowOnReceipt: true,
    receiptLabel: 'Sales Tax',
    breakdownRequired: false,
    reportingFormat: 'standard',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },

  // === EUROPEAN UNION ===
  {
    id: 'de_vat',
    name: 'de_vat',
    displayName: 'German VAT (Mehrwertsteuer)',
    type: 'vat',
    rate: 19,
    isPercentage: true,
    countryCode: 'DE',
    applicableBusinessTypes: ['*'],
    exemptCategories: ['financial_services', 'insurance', 'education'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 22000, // EUR 22K annually
    filingFrequency: 'monthly',
    filingDeadline: 10,
    mustShowOnReceipt: true,
    receiptLabel: 'MwSt. (19%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },
  {
    id: 'gb_vat',
    name: 'gb_vat',
    displayName: 'UK VAT',
    type: 'vat',
    rate: 20,
    isPercentage: true,
    countryCode: 'GB',
    applicableBusinessTypes: ['*'],
    exemptCategories: ['financial_services', 'insurance', 'education', 'healthcare'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 85000, // GBP 85K annually
    filingFrequency: 'quarterly',
    filingDeadline: 30,
    mustShowOnReceipt: true,
    receiptLabel: 'VAT (20%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2021-01-01'
  },

  // === SINGAPORE ===
  {
    id: 'sg_gst',
    name: 'sg_gst',
    displayName: 'Goods and Services Tax (GST)',
    type: 'gst',
    rate: 8, // Updated to 8% in 2023
    isPercentage: true,
    countryCode: 'SG',
    applicableBusinessTypes: ['*'],
    exemptCategories: ['financial_services', 'residential_property', 'education'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 1000000, // SGD 1M annually
    filingFrequency: 'quarterly',
    filingDeadline: 30,
    mustShowOnReceipt: true,
    receiptLabel: 'GST (8%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2023-01-01'
  },

  // === AUSTRALIA ===
  {
    id: 'au_gst',
    name: 'au_gst',
    displayName: 'Goods and Services Tax (GST)',
    type: 'gst',
    rate: 10,
    isPercentage: true,
    countryCode: 'AU',
    applicableBusinessTypes: ['*'],
    exemptCategories: ['basic_food', 'medical_services', 'education', 'financial_services'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 75000, // AUD 75K annually
    filingFrequency: 'quarterly',
    filingDeadline: 28,
    mustShowOnReceipt: true,
    receiptLabel: 'GST (10%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  },

  // === CANADA ===
  {
    id: 'ca_gst',
    name: 'ca_gst',
    displayName: 'Goods and Services Tax (GST)',
    type: 'gst',
    rate: 5,
    isPercentage: true,
    countryCode: 'CA',
    applicableBusinessTypes: ['*'],
    exemptCategories: ['basic_groceries', 'medical_services', 'educational_services'],
    taxBasis: 'subtotal',
    compounding: false,
    roundingMethod: 'nearest',
    requiresRegistration: true,
    registrationThreshold: 30000, // CAD 30K annually
    filingFrequency: 'quarterly',
    filingDeadline: 30,
    mustShowOnReceipt: true,
    receiptLabel: 'GST (5%)',
    breakdownRequired: true,
    reportingFormat: 'government_specific',
    auditTrailRequired: true,
    isActive: true,
    effectiveDate: '2020-01-01'
  }
]

// Global Compliance Requirements Database
export const GLOBAL_COMPLIANCE_REQUIREMENTS: ComplianceRequirement[] = [
  // === PHILIPPINES ===
  {
    id: 'ph_official_receipts',
    countryCode: 'PH',
    type: 'receipt',
    title: 'Official Receipts (OR) / Sales Invoices (SI)',
    description: 'All businesses must issue BIR-registered receipts for transactions',
    mandatory: true,
    businessTypes: ['*'],
    threshold: { amount: 0, currency: 'PHP', period: 'daily' },
    penalty: { type: 'fixed', amount: 1000, description: 'PHP 1,000 fine per violation' },
    resources: {
      documentationUrl: 'https://www.bir.gov.ph/index.php/tax-information/registration.html',
      formUrl: 'https://www.bir.gov.ph/index.php/downloadable-forms.html'
    }
  },
  {
    id: 'ph_bir_registration',
    countryCode: 'PH',
    type: 'registration',
    title: 'BIR Business Registration',
    description: 'Register with Bureau of Internal Revenue within 30 days of business start',
    mandatory: true,
    businessTypes: ['*'],
    penalty: { type: 'fixed', amount: 10000, description: 'PHP 10,000 + closure penalty' },
    resources: {
      documentationUrl: 'https://www.bir.gov.ph/index.php/registration.html'
    }
  },

  // === UNITED STATES ===
  {
    id: 'us_sales_tax_permit',
    countryCode: 'US',
    type: 'registration',
    title: 'Sales Tax Permit',
    description: 'Required for businesses selling taxable goods or services',
    mandatory: true,
    businessTypes: ['retail', 'restaurant', 'e-commerce'],
    threshold: { amount: 100000, currency: 'USD', period: 'annually' },
    penalty: { type: 'percentage', amount: 25, description: '25% penalty on unpaid taxes' },
    resources: {
      documentationUrl: 'https://www.salestaxinstitute.com/'
    }
  },

  // === EUROPEAN UNION ===
  {
    id: 'eu_vat_registration',
    countryCode: 'DE',
    type: 'registration',
    title: 'VAT Registration (Umsatzsteuer-ID)',
    description: 'VAT registration required above threshold',
    mandatory: true,
    businessTypes: ['*'],
    threshold: { amount: 22000, currency: 'EUR', period: 'annually' },
    penalty: { type: 'percentage', amount: 20, description: '20% penalty + interest' },
    resources: {
      documentationUrl: 'https://www.bzst.de/EN/Home/home_node.html'
    }
  }
]

// Tax Engine Functions
export const getTaxRulesByCountry = (countryCode: string, stateProvince?: string): TaxRule[] => {
  return GLOBAL_TAX_RULES.filter(rule => 
    rule.countryCode === countryCode && 
    rule.isActive &&
    (!stateProvince || !rule.stateProvince || rule.stateProvince === stateProvince)
  )
}

export const getTaxRulesByBusinessType = (countryCode: string, businessType: string): TaxRule[] => {
  return getTaxRulesByCountry(countryCode).filter(rule =>
    rule.applicableBusinessTypes.includes('*') || 
    rule.applicableBusinessTypes.includes(businessType)
  )
}

export const calculateTax = (
  amount: number, 
  taxRuleId: string, 
  exemptCategories: string[] = []
): { taxAmount: number; isExempt: boolean; breakdown: any } => {
  const rule = GLOBAL_TAX_RULES.find(r => r.id === taxRuleId)
  if (!rule) return { taxAmount: 0, isExempt: false, breakdown: null }
  
  // Check exemptions
  const isExempt = exemptCategories.some(category => 
    rule.exemptCategories?.includes(category)
  )
  if (isExempt) return { taxAmount: 0, isExempt: true, breakdown: null }
  
  // Check minimum/maximum amounts
  if (rule.minimumAmount && amount < rule.minimumAmount) {
    return { taxAmount: 0, isExempt: false, breakdown: null }
  }
  if (rule.maximumAmount && amount > rule.maximumAmount) {
    return { taxAmount: 0, isExempt: false, breakdown: null }
  }
  
  // Calculate tax
  let taxAmount = rule.isPercentage ? (amount * rule.rate) / 100 : rule.rate
  
  // Apply rounding
  switch (rule.roundingMethod) {
    case 'up':
      taxAmount = Math.ceil(taxAmount * 100) / 100
      break
    case 'down':
      taxAmount = Math.floor(taxAmount * 100) / 100
      break
    case 'nearest':
      taxAmount = Math.round(taxAmount * 100) / 100
      break
  }
  
  return {
    taxAmount,
    isExempt: false,
    breakdown: {
      rule: rule.displayName,
      rate: rule.rate,
      isPercentage: rule.isPercentage,
      basis: amount,
      calculation: `${rule.rate}${rule.isPercentage ? '%' : ''} of ${amount}`
    }
  }
}

export const getComplianceRequirements = (countryCode: string, businessType: string): ComplianceRequirement[] => {
  return GLOBAL_COMPLIANCE_REQUIREMENTS.filter(req =>
    req.countryCode === countryCode &&
    (req.businessTypes.includes('*') || req.businessTypes.includes(businessType))
  )
}

export const checkComplianceThreshold = (
  requirement: ComplianceRequirement, 
  businessMetrics: { revenue: number; period: string }
): boolean => {
  if (!requirement.threshold) return true
  
  // Convert business metrics to requirement period for comparison
  // This would need more sophisticated logic for real implementation
  return businessMetrics.revenue >= requirement.threshold.amount
}

// Tax Settings Configuration
export interface TaxConfiguration {
  enabled: boolean
  countryCode: string
  stateProvince?: string
  businessType: string
  enabledTaxRules: string[]
  exemptCategories: string[]
  defaultInclusive: boolean // Are prices tax-inclusive?
  complianceSettings: {
    requireOfficialReceipts: boolean
    auditTrailEnabled: boolean
    automaticFiling: boolean
  }
}

export const getRecommendedTaxConfiguration = (
  countryCode: string, 
  businessType: string = 'retail'
): TaxConfiguration => {
  const applicableRules = getTaxRulesByBusinessType(countryCode, businessType)
  const complianceReqs = getComplianceRequirements(countryCode, businessType)
  
  return {
    enabled: true,
    countryCode,
    businessType,
    enabledTaxRules: applicableRules
      .filter(rule => rule.type === 'vat' || rule.type === 'gst' || rule.type === 'sales_tax')
      .map(rule => rule.id),
    exemptCategories: [],
    defaultInclusive: ['GB', 'AU', 'DE'].includes(countryCode), // Tax-inclusive pricing common in these countries
    complianceSettings: {
      requireOfficialReceipts: complianceReqs.some(req => req.type === 'receipt'),
      auditTrailEnabled: applicableRules.some(rule => rule.auditTrailRequired),
      automaticFiling: false // Start with manual filing
    }
  }
}
