'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useSubscription } from '../../lib/context/SubscriptionContext'
import { SUBSCRIPTION_PLANS } from '../../lib/types/subscription'
import { useBranch } from '../../lib/context/BranchContext'
import SecurityAuditPanel from '@/components/security/SecurityAuditPanel'
import { getAllCountries, getCountryByName, formatCurrency, getPopularCountries, getCountryByCode } from '@/lib/payments/globalCurrencies'
import { getPaymentMethodsByCountry, getPopularPaymentMethods, getPaymentMethodsByBusinessType, calculateProcessingFee, PaymentMethod } from '@/lib/payments/globalPaymentMethods'
import { getTaxRulesByCountry, getTaxRulesByBusinessType, getComplianceRequirements, getRecommendedTaxConfiguration, TaxRule, ComplianceRequirement } from '@/lib/payments/globalTaxCompliance'

// POS & Payments Settings Component
function POSPaymentsTab({ paymentSettings, setPaymentSettings }: {
  paymentSettings: any
  setPaymentSettings: (settings: any) => void
}) {
  // Get all countries from global database
  const allCountries = getAllCountries()
  const popularCountries = getPopularCountries()
  
  // Get current country data
  const currentCountry = getCountryByName(paymentSettings.country)
  const currentCountryCode = currentCountry?.code || 'US'
  
  // Get payment methods for current country
  const availablePaymentMethods = getPaymentMethodsByCountry(currentCountryCode)
  const popularPaymentMethods = getPopularPaymentMethods(currentCountryCode)
  const businessTypeMethods = getPaymentMethodsByBusinessType(currentCountryCode, 'restaurant') // Default to restaurant

  // Get tax rules and compliance for current country
  const availableTaxRules = getTaxRulesByCountry(currentCountryCode)
  const businessTypeTaxRules = getTaxRulesByBusinessType(currentCountryCode, paymentSettings.businessType || 'restaurant')
  const complianceRequirements = getComplianceRequirements(currentCountryCode, paymentSettings.businessType || 'restaurant')
  const recommendedTaxConfig = getRecommendedTaxConfiguration(currentCountryCode, paymentSettings.businessType || 'restaurant')

  const handleCountryChange = (countryName: string) => {
    const countryData = getCountryByName(countryName)
    
    if (countryData) {
      // Get popular payment methods for this country
      const popularMethods = getPopularPaymentMethods(countryData.code)
      const defaultEnabledMethods = popularMethods.reduce((acc, method) => ({
        ...acc,
        [method.id]: true
      }), {})
      
      // Get recommended tax configuration
      const taxConfig = getRecommendedTaxConfiguration(countryData.code, paymentSettings.businessType || 'restaurant')
      
      setPaymentSettings({
        ...paymentSettings,
        country: countryName,
        currency: countryData.currency.code,
        currencySymbol: countryData.currency.symbol,
        enabledPaymentMethods: {
          cash: true, // Always enable cash
          ...defaultEnabledMethods
        },
        // Update tax settings based on country
        taxSettings: {
          ...paymentSettings.taxSettings,
          enableTax: taxConfig.enabled,
          enabledTaxRules: taxConfig.enabledTaxRules,
          pricesIncludeTax: taxConfig.defaultInclusive,
          complianceSettings: taxConfig.complianceSettings
        }
      })
    }
  }

  const togglePaymentMethod = (methodId: string) => {
    setPaymentSettings({
      ...paymentSettings,
      enabledPaymentMethods: {
        ...paymentSettings.enabledPaymentMethods,
        [methodId]: !paymentSettings.enabledPaymentMethods[methodId]
      }
    })
  }

  const getMethodStatusBadge = (method: PaymentMethod) => {
    switch (method.integrationStatus) {
      case 'ready':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Ready</span>
      case 'beta':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Beta</span>
      case 'coming_soon':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Soon</span>
      case 'requires_setup':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Setup</span>
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'complex': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const currentCountryMethods = availablePaymentMethods

  const toggleTaxRule = (ruleId: string) => {
    const currentRules = paymentSettings.taxSettings?.enabledTaxRules || []
    const updatedRules = currentRules.includes(ruleId)
      ? currentRules.filter((id: string) => id !== ruleId)
      : [...currentRules, ruleId]
    
    setPaymentSettings({
      ...paymentSettings,
      taxSettings: {
        ...paymentSettings.taxSettings,
        enabledTaxRules: updatedRules
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">POS & Payment Settings</h1>
        <p className="text-gray-600">Configure payment methods and POS settings for your region</p>
      </div>

      {/* Country & Currency Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Regional Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country/Region</label>
            <select
              value={paymentSettings.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Popular Countries">
                {popularCountries.map(country => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All Countries">
                {allCountries.filter(c => !popularCountries.find(p => p.code === c.code)).map(country => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={paymentSettings.currency}
                onChange={(e) => setPaymentSettings({...paymentSettings, currency: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
              <input
                type="text"
                value={paymentSettings.currencySymbol}
                onChange={(e) => setPaymentSettings({...paymentSettings, currencySymbol: e.target.value})}
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="₱"
                readOnly
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Format preview: <span className="font-semibold text-blue-600">
                {formatCurrency(1234.56, paymentSettings.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Payment Methods</h2>
        <p className="text-gray-600 mb-6">Regional payment methods discovered for {paymentSettings.country}</p>
        
        {/* Payment Method Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{availablePaymentMethods.length}</div>
            <div className="text-sm text-gray-600">Available Methods</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{popularPaymentMethods.length}</div>
            <div className="text-sm text-gray-600">Popular Methods</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {availablePaymentMethods.filter(m => m.integrationStatus === 'ready').length}
            </div>
            <div className="text-sm text-gray-600">Ready to Use</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(paymentSettings.enabledPaymentMethods).filter(key => paymentSettings.enabledPaymentMethods[key]).length}
            </div>
            <div className="text-sm text-gray-600">Currently Enabled</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentCountryMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                paymentSettings.enabledPaymentMethods[method.id]
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => togglePaymentMethod(method.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{method.displayName}</div>
                    <div className="text-xs text-gray-500 capitalize">{method.type.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getMethodStatusBadge(method)}
                  <input
                    type="checkbox"
                    checked={paymentSettings.enabledPaymentMethods[method.id] || false}
                    onChange={() => togglePaymentMethod(method.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Payment Method Details */}
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Processing Fee:</span>
                  <span className="font-medium">
                    {method.processingFee.percentage ? `${method.processingFee.percentage}%` : 'Free'}
                    {method.processingFee.fixed ? ` + ${formatCurrency(method.processingFee.fixed, method.processingFee.currency || 'USD')}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Setup Time:</span>
                  <span className={`font-medium ${getDifficultyColor(method.integrationDifficulty)}`}>
                    {method.setupTimeEstimate}
                  </span>
                </div>
                {method.limits.perTransaction && (
                  <div className="flex justify-between">
                    <span>Limits:</span>
                    <span className="font-medium">
                      {formatCurrency(method.limits.perTransaction.min, currentCountry?.currency.code || 'USD')} - {formatCurrency(method.limits.perTransaction.max, currentCountry?.currency.code || 'USD')}
                    </span>
                  </div>
                )}
                {method.features.refunds && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Supports refunds</span>
                  </div>
                )}
                {method.requiresLicense && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-orange-600">Requires license</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax & Compliance Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tax & Compliance Engine</h2>
            <p className="text-gray-600">Advanced tax calculations and regulatory compliance</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {paymentSettings.taxSettings?.enableTax ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => setPaymentSettings({
                ...paymentSettings,
                taxSettings: {
                  ...paymentSettings.taxSettings,
                  enableTax: !paymentSettings.taxSettings?.enableTax
                }
              })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                paymentSettings.taxSettings?.enableTax ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  paymentSettings.taxSettings?.enableTax ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {paymentSettings.taxSettings?.enableTax ? (
          <div className="space-y-6">
            {/* Tax Engine Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{availableTaxRules.length}</div>
                <div className="text-sm text-green-700">Available Tax Rules</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{businessTypeTaxRules.length}</div>
                <div className="text-sm text-blue-700">Business Applicable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{complianceRequirements.length}</div>
                <div className="text-sm text-purple-700">Compliance Rules</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {paymentSettings.taxSettings?.enabledTaxRules?.length || 0}
                </div>
                <div className="text-sm text-orange-700">Currently Enabled</div>
              </div>
            </div>

            {/* Tax Rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Rules for {paymentSettings.country}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessTypeTaxRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentSettings.taxSettings?.enabledTaxRules?.includes(rule.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleTaxRule(rule.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{rule.displayName}</div>
                        <div className="text-sm text-gray-600 capitalize">{rule.type.replace('_', ' ')}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {rule.rate}{rule.isPercentage ? '%' : ''}
                        </span>
                        <input
                          type="checkbox"
                          checked={paymentSettings.taxSettings?.enabledTaxRules?.includes(rule.id) || false}
                          onChange={() => toggleTaxRule(rule.id)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Filing:</span>
                        <span className="font-medium capitalize">{rule.filingFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Receipt Required:</span>
                        <span className={`font-medium ${rule.mustShowOnReceipt ? 'text-green-600' : 'text-gray-500'}`}>
                          {rule.mustShowOnReceipt ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {rule.requiresRegistration && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-orange-600">Registration required</span>
                          {rule.registrationThreshold && (
                            <span className="text-gray-500">
                              (&gt;{formatCurrency(rule.registrationThreshold, currentCountry?.currency.code || 'USD')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Requirements */}
            {complianceRequirements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Requirements</h3>
                <div className="space-y-3">
                  {complianceRequirements.map((req) => (
                    <div key={req.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{req.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                          {req.penalty && (
                            <p className="text-sm text-red-600 mt-2">
                              <strong>Penalty:</strong> {req.penalty.description}
                            </p>
                          )}
                          {req.resources.documentationUrl && (
                            <a
                              href={req.resources.documentationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                            >
                              Learn more →
                            </a>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          req.mandatory ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {req.mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tax Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Configuration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Prices Include Tax</div>
                      <div className="text-sm text-gray-600">Display tax-inclusive pricing</div>
                    </div>
                    <button
                      onClick={() => setPaymentSettings({
                        ...paymentSettings,
                        taxSettings: {
                          ...paymentSettings.taxSettings,
                          pricesIncludeTax: !paymentSettings.taxSettings?.pricesIncludeTax
                        }
                      })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        paymentSettings.taxSettings?.pricesIncludeTax ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          paymentSettings.taxSettings?.pricesIncludeTax ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Audit Trail</div>
                      <div className="text-sm text-gray-600">Track all tax calculations</div>
                    </div>
                    <button
                      onClick={() => setPaymentSettings({
                        ...paymentSettings,
                        taxSettings: {
                          ...paymentSettings.taxSettings,
                          complianceSettings: {
                            ...paymentSettings.taxSettings?.complianceSettings,
                            auditTrailEnabled: !paymentSettings.taxSettings?.complianceSettings?.auditTrailEnabled
                          }
                        }
                      })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        paymentSettings.taxSettings?.complianceSettings?.auditTrailEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          paymentSettings.taxSettings?.complianceSettings?.auditTrailEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tax Engine Disabled</h3>
            <p className="text-gray-600 max-w-sm mx-auto mb-4">
              Enable the tax engine to automatically handle regional tax calculations, compliance requirements, and official receipt generation.
            </p>
            <div className="text-sm text-gray-500">
              Available for {paymentSettings.country}: {availableTaxRules.length} tax rules, {complianceRequirements.length} compliance requirements
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // Save settings logic here
            alert('Payment settings saved successfully!')
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Payment Settings
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { profile } = useAuth()
  // Note: BranchContext will be available when used within Dashboard component
  const [activeTab, setActiveTab] = useState('billing')
  
  console.log('Current active tab:', activeTab)
  
  // POS & Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    country: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    businessType: 'restaurant',
    enabledPaymentMethods: {
      cash: true,
      credit_card: true,
      gcash: true,
      maya: true,
      paypal: false,
      stripe: false,
      paymongo: false,
      grab_pay: false,
      shopee_pay: false
    },
    taxSettings: {
      enableTax: false, // Disabled by default - user can toggle
      enabledTaxRules: [],
      pricesIncludeTax: false,
      complianceSettings: {
        requireOfficialReceipts: false,
        auditTrailEnabled: false,
        automaticFiling: false
      }
    },
    receiptSettings: {
      businessName: 'Your Business Name',
      businessAddress: '',
      taxId: '',
      showTaxBreakdown: true,
      footerMessage: 'Thank you for your business!'
    }
  })

  const tabs = [
    { id: 'business', label: 'Business Profile', icon: '🏢' },
    { id: 'pos-payments', label: 'POS & Payments', icon: '💳' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integration', label: 'Integrations', icon: '🔗' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing & Plan', icon: '💳' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ]

  return (
    <div className="flex h-full bg-surface-50 min-h-screen">
      {/* Sidebar */}
      <div className="w-72 bg-white shadow-lg border-r border-surface-200 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 bg-white">
          <div className="px-6 py-6 border-b border-surface-200 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-surface-900">Settings</h1>
                <p className="text-sm text-surface-600 mt-0.5">Business Configuration</p>
              </div>
            </div>
          </div>
          
          <nav className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
            <div className="space-y-2">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    console.log('Tab clicked:', tab.id)
                    setActiveTab(tab.id)
                  }}
                  className={`group w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    {tab.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block truncate">{tab.label}</span>
                    {activeTab === tab.id && (
                      <span className="text-xs text-primary-600 mt-0.5 block">Currently viewing</span>
                    )}
                  </div>
                  {activeTab === tab.id && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Sidebar Footer */}
            <div className="mt-8 pt-6 border-t border-surface-200">
              <div className="px-4 py-3 bg-surface-25 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-700">System Status</p>
                    <p className="text-xs text-green-600">All systems operational</p>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-surface-200 shadow-sm">
        <div className="px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-medium"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {activeTab === 'business' && <BusinessProfileTab />}
            {activeTab === 'pos-payments' && <POSPaymentsTab paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'integration' && <IntegrationTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Business Profile Tab
function BusinessProfileTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Business Profile</h2>
        <p className="mt-2 text-surface-600 max-w-2xl">
          Manage your core business information and branding settings.
        </p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-900">
                <strong>Need to manage locations and business hours?</strong> Use the <strong>Locations</strong> module in the main navigation for complete branch management including addresses, operating hours, and staff assignments.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* Main Business Information */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-surface-900">Business Information</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Complete
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                defaultValue=""
                className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900">
                <option>Restaurant</option>
                <option>Retail Store</option>
                <option>Coffee Shop</option>
                <option>Grocery Store</option>
                <option>Pharmacy</option>
                <option>Convenience Store</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Tax ID Number
              </label>
              <input
                type="text"
                defaultValue=""
                className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                placeholder="Enter tax identification number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                defaultValue=""
                className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                placeholder="+63 XXX XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Business Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                defaultValue=""
                className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                placeholder="business@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Business Description
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400 resize-none"
                placeholder="Brief description of your business"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-surface-200">
        <div className="flex items-center space-x-2 text-sm text-surface-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last updated: Jan 15, 2025 at 2:30 PM</span>
        </div>
        <div className="flex space-x-3">
          <button className="px-6 py-3 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium">
            Reset Changes
          </button>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Notifications Tab
function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Notification Settings</h2>
        <p className="text-surface-600">Configure how and when you receive notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Email Notifications */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Email Notifications</h3>
          <div className="space-y-4">
            {[
              { id: 'low-stock', label: 'Low stock alerts', description: 'Get notified when items are running low' },
              { id: 'daily-reports', label: 'Daily sales reports', description: 'Receive daily performance summaries' },
              { id: 'user-activity', label: 'User activity alerts', description: 'Get notified of important user actions' },
              { id: 'system-updates', label: 'System updates', description: 'Receive notifications about new features' }
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-surface-900">{setting.label}</div>
                  <div className="text-sm text-surface-600">{setting.description}</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Push Notifications</h3>
          <div className="space-y-4">
            {[
              { id: 'new-orders', label: 'New orders', description: 'Get notified of new customer orders' },
              { id: 'payment-alerts', label: 'Payment alerts', description: 'Receive alerts for payment issues' },
              { id: 'emergency-alerts', label: 'Emergency alerts', description: 'Critical system notifications' },
              { id: 'shift-reminders', label: 'Shift reminders', description: 'Reminders for upcoming shifts' }
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-surface-900">{setting.label}</div>
                  <div className="text-sm text-surface-600">{setting.description}</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Integration Tab
function IntegrationTab() {
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([
    'GrabFood', 'Stripe', 'Gmail', 'Zapier'
  ]);

  const handleIntegrationToggle = (integrationName: string, currentStatus: string) => {
    if (currentStatus === 'connected') {
      // Disconnect the integration
      setConnectedIntegrations(prev => prev.filter(name => name !== integrationName));
      // You could add a toast notification here
      console.log(`Disconnected from ${integrationName}`);
    } else {
      // Connect the integration
      setConnectedIntegrations(prev => [...prev, integrationName]);
      // You could add a toast notification here  
      console.log(`Connected to ${integrationName}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Integrations</h2>
        <p className="mt-2 text-surface-600 max-w-3xl">
          Connect CoreTrack with your favorite business tools and services to streamline operations and automate workflows.
        </p>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0">
              <div className="text-2xl font-bold text-surface-900">12</div>
              <div className="text-sm text-surface-600 break-words">Total Integrations</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0">
              <div className="text-2xl font-bold text-green-600">{connectedIntegrations.length}</div>
              <div className="text-sm text-surface-600 break-words">Connected</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 min-w-0">
              <div className="text-2xl font-bold text-orange-600">{12 - connectedIntegrations.length}</div>
              <div className="text-sm text-surface-600 break-words">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Integrations */}
      <div>
        <h3 className="text-xl font-semibold text-surface-900 mb-6">Popular Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[
            { 
              name: 'GCash Business', 
              description: 'Accept GCash payments directly in your POS system', 
              icon: '💳', 
              status: 'available',
              category: 'Payments',
              features: ['QR code payments', 'Real-time settlement', 'Transaction reporting'],
              popular: true
            },
            { 
              name: 'Maya Business', 
              description: 'Integrate Maya (PayMaya) for seamless digital payments', 
              icon: '📱', 
              status: 'available',
              category: 'Payments',
              features: ['Mobile payments', 'Online transactions', 'Payment analytics'],
              popular: true
            },
            { 
              name: 'GrabFood', 
              description: 'Sync your menu and manage GrabFood orders', 
              icon: '🍔', 
              status: 'connected',
              category: 'Food Delivery',
              features: ['Menu synchronization', 'Order management', 'Inventory tracking'],
              popular: true
            },
            { 
              name: 'Foodpanda', 
              description: 'Connect with Foodpanda for order and menu management', 
              icon: '🐼', 
              status: 'available',
              category: 'Food Delivery',
              features: ['Order synchronization', 'Menu updates', 'Revenue tracking'],
              popular: true
            },
            { 
              name: 'QuickBooks', 
              description: 'Sync your financial data and automate accounting workflows', 
              icon: '💼', 
              status: 'available',
              category: 'Accounting',
              features: ['Auto sync transactions', 'Tax reporting', 'Financial analytics']
            },
            { 
              name: 'Shopify', 
              description: 'Connect your online store inventory and orders', 
              icon: '🛒', 
              status: 'available',
              category: 'E-commerce',
              features: ['Inventory sync', 'Order management', 'Product catalog']
            },
            { 
              name: 'Stripe', 
              description: 'Process international payments securely', 
              icon: '�', 
              status: 'connected',
              category: 'Payments',
              features: ['International cards', 'Subscription billing', 'Financial reporting']
            },
            { 
              name: 'Gmail', 
              description: 'Send reports and notifications via Gmail', 
              icon: '📧', 
              status: 'connected',
              category: 'Communication',
              features: ['Email notifications', 'Report delivery', 'Custom templates']
            },
            { 
              name: 'Slack', 
              description: 'Get real-time notifications in your Slack workspace', 
              icon: '💬', 
              status: 'available',
              category: 'Communication',
              features: ['Real-time alerts', 'Team notifications', 'Custom channels']
            },
            { 
              name: 'Zapier', 
              description: 'Automate workflows with 5000+ apps and services', 
              icon: '⚡', 
              status: 'connected',
              category: 'Automation',
              features: ['Workflow automation', '5000+ app connections', 'Custom triggers']
            }
          ].map((integration) => {
            const isConnected = connectedIntegrations.includes(integration.name);
            const currentStatus = isConnected ? 'connected' : 'available';
            
            return (
            <div key={integration.name} className={`card p-6 hover:shadow-md transition-shadow h-full flex flex-col ${
              integration.popular ? 'border-primary-200 bg-primary-50' : ''
            }`}>
              {/* Header with icon, name, and status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">{integration.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-surface-900 text-base">{integration.name}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-600">
                        {integration.category}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          currentStatus === 'connected' ? 'bg-green-500' : 'bg-surface-300'
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          currentStatus === 'connected' ? 'text-green-600' : 'text-surface-500'
                        }`}>
                          {currentStatus === 'connected' ? 'Connected' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-sm text-surface-600 mb-4 line-clamp-2">{integration.description}</p>
              
              {/* Features */}
              <div className="mb-6 flex-grow">
                <h5 className="text-xs font-medium text-surface-700 mb-3">Key Features:</h5>
                <ul className="space-y-2">
                  {integration.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-xs text-surface-600">
                      <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Action button */}
              <button 
                onClick={() => handleIntegrationToggle(integration.name, currentStatus)}
                className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors mt-auto ${
                  currentStatus === 'connected'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                }`}
              >
                {currentStatus === 'connected' ? 'Disconnect' : 'Connect Now'}
              </button>
            </div>
            )
          })}
        </div>
      </div>

      {/* Additional Integrations */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-surface-900">More Integrations</h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Browse All →
          </button>
        </div>
        <div className="card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              // Philippine-specific integrations
              { name: 'LBC', icon: '📦', category: 'Logistics', popular: true },
              { name: 'J&T Express', icon: '🚚', category: 'Delivery', popular: true },
              { name: 'UnionBank', icon: '🏦', category: 'Banking', popular: true },
              { name: 'BPI Business', icon: '💳', category: 'Banking', popular: true },
              { name: 'BIR e-Filing', icon: '📋', category: 'Government', popular: true },
              { name: 'Lazada', icon: '🛍️', category: 'E-commerce', popular: true },
              { name: 'Shopee', icon: '🛒', category: 'E-commerce', popular: true },
              { name: 'Facebook Business', icon: '📘', category: 'Marketing', popular: true },
              
              // International integrations
              { name: 'Xero', icon: '📊', category: 'Accounting' },
              { name: 'WooCommerce', icon: '🏪', category: 'E-commerce' },
              { name: 'PayPal', icon: '💰', category: 'Payments' },
              { name: 'Mailchimp', icon: '📮', category: 'Marketing' },
              { name: 'Trello', icon: '📋', category: 'Project Management' },
              { name: 'Google Sheets', icon: '📈', category: 'Productivity' },
              { name: 'Microsoft Teams', icon: '👥', category: 'Communication' },
              { name: 'WhatsApp Business', icon: '💬', category: 'Messaging' }
            ].map((integration) => (
              <div key={integration.name} className={`flex items-center space-x-3 p-3 border rounded-xl hover:bg-surface-50 transition-colors cursor-pointer min-w-0 ${
                integration.popular ? 'border-primary-200 bg-primary-25' : 'border-surface-200'
              }`}>
                <span className="text-xl flex-shrink-0">{integration.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-surface-900 text-sm break-words">{integration.name}</div>
                    {integration.popular && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  <div className="text-xs text-surface-500 break-words">{integration.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Integrations & API */}
      <div>
        <h3 className="text-xl font-semibold text-surface-900 mb-6">Custom Integrations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Access */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-surface-900">REST API Access</h4>
                <p className="text-sm text-surface-600">Build custom integrations with our API</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full CRUD operations for all data
              </div>
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Real-time webhooks for instant updates
              </div>
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Comprehensive API documentation
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                Generate API Key
              </button>
              <button className="py-2 px-4 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors text-sm font-medium">
                View Docs
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-surface-900">Webhook Setup</h4>
                <p className="text-sm text-surface-600">Receive real-time notifications</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                New order notifications
              </div>
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Inventory level alerts
              </div>
              <div className="flex items-center text-sm text-surface-600">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Payment confirmations
              </div>
            </div>
            <div className="flex space-x-3">
              <button className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                Configure Webhooks
              </button>
              <button className="py-2 px-4 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors text-sm font-medium">
                Test Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guidelines */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Integration Best Practices</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Best Practices */}
              <div>
                <h5 className="font-medium text-blue-900 mb-3">Security & Setup</h5>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Test integrations in a safe environment before connecting production data
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Review permissions carefully when connecting third-party services
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Monitor integration activity regularly for any unusual behavior
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Keep integration credentials secure and update them periodically
                  </li>
                </ul>
              </div>
              
              {/* Philippine-specific considerations */}
              <div>
                <h5 className="font-medium text-blue-900 mb-3">Philippine Business Considerations</h5>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Ensure payment integrations comply with BSP regulations
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Configure BIR reporting for automated tax compliance
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Set up local delivery integrations for Metro Manila coverage
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Enable GCash/Maya for broader customer payment options
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Integration */}
      <div className="card p-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-surface-900 mb-2">Need a Custom Integration?</h4>
          <p className="text-surface-600 mb-6 max-w-2xl mx-auto">
            Don't see the integration you need? Our team can help build custom connections to your favorite business tools 
            or Philippine-specific services.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
              Request Integration
            </button>
            <button className="px-6 py-3 border border-surface-300 text-surface-700 rounded-lg hover:bg-white transition-colors font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Security Tab
function SecurityTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Security Settings</h2>
        <p className="mt-2 text-surface-600 max-w-2xl">
          Monitor your account security and manage access controls for your business.
        </p>
      </div>

      {/* Security Audit Panel */}
      <div className="card">
        <div className="p-6 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Security Audit</h3>
          <p className="text-sm text-surface-600">Real-time security monitoring and vulnerability detection</p>
        </div>
        <div className="p-6">
          <SecurityAuditPanel />
        </div>
      </div>

      {/* Security Information */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Security Best Practices</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-blue-900 mb-3">Account Security</h5>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Use strong, unique passwords for your account
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Regularly review user access and permissions
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Monitor the security audit panel for vulnerabilities
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Keep your branch assignments up to date
                  </li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-blue-900 mb-3">Data Protection</h5>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Ensure proper branch isolation is maintained
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Review and update Firebase security rules regularly
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Limit user access to only necessary branches
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">•</span>
                    Regular security audits help identify potential issues
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Billing Tab
function BillingTab() {
  const { profile } = useAuth()
  const { subscription, features, limits, isActive, isTrial, trialDaysRemaining, loading } = useSubscription()
  
  // Check if user has billing access (owner/admin only)
  // In a typical business, only owners should see billing details
  const hasBillingAccess = profile?.role === 'owner'
  
  if (!hasBillingAccess) {
    return (
      <div className="space-y-8">
        {/* Restricted Access Message */}
        <div className="pb-5 border-b border-surface-200">
          <h2 className="text-3xl font-bold text-surface-900">Billing & Subscription</h2>
          <p className="mt-2 text-surface-600 max-w-2xl">
            View your current subscription plan and usage information.
          </p>
        </div>

        {/* Limited View for Non-Owners */}
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-surface-900 mb-2">Access Restricted</h3>
            <p className="text-surface-600 mb-6">
              Only business owners can access billing and subscription management. 
              Contact your business owner for subscription-related changes.
            </p>
            
            {/* Show basic plan info only */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-3 mb-3">
                {loading ? (
                  <span className="text-lg font-bold text-blue-900">Loading...</span>
                ) : subscription ? (
                  <>
                    <span className="text-lg font-bold text-blue-900 capitalize">{subscription.tier}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isActive 
                        ? isTrial 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isTrial ? `Trial (${trialDaysRemaining}d)` : subscription.status}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-gray-600">No Plan</span>
                )}
              </div>
              <div className="text-sm text-blue-700">
                {loading ? 'Loading subscription information...' : 'Contact owner for plan changes'}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm text-yellow-900 font-medium">Need to upgrade or change plans?</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Ask your business owner to access billing settings or contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section - Full Access */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Billing & Subscription</h2>
        <p className="mt-2 text-surface-600 max-w-2xl">
          Manage your subscription plan, billing information, and payment history.
        </p>
        <div className="mt-4 flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Business Owner Access</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Current Plan - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Current Plan Card */}
          <div className="card p-8">{loading ? (
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-8 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-semibold text-surface-900 mb-2">Current Subscription</h3>
                    <div className="flex items-center space-x-4">
                      {subscription ? (
                        <>
                          <span className="text-2xl font-bold text-primary-600 capitalize">{subscription.tier}</span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            isActive 
                              ? isTrial 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isTrial ? `Trial (${trialDaysRemaining} days left)` : subscription.status}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-gray-600">No Active Plan</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {subscription ? (
                      <>
                        <div className="text-3xl font-bold text-surface-900">
                          ₱{subscription.billingCycle === 'monthly' 
                            ? SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)?.monthlyPrice || '--'
                            : SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)?.yearlyPrice || '--'
                          }
                        </div>
                        <div className="text-sm text-surface-600">per {subscription.billingCycle === 'monthly' ? 'month' : 'year'}</div>
                        <div className="text-xs text-surface-500 mt-1">
                          Next billing: {subscription.endDate ? new Date(subscription.endDate.seconds * 1000).toLocaleDateString() : '--'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-surface-900">--</div>
                        <div className="text-sm text-surface-600">No plan</div>
                        <div className="text-xs text-surface-500 mt-1">Next billing: --</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {subscription?.currentUsage?.locations || 0}
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Active Branches</div>
                    <div className="text-xs text-blue-600">
                      {limits?.maxLocations === -1 ? 'Unlimited' : `of ${limits?.maxLocations || 0} max`}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {subscription?.currentUsage?.users || 0}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Team Members</div>
                    <div className="text-xs text-green-600">
                      {limits?.maxUsers === -1 ? 'Unlimited' : `of ${limits?.maxUsers || 0} max`}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {subscription?.currentUsage?.apiCallsThisMonth || 0}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">API Calls</div>
                    <div className="text-xs text-purple-600">This month</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {subscription?.currentUsage?.storageUsed || 0}GB
                    </div>
                    <div className="text-sm text-orange-700 font-medium">Storage Used</div>
                    <div className="text-xs text-orange-600">
                      {limits?.storageLimit === -1 ? 'Unlimited' : `of ${limits?.storageLimit || 0}GB`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button 
                    onClick={() => window.location.href = '/subscription'}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm"
                  >
                    Manage Plan
                  </button>
                  <button className="flex-1 px-6 py-3 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium">
                    View Usage Details
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Billing History */}
          <div className="card overflow-hidden">
            <div className="px-8 py-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-surface-900">Billing History</h3>
                <div className="flex items-center space-x-3">
                  <select className="px-3 py-2 text-sm border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                    <option>Last 12 months</option>
                    <option>This year</option>
                    <option>All time</option>
                  </select>
                  <button className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                    Export All
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-surface-700">Date</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-surface-700">Description</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-surface-700">Amount</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-surface-700">Status</th>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-surface-700">Invoice</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-surface-100">
                  <tr className="hover:bg-surface-25 transition-colors">
                    <td className="px-8 py-8 text-center text-surface-500" colSpan={5}>
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg className="w-12 h-12 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-sm font-medium text-surface-600">No billing history available</div>
                        <div className="text-xs text-surface-500">Billing information will appear here once available</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar - Takes 1 column */}
        <div className="space-y-6">
          {/* Billing Address */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Billing Address</h3>
            <div className="text-sm text-surface-600 space-y-1">
              <div className="font-medium text-surface-900">--</div>
              <div>--</div>
              <div>--</div>
              <div>--</div>
            </div>
            <button className="w-full mt-4 px-4 py-2 text-sm border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors">
              Update Address
            </button>
          </div>
          {/* Payment Method */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-900">Payment Method</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Update
              </button>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-surface-900">No payment method</div>
                <div className="text-sm text-surface-600">Add a payment method</div>
              </div>
              <div className="text-sm text-gray-500 font-medium">
                --
              </div>
            </div>
          </div>

          {/* Next Billing */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Next Billing</h3>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-surface-900">
                {subscription && subscription.endDate ? 
                  new Date(subscription.endDate.seconds * 1000).toLocaleDateString() : 
                  '--'
                }
              </div>
              <div className="text-sm text-surface-600 mt-1">
                {subscription ? `${subscription.billingCycle} billing` : 'No billing scheduled'}
              </div>
            </div>
            <div className="bg-surface-100 rounded-full h-2 mb-2">
              <div className="bg-primary-500 h-2 rounded-full" style={{ 
                width: subscription && isTrial ? `${(1 - trialDaysRemaining / 14) * 100}%` : '0%' 
              }}></div>
            </div>
            <div className="text-center text-xs text-surface-500">
              {isTrial ? `${trialDaysRemaining} days left in trial` : 'Active subscription'}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Current Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Branches</span>
                  <span className="font-medium">
                    {subscription?.currentUsage?.locations || 0} / {limits?.maxLocations === -1 ? '∞' : limits?.maxLocations || 0}
                  </span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ 
                    width: limits?.maxLocations === -1 ? '0%' : 
                      `${Math.min(((subscription?.currentUsage?.locations || 0) / (limits?.maxLocations || 1)) * 100, 100)}%` 
                  }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Users</span>
                  <span className="font-medium">
                    {subscription?.currentUsage?.users || 0} / {limits?.maxUsers === -1 ? '∞' : limits?.maxUsers || 0}
                  </span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ 
                    width: limits?.maxUsers === -1 ? '0%' : 
                      `${Math.min(((subscription?.currentUsage?.users || 0) / (limits?.maxUsers || 1)) * 100, 100)}%` 
                  }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">API Calls</span>
                  <span className="font-medium">
                    {subscription?.currentUsage?.apiCallsThisMonth || 0} / {limits?.apiCallsPerMonth === -1 ? '∞' : limits?.apiCallsPerMonth || 0}
                  </span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ 
                    width: limits?.apiCallsPerMonth === -1 ? '0%' : 
                      `${Math.min(((subscription?.currentUsage?.apiCallsThisMonth || 0) / (limits?.apiCallsPerMonth || 1)) * 100, 100)}%` 
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Tax Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">VAT Registered</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  --
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">TIN</span>
                <span className="text-sm font-medium text-surface-900">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-600">BIR RDO</span>
                <span className="text-sm font-medium text-surface-900">--</span>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 text-sm border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors">
              Update Tax Info
            </button>
          </div>

          {/* Payment Preferences */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Payment Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-surface-900">Auto-pay</div>
                  <div className="text-xs text-surface-600">Automatically pay invoices</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-surface-900">Email receipts</div>
                  <div className="text-xs text-surface-600">Send receipts via email</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-surface-900">Payment reminders</div>
                  <div className="text-xs text-surface-600">3 days before due date</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
                </label>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="card p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-sm text-blue-800 mb-4">
              Contact our billing support team for assistance with your account.
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Advanced Tab
function AdvancedTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Advanced Settings</h2>
        <p className="text-surface-600">Advanced configuration options for power users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Data Management */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Data Management</h3>
          <div className="space-y-4">
            <button className="w-full p-3 text-left border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors">
              <div className="font-medium text-surface-900">Export All Data</div>
              <div className="text-sm text-surface-600">Download a complete backup of your data</div>
            </button>
            <button className="w-full p-3 text-left border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors">
              <div className="font-medium text-surface-900">Import Data</div>
              <div className="text-sm text-surface-600">Import data from another system</div>
            </button>
            <button className="w-full p-3 text-left border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              <div className="font-medium text-red-600">Clear All Data</div>
              <div className="text-sm text-red-500">Permanently delete all data (irreversible)</div>
            </button>
          </div>
        </div>

        {/* System Settings */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Debug Mode</div>
                <div className="text-sm text-surface-600">Enable detailed logging for troubleshooting</div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Auto Backup</div>
                <div className="text-sm text-surface-600">Automatically backup data daily</div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Data Retention Period</label>
              <select className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option>1 year</option>
                <option>2 years</option>
                <option>5 years</option>
                <option>Forever</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">API Key</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value="ct_live_1234567890abcdef"
                readOnly
                className="flex-1 px-3 py-2 border border-surface-300 rounded-lg bg-surface-50"
              />
              <button className="px-4 py-2 bg-surface-600 text-white rounded-lg hover:bg-surface-700 transition-colors">
                Copy
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Regenerate
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-surface-900">API Access</div>
              <div className="text-sm text-surface-600">Enable API access for third-party integrations</div>
            </div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
