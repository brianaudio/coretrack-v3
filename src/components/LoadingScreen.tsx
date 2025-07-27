import React from 'react'
import CoreTrackLogo from './CoreTrackLogo'

interface LoadingScreenProps {
  message?: string
  submessage?: string
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading CoreTrack...", 
  submessage = "Professional Business Management System" 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto animate-pulse">
              <CoreTrackLogo className="w-12 h-12 text-white" />
            </div>
            {/* Rotating ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{message}</h2>
          <p className="text-gray-600">{submessage}</p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-64 bg-gray-200 rounded-full h-2 mx-auto overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center mt-6 space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Professional Footer */}
        <div className="mt-12 text-xs text-gray-500">
          <p>© 2025 CoreTrack Professional</p>
          <p>Initializing secure systems...</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
