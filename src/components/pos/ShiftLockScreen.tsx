'use client'

import { useEffect, useState } from 'react'

interface ShiftLockScreenProps {
  onHighlightStart?: () => void
  onStartShift?: () => void
}

export default function ShiftLockScreen({ onHighlightStart, onStartShift }: ShiftLockScreenProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (onHighlightStart) {
      const timer = setTimeout(() => {
        onHighlightStart()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [onHighlightStart])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* 🍎 Apple-Inspired Lock Screen Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 rounded-3xl"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Modern Lock Icon */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Clean Typography */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight">
              Start Your Shift
            </h2>
            
            {/* Prominent Start Shift Button */}
            <button 
              onClick={onStartShift}
              className="inline-flex items-center px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl mb-6 text-lg"
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Shift
            </button>
            
            <p className="text-gray-600 mb-8 leading-relaxed text-base">
              Begin by starting your shift with the 
              <span className="font-medium text-emerald-600"> Start </span> 
              button in the header above.
            </p>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Your shift will be tracked for reporting and analytics
          </p>
        </div>
      </div>
    </div>
  )
}
