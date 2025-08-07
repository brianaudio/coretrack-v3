/**
 * 🔍 DATA EXISTENCE CHECKER
 * 
 * This script checks if your system actually has data that should be reset
 * Run this to see if there's operational data that a reset would affect
 */

console.log('🔍 CHECKING FOR OPERATIONAL DATA...')
console.log('=' .repeat(50))

/**
 * Check what data exists that should be affected by reset
 */
async function checkOperationalData() {
  console.log('🗃️ OPERATIONAL DATA ANALYSIS')
  console.log('-'.repeat(30))
  
  try {
    // Check for POS data indicators
    const posIndicators = [
      'pos_orders',
      'posOrders', 
      'orders',
      'transactions',
      'sales'
    ]
    
    // Check for expense data indicators  
    const expenseIndicators = [
      'expenses',
      'dailyExpenses',
      'costs',
      'expenditures'
    ]
    
    // Check for inventory transaction indicators
    const inventoryIndicators = [
      'inventory_transactions',
      'inventoryTransactions',
      'stock_movements',
      'stockMovements'
    ]
    
    console.log('📊 Checking localStorage for operational data...')
    
    let foundData = {
      pos: [],
      expenses: [],
      inventory: [],
      other: []
    }
    
    // Scan localStorage
    Object.keys(localStorage).forEach(key => {
      const lowerKey = key.toLowerCase()
      
      if (posIndicators.some(indicator => lowerKey.includes(indicator))) {
        foundData.pos.push({ key, location: 'localStorage' })
      } else if (expenseIndicators.some(indicator => lowerKey.includes(indicator))) {
        foundData.expenses.push({ key, location: 'localStorage' })
      } else if (inventoryIndicators.some(indicator => lowerKey.includes(indicator))) {
        foundData.inventory.push({ key, location: 'localStorage' })
      } else if (lowerKey.includes('data') || lowerKey.includes('cache')) {
        foundData.other.push({ key, location: 'localStorage' })
      }
    })
    
    // Scan sessionStorage if available
    if (typeof sessionStorage !== 'undefined') {
      console.log('📊 Checking sessionStorage for operational data...')
      Object.keys(sessionStorage).forEach(key => {
        const lowerKey = key.toLowerCase()
        
        if (posIndicators.some(indicator => lowerKey.includes(indicator))) {
          foundData.pos.push({ key, location: 'sessionStorage' })
        } else if (expenseIndicators.some(indicator => lowerKey.includes(indicator))) {
          foundData.expenses.push({ key, location: 'sessionStorage' })
        } else if (inventoryIndicators.some(indicator => lowerKey.includes(indicator))) {
          foundData.inventory.push({ key, location: 'sessionStorage' })
        } else if (lowerKey.includes('data') || lowerKey.includes('cache')) {
          foundData.other.push({ key, location: 'sessionStorage' })
        }
      })
    }
    
    // Report findings
    console.log('\n📋 FOUND OPERATIONAL DATA:')
    
    if (foundData.pos.length > 0) {
      console.log('💰 POS/Sales Data:')
      foundData.pos.forEach(item => {
        console.log(`   📝 ${item.key} (${item.location})`)
        try {
          const data = item.location === 'localStorage' ? 
            localStorage.getItem(item.key) : 
            sessionStorage.getItem(item.key)
          if (data) {
            const parsed = JSON.parse(data)
            if (Array.isArray(parsed)) {
              console.log(`      📊 ${parsed.length} items`)
            } else if (typeof parsed === 'object') {
              console.log(`      📊 Object with ${Object.keys(parsed).length} properties`)
            }
          }
        } catch (e) {
          console.log(`      📊 Non-JSON data (${typeof data})`)
        }
      })
    } else {
      console.log('💰 POS/Sales Data: ❌ None found')
    }
    
    if (foundData.expenses.length > 0) {
      console.log('💸 Expense Data:')
      foundData.expenses.forEach(item => {
        console.log(`   📝 ${item.key} (${item.location})`)
      })
    } else {
      console.log('💸 Expense Data: ❌ None found')
    }
    
    if (foundData.inventory.length > 0) {
      console.log('📦 Inventory Transaction Data:')
      foundData.inventory.forEach(item => {
        console.log(`   📝 ${item.key} (${item.location})`)
      })
    } else {
      console.log('📦 Inventory Transaction Data: ❌ None found')
    }
    
    if (foundData.other.length > 0) {
      console.log('📂 Other Data:')
      foundData.other.forEach(item => {
        console.log(`   📝 ${item.key} (${item.location})`)
      })
    }
    
    // Check if any operational data exists
    const totalOperationalData = foundData.pos.length + foundData.expenses.length + foundData.inventory.length
    
    if (totalOperationalData === 0) {
      console.log('\n⚠️ NO OPERATIONAL DATA FOUND')
      console.log('This could mean:')
      console.log('• No transactions have been made yet')
      console.log('• Data is stored in Firebase only (not cached locally)')
      console.log('• Different naming convention used')
      console.log('• Data stored in React component state only')
      console.log('')
      console.log('🎯 RECOMMENDATION:')
      console.log('1. Make some test transactions in the POS')
      console.log('2. Add some expenses')
      console.log('3. Move some inventory')
      console.log('4. Then test the reset functionality')
    } else {
      console.log(`\n✅ FOUND ${totalOperationalData} OPERATIONAL DATA SOURCES`)
      console.log('This data should be affected by shift reset.')
    }
    
    return foundData
    
  } catch (error) {
    console.error('❌ Error checking operational data:', error.message)
    return null
  }
}

/**
 * Check current date/time to see if reset should have happened
 */
function checkResetTiming() {
  console.log('\n⏰ RESET TIMING ANALYSIS')
  console.log('-'.repeat(30))
  
  const now = new Date()
  const today3AM = new Date()
  today3AM.setHours(3, 0, 0, 0)
  
  const yesterday3AM = new Date(today3AM)
  yesterday3AM.setDate(yesterday3AM.getDate() - 1)
  
  console.log('🕐 Current time:', now.toLocaleString())
  console.log('🕐 Last 3AM reset:', yesterday3AM.toLocaleString())
  console.log('🕐 Next 3AM reset:', today3AM.toLocaleString())
  
  const hoursSinceLastReset = Math.floor((now.getTime() - yesterday3AM.getTime()) / (1000 * 60 * 60))
  
  if (hoursSinceLastReset < 24) {
    console.log(`⏱️ Time since last expected reset: ${hoursSinceLastReset} hours`)
    
    if (hoursSinceLastReset > 21) { // After 12AM (21 hours since 3AM)
      console.log('🚨 RESET SHOULD HAVE HAPPENED!')
      console.log('If you have operational data, reset might not be working.')
    } else {
      console.log('✅ Normal time - reset not due yet.')
    }
  }
  
  // Check if it's currently close to 3AM
  const currentHour = now.getHours()
  if (currentHour >= 2 && currentHour <= 4) {
    console.log('🎯 Currently in reset window (2-4AM)')
    console.log('Watch for reset activity in the next few minutes.')
  }
}

/**
 * Check browser environment for reset blockers
 */
function checkEnvironmentBlockers() {
  console.log('\n🔧 ENVIRONMENT ANALYSIS')
  console.log('-'.repeat(30))
  
  // Check if page is visible (hidden pages don't run intervals)
  const isVisible = !document.hidden
  console.log(`👁️ Page visibility: ${isVisible ? 'Visible' : 'Hidden'}`)
  if (!isVisible) {
    console.log('⚠️ Hidden pages may not trigger automatic resets!')
  }
  
  // Check if browser tab is active
  const hasFocus = document.hasFocus()
  console.log(`🎯 Page focus: ${hasFocus ? 'Focused' : 'Unfocused'}`)
  
  // Check for service workers that might handle background tasks
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log(`🔧 Service workers: ${registrations.length} registered`)
      if (registrations.length > 0) {
        console.log('   Service workers could handle background resets')
      }
    })
  }
  
  // Check notification permissions (might indicate background capability)
  if ('Notification' in window) {
    console.log(`🔔 Notification permission: ${Notification.permission}`)
  }
  
  // Check battery API for power-saving mode
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      console.log(`🔋 Battery charging: ${battery.charging}`)
      console.log(`🔋 Battery level: ${Math.round(battery.level * 100)}%`)
      if (!battery.charging && battery.level < 0.2) {
        console.log('⚠️ Low battery might affect background processes')
      }
    })
  }
}

/**
 * Main analysis function
 */
async function analyzeDataResetSituation() {
  console.log('🔍 ANALYZING DATA RESET SITUATION')
  console.log('=' .repeat(50))
  
  const operationalData = await checkOperationalData()
  checkResetTiming()
  checkEnvironmentBlockers()
  
  console.log('\n📊 ANALYSIS COMPLETE')
  console.log('=' .repeat(50))
  
  // Provide specific recommendations
  if (operationalData && Object.values(operationalData).every(arr => arr.length === 0)) {
    console.log('🎯 LIKELY ISSUE: NO DATA TO RESET')
    console.log('')
    console.log('Your reset system might be working fine, but there\'s no data to reset!')
    console.log('')
    console.log('TO TEST PROPERLY:')
    console.log('1. 🛒 Make a test sale in POS')
    console.log('2. 💸 Add a test expense')
    console.log('3. 📦 Move some inventory')
    console.log('4. 🔄 Then try manual reset')
    console.log('5. ✅ Verify data was archived and collections cleared')
  } else {
    console.log('🎯 DATA EXISTS - RESET SYSTEM SHOULD BE TESTED')
    console.log('')
    console.log('NEXT STEPS:')
    console.log('1. 🧪 Run: runShiftResetDeepDive()')
    console.log('2. 🔄 Try manual reset from Team Management')
    console.log('3. 🔍 Check if data gets archived properly')
    console.log('4. ⚙️ Verify automatic reset at 3AM')
  }
  
  return {
    operationalData,
    hasDataToReset: operationalData && Object.values(operationalData).some(arr => arr.length > 0),
    timestamp: new Date().toISOString()
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.checkOperationalData = checkOperationalData
  window.checkResetTiming = checkResetTiming
  window.checkEnvironmentBlockers = checkEnvironmentBlockers
  window.analyzeDataResetSituation = analyzeDataResetSituation
  
  console.log('🔍 DATA EXISTENCE CHECKER READY!')
  console.log('')
  console.log('Run this command to analyze:')
  console.log('  analyzeDataResetSituation()')
  console.log('')
  console.log('Or check specific aspects:')
  console.log('  checkOperationalData() - See what data exists')
  console.log('  checkResetTiming() - Check if reset should have happened')
  console.log('  checkEnvironmentBlockers() - Check for issues')
}
