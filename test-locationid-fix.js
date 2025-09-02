// Test the locationId fix
const branchUtils = require('./src/lib/utils/branchUtils.ts');

// Test cases based on the actual branch ID from logs
const testCases = [
  { input: '6cwvUakzskIHbTHDYv5E', expected: 'location_6cwvUakzskIHbTHDYv5E' },
  { input: 'main', expected: 'location_main' },
  { input: 'MAIN', expected: 'location_main' },
  { input: ' 6cwvUakzskIHbTHDYv5E ', expected: 'location_6cwvUakzskIHbTHDYv5E' },
];

console.log('🧪 Testing locationId generation fix...\n');

testCases.forEach((testCase, index) => {
  try {
    const result = branchUtils.getBranchLocationId(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Input: "${testCase.input}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Actual: "${result}"`);
    
    if (!passed) {
      console.log(`  ❌ MISMATCH DETECTED!`);
    }
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
    console.log('');
  }
});

console.log('🔍 Based on console logs, the correct locationId should be:');
console.log('  location_6cwvUakzskIHbTHDYv5E (preserving original case)');
console.log('  NOT location_6cwvuakzskihbthdyv5e (lowercase conversion)');
