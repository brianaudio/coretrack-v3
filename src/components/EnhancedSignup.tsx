'use client'

import { useState, useEffect } from 'react'
import { Mail, Lock, User, Building, MapPin, Users, Target, ArrowRight, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react'
import { signIn } from '../lib/firebase/auth'
import { createEnhancedAccount } from '../lib/firebase/enhancedAuth'
import { useUser } from '../lib/rbac/UserContext'
import CoreTrackLogo from './CoreTrackLogo'

interface EnhancedSignupProps {
  onLogin: () => void
  onBackToLanding: () => void
  initialMode?: 'signin' | 'signup'
}

interface BusinessSetup {
  // Personal Information
  displayName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  
  // Business Information
  businessName: string
  businessType: 'restaurant' | 'cafe' | 'food_truck' | 'bakery' | 'bar' | 'catering' | 'retail' | 'other'
  businessDescription: string
  
  // Business Details
  cuisine: string
  seatingCapacity: number
  avgTicketSize: number
  operatingHours: {
    open: string
    close: string
  }
  
  // Location
  address: string
  city: string
  province: string
  postalCode: string
  
  // Features
  hasDelivery: boolean
  hasTakeout: boolean
  hasDineIn: boolean
  hasOnlineOrdering: boolean
  
  // Team
  teamSize: number
  currentPOS: string
  
  // Goals
  goals: string[]
  monthlyRevenue: string
}

const businessTypes = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'cafe', label: 'Café/Coffee Shop', icon: '☕' },
  { value: 'food_truck', label: 'Food Truck', icon: '🚚' },
  { value: 'bakery', label: 'Bakery', icon: '🍞' },
  { value: 'bar', label: 'Bar/Pub', icon: '🍺' },
  { value: 'catering', label: 'Catering', icon: '🥘' },
  { value: 'retail', label: 'Retail Food', icon: '🏪' },
  { value: 'other', label: 'Other', icon: '🏢' }
]

const cuisineTypes = [
  'Filipino', 'Asian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese',
  'Western', 'American', 'Italian', 'Mexican', 'Mediterranean', 'Indian',
  'Fast Food', 'Casual Dining', 'Fine Dining', 'Fusion', 'Vegetarian', 'Vegan', 'Other'
]

const businessGoals = [
  'Reduce inventory waste',
  'Increase profit margins',
  'Improve staff efficiency',
  'Better customer service',
  'Expand to multiple locations',
  'Streamline operations',
  'Track performance metrics',
  'Manage team better',
  'Reduce theft/loss',
  'Automate processes'
]

const revenueRanges = [
  'Less than ₱50,000/month',
  '₱50,000 - ₱100,000/month',
  '₱100,000 - ₱250,000/month',
  '₱250,000 - ₱500,000/month',
  '₱500,000 - ₱1,000,000/month',
  'More than ₱1,000,000/month'
]

export default function EnhancedSignup({ onLogin, onBackToLanding, initialMode = 'signup' }: EnhancedSignupProps) {
  const [mode, setMode] = useState(initialMode)
  const [currentStep, setCurrentStep] = useState(1)
  const { setCurrentRole, setCurrentUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  
  // Check for selected tier from landing page
  useEffect(() => {
    const tier = localStorage.getItem('selectedTier')
    if (tier) {
      setSelectedTier(tier)
      console.log(`📋 Signup form loaded with pre-selected tier: ${tier}`)
    }
  }, [])
  
  const [businessSetup, setBusinessSetup] = useState<BusinessSetup>({
    // Personal Information
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    
    // Business Information
    businessName: '',
    businessType: 'restaurant',
    businessDescription: '',
    
    // Business Details
    cuisine: '',
    seatingCapacity: 0,
    avgTicketSize: 0,
    operatingHours: {
      open: '09:00',
      close: '21:00'
    },
    
    // Location
    address: '',
    city: '',
    province: '',
    postalCode: '',
    
    // Features
    hasDelivery: false,
    hasTakeout: true,
    hasDineIn: true,
    hasOnlineOrdering: false,
    
    // Team
    teamSize: 1,
    currentPOS: '',
    
    // Goals
    goals: [],
    monthlyRevenue: ''
  })

  const totalSteps = 6

  const handleInputChange = (field: keyof BusinessSetup, value: any) => {
    setBusinessSetup(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setBusinessSetup(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof BusinessSetup] as any,
        [field]: value
      }
    }))
  }

  const handleGoalToggle = (goal: string) => {
    setBusinessSetup(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Enhanced validation for step 1
        if (!businessSetup.displayName?.trim() || 
            !businessSetup.email?.trim() || 
            !businessSetup.password || 
            !businessSetup.confirmPassword || 
            !businessSetup.phone?.trim()) {
          return false
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(businessSetup.email)) {
          return false
        }
        
        // Password validation - simplified
        if (businessSetup.password.length < 6) {
          return false
        }
        
        if (businessSetup.password !== businessSetup.confirmPassword) {
          return false
        }
        
        return true
        
      case 2:
        return !!(businessSetup.businessName?.trim() && 
                 businessSetup.businessType && 
                 businessSetup.businessDescription?.trim())
      case 3:
        return !!(businessSetup.cuisine && businessSetup.seatingCapacity > 0 && businessSetup.avgTicketSize > 0)
      case 4:
        return !!(businessSetup.address && businessSetup.city && businessSetup.province)
      case 5:
        return businessSetup.teamSize > 0
      case 6:
        return businessSetup.goals.length > 0 && !!businessSetup.monthlyRevenue
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
      setError('')
    } else {
      setError('Please fill in all required fields')
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await signIn(email, password)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!validateStep(currentStep)) return

    setLoading(true)
    setError('')

    try {
      // Pass the complete businessSetup object to the enhanced account creation
      const result = await createEnhancedAccount(businessSetup)
      
      console.log('Enhanced account created:', result)
      
      // Set user role as owner since they're creating the business account
      setCurrentRole('owner')
      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email || businessSetup.email,
        role: 'owner'
      })
      
      console.log('✅ User role set to owner after signup')
      onLogin()
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">Let&apos;s start with your basic information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={businessSetup.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className="input-field"
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={businessSetup.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="input-field"
            placeholder="+63 912 345 6789"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={businessSetup.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="input-field"
          placeholder="your.email@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <input
            type="password"
            value={businessSetup.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="input-field"
            placeholder="Minimum 6 characters"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <input
            type="password"
            value={businessSetup.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className="input-field"
            placeholder="Confirm your password"
            required
          />
        </div>
      </div>

      {/* Password validation feedback */}
      {(businessSetup.password || businessSetup.confirmPassword) && (
        <div className="text-sm space-y-1">
          {businessSetup.password && businessSetup.password.length < 6 && (
            <p className="text-red-500">• Password must be at least 6 characters</p>
          )}
          {businessSetup.password && businessSetup.confirmPassword && businessSetup.password !== businessSetup.confirmPassword && (
            <p className="text-red-500">• Passwords do not match</p>
          )}
          {businessSetup.password && businessSetup.password.length >= 6 && businessSetup.password === businessSetup.confirmPassword && businessSetup.confirmPassword && (
            <p className="text-green-500">• Passwords match ✓</p>
          )}
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
        <p className="text-gray-600">Tell us about your business</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name *
        </label>
        <input
          type="text"
          value={businessSetup.businessName}
          onChange={(e) => handleInputChange('businessName', e.target.value)}
          className="input-field"
          placeholder="Your business name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Business Type *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {businessTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleInputChange('businessType', type.value)}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                businessSetup.businessType === type.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="text-sm font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Description *
        </label>
        <textarea
          value={businessSetup.businessDescription}
          onChange={(e) => handleInputChange('businessDescription', e.target.value)}
          className="input-field"
          rows={3}
          placeholder="Briefly describe your business, menu, or specialty..."
          required
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
        <p className="text-gray-600">Help us understand your operation better</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Cuisine Type *
        </label>
        <select
          value={businessSetup.cuisine}
          onChange={(e) => handleInputChange('cuisine', e.target.value)}
          className="input-field"
          required
        >
          <option value="">Select cuisine type</option>
          {cuisineTypes.map((cuisine) => (
            <option key={cuisine} value={cuisine}>{cuisine}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seating Capacity *
          </label>
          <input
            type="number"
            value={businessSetup.seatingCapacity || ''}
            onChange={(e) => handleInputChange('seatingCapacity', parseInt(e.target.value) || 0)}
            className="input-field"
            placeholder="Number of seats"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Average Ticket Size *
          </label>
          <input
            type="number"
            value={businessSetup.avgTicketSize || ''}
            onChange={(e) => handleInputChange('avgTicketSize', parseInt(e.target.value) || 0)}
            className="input-field"
            placeholder="₱ per customer"
            min="0"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Operating Hours
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opening Time</label>
            <input
              type="time"
              value={businessSetup.operatingHours.open}
              onChange={(e) => handleNestedInputChange('operatingHours', 'open', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Closing Time</label>
            <input
              type="time"
              value={businessSetup.operatingHours.close}
              onChange={(e) => handleNestedInputChange('operatingHours', 'close', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Service Options
        </label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'hasDineIn', label: 'Dine-in', icon: '🍽️' },
            { key: 'hasTakeout', label: 'Takeout', icon: '🥡' },
            { key: 'hasDelivery', label: 'Delivery', icon: '🚚' },
            { key: 'hasOnlineOrdering', label: 'Online Ordering', icon: '📱' }
          ].map((option) => (
            <label key={option.key} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={businessSetup[option.key as keyof BusinessSetup] as boolean}
                onChange={(e) => handleInputChange(option.key as keyof BusinessSetup, e.target.checked)}
                className="mr-3"
              />
              <span className="mr-2">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Location</h2>
        <p className="text-gray-600">Where is your business located?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Street Address *
        </label>
        <input
          type="text"
          value={businessSetup.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="input-field"
          placeholder="123 Street Name, Barangay"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            value={businessSetup.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="input-field"
            placeholder="City"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Province *
          </label>
          <input
            type="text"
            value={businessSetup.province}
            onChange={(e) => handleInputChange('province', e.target.value)}
            className="input-field"
            placeholder="Province"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            value={businessSetup.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            className="input-field"
            placeholder="1234"
          />
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team & Operations</h2>
        <p className="text-gray-600">Tell us about your team and current setup</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Size *
        </label>
        <input
          type="number"
          value={businessSetup.teamSize || ''}
          onChange={(e) => handleInputChange('teamSize', parseInt(e.target.value) || 0)}
          className="input-field"
          placeholder="Total number of employees"
          min="1"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current POS System (Optional)
        </label>
        <input
          type="text"
          value={businessSetup.currentPOS}
          onChange={(e) => handleInputChange('currentPOS', e.target.value)}
          className="input-field"
          placeholder="e.g., Manual, Excel, Square, etc."
        />
      </div>
    </div>
  )

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Goals & Revenue</h2>
        <p className="text-gray-600">What are you hoping to achieve with CoreTrack?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Business Goals * (Select all that apply)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {businessGoals.map((goal) => (
            <label key={goal} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={businessSetup.goals.includes(goal)}
                onChange={() => handleGoalToggle(goal)}
                className="mr-3"
              />
              <span className="text-sm">{goal}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Revenue Range *
        </label>
        <select
          value={businessSetup.monthlyRevenue}
          onChange={(e) => handleInputChange('monthlyRevenue', e.target.value)}
          className="input-field"
          required
        >
          <option value="">Select revenue range</option>
          {revenueRanges.map((range) => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>
    </div>
  )

  if (mode === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={onBackToLanding}
            className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <CoreTrackLogo size="lg" />
              <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your CoreTrack account</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="input-field"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => setMode('signup')}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                Don&apos;t have an account? Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBackToLanding}
          className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <CoreTrackLogo size="lg" />
            
            {selectedTier && (
              <div className="my-4 inline-flex items-center bg-primary-50 border border-primary-200 rounded-full px-4 py-2">
                <svg className="w-4 h-4 text-primary-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-sm font-medium text-primary-700">
                  {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Plan Selected
                </span>
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Create Your Account</h1>
            <p className="text-gray-600">
              {selectedTier 
                ? `Get started with your 14-day free trial of ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} features`
                : 'Get started with your 14-day free trial'
              }
            </p>
          </div>

          {renderProgressBar()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
            {currentStep === 6 && renderStep6()}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={currentStep === 1 ? onBackToLanding : handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex space-x-3">
              <button
                onClick={() => setMode('signin')}
                className="px-6 py-3 text-primary-600 hover:text-primary-700 transition-colors"
              >
                Sign In Instead
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSignUp}
                  disabled={loading || !validateStep(currentStep)}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              )}
            </div>
          </div>

          <div className="text-center mt-6 text-sm text-gray-500">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
