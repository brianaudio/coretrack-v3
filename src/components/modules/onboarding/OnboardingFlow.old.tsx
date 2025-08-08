'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowRight, ArrowLeft, Users, Target, BarChart3, Zap } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  component: React.ComponentType<any>
}

interface OnboardingFlowProps {
  onComplete: () => void
  userProfile: any
}

// Step Components
const WelcomeStep = ({ userProfile, onNext }: any) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
      <Zap className="w-10 h-10 text-blue-600" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to CoreTrack, {userProfile?.firstName}!
      </h2>
      <p className="text-gray-600">
        We&apos;re excited to help you transform your business operations. Let&apos;s get you set up for success.
      </p>
    </div>
    <div className="bg-blue-50 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-2">What&apos;s Next?</h3>
      <ul className="text-sm text-blue-700 space-y-1">
        <li>• Quick tour of your dashboard</li>
        <li>• Set up your first products/menu items</li>
        <li>• Configure your business preferences</li>
        <li>• Start tracking your inventory</li>
      </ul>
    </div>
    <button
      onClick={onNext}
      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
    >
      Let&apos;s Get Started <ArrowRight className="w-4 h-4" />
    </button>
  </div>
)

const DashboardTourStep = ({ onNext, onPrev }: any) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Dashboard</h2>
      <p className="text-gray-600">
        Your command center for monitoring and managing your business
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold">Real-time Analytics</h3>
        </div>
        <p className="text-sm text-gray-600">
          Track sales, inventory levels, and performance metrics in real-time
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-semibold">Quick Actions</h3>
        </div>
        <p className="text-sm text-gray-600">
          Access frequently used features like POS, inventory, and reports
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-semibold">Team Management</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage staff access and monitor team performance
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="font-semibold">Smart Insights</h3>
        </div>
        <p className="text-sm text-gray-600">
          Get AI-powered recommendations to optimize your operations
        </p>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onPrev}
        className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button
        onClick={onNext}
        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)

const QuickSetupStep = ({ userProfile, onNext, onPrev }: any) => {
  const [selectedActions, setSelectedActions] = useState<string[]>([])

  const quickActions = [
    {
      id: 'inventory',
      title: 'Add Your First Products',
      description: 'Set up your inventory with products or menu items',
      recommended: true
    },
    {
      id: 'pos',
      title: 'Configure Point of Sale',
      description: 'Set up your POS system for taking orders',
      recommended: userProfile?.businessType !== 'warehouse'
    },
    {
      id: 'suppliers',
      title: 'Add Suppliers',
      description: 'Manage your vendor relationships and purchase orders',
      recommended: false
    },
    {
      id: 'staff',
      title: 'Invite Team Members',
      description: 'Add staff accounts and set permissions',
      recommended: userProfile?.teamSize > 1
    }
  ]

  const toggleAction = (actionId: string) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Setup</h2>
        <p className="text-gray-600">
          Choose what you&apos;d like to set up first. You can always do this later.
        </p>
      </div>

      <div className="space-y-3">
        {quickActions.map((action) => (
          <div
            key={action.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedActions.includes(action.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleAction(action.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedActions.includes(action.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedActions.includes(action.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    {action.recommended && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPrev}
          className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {selectedActions.length > 0 ? `Set Up ${selectedActions.length} Items` : 'Skip for Now'} 
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const CompletionStep = ({ onComplete }: any) => (
  <div className="text-center space-y-6">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
      <Check className="w-10 h-10 text-green-600" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re All Set!</h2>
      <p className="text-gray-600">
        Welcome to CoreTrack! Your business management system is ready to use.
      </p>
    </div>
    <div className="bg-green-50 rounded-lg p-4">
      <h3 className="font-semibold text-green-900 mb-2">What&apos;s Available Now:</h3>
      <ul className="text-sm text-green-700 space-y-1">
        <li>• Complete dashboard with real-time data</li>
        <li>• Inventory management system</li>
        <li>• Point of sale interface</li>
        <li>• Analytics and reporting tools</li>
      </ul>
    </div>
    <button
      onClick={onComplete}
      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
    >
      Go to Dashboard <ArrowRight className="w-4 h-4" />
    </button>
  </div>
)

export default function OnboardingFlow({ onComplete, userProfile }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with CoreTrack',
      icon: Zap,
      component: WelcomeStep
    },
    {
      id: 'dashboard',
      title: 'Dashboard Tour',
      description: 'Explore your control center',
      icon: BarChart3,
      component: DashboardTourStep
    },
    {
      id: 'setup',
      title: 'Quick Setup',
      description: 'Configure your essentials',
      icon: Target,
      component: QuickSetupStep
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'Ready to go!',
      icon: Check,
      component: CompletionStep
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem('coretrack_onboarding_completed', 'true')
    onComplete()
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {steps[currentStep].title}
            </h1>
            <p className="text-sm text-gray-600">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div 
            key={currentStep}
            className="transition-all duration-300 ease-in-out"
          >
            <CurrentStepComponent
              userProfile={userProfile}
              onNext={currentStep === steps.length - 1 ? handleComplete : nextStep}
              onPrev={prevStep}
              onComplete={handleComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
