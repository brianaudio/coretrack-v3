/**
 * 🔄 SHIFT RESET FUNCTIONALITY DEEP DIVE TEST
 * 
 * This comprehensive test script will check if your shift reset system
 * is actually working during testing and identify any issues.
 * 
 * Run this from browser console to get detailed insights.
 */

console.log('🔄 SHIFT RESET DEEP DIVE TESTER LOADING...')
console.log('=' .repeat(60))

// Global test results
window.shiftResetTestResults = {
  components: {},
  services: {},
  data: {},
  issues: []
}

/**
 * Test 1: Check if ShiftResetService exists and is accessible
 */
function testShiftResetServiceAvailability() {
  console.log('\n🧪 TEST 1: ShiftResetService Availability')
  console.log('-'.repeat(40))
  
  try {
    // Check if service is accessible in browser
    const hasService = window.ShiftResetService || 
                      (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED)
    
    console.log('✅ React environment detected:', !!window.React)
    console.log('🔍 Checking for ShiftResetService module...')
    
    // Look for service in common module patterns
    const modulePatterns = [
      'window.ShiftResetService',
      'window.__NEXT_DATA__', // Next.js
      'window.__webpack_require__' // Webpack
    ]
    
    modulePatterns.forEach(pattern => {
      const exists = eval(`typeof ${pattern} !== 'undefined'`)
      console.log(`   ${exists ? '✅' : '❌'} ${pattern}: ${exists ? 'Found' : 'Not found'}`)
    })
    
    window.shiftResetTestResults.services.availability = true
    return true
  } catch (error) {
    console.error('❌ Error checking ShiftResetService:', error.message)
    window.shiftResetTestResults.services.availability = false
    window.shiftResetTestResults.issues.push('ShiftResetService not accessible')
    return false
  }
}

/**
 * Test 2: Check if shift reset utilities are available
 */
function testShiftResetUtilities() {
  console.log('\n🧪 TEST 2: Shift Reset Utilities')
  console.log('-'.repeat(40))
  
  try {
    // Check for utility functions
    const utilities = [
      'triggerTestShiftReset',
      'getLastShiftReset', 
      'clearShiftResetData'
    ]
    
    utilities.forEach(util => {
      const exists = typeof window[util] === 'function'
      console.log(`   ${exists ? '✅' : '❌'} ${util}: ${exists ? 'Available' : 'Missing'}`)
      
      if (!exists) {
        window.shiftResetTestResults.issues.push(`Utility function ${util} not available`)
      }
    })
    
    // Test localStorage functionality
    const canUseLocalStorage = typeof localStorage !== 'undefined'
    console.log(`   ${canUseLocalStorage ? '✅' : '❌'} localStorage: ${canUseLocalStorage ? 'Available' : 'Blocked'}`)
    
    window.shiftResetTestResults.services.utilities = true
    return true
  } catch (error) {
    console.error('❌ Error checking utilities:', error.message)
    window.shiftResetTestResults.services.utilities = false
    return false
  }
}

/**
 * Test 3: Check for existing shift reset data
 */
function testExistingResetData() {
  console.log('\n🧪 TEST 3: Existing Reset Data')
  console.log('-'.repeat(40))
  
  try {
    // Check localStorage for previous resets
    const lastReset = localStorage.getItem('lastShiftReset')
    if (lastReset) {
      const resetData = JSON.parse(lastReset)
      console.log('✅ Found previous reset data:')
      console.log('   📅 Timestamp:', resetData.timestamp)
      console.log('   🔢 Shift ID:', resetData.shiftId)
      console.log('   📦 Archive ID:', resetData.archiveId)
      
      // Check how long ago
      const resetTime = new Date(resetData.timestamp)
      const timeDiff = Date.now() - resetTime.getTime()
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
      console.log('   ⏰ Time since reset:', hoursAgo > 24 ? `${Math.floor(hoursAgo/24)} days ago` : `${hoursAgo} hours ago`)
      
      window.shiftResetTestResults.data.lastReset = resetData
    } else {
      console.log('ℹ️ No previous reset data found')
      console.log('   This could mean:')
      console.log('   • No resets have been performed yet')
      console.log('   • Data was cleared manually')
      console.log('   • Local storage was cleared')
      
      window.shiftResetTestResults.data.lastReset = null
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking reset data:', error.message)
    window.shiftResetTestResults.issues.push('Cannot access reset data')
    return false
  }
}

/**
 * Test 4: Check if automatic reset is configured
 */
function testAutomaticResetConfig() {
  console.log('\n🧪 TEST 4: Automatic Reset Configuration')
  console.log('-'.repeat(40))
  
  try {
    // Look for HybridResetManager state in local storage or other indicators
    const keys = Object.keys(localStorage)
    const resetConfigKeys = keys.filter(key => 
      key.includes('reset') || 
      key.includes('schedule') || 
      key.includes('hybrid')
    )
    
    console.log('🔍 Checking for reset configuration...')
    
    if (resetConfigKeys.length > 0) {
      console.log('✅ Found reset-related configuration:')
      resetConfigKeys.forEach(key => {
        console.log(`   📝 ${key}: ${localStorage.getItem(key)}`)
      })
    } else {
      console.log('⚠️ No automatic reset configuration found')
      console.log('   This might indicate:')
      console.log('   • HybridResetManager not initialized')
      console.log('   • Configuration stored elsewhere')
      console.log('   • Default settings in use')
    }
    
    // Check current time vs 3AM
    const now = new Date()
    const nextThreeAM = new Date()
    nextThreeAM.setHours(3, 0, 0, 0)
    if (nextThreeAM <= now) {
      nextThreeAM.setDate(nextThreeAM.getDate() + 1)
    }
    
    const msUntilReset = nextThreeAM.getTime() - now.getTime()
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60))
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    console.log(`⏰ Next 3AM reset in: ${hoursUntilReset}h ${minutesUntilReset}m`)
    
    window.shiftResetTestResults.data.nextReset = {
      scheduled: nextThreeAM.toISOString(),
      hoursUntil: hoursUntilReset
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking automatic reset config:', error.message)
    return false
  }
}

/**
 * Test 5: Check if analytics components have reset capability
 */
function testAnalyticsResetCapability() {
  console.log('\n🧪 TEST 5: Analytics Reset Event System')
  console.log('-'.repeat(40))
  
  try {
    let eventReceived = false
    let eventData = null
    
    // Listen for shift reset events
    const testListener = (event) => {
      eventReceived = true
      eventData = event.detail
      console.log('✅ Shift reset event received!')
      console.log('   📊 Event data:', event.detail)
    }
    
    window.addEventListener('shiftReset', testListener)
    
    // Trigger a test reset event
    console.log('🧪 Triggering test shift reset event...')
    
    if (typeof window.triggerTestShiftReset === 'function') {
      window.triggerTestShiftReset({
        shiftName: 'Test Shift',
        totalSales: 1000,
        totalOrders: 25
      })
      
      // Wait a moment for event to propagate
      setTimeout(() => {
        if (eventReceived) {
          console.log('✅ Event system working correctly!')
          window.shiftResetTestResults.components.eventSystem = true
        } else {
          console.log('❌ Event system not responding')
          window.shiftResetTestResults.components.eventSystem = false
          window.shiftResetTestResults.issues.push('Shift reset event system not working')
        }
        
        // Clean up
        window.removeEventListener('shiftReset', testListener)
      }, 100)
    } else {
      console.log('❌ triggerTestShiftReset function not available')
      window.shiftResetTestResults.issues.push('Test trigger function missing')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error testing analytics reset:', error.message)
    return false
  }
}

/**
 * Test 6: Check Firebase connectivity and data access
 */
function testFirebaseConnectivity() {
  console.log('\n🧪 TEST 6: Firebase Connectivity')
  console.log('-'.repeat(40))
  
  try {
    // Check if Firebase is available
    const hasFirebase = typeof window.firebase !== 'undefined' || 
                       typeof window.__FIREBASE_APPS__ !== 'undefined'
    
    console.log(`${hasFirebase ? '✅' : '❌'} Firebase SDK: ${hasFirebase ? 'Available' : 'Missing'}`)
    
    if (hasFirebase) {
      // Try to access Firebase app
      try {
        const firebaseApp = window.firebase?.app?.() || window.__FIREBASE_APPS__?.[0]
        console.log('✅ Firebase app initialized')
        
        // Check auth state
        const auth = window.firebase?.auth?.() || firebaseApp?.auth?.()
        if (auth) {
          console.log('✅ Firebase Auth available')
          console.log('   🔐 Current user:', auth.currentUser ? 'Authenticated' : 'Not authenticated')
        }
        
        // Check Firestore
        const firestore = window.firebase?.firestore?.() || firebaseApp?.firestore?.()
        if (firestore) {
          console.log('✅ Firestore available')
        }
        
      } catch (fbError) {
        console.log('⚠️ Firebase available but not properly initialized')
        console.log('   Error:', fbError.message)
      }
    } else {
      console.log('❌ Firebase not available - this will prevent reset functionality')
      window.shiftResetTestResults.issues.push('Firebase not available')
    }
    
    window.shiftResetTestResults.services.firebase = hasFirebase
    return hasFirebase
  } catch (error) {
    console.error('❌ Error checking Firebase:', error.message)
    return false
  }
}

/**
 * Test 7: Check for active shift context
 */
function testShiftContext() {
  console.log('\n🧪 TEST 7: Active Shift Context')
  console.log('-'.repeat(40))
  
  try {
    // Look for shift-related data in various places
    const shiftIndicators = [
      'currentShift',
      'activeShift', 
      'shiftContext',
      'shift',
      '__shift__'
    ]
    
    let foundShift = false
    
    // Check localStorage
    Object.keys(localStorage).forEach(key => {
      if (shiftIndicators.some(indicator => key.toLowerCase().includes(indicator))) {
        console.log(`✅ Found shift data in localStorage: ${key}`)
        try {
          const data = JSON.parse(localStorage.getItem(key))
          console.log('   📊 Shift info:', data)
          foundShift = true
        } catch {
          console.log('   📊 Shift data (non-JSON):', localStorage.getItem(key))
          foundShift = true
        }
      }
    })
    
    // Check sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (shiftIndicators.some(indicator => key.toLowerCase().includes(indicator))) {
          console.log(`✅ Found shift data in sessionStorage: ${key}`)
          foundShift = true
        }
      })
    }
    
    if (!foundShift) {
      console.log('ℹ️ No active shift context found')
      console.log('   This might mean:')
      console.log('   • No shift is currently active')
      console.log('   • Shift data stored in React state only')
      console.log('   • Different storage mechanism used')
    }
    
    window.shiftResetTestResults.data.activeShift = foundShift
    return true
  } catch (error) {
    console.error('❌ Error checking shift context:', error.message)
    return false
  }
}

/**
 * Main test runner
 */
async function runShiftResetDeepDive() {
  console.log('🚀 STARTING SHIFT RESET DEEP DIVE ANALYSIS')
  console.log('=' .repeat(60))
  
  const tests = [
    testShiftResetServiceAvailability,
    testShiftResetUtilities,
    testExistingResetData,
    testAutomaticResetConfig,
    testAnalyticsResetCapability,
    testFirebaseConnectivity,
    testShiftContext
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test()
      results.push(result)
    } catch (error) {
      console.error(`❌ Test failed:`, error.message)
      results.push(false)
    }
  }
  
  // Summary
  console.log('\n📋 TEST SUMMARY')
  console.log('=' .repeat(60))
  
  const passedTests = results.filter(r => r).length
  const totalTests = results.length
  
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`❌ Tests Failed: ${totalTests - passedTests}/${totalTests}`)
  
  if (window.shiftResetTestResults.issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:')
    window.shiftResetTestResults.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`)
    })
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  
  if (!window.shiftResetTestResults.services.firebase) {
    console.log('🔥 CRITICAL: Firebase not available - shift reset cannot work without it')
  }
  
  if (!window.shiftResetTestResults.data.lastReset) {
    console.log('⚠️ No previous resets detected - test with manual reset first')
  }
  
  if (!window.shiftResetTestResults.components.eventSystem) {
    console.log('⚠️ Event system issues - analytics may not reset properly')
  }
  
  if (!window.shiftResetTestResults.data.activeShift) {
    console.log('ℹ️ No active shift - start a shift to test full functionality')
  }
  
  console.log('\n🔧 NEXT STEPS:')
  console.log('1. Navigate to Team Management page')
  console.log('2. Check if ShiftResetManager component appears')
  console.log('3. Try manual reset if you have permission')
  console.log('4. Monitor browser console for reset logs')
  console.log('5. Check if data actually gets archived')
  
  console.log('\n📊 Full test results saved to: window.shiftResetTestResults')
  
  return window.shiftResetTestResults
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🔄 SHIFT RESET DEEP DIVE TESTER READY!')
  console.log('')
  console.log('Run this command to start testing:')
  console.log('  runShiftResetDeepDive()')
  console.log('')
  console.log('Or test individual components:')
  console.log('  triggerTestShiftReset() - Test event system')
  console.log('  getLastShiftReset() - Check last reset')
  console.log('  clearShiftResetData() - Clear reset data')
  
  // Make functions globally available
  window.runShiftResetDeepDive = runShiftResetDeepDive
  window.testShiftResetServiceAvailability = testShiftResetServiceAvailability
  window.testShiftResetUtilities = testShiftResetUtilities
  window.testExistingResetData = testExistingResetData
  window.testAutomaticResetConfig = testAutomaticResetConfig
  window.testAnalyticsResetCapability = testAnalyticsResetCapability
  window.testFirebaseConnectivity = testFirebaseConnectivity
  window.testShiftContext = testShiftContext
}
