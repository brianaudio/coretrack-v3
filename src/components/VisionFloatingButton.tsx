'use client'

import React from 'react'
import Link from 'next/link'

export default function VisionFloatingButton() {
  return (
    <Link href="/vision" target="_blank">
      {/* Vision Button - Positioned above AI button with same dimensions */}
      <div className="fixed bottom-20 right-6 z-40 group" style={{ zIndex: 9998 }}>
        <button
          className="group relative w-16 h-16 bg-gradient-to-br from-indigo-500/90 to-blue-600/90 hover:from-indigo-600/95 hover:to-blue-700/95 text-white rounded-2xl shadow-2xl hover:shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300 flex items-center justify-center backdrop-blur-xl border border-white/20"
          aria-label="Open CoreTrack Vision - Mobile Analytics"
        >
          {/* Glassmorphism Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl" />
          
          {/* Vision Analytics Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>

          {/* Pulse Animation */}
          {/* <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 rounded-2xl animate-pulse" /> */}
        </button>
        
        {/* Enhanced Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-xl whitespace-nowrap shadow-lg border border-white/10">
            CoreTrack Vision - Mobile Analytics
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/90"></div>
          </div>
        </div>
      </div>
    </Link>
  )
}
