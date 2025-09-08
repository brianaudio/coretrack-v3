'use client'

import React, { useState } from 'react'
import { useSettings } from '../../lib/context/SettingsContext'
import { getAllCountries, getCountryByName, getPopularCountries } from '@/lib/payments/globalCurrencies'
import { getPaymentMethodsByCountry, getPopularPaymentMethods, PaymentMethod } from '@/lib/payments/globalPaymentMethods'

export default function POSPaymentsTab() {
  const { paymentSettings, updatePaymentSettings, savePaymentSettings, loading, error } = useSettings()
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Get countries and payment methods
  const allCountries = getAllCountries()
  const popularCountries = getPopularCountries()
  const currentCountry = getCountryByName(paymentSettings.country)
  const currentCountryCode = currentCountry?.code || 'PH'
  const availablePaymentMethods = getPaymentMethodsByCountry(currentCountryCode)
  const popularPaymentMethods = getPopularPaymentMethods(currentCountryCode)

  const handleSave = async () => {
    try {
      setSaving(true)
      setSuccessMessage('')
      await savePaymentSettings()
      setSuccessMessage('Payment settings saved successfully! 🎉')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving payment settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCountryChange = (countryName: string) => {
    const countryData = getCountryByName(countryName)
    
    if (countryData) {
      // Get popular payment methods for this country
      const popularMethods = getPopularPaymentMethods(countryData.code)
      const defaultEnabledMethods = popularMethods.reduce((acc, method) => ({
        ...acc,
        [method.id]: true
      }), {})
      
      updatePaymentSettings({
        country: countryName,
        currency: countryData.currency.code,
        currencySymbol: countryData.currency.symbol,
        enabledPaymentMethods: {
          ...paymentSettings.enabledPaymentMethods,
          cash: true, // Always enable cash
          ...defaultEnabledMethods
        }
      })
    }
  }

  const togglePaymentMethod = (methodId: string) => {
    const currentMethods = paymentSettings.enabledPaymentMethods
    const updatedMethods = {
      ...currentMethods,
      [methodId as keyof typeof currentMethods]: !currentMethods[methodId as keyof typeof currentMethods]
    }
    
    updatePaymentSettings({
      enabledPaymentMethods: updatedMethods
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">POS & Payment Settings</h1>
        <p className="text-gray-600">Configure payment methods and regional settings for your business</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Regional Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Regional Settings</h2>
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
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <input
                type="text"
                value={paymentSettings.currencySymbol}
                readOnly
                className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-center"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Currency is automatically set based on your country selection</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
            <select
              value={paymentSettings.businessType}
              onChange={(e) => updatePaymentSettings({ businessType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="restaurant">Restaurant & Food Service</option>
              <option value="retail">Retail Store</option>
              <option value="cafe">Café & Coffee Shop</option>
              <option value="bakery">Bakery</option>
              <option value="bar">Bar & Nightlife</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Methods</h2>
        <p className="text-gray-600 mb-6">Enable payment methods available in {paymentSettings.country}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availablePaymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                paymentSettings.enabledPaymentMethods[method.id as keyof typeof paymentSettings.enabledPaymentMethods]
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => togglePaymentMethod(method.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{method.displayName}</div>
                    <div className="text-sm text-gray-600">Digital payment method</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getMethodStatusBadge(method)}
                  <input
                    type="checkbox"
                    checked={paymentSettings.enabledPaymentMethods[method.id as keyof typeof paymentSettings.enabledPaymentMethods] || false}
                    onChange={() => togglePaymentMethod(method.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Available in {paymentSettings.country}</div>
                {method.features.refunds && (
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Supports refunds</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Basic Tax Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Tax Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Tax Calculations</div>
              <div className="text-sm text-gray-600">Calculate and display taxes on receipts</div>
            </div>
            <button
              onClick={() => updatePaymentSettings({
                taxSettings: {
                  ...paymentSettings.taxSettings,
                  enableTax: !paymentSettings.taxSettings.enableTax
                }
              })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                paymentSettings.taxSettings.enableTax ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  paymentSettings.taxSettings.enableTax ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {paymentSettings.taxSettings.enableTax && (
            <div className="pl-4 border-l-2 border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Prices Include Tax</div>
                  <div className="text-sm text-gray-600">Display tax-inclusive pricing</div>
                </div>
                <button
                  onClick={() => updatePaymentSettings({
                    taxSettings: {
                      ...paymentSettings.taxSettings,
                      pricesIncludeTax: !paymentSettings.taxSettings.pricesIncludeTax
                    }
                  })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    paymentSettings.taxSettings.pricesIncludeTax ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      paymentSettings.taxSettings.pricesIncludeTax ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center space-x-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Payment Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
