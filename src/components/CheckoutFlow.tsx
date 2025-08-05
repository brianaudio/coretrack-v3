'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Check, Mail, User, Building, Lock } from 'lucide-react'
import CoreTrackLogo from './CoreTrackLogo'
import { SUBSCRIPTION_PLANS } from '../lib/types/subscription'
import { createEnhancedAccount } from '../lib/firebase/enhancedAuth'
import { useUser } from '../lib/rbac/UserContext'

interface CheckoutFlowProps {
  selectedTier: string // Pass the tier from parent component
  onCompleteSignup: () => void
  onBackToLanding: () => void
}

interface CheckoutForm {
  // Personal
  name: string
  email: string
  password: string
  phone: string
  
  // Business
  businessName: string
}

export default function CheckoutFlow({ selectedTier, onCompleteSignup, onBackToLanding }: CheckoutFlowProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setCurrentRole, setCurrentUser } = useUser()
  
  // Remove payment step - true no credit card trial
  const totalSteps = 1
  
  const [form, setForm] = useState<CheckoutForm>({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: ''
  })

  const selectedPlan = SUBSCRIPTION_PLANS.find(plan => plan.tier === selectedTier)
  const price = selectedPlan?.monthlyPrice || 0

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCompleteOrder = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Validate required fields
      if (!form.name || !form.email || !form.password || !form.businessName) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }
      
      // Create the account with selected tier - NO PAYMENT REQUIRED
      const result = await createEnhancedAccount({
        displayName: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.password,
        phone: form.phone || '',
        businessName: form.businessName,
        businessType: 'restaurant',
        businessDescription: 'Restaurant created through checkout flow',
        cuisine: 'Filipino',
        seatingCapacity: 50,
        avgTicketSize: 300,
        operatingHours: { open: '09:00', close: '21:00' },
        address: '',
        city: '',
        province: '',
        postalCode: '',
        hasDineIn: true,
        hasTakeout: true,
        hasDelivery: false,
        hasOnlineOrdering: false,
        teamSize: 1,
        currentPOS: 'none',
        goals: ['increase_profits'],
        monthlyRevenue: '100000-500000'
      }, selectedTier) // Pass the selected tier directly
      
      // Set user context
      setCurrentRole('owner')
      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email || form.email,
        role: 'owner'
      })
      
      onCompleteSignup()
    } catch (error: any) {
      console.error('Checkout error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderPlanSummary = () => (
    <div className="bg-gray-50 rounded-lg p-6 border">
      <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">{selectedPlan?.name} Plan</span>
          <span className="font-medium">₱{price}/month</span>
        </div>
        
        <hr />
        
        <div className="flex justify-between font-semibold text-lg">
          <span>Total Today</span>
          <span>₱0.00</span>
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center text-green-700 text-sm">
          <Check className="w-4 h-4 mr-2" />
          <span className="font-medium">14-day free trial</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          You won't be charged until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </p>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Check className="w-4 h-4 mr-2 text-green-500" />
          <span>Cancel anytime</span>
        </div>
        <div className="flex items-center">
          <Check className="w-4 h-4 mr-2 text-green-500" />
          <span>Full access during trial</span>
        </div>
        <div className="flex items-center">
          <Check className="w-4 h-4 mr-2 text-green-500" />
          <span>24/7 support included</span>
        </div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
        <p className="text-gray-600">Start your 14-day free trial of {selectedPlan?.name}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@restaurant.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a secure password"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Restaurant Name"
              required
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <CoreTrackLogo size="sm" />
            <span className="text-xl font-bold text-gray-900">CoreTrack</span>
          </div>
          <button
            onClick={onBackToLanding}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">Create Your Account</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                  {error}
                </div>
              )}

              {renderStep1()}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  onClick={onBackToLanding}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Plans
                </button>

                <button
                  onClick={handleCompleteOrder}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Start Free Trial'}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            {renderPlanSummary()}
          </div>
        </div>
      </div>
    </div>
  )
}
