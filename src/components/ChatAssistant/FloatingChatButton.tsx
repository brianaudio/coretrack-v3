'use client'

import { useState } from 'react'
import { ChatPanel } from './ChatPanel'

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(true)
            setHasNewMessage(false)
          }}
          className="relative bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group"
          aria-label="Open CoreTrack Assistant"
        >
          {/* Notification Dot */}
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          
          {/* Chat Icon */}
          <svg 
            className="w-6 h-6 transition-transform group-hover:scale-110" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
          
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-full bg-primary-400 opacity-20 animate-ping" />
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-16 right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Need help? Ask CoreTrack AI
          <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <ChatPanel 
          onClose={() => setIsOpen(false)}
          onNewMessage={() => setHasNewMessage(true)}
        />
      )}
    </>
  )
}
