// Quick test to verify the locationId fix
console.log('🧪 Testing locationId generation fix...\n');

// Simulate the getBranchLocationId function logic
function getBranchLocationId(branchId) {
  if (!branchId || typeof branchId !== 'string') {
    console.warn('Invalid branchId provided to getBranchLocationId:', branchId);
    return 'location_main';
  }
  
  const trimmedBranchId = branchId.trim();
  
  if (trimmedBranchId === '') {
    console.warn('Empty branchId provided, using main branch');
    return 'location_main';
  }
  
  if (trimmedBranchId.toLowerCase() === 'main') {
    return 'location_main';
  }
  
  return `location_${trimmedBranchId}`;
}

// Test with the actual branch ID from console logs
const actualBranchId = '6cwvUakzskIHbTHDYv5E'; // From Firebase document ID
const result = getBranchLocationId(actualBranchId);

console.log('Input branch ID:', actualBranchId);
console.log('Generated locationId:', result);
console.log('Expected from logs:', 'location_6cwvUakzskIHbTHDYv5E');
console.log('Match:', result === 'location_6cwvUakzskIHbTHDYv5E' ? '✅ YES' : '❌ NO');

console.log('\n🔍 Analysis:');
console.log('- The fix preserves original case from Firebase document ID');
console.log('- Previous version converted to lowercase causing mismatch');
console.log('- New version only trims whitespace and adds location_ prefix');
console.log('- Special handling for "main" branch to ensure consistency');
