/**
 * 🔄 AUTOMATIC RESET SYSTEM DIAGNOSTIC & TEST
 * 
 * This script provides comprehensive testing and diagnostics for the
 * improved automatic reset system in CoreTrack.
 * 
 * Usage: Run in browser console or copy to browser console
 */

console.log('🔄 AUTOMATIC RESET SYSTEM DIAGNOSTIC')
console.log('=' .repeat(60))

// Global test state
window.resetSystemDiagnostic = {
  results: {},
  logs: [],
  startTime: new Date()
}

/**
 * Test 1: Check if HybridResetManager is working
 */
async function testResetManagerAvailability() {
  console.log('\n🧪 TEST 1: Reset Manager Availability')
  console.log('-' .repeat(40))
  
  try {
    // Check localStorage for reset schedule
    const resetSchedule = localStorage.getItem('resetSchedule')
    if (resetSchedule) {
      const schedule = JSON.parse(resetSchedule)
      console.log('✅ Reset schedule found:')
      console.log('   📅 Enabled:', schedule.enabled)
      console.log('   🕒 Time:', schedule.time)
      console.log('   🌏 Timezone:', schedule.timezone)
      
      window.resetSystemDiagnostic.results.schedule = schedule
    } else {
      console.log('⚠️ No reset schedule found in localStorage')
      console.log('   This might mean:')
      console.log('   • Team Management page not visited yet')
      console.log('   • Component not rendering properly')
      console.log('   • LocalStorage was cleared')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking reset manager:', error)
    return false
  }
}

/**
 * Test 2: Check last reset timestamp
 */
function testLastResetTimestamp() {
  console.log('\n🧪 TEST 2: Last Reset Timestamp')
  console.log('-' .repeat(40))
  
  try {
    const lastReset = localStorage.getItem('lastDailyReset')
    
    if (lastReset) {
      const resetDate = new Date(lastReset)
      const now = new Date()
      const hoursSince = Math.floor((now.getTime() - resetDate.getTime()) / (1000 * 60 * 60))
      
      console.log('✅ Last reset found:')
      console.log('   📅 Date:', resetDate.toLocaleString())
      console.log('   ⏰ Hours ago:', hoursSince)
      
      if (hoursSince > 25) {
        console.log('🚨 OVERDUE: Reset should have happened!')
        console.log('   Possible issues:')
        console.log('   • Browser/tab was closed during reset time')
        console.log('   • Active shift blocking reset')
        console.log('   • Reset system disabled')
      } else if (hoursSince < 1) {
        console.log('✅ Recent reset - system working properly')
      } else {
        console.log('👍 Normal - within expected timeframe')
      }
      
      window.resetSystemDiagnostic.results.lastReset = { 
        timestamp: lastReset, 
        hoursAgo: hoursSince 
      }
    } else {
      console.log('ℹ️ No previous reset timestamp found')
      console.log('   This is normal for new installations')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking reset timestamp:', error)
    return false
  }
}

/**
 * Test 3: Check service worker registration
 */
async function testServiceWorker() {
  console.log('\n🧪 TEST 3: Service Worker for Background Reset')
  console.log('-' .repeat(40))
  
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const resetWorker = registrations.find(reg => 
        reg.active?.scriptURL.includes('reset-worker') || 
        reg.active?.scriptURL.includes('sw.js')
      )
      
      if (resetWorker) {
        console.log('✅ Service Worker found:')
        console.log('   📝 URL:', resetWorker.active?.scriptURL)
        console.log('   📊 State:', resetWorker.active?.state)
        console.log('   💾 Can run in background: YES')
      } else {
        console.log('⚠️ No reset service worker found')
        console.log('   Background reset capability limited')
        console.log('   Reset will only work when browser is open')
      }
      
      // Check for cached reset flags
      if ('caches' in window) {
        const cache = await caches.open('reset-flags')
        const resetFlag = await cache.match('/reset-needed')
        if (resetFlag) {
          console.log('📨 Found pending background reset flag')
        }
      }
    } else {
      console.log('❌ Service Workers not supported in this browser')
      console.log('   Background reset will not work')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking service worker:', error)
    return false
  }
}

/**
 * Test 4: Calculate next reset time
 */
function testNextResetCalculation() {
  console.log('\n🧪 TEST 4: Next Reset Calculation')
  console.log('-' .repeat(40))
  
  try {
    const resetSchedule = localStorage.getItem('resetSchedule')
    
    if (resetSchedule) {
      const schedule = JSON.parse(resetSchedule)
      const now = new Date()
      const [hours, minutes] = schedule.time.split(':').map(Number)
      
      const nextReset = new Date()
      nextReset.setHours(hours, minutes, 0, 0)
      
      if (nextReset <= now) {
        nextReset.setDate(nextReset.getDate() + 1)
      }
      
      const msUntilReset = nextReset.getTime() - now.getTime()
      const hoursUntil = Math.floor(msUntilReset / (1000 * 60 * 60))
      const minutesUntil = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
      
      console.log('⏰ Next reset scheduled:')
      console.log('   📅 Date:', nextReset.toLocaleString())
      console.log('   ⌛ Time until:', `${hoursUntil}h ${minutesUntil}m`)
      
      if (hoursUntil < 1) {
        console.log('🎯 Reset happening soon! Watch for activity.')
      }
      
      window.resetSystemDiagnostic.results.nextReset = {
        timestamp: nextReset.toISOString(),
        hoursUntil,
        minutesUntil
      }
    } else {
      console.log('❌ Cannot calculate - no schedule found')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error calculating next reset:', error)
    return false
  }
}

/**
 * Test 5: Manual reset trigger test
 */
async function testManualReset() {
  console.log('\n🧪 TEST 5: Manual Reset Trigger Test')
  console.log('-' .repeat(40))
  
  console.log('⚠️ This test will trigger an actual reset!')
  console.log('Only run this if you want to test the reset functionality.')
  console.log('')
  console.log('To run manual reset test:')
  console.log('1. Go to Team Management page')
  console.log('2. Click "Reset Now" button')
  console.log('3. Confirm the reset')
  console.log('4. Check console for reset activity')
  console.log('')
  console.log('Or run: triggerManualResetTest() in console')
  
  return true
}

/**
 * Trigger manual reset for testing
 */
window.triggerManualResetTest = async () => {
  console.log('🔄 TRIGGERING MANUAL RESET TEST...')
  
  try {
    // Check if we're on a page with reset functionality
    if (typeof window.resetDailyData === 'function') {
      await window.resetDailyData()
      console.log('✅ Manual reset test completed')
    } else {
      console.log('❌ Reset function not available on this page')
      console.log('Navigate to Team Management page and try again')
    }
  } catch (error) {
    console.error('❌ Manual reset test failed:', error)
  }
}

/**
 * Main diagnostic runner
 */
async function runAutomaticResetDiagnostic() {
  console.log('🔄 Running comprehensive automatic reset diagnostic...')
  console.log('')
  
  const tests = [
    testResetManagerAvailability,
    testLastResetTimestamp,
    testServiceWorker,
    testNextResetCalculation,
    testManualReset
  ]
  
  let passedTests = 0
  
  for (const test of tests) {
    try {
      const result = await test()
      if (result) passedTests++
    } catch (error) {
      console.error('Test failed:', error)
    }
  }
  
  console.log('\n📊 DIAGNOSTIC SUMMARY')
  console.log('=' .repeat(50))
  console.log(`✅ Tests completed: ${passedTests}/${tests.length}`)
  console.log('')
  
  // Recommendations
  console.log('🎯 RECOMMENDATIONS:')
  
  const schedule = window.resetSystemDiagnostic.results.schedule
  if (!schedule || !schedule.enabled) {
    console.log('• Enable automatic reset in Team Management')
  }
  
  const lastReset = window.resetSystemDiagnostic.results.lastReset
  if (lastReset && lastReset.hoursAgo > 25) {
    console.log('• Perform manual reset to catch up')
  }
  
  console.log('• Visit Team Management page daily to ensure reset runs')
  console.log('• Keep browser tab open during reset hours (3AM)')
  console.log('• Monitor console for reset activity')
  console.log('• End active shifts before reset time')
  
  return window.resetSystemDiagnostic.results
}

// Auto-run the diagnostic
runAutomaticResetDiagnostic()

// Make functions available globally
window.runAutomaticResetDiagnostic = runAutomaticResetDiagnostic
window.testResetManagerAvailability = testResetManagerAvailability
window.testLastResetTimestamp = testLastResetTimestamp
window.testServiceWorker = testServiceWorker
window.testNextResetCalculation = testNextResetCalculation
window.testManualReset = testManualReset
