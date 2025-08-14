'use client'

import React, { useState } from 'react'
import ChatPanel from './ChatPanel'

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary-200"
            aria-label="Open AI Assistant"
          >
            {/* Animated Pulse Ring */}
            <div className="absolute inset-0 rounded-full bg-primary-400 opacity-75 animate-ping"></div>
            
            {/* Chat Icon */}
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>

            {/* Help Badge */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
              ?
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-16 right-0 mb-2 hidden group-hover:block">
              <div className="bg-surface-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                Need help? Ask CoreTrack AI!
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-surface-900"></div>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <ChatPanel 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
