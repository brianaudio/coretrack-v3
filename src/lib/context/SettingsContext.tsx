'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Settings interfaces with proper TypeScript
export interface PaymentSettings {
  country: string
  currency: string
  currencySymbol: string
  businessType: string
  enabledPaymentMethods: {
    cash: boolean
    credit_card: boolean
    gcash: boolean
    maya: boolean
    paypal: boolean
    paymongo: boolean
    grab_pay: boolean
    shopee_pay: boolean
  }
  taxSettings: {
    enableTax: boolean
    enabledTaxRules: string[]
    pricesIncludeTax: boolean
    complianceSettings: {
      requireOfficialReceipts: boolean
      auditTrailEnabled: boolean
      automaticFiling: boolean
    }
  }
  receiptSettings: {
    businessName: string
    businessAddress: string
    taxId: string
    showTaxBreakdown: boolean
    footerMessage: string
  }
}

export interface BusinessProfile {
  name: string
  email: string
  phone: string
  taxId: string
  description: string
}

export interface SettingsContextType {
  paymentSettings: PaymentSettings
  businessProfile: BusinessProfile
  updatePaymentSettings: (settings: Partial<PaymentSettings>) => void
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void
  savePaymentSettings: () => Promise<void>
  saveBusinessProfile: () => Promise<void>
  loading: boolean
  error: string | null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { tenant, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize with default values
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
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
      paymongo: false,
      grab_pay: false,
      shopee_pay: false
    },
    taxSettings: {
      enableTax: false,
      enabledTaxRules: [],
      pricesIncludeTax: false,
      complianceSettings: {
        requireOfficialReceipts: false,
        auditTrailEnabled: false,
        automaticFiling: false
      }
    },
    receiptSettings: {
      businessName: '',
      businessAddress: '',
      taxId: '',
      showTaxBreakdown: true,
      footerMessage: 'Thank you for your business!'
    }
  })

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    description: ''
  })

  // Load settings from Firebase
  useEffect(() => {
    if (!tenant?.id || !profile?.email) return

    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const tenantRef = doc(db, 'tenants', tenant.id)
        const tenantDoc = await getDoc(tenantRef)

        if (tenantDoc.exists()) {
          const data = tenantDoc.data()
          
          // Update payment settings with Firebase data
          if (data.settings) {
            setPaymentSettings(prev => ({
              ...prev,
              currency: data.settings.currency || prev.currency,
              country: data.settings.country || prev.country,
              businessType: data.settings.businessType || prev.businessType,
              enabledPaymentMethods: {
                ...prev.enabledPaymentMethods,
                ...data.settings.paymentMethods
              },
              taxSettings: {
                ...prev.taxSettings,
                ...data.settings.tax
              },
              receiptSettings: {
                ...prev.receiptSettings,
                ...data.settings.receipts
              }
            }))
          }

          // Update business profile
          setBusinessProfile({
            name: data.name || tenant.name || '',
            email: data.email || profile.email || '',
            phone: data.phone || '',
            taxId: data.taxId || '',
            description: data.description || ''
          })
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [tenant?.id, profile?.email])

  // Update functions
  const updatePaymentSettings = (settings: Partial<PaymentSettings>) => {
    setPaymentSettings(prev => ({ ...prev, ...settings }))
  }

  const updateBusinessProfile = (profile: Partial<BusinessProfile>) => {
    setBusinessProfile(prev => ({ ...prev, ...profile }))
  }

  // Save functions
  const savePaymentSettings = async () => {
    if (!tenant?.id) {
      throw new Error('No tenant information found')
    }

    try {
      setError(null)
      const tenantRef = doc(db, 'tenants', tenant.id)
      await updateDoc(tenantRef, {
        'settings.currency': paymentSettings.currency,
        'settings.country': paymentSettings.country,
        'settings.businessType': paymentSettings.businessType,
        'settings.paymentMethods': paymentSettings.enabledPaymentMethods,
        'settings.tax': paymentSettings.taxSettings,
        'settings.receipts': paymentSettings.receiptSettings,
        updatedAt: new Date()
      })
    } catch (err) {
      console.error('Error saving payment settings:', err)
      setError('Failed to save payment settings')
      throw err
    }
  }

  const saveBusinessProfile = async () => {
    if (!tenant?.id) {
      throw new Error('No tenant information found')
    }

    try {
      setError(null)
      const tenantRef = doc(db, 'tenants', tenant.id)
      await updateDoc(tenantRef, {
        name: businessProfile.name,
        email: businessProfile.email,
        phone: businessProfile.phone,
        taxId: businessProfile.taxId,
        description: businessProfile.description,
        updatedAt: new Date()
      })
    } catch (err) {
      console.error('Error saving business profile:', err)
      setError('Failed to save business profile')
      throw err
    }
  }

  const value: SettingsContextType = {
    paymentSettings,
    businessProfile,
    updatePaymentSettings,
    updateBusinessProfile,
    savePaymentSettings,
    saveBusinessProfile,
    loading,
    error
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
