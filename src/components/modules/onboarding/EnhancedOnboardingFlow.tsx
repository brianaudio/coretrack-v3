'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { 
  ArrowRight, 
  Check, 
  ChevronLeft,
  Sparkles,
  Store,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  CreditCard,
  Map,
  Coffee,
  UtensilsCrossed,
  Truck,
  Building2,
  Star,
  Clock,
  PlayCircle,
  Zap
} from 'lucide-react'

interface EnhancedOnboardingProps {
  onComplete: () => void
}

interface BusinessProfile {
  businessName: string
  businessType: 'restaurant' | 'cafe' | 'food_truck' | 'retail' | 'other'
  location: string
  size: 'solo' | 'small' | 'medium' | 'large'
  experience: 'new' | 'switching' | 'expanding'
}

interface OnboardingPreferences {
  priorities: string[]
  features: string[]
  quickStart: boolean
}

const BUSINESS_TYPES = [
  { id: 'restaurant', name: 'Restaurant', icon: UtensilsCrossed, color: 'from-red-500 to-orange-500' },
  { id: 'cafe', name: 'Café / Coffee Shop', icon: Coffee, color: 'from-amber-500 to-yellow-500' },
  { id: 'food_truck', name: 'Food Truck', icon: Truck, color: 'from-green-500 to-emerald-500' },
  { id: 'retail', name: 'Retail Store', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { id: 'other', name: 'Other Business', icon: Store, color: 'from-purple-500 to-pink-500' }
]

const BUSINESS_SIZES = [
  { id: 'solo', name: 'Just Me', desc: 'Solo entrepreneur', users: '1 user' },
  { id: 'small', name: 'Small Team', desc: '2-5 people', users: '2-5 users' },
  { id: 'medium', name: 'Growing Business', desc: '6-20 people', users: '6-20 users' },
  { id: 'large', name: 'Established Business', desc: '20+ people', users: '20+ users' }
]

const EXPERIENCE_LEVELS = [
  { id: 'new', name: 'New Business', desc: 'Just getting started', icon: Sparkles },
  { id: 'switching', name: 'Switching Systems', desc: 'Moving from another solution', icon: ArrowRight },
  { id: 'expanding', name: 'Expanding Operations', desc: 'Adding new locations/features', icon: BarChart3 }
]

const PRIORITY_FEATURES = [
  { id: 'inventory', name: 'Inventory Management', icon: Package, desc: 'Track stock levels', time: '5 min' },
  { id: 'pos', name: 'Point of Sale', icon: ShoppingCart, desc: 'Process transactions', time: '3 min' },
  { id: 'analytics', name: 'Sales Analytics', icon: BarChart3, desc: 'Business insights', time: '2 min' },
  { id: 'team', name: 'Team Management', icon: Users, desc: 'Add staff members', time: '4 min' },
  { id: 'payments', name: 'Payment Processing', icon: CreditCard, desc: 'Accept card payments', time: '10 min' },
  { id: 'locations', name: 'Multiple Locations', icon: Map, desc: 'Manage branches', time: '5 min' }
]

export default function EnhancedOnboardingFlow({ onComplete }: EnhancedOnboardingProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState(0)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    businessName: profile?.displayName || '',
    businessType: 'restaurant',
    location: '',
    size: 'small',
    experience: 'new'
  })
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    priorities: ['inventory', 'pos'],
    features: [],
    quickStart: true
  })
  const [isLoading, setIsLoading] = useState(false)

  const totalSteps = 5

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Here we would save the onboarding data
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      onComplete()
    } catch (error) {
      console.error('Onboarding completion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const ProgressBar = () => (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-surface-600">Step {step + 1} of {totalSteps}</span>
        <span className="text-sm text-surface-500">{Math.round(((step + 1) / totalSteps) * 100)}% Complete</span>
      </div>
      <div className="w-full bg-surface-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-primary-500 to-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )

  const StepWelcome = () => (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-surface-900 mb-4">
          Welcome to CoreTrack! 🎉
        </h1>
        <p className="text-xl text-surface-600 leading-relaxed">
          Let's set up your business management system in just a few easy steps.
        </p>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 border border-primary-200">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-surface-900 text-lg">Quick Setup: 2-5 minutes</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { icon: Package, text: 'Inventory Ready' },
            { icon: ShoppingCart, text: 'POS System' },
            { icon: BarChart3, text: 'Analytics' },
            { icon: Users, text: 'Team Tools' }
          ].map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-primary-100">
              <item.icon className="w-6 h-6 text-primary-600" />
              <span className="text-surface-700 font-medium text-center">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={nextStep}
        className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
      >
        Let's Get Started <ArrowRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  )

  const StepBusinessInfo = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">Tell us about your business</h2>
        <p className="text-surface-600">This helps us customize CoreTrack for your needs</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Business Name</label>
          <input
            type="text"
            value={businessProfile.businessName}
            onChange={(e) => setBusinessProfile({...businessProfile, businessName: e.target.value})}
            className="input-field text-lg"
            placeholder="Enter your business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-4">What type of business?</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setBusinessProfile({...businessProfile, businessType: type.id as any})}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  businessProfile.businessType === type.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 hover:border-surface-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-surface-900">{type.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 mb-4">Business size</label>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => setBusinessProfile({...businessProfile, size: size.id as any})}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  businessProfile.size === size.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 hover:border-surface-300 bg-white'
                }`}
              >
                <div className="font-medium text-surface-900">{size.name}</div>
                <div className="text-sm text-surface-600">{size.desc}</div>
                <div className="text-xs text-primary-600 font-medium mt-1">{size.users}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const StepExperience = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">What's your experience?</h2>
        <p className="text-surface-600">We'll tailor the setup based on your background</p>
      </div>

      <div className="space-y-4">
        {EXPERIENCE_LEVELS.map((exp) => (
          <button
            key={exp.id}
            onClick={() => setBusinessProfile({...businessProfile, experience: exp.id as any})}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              businessProfile.experience === exp.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 hover:border-surface-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center">
                <exp.icon className="w-6 h-6 text-surface-600" />
              </div>
              <div>
                <div className="font-semibold text-surface-900 text-lg">{exp.name}</div>
                <div className="text-surface-600">{exp.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const StepPriorities = () => (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">What's most important to you?</h2>
        <p className="text-surface-600">Select your top priorities - we'll set these up first</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRIORITY_FEATURES.map((feature) => (
          <button
            key={feature.id}
            onClick={() => {
              const isSelected = preferences.priorities.includes(feature.id)
              if (isSelected) {
                setPreferences({
                  ...preferences,
                  priorities: preferences.priorities.filter(p => p !== feature.id)
                })
              } else {
                setPreferences({
                  ...preferences,
                  priorities: [...preferences.priorities, feature.id]
                })
              }
            }}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              preferences.priorities.includes(feature.id)
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 hover:border-surface-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-surface-600" />
                </div>
                <div>
                  <div className="font-semibold text-surface-900">{feature.name}</div>
                  <div className="text-surface-600 text-sm">{feature.desc}</div>
                  <div className="text-xs text-primary-600 font-medium mt-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Setup time: {feature.time}
                  </div>
                </div>
              </div>
              {preferences.priorities.includes(feature.id) && (
                <Check className="w-6 h-6 text-primary-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <div className="text-sm text-surface-500">
          Selected {preferences.priorities.length} priorities
        </div>
      </div>
    </div>
  )

  const StepComplete = () => (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
        <Check className="w-12 h-12 text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-surface-900 mb-4">
          Perfect! You're all set 🚀
        </h2>
        <p className="text-xl text-surface-600">
          CoreTrack is now configured for {businessProfile.businessName}
        </p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <h3 className="font-semibold text-surface-900 mb-4">What happens next:</h3>
        <div className="space-y-3 text-left">
          {preferences.priorities.map((priority) => {
            const feature = PRIORITY_FEATURES.find(f => f.id === priority)
            return feature ? (
              <div key={priority} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-surface-700">Setup {feature.name}</span>
                <span className="text-sm text-surface-500">({feature.time})</span>
              </div>
            ) : null
          })}
        </div>
      </div>

      <button
        onClick={handleComplete}
        disabled={isLoading}
        className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Setting up...
          </div>
        ) : (
          <>
            Start Using CoreTrack <Zap className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    </div>
  )

  const steps = [
    <StepWelcome key="welcome" />,
    <StepBusinessInfo key="business" />,
    <StepExperience key="experience" />,
    <StepPriorities key="priorities" />,
    <StepComplete key="complete" />
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-primary-50 py-8 px-4">
      <div className="container mx-auto">
        <ProgressBar />
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-surface-200">
          {/* Navigation */}
          {step > 0 && step < totalSteps - 1 && (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 text-surface-600 hover:text-surface-900 mb-8 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}

          {/* Step Content */}
          {steps[step]}

          {/* Navigation Buttons */}
          {step > 0 && step < totalSteps - 1 && (
            <div className="flex justify-center mt-12">
              <button
                onClick={nextStep}
                className="btn-primary px-8 py-3 rounded-xl"
                disabled={
                  (step === 1 && !businessProfile.businessName) ||
                  (step === 3 && preferences.priorities.length === 0)
                }
              >
                Continue <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
