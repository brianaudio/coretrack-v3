'use client'

import { useState, useEffect } from 'react'

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tutorial-completed')
    if (!hasSeenTutorial) {
      setTimeout(() => setShowTutorial(true), 1000)
    }
  }, [])

  const nextStep = () => setCurrentStep(prev => prev + 1)
  const prevStep = () => setCurrentStep(prev => Math.max(0, prev - 1))
  
  const completeTutorial = () => {
    localStorage.setItem('tutorial-completed', 'true')
    setShowTutorial(false)
    setCurrentStep(0)
  }

  const startTutorial = () => {
    setCurrentStep(0)
    setShowTutorial(true)
  }

  return {
    showTutorial,
    currentStep,
    nextStep,
    prevStep,
    completeTutorial,
    startTutorial
  }
}
