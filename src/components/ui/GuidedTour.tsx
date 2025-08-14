'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface TourStep {
  target: string // CSS selector or element ID
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  showSkip?: boolean
  action?: () => void // Optional action to perform when step is shown
}

interface GuidedTourProps {
  steps: TourStep[]
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
  tourId: string // Unique identifier for tour persistence
}

export function GuidedTour({ steps, isActive, onComplete, onSkip, tourId }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && steps.length > 0) {
      updateTargetPosition()
      // Run step action if provided
      if (steps[currentStep]?.action) {
        steps[currentStep].action!()
      }
    }
  }, [isActive, currentStep, steps])

  useEffect(() => {
    const handleResize = () => {
      if (isActive) updateTargetPosition()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive])

  const updateTargetPosition = () => {
    const step = steps[currentStep]
    if (!step) return

    const targetElement = document.querySelector(step.target) as HTMLElement
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      setTargetPosition({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      })
      
      // Scroll element into view if needed
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    localStorage.setItem(`coretrack_tour_${tourId}_completed`, 'true')
    onComplete()
  }

  const skipTour = () => {
    localStorage.setItem(`coretrack_tour_${tourId}_skipped`, 'true')
    onSkip()
  }

  if (!isActive || steps.length === 0) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  // Calculate tooltip position
  const getTooltipPosition = () => {
    const padding = 20
    let x = targetPosition.x
    let y = targetPosition.y

    switch (step.position) {
      case 'top':
        x = targetPosition.x + targetPosition.width / 2 - 150 // 300px width / 2
        y = targetPosition.y - 200 // Tooltip height + padding
        break
      case 'bottom':
        x = targetPosition.x + targetPosition.width / 2 - 150
        y = targetPosition.y + targetPosition.height + padding
        break
      case 'left':
        x = targetPosition.x - 320 // Tooltip width + padding
        y = targetPosition.y + targetPosition.height / 2 - 100
        break
      case 'right':
        x = targetPosition.x + targetPosition.width + padding
        y = targetPosition.y + targetPosition.height / 2 - 100
        break
      case 'center':
      default:
        x = window.innerWidth / 2 - 150
        y = window.innerHeight / 2 - 100
        break
    }

    // Keep tooltip within viewport
    x = Math.max(padding, Math.min(x, window.innerWidth - 320))
    y = Math.max(padding, Math.min(y, window.innerHeight - 220))

    return { x, y }
  }

  const tooltipPos = getTooltipPosition()

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
    >
      {/* Highlight the target element */}
      <div
        className="absolute border-4 border-primary-400 rounded-lg shadow-lg animate-pulse"
        style={{
          left: targetPosition.x - 4,
          top: targetPosition.y - 4,
          width: targetPosition.width + 8,
          height: targetPosition.height + 8,
          background: 'rgba(59, 130, 246, 0.1)'
        }}
      />

      {/* Tour tooltip */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl w-80 max-w-sm"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{currentStep + 1}</span>
            </div>
            <span className="text-sm font-medium text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          {step.showSkip !== false && (
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {step.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={isFirstStep}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
              isFirstStep 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Progress dots */}
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={nextStep}
            className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            <span>{isLastStep ? 'Finish' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook to manage tour state
export function useTour(tourId: string) {
  const [isActive, setIsActive] = useState(false)

  const startTour = () => setIsActive(true)
  const completeTour = () => setIsActive(false)
  const skipTour = () => setIsActive(false)

  const hasCompletedTour = () => {
    return localStorage.getItem(`coretrack_tour_${tourId}_completed`) === 'true'
  }

  const hasSkippedTour = () => {
    return localStorage.getItem(`coretrack_tour_${tourId}_skipped`) === 'true'
  }

  const shouldShowTour = () => {
    return !hasCompletedTour() && !hasSkippedTour()
  }

  return {
    isActive,
    startTour,
    completeTour,
    skipTour,
    hasCompletedTour,
    hasSkippedTour,
    shouldShowTour
  }
}

export default GuidedTour
