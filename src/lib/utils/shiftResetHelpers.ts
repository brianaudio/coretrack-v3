/**
 * Shift Reset Utilities
 * Helper functions for testing and managing shift reset events
 */

export interface ShiftResetTestData {
  shiftId: string
  shiftName: string
  archiveId: string
  totalSales: number
  totalOrders: number
}

/**
 * Manually trigger a shift reset event for testing
 * This is useful for developers to test the analytics reset functionality
 */
export function triggerTestShiftReset(testData?: Partial<ShiftResetTestData>): void {
  const defaultData: ShiftResetTestData = {
    shiftId: 'test_shift_' + Date.now(),
    shiftName: 'Test Shift',
    archiveId: 'archive_' + Date.now(),
    totalSales: 0,
    totalOrders: 0,
    ...testData
  }

  const resetEvent = new CustomEvent('shiftReset', {
    detail: {
      summary: defaultData,
      timestamp: new Date().toISOString(),
      type: 'shift_reset_test'
    }
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(resetEvent)
    console.log('🧪 Test shift reset event dispatched:', defaultData)
  }
}

/**
 * Check if a shift reset recently occurred
 */
export function getLastShiftReset(): { timestamp: string; shiftId: string; archiveId: string } | null {
  if (typeof localStorage === 'undefined') return null
  
  try {
    const lastReset = localStorage.getItem('lastShiftReset')
    return lastReset ? JSON.parse(lastReset) : null
  } catch (error) {
    console.error('Failed to parse last shift reset data:', error)
    return null
  }
}

/**
 * Clear shift reset localStorage data
 */
export function clearShiftResetData(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('lastShiftReset')
    console.log('🧹 Shift reset data cleared from localStorage')
  }
}

// Add global function for easy testing in browser console
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.triggerTestShiftReset = triggerTestShiftReset
  // @ts-ignore  
  window.getLastShiftReset = getLastShiftReset
  // @ts-ignore
  window.clearShiftResetData = clearShiftResetData
  
  console.log('🛠️ Shift reset test utilities available:')
  console.log('   - triggerTestShiftReset() - Trigger test reset event')
  console.log('   - getLastShiftReset() - Check last reset data')
  console.log('   - clearShiftResetData() - Clear reset localStorage')
}
