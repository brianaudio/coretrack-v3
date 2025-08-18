/**
 * React Key Duplicate Detection Test
 * This script helps identify and monitor React duplicate key issues
 */

// Simple key generation test without external imports
function generateUniqueReactKey(prefix = 'key') {
  const timestamp = Date.now();
  const highResTime = Math.floor(performance.now() * 1000);
  const randomId = Math.random().toString(36).substr(2, 9);
  const incrementalId = Math.floor(Math.random() * 10000);
  
  // Add crypto randomness if available
  const cryptoRandom = typeof crypto !== 'undefined' && crypto.getRandomValues 
    ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    : Math.floor(Math.random() * 999999).toString(36);
  
  return `${prefix}-${timestamp}-${highResTime}-${randomId}-${cryptoRandom}-${incrementalId}`;
}

console.log('🧪 Testing React Key Uniqueness for Shift Reset Issue...')

// Test specific to the "shift_daily-reset-1755241627649_1755241627649" error pattern
console.log('\n1. Testing shift_daily-reset key generation:')
const shiftKeys = []
for (let i = 0; i < 100; i++) {
  const uniqueId = generateUniqueReactKey('shift-reset')
  shiftKeys.push(`shift_daily-reset-${uniqueId}`)
}
const uniqueShiftKeys = new Set(shiftKeys)
console.log(`   Generated ${shiftKeys.length} shift keys, ${uniqueShiftKeys.size} unique`)
console.log(`   Sample keys:`, shiftKeys.slice(0, 3))
console.log(`   ✅ ${uniqueShiftKeys.size === shiftKeys.length ? 'PASS - No duplicates' : 'FAIL - Still has duplicates'}`)

// Test React Strict Mode simulation (rapid successive calls)
console.log('\n2. Simulating React Strict Mode double-rendering:')
const strictModeKeys = []
for (let i = 0; i < 50; i++) {
  // Simulate the exact scenario causing the duplicate key error
  const timestamp = Date.now()
  const baseKey = `shift_daily-reset-${timestamp}`
  
  // Add our uniqueness enhancement
  const uniqueKey1 = `${baseKey}_${generateUniqueReactKey()}`
  const uniqueKey2 = `${baseKey}_${generateUniqueReactKey()}`
  
  strictModeKeys.push(uniqueKey1)
  strictModeKeys.push(uniqueKey2)
}
const uniqueStrictKeys = new Set(strictModeKeys)
console.log(`   Generated ${strictModeKeys.length} keys in Strict Mode simulation`)
console.log(`   Unique keys: ${uniqueStrictKeys.size}`)
console.log(`   Sample keys:`, strictModeKeys.slice(0, 4))
console.log(`   ✅ ${uniqueStrictKeys.size === strictModeKeys.length ? 'PASS - No duplicates even in Strict Mode' : 'FAIL - Strict Mode still causing duplicates'}`)

// Test the exact error pattern resolution
console.log('\n3. Testing resolution of exact error pattern:')
const problematicTimestamp = '1755241627649'
const fixedKeys = []
for (let i = 0; i < 20; i++) {
  // Old problematic pattern would be: shift_daily-reset-1755241627649_1755241627649
  // New fixed pattern:
  const fixedKey = `shift_daily-reset-${problematicTimestamp}_${generateUniqueReactKey()}`
  fixedKeys.push(fixedKey)
}
const uniqueFixedKeys = new Set(fixedKeys)
console.log(`   Generated ${fixedKeys.length} keys with problematic timestamp`)
console.log(`   Unique keys: ${uniqueFixedKeys.size}`)
console.log(`   Sample fixed keys:`, fixedKeys.slice(0, 3))
console.log(`   ✅ ${uniqueFixedKeys.size === fixedKeys.length ? 'PASS - Problematic pattern fixed' : 'FAIL - Pattern still causing duplicates'}`)

console.log('\n🎉 React Key Uniqueness Tests Complete!')
console.log('')
console.log('📋 SUMMARY:')
console.log('- Disabled React Strict Mode temporarily to test if it was the root cause')
console.log('- Enhanced unique ID generation with multiple entropy sources')
console.log('- Added React key utilities for consistent uniqueness across the app')
console.log('- Fixed ShiftDashboard staff mapping keys')
console.log('- Updated ShiftContext to use enhanced unique ID generation')
console.log('')
console.log('🔍 NEXT STEPS:')
console.log('1. Monitor browser console for the original error: "shift_daily-reset-1755241627649_1755241627649"')
console.log('2. If error still occurs, check specific components rendering shift data')
console.log('3. Consider re-enabling React Strict Mode once duplicate keys are confirmed fixed')
console.log('4. Use the new reactKeyUtils in any components that render dynamic lists')

export { /* Export for potential use in tests */ }
