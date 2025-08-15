'use client'

import { generateUniqueReactKey } from './reactKeyUtils'

// Debug utilities specifically for shift-related React key issues
export class ShiftKeyDebugger {
  private static keyRegistry = new Set<string>()
  private static problemKeys = new Set<string>()
  
  /**
   * Generate a guaranteed unique shift key with debugging
   */
  static generateShiftKey(baseKey: string = 'shift'): string {
    const key = generateUniqueReactKey(baseKey)
    
    // Check for the specific problematic pattern
    if (key.includes('shift_daily-reset') && key.match(/(\d+)_\1/)) {
      console.error('🚨 DUPLICATE SHIFT KEY DETECTED:', key)
      this.problemKeys.add(key)
      
      // Generate a completely new key as fallback
      const fallbackKey = `shift-emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.warn('🔧 Using fallback key:', fallbackKey)
      return fallbackKey
    }
    
    // Track all keys to detect duplicates
    if (this.keyRegistry.has(key)) {
      console.warn('⚠️ Duplicate shift key avoided:', key)
      const uniqueKey = `${key}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      this.keyRegistry.add(uniqueKey)
      return uniqueKey
    }
    
    this.keyRegistry.add(key)
    return key
  }
  
  /**
   * Clean old keys from registry to prevent memory leaks
   */
  static cleanRegistry(): void {
    if (this.keyRegistry.size > 1000) {
      this.keyRegistry.clear()
      console.log('🧹 Shift key registry cleaned')
    }
  }
  
  /**
   * Get debug information about problematic keys
   */
  static getDebugInfo(): object {
    return {
      totalKeys: this.keyRegistry.size,
      problemKeys: Array.from(this.problemKeys),
      hasProblems: this.problemKeys.size > 0
    }
  }
  
  /**
   * Reset all debugging data
   */
  static reset(): void {
    this.keyRegistry.clear()
    this.problemKeys.clear()
    console.log('🔄 Shift key debugger reset')
  }
}

// Auto-cleanup every 5 minutes in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    ShiftKeyDebugger.cleanRegistry()
  }, 5 * 60 * 1000)
}

/**
 * Enhanced shift key generation with built-in debugging
 */
export function generateDebuggedShiftKey(prefix: string = 'shift'): string {
  return ShiftKeyDebugger.generateShiftKey(prefix)
}

/**
 * Specific key generator for daily reset operations
 */
export function generateDailyResetKey(): string {
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substr(2, 9)
  const cryptoPart = typeof crypto !== 'undefined' && crypto.getRandomValues 
    ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    : Math.floor(Math.random() * 999999).toString(36)
  
  // Ensure no duplicate pattern like "shift_daily-reset-1234_1234"
  const uniqueKey = `daily-reset-${timestamp}-${randomPart}-${cryptoPart}`
  
  console.log('🔑 Generated daily reset key:', uniqueKey)
  return uniqueKey
}
