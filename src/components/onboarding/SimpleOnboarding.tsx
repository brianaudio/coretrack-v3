'use client'

import React, { useState } from 'react'
import { X, ChevronRight, CheckCircle, Package, Receipt, BarChart3 } from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { useBranch } from '@/lib/context/BranchContext'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

export default function SimpleOnboarding() {
  const { user, profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { showOnboarding, completeOnboarding } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(1)

  // Don't show onboarding if not needed
  if (!showOnboarding) {
    return null
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const businessName = selectedBranch?.name || profile?.displayName || 'Your Business'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">CT</span>
            </div>
            <span className="font-semibold text-gray-900">CoreTrack Setup</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Step {currentStep} of 2</span>
            <span className="text-xs text-gray-500">{currentStep === 1 ? 'Welcome' : 'Quick Demo'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 pt-4">
          {currentStep === 1 ? (
            // Step 1: Welcome
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to CoreTrack!
              </h2>
              <p className="text-gray-600 mb-6">
                Hi there! We're excited to help you manage <strong>{businessName}</strong> more efficiently. 
                CoreTrack is your all-in-one business management solution.
              </p>
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Inventory Management</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Receipt className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Point of Sale (POS)</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Sales Analytics</span>
                </div>
              </div>
            </div>
          ) : (
            // Step 2: Quick Demo
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                You're All Set! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                Here's what you can do right now:
              </p>
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">📦 Add Your First Items</div>
                  <div className="text-sm text-gray-600">Go to Inventory Center to add your products</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">💰 Make Your First Sale</div>
                  <div className="text-sm text-gray-600">Use the POS system to record sales</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900 mb-1">📊 View Reports</div>
                  <div className="text-sm text-gray-600">Check Analytics for business insights</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleNext}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <span>{currentStep === 1 ? 'Next' : 'Get Started'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
