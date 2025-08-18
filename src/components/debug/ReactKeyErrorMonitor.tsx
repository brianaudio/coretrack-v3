'use client'

import { useEffect } from 'react'

/**
 * React Key Error Monitor - Detects and prevents duplicate key errors
 */
export default function ReactKeyErrorMonitor() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    // Store original console.error
    const originalConsoleError = console.error

    // Override console.error to catch React duplicate key errors
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      
      // Check for the specific duplicate key error pattern
      if (message.includes('Encountered two children with the same key') && 
          message.includes('shift_daily-reset')) {
        
        console.group('🚨 REACT DUPLICATE KEY ERROR DETECTED')
        console.error('Original error:', ...args)
        console.log('📍 Stack trace available in browser DevTools')
        console.log('🔧 Enhanced key generation should prevent this')
        console.log('🧹 Clearing React cache and forcing refresh...')
        console.groupEnd()
        
        // Force a hard refresh to clear React cache
        setTimeout(() => {
          if (confirm('React duplicate key error detected. Clear cache and refresh?')) {
            // Clear localStorage
            localStorage.removeItem('lastDailyReset')
            // Clear sessionStorage
            sessionStorage.clear()
            // Force hard reload
            window.location.reload()
          }
        }, 1000)
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args)
    }

    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError
    }
  }, [])

  // Monitor for duplicate key errors in React DevTools
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Set up global error handler
      const handleError = (event: ErrorEvent) => {
        if (event.message.includes('shift_daily-reset') && 
            event.message.includes('duplicate') || event.message.includes('same key')) {
          console.warn('🚨 Global error caught - duplicate React keys detected')
        }
      }

      window.addEventListener('error', handleError)
      
      return () => {
        window.removeEventListener('error', handleError)
      }
    }
  }, [])

  return null // This component renders nothing
}
