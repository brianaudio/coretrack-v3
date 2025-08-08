'use client'

import React, { useState } from 'react'
import { 
  ArrowRight, 
  Check, 
  Zap, 
  Target,
  Package,
  ShoppingBag,
  ClipboardList,
  UserPlus,
  Star,
  Clock,
  Sparkles,
  BarChart3
} from 'lucide-react'

interface OnboardingFlowProps {
  onComplete: () => void
  userProfile?: {
    businessName?: string
    businessType?: string
    email?: string
    firstName?: string
  }
}

const WelcomeStep = ({ userProfile, onNext }: any) => (
  <div className="text-center space-y-8">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
      <Sparkles className="w-12 h-12 text-white" />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">
        Welcome to CoreTrack{userProfile?.firstName ? `, ${userProfile.firstName}!` : '!'}
      </h2>
      <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
        Your complete business management solution is ready. Let&apos;s get you started in under <strong>2 minutes</strong>.
      </p>
    </div>
    
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 max-w-lg mx-auto border border-blue-100">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500" />
        <span className="font-semibold text-gray-900 text-lg">Everything You Need</span>
        <Star className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
        <div className="flex items-center gap-2 text-blue-700">
          <Check className="w-4 h-4" />
          <span>Inventory Management</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700">
          <Check className="w-4 h-4" />
          <span>Point of Sale</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700">
          <Check className="w-4 h-4" />
          <span>Sales Analytics</span>
        </div>
        <div className="flex items-center gap-2 text-blue-700">
          <Check className="w-4 h-4" />
          <span>Purchase Orders</span>
        </div>
      </div>
    </div>

    <button
      onClick={onNext}
      className="w-full max-w-sm mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      Start Setup <ArrowRight className="w-5 h-5" />
    </button>
  </div>
)

const QuickSetupStep = ({ onNext }: any) => {
  const [selectedActions, setSelectedActions] = useState<string[]>(['inventory', 'pos'])

  const setupActions = [
    {
      id: 'inventory',
      icon: Package,
      title: 'Add Your Products',
      description: 'Start with your core inventory items',
      time: '2 min',
      priority: 'essential',
      benefit: 'Start tracking immediately'
    },
    {
      id: 'pos',
      icon: ShoppingBag,
      title: 'Setup Point of Sale',
      description: 'Ready to take orders immediately',
      time: '1 min',
      priority: 'essential',
      benefit: 'Accept payments instantly'
    },
    {
      id: 'suppliers',
      icon: ClipboardList,
      title: 'Add Key Suppliers',
      description: 'For purchase order management',
      time: '3 min',
      priority: 'recommended',
      benefit: 'Streamline ordering'
    },
    {
      id: 'staff',
      icon: UserPlus,
      title: 'Invite Team Members',
      description: 'Set roles and permissions',
      time: '2 min',
      priority: 'optional',
      benefit: 'Collaborate effectively'
    }
  ]

  const toggleAction = (actionId: string) => {
    setSelectedActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    )
  }

  const essentialActions = setupActions.filter(a => a.priority === 'essential')
  const otherActions = setupActions.filter(a => a.priority !== 'essential')
  const totalTime = setupActions
    .filter(a => selectedActions.includes(a.id))
    .reduce((sum, a) => sum + parseInt(a.time), 0)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Quick Setup</h2>
        <p className="text-lg text-gray-600">
          Choose what to set up now. Don&apos;t worry - you can add more anytime.
        </p>
        {selectedActions.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
            <Clock className="w-4 h-4" />
            <span className="font-medium">~{totalTime} minutes total</span>
          </div>
        )}
      </div>

      {/* Essential Setup */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Essential Setup</h3>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            Recommended
          </span>
        </div>
        <div className="space-y-4">
          {essentialActions.map((action) => (
            <div
              key={action.id}
              onClick={() => toggleAction(action.id)}
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                selectedActions.includes(action.id)
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg transform scale-102'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-7 h-7 border-2 rounded-xl flex items-center justify-center transition-colors ${
                  selectedActions.includes(action.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {selectedActions.includes(action.id) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedActions.includes(action.id)
                    ? 'bg-blue-100 shadow-md'
                    : 'bg-gray-100'
                }`}>
                  <action.icon className={`w-7 h-7 ${
                    selectedActions.includes(action.id) ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="text-xl font-semibold text-gray-900">{action.title}</h4>
                    <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {action.time}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-2">{action.description}</p>
                  <p className="text-sm text-blue-600 font-medium">✓ {action.benefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Setup */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Optional Setup</h3>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
            Do Later
          </span>
        </div>
        <div className="space-y-3">
          {otherActions.map((action) => (
            <div
              key={action.id}
              onClick={() => toggleAction(action.id)}
              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                selectedActions.includes(action.id)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 border-2 rounded-lg ${
                  selectedActions.includes(action.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {selectedActions.includes(action.id) && (
                    <Check className="w-3 h-3 text-white m-0.5" />
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedActions.includes(action.id)
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  <action.icon className={`w-5 h-5 ${
                    selectedActions.includes(action.id) ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-gray-900">{action.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {action.time}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{action.description}</p>
                  <p className="text-xs text-blue-600">✓ {action.benefit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {selectedActions.length > 0 ? (
            <>Continue with {selectedActions.length} Item{selectedActions.length > 1 ? 's' : ''}</>
          ) : (
            'Skip Setup for Now'
          )}
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-sm text-gray-500">
          You can always set these up later from your dashboard
        </p>
      </div>
    </div>
  )
}

const CompletionStep = ({ onComplete }: any) => (
  <div className="text-center space-y-8">
    <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
      <Check className="w-12 h-12 text-white" />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">You&apos;re All Set!</h2>
      <p className="text-lg text-gray-600 max-w-md mx-auto">
        Welcome to CoreTrack! Your business management system is ready to use.
      </p>
    </div>
    
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 max-w-lg mx-auto border border-green-200">
      <h3 className="font-semibold text-green-900 mb-4 text-lg">What&apos;s Available Now:</h3>
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center gap-3 text-green-700">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          <span>Complete dashboard with real-time data</span>
        </div>
        <div className="flex items-center gap-3 text-green-700">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-green-600" />
          </div>
          <span>Inventory management system</span>
        </div>
        <div className="flex items-center gap-3 text-green-700">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-green-600" />
          </div>
          <span>Point of sale interface</span>
        </div>
        <div className="flex items-center gap-3 text-green-700">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-green-600" />
          </div>
          <span>Analytics and reporting tools</span>
        </div>
      </div>
    </div>
    
    <button
      onClick={onComplete}
      className="w-full max-w-sm mx-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      Go to Dashboard <ArrowRight className="w-5 h-5" />
    </button>
  </div>
)

export default function OnboardingFlow({ onComplete, userProfile }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      id: 'welcome',
      component: WelcomeStep
    },
    {
      id: 'setup',
      component: QuickSetupStep
    },
    {
      id: 'complete',
      component: CompletionStep
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem('coretrack_onboarding_completed', 'true')
    onComplete()
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Progress Bar - Only show if not on welcome step */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index <= currentStep 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-20 h-2 mx-3 rounded-full transition-all duration-300 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-100">
          <div 
            key={currentStep}
            className="transition-all duration-500 ease-in-out"
          >
            <CurrentStepComponent
              userProfile={userProfile}
              onNext={currentStep === steps.length - 1 ? handleComplete : nextStep}
              onComplete={handleComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
