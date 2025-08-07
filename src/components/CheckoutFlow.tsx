'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  ArrowRight,
  Check, 
  Mail, 
  User, 
  Building, 
  Lock, 
  Phone, 
  MapPin, 
  Clock, 
  Users,
  Eye,
  EyeOff 
} from 'lucide-react'
import CoreTrackLogo from './CoreTrackLogo'
import { SUBSCRIPTION_PLANS } from '../lib/types/subscription'
import { createEnhancedAccount } from '../lib/firebase/enhancedAuth'
import { useUser } from '../lib/rbac/UserContext'

interface CheckoutFlowProps {
  selectedTier: string // Pass the tier from parent component
  onCompleteSignup: () => void
  onBackToLanding: () => void
}

interface EnhancedCheckoutForm {
  // Step 1: Personal Information
  name: string
  email: string
  password: string
  confirmPassword: string
  
  // Step 2: Business Information  
  businessName: string
  businessType: 'restaurant' | 'cafe' | 'food_truck' | 'bakery' | 'bar' | 'catering' | 'retail' | 'other'
  phone: string
  address: string
  city: string
  province: string
  postalCode: string
  
  // Step 3: Operations Setup
  operatingHours: {
    open: string
    close: string
  }
  seatingCapacity: number
  hasDelivery: boolean
  hasTakeout: boolean
  hasDineIn: boolean
  hasOnlineOrdering: boolean
}

const businessTypes = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café/Coffee Shop', icon: '☕' },
  { value: 'food_truck', label: 'Food Truck', icon: '🚚' },
  { value: 'bakery', label: 'Bakery', icon: '🍞' },
  { value: 'bar', label: 'Bar/Pub', icon: '🍺' },
  { value: 'catering', label: 'Catering', icon: '🎪' },
  { value: 'retail', label: 'Retail Store', icon: '🏪' },
  { value: 'other', label: 'Other', icon: '🏢' }
]

export default function CheckoutFlow({ selectedTier, onCompleteSignup, onBackToLanding }: CheckoutFlowProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { setCurrentRole, setCurrentUser } = useUser()
  
  const totalSteps = 3
  
  const [form, setForm] = useState<EnhancedCheckoutForm>({
    // Step 1: Personal Information
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Business Information
    businessName: '',
    businessType: 'restaurant',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    
    // Step 3: Operations Setup
    operatingHours: {
      open: '09:00',
      close: '21:00'
    },
    seatingCapacity: 30,
    hasDelivery: false,
    hasTakeout: true,
    hasDineIn: true,
    hasOnlineOrdering: false
  })

  const selectedPlan = SUBSCRIPTION_PLANS.find(plan => plan.tier === selectedTier)
  const price = selectedPlan?.monthlyPrice || 0

  const handleInputChange = (field: keyof EnhancedCheckoutForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleNestedInputChange = (parent: keyof EnhancedCheckoutForm, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }))
  }

  // Validation for each step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          form.name?.trim() && 
          form.email?.trim() && 
          form.password && 
          form.confirmPassword &&
          form.password === form.confirmPassword &&
          form.password.length >= 6
        )
      case 2:
        return !!(
          form.businessName?.trim() && 
          form.businessType && 
          form.phone?.trim() &&
          form.address?.trim() &&
          form.city?.trim() &&
          form.province?.trim()
        )
      case 3:
        return !!(
          form.operatingHours.open && 
          form.operatingHours.close &&
          form.seatingCapacity > 0
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
      setError('')
    } else {
      setError('Please fill in all required fields correctly')
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const handleCompleteOrder = async () => {
    if (!validateStep(3)) {
      setError('Please complete all required fields')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Create the account with comprehensive business setup
      const result = await createEnhancedAccount({
        displayName: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone,
        businessName: form.businessName,
        businessType: form.businessType,
        businessDescription: `${form.businessType.charAt(0).toUpperCase() + form.businessType.slice(1)} created through enhanced signup`,
        cuisine: form.businessType === 'restaurant' ? 'Filipino' : 'General',
        seatingCapacity: form.seatingCapacity,
        avgTicketSize: form.businessType === 'restaurant' ? 300 : 150,
        operatingHours: form.operatingHours,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        hasDineIn: form.hasDineIn,
        hasTakeout: form.hasTakeout,
        hasDelivery: form.hasDelivery,
        hasOnlineOrdering: form.hasOnlineOrdering,
        teamSize: 1,
        currentPOS: 'none',
        goals: ['increase_profits'],
        monthlyRevenue: '100000-500000'
      }, selectedTier)
      
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
          You won&apos;t be charged until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
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

  // Step 1: Personal Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
        <p className="text-gray-600">Let&apos;s start with your personal information</p>
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
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 6 characters"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Password validation feedback */}
        {form.password && (
          <div className="text-sm space-y-1">
            <div className={form.password.length >= 6 ? "text-green-600" : "text-red-600"}>
              • Password must be at least 6 characters {form.password.length >= 6 && "✓"}
            </div>
            {form.confirmPassword && (
              <div className={form.password === form.confirmPassword ? "text-green-600" : "text-red-600"}>
                • Passwords must match {form.password === form.confirmPassword && "✓"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Step 2: Business Information
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
        <p className="text-gray-600">Tell us about your business</p>
      </div>

      <div className="space-y-4">
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
              placeholder="Your Business Name"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            value={form.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {businessTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+63 9XX XXX XXXX"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Main Street"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Manila"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province *
            </label>
            <input
              type="text"
              value={form.province}
              onChange={(e) => handleInputChange('province', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Metro Manila"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={form.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="1000"
          />
        </div>
      </div>
    </div>
  )

  // Step 3: Operations Setup
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Operations Setup</h2>
        <p className="text-gray-600">Configure your business operations</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Operating Hours *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opening Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="time"
                  value={form.operatingHours.open}
                  onChange={(e) => handleNestedInputChange('operatingHours', 'open', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Closing Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="time"
                  value={form.operatingHours.close}
                  onChange={(e) => handleNestedInputChange('operatingHours', 'close', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seating Capacity *
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="number"
              min="1"
              max="500"
              value={form.seatingCapacity}
              onChange={(e) => handleInputChange('seatingCapacity', parseInt(e.target.value) || 0)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="30"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Service Options
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasDineIn}
                onChange={(e) => handleInputChange('hasDineIn', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Dine-In Service</span>
            </label>
            
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasTakeout}
                onChange={(e) => handleInputChange('hasTakeout', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Takeout Service</span>
            </label>
            
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasDelivery}
                onChange={(e) => handleInputChange('hasDelivery', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Delivery Service</span>
            </label>
            
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasOnlineOrdering}
                onChange={(e) => handleInputChange('hasOnlineOrdering', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Online Ordering</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step < currentStep
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : step === currentStep
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-gray-300 text-gray-300 bg-white'
              }`}
            >
              {step < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>
            {step < 3 && (
              <div
                className={`w-12 h-0.5 mx-4 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      default:
        return renderStep1()
    }
  }

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
              {/* Progress Indicator */}
              {renderProgressIndicator()}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Current Step Content */}
              {renderCurrentStep()}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  onClick={currentStep === 1 ? onBackToLanding : handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {currentStep === 1 ? 'Back to Plans' : 'Previous'}
                </button>

                {currentStep < totalSteps ? (
                  <button
                    onClick={handleNext}
                    disabled={!validateStep(currentStep) || loading}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteOrder}
                    disabled={loading || !validateStep(currentStep)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Account...' : 'Start Free Trial'}
                  </button>
                )}
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
