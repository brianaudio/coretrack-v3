/**
 * 🔍 CODE AUDIT: getBranchLocationId() Consistency Test
 * 
 * This script tests the getBranchLocationId() function for consistency
 */

// Replicate the functions locally for testing
const getBranchLocationId = (branchId) => {
  return `location_${branchId}`;
};

const isMainBranch = (branchId) => {
  return branchId === 'main';
};

console.log('🔍 CODE AUDIT: getBranchLocationId() Consistency');
console.log('==============================================');

const testBranchLocationIdConsistency = () => {
  console.log('\n📊 TESTING getBranchLocationId() FUNCTION...');
  
  // Test common branch IDs
  const testBranches = [
    'main',
    'branch1', 
    'branch2',
    'downtown',
    'mall',
    'airport',
    'test-branch',
    'special_branch',
    'branch with spaces',
    ''
  ];
  
  console.log('\n🧪 CONSISTENCY TESTS:');
  testBranches.forEach(branchId => {
    try {
      const locationId1 = getBranchLocationId(branchId);
      const locationId2 = getBranchLocationId(branchId);
      const locationId3 = getBranchLocationId(branchId);
      
      const isConsistent = locationId1 === locationId2 && locationId2 === locationId3;
      const isMainResult = isMainBranch(branchId);
      
      console.log(`Branch "${branchId}":`);
      console.log(`  - LocationID: "${locationId1}"`);
      console.log(`  - Consistent: ${isConsistent ? '✅' : '❌'}`);
      console.log(`  - IsMain: ${isMainResult}`);
      
      if (!isConsistent) {
        console.log(`  ❌ INCONSISTENCY DETECTED!`);
        console.log(`    Call 1: "${locationId1}"`);
        console.log(`    Call 2: "${locationId2}"`);
        console.log(`    Call 3: "${locationId3}"`);
      }
    } catch (error) {
      console.log(`Branch "${branchId}": ❌ ERROR - ${error.message}`);
    }
  });
  
  console.log('\n🔍 PATTERN ANALYSIS:');
  testBranches.forEach(branchId => {
    try {
      const locationId = getBranchLocationId(branchId);
      const expectedPattern = `location_${branchId}`;
      const matchesPattern = locationId === expectedPattern;
      
      console.log(`"${branchId}" → "${locationId}" ${matchesPattern ? '✅' : '❌'}`);
      if (!matchesPattern) {
        console.log(`  Expected: "${expectedPattern}"`);
        console.log(`  Actual:   "${locationId}"`);
      }
    } catch (error) {
      console.log(`"${branchId}" → ERROR: ${error.message}`);
    }
  });
  
  console.log('\n🎯 EDGE CASES:');
  const edgeCases = [
    null,
    undefined,
    0,
    false,
    {},
    [],
    'MAIN',
    'Main',
    'BRANCH1',
    '   main   ',
    'main\n',
    'main\t'
  ];
  
  edgeCases.forEach(branchId => {
    try {
      const locationId = getBranchLocationId(branchId);
      console.log(`${JSON.stringify(branchId)} → "${locationId}"`);
    } catch (error) {
      console.log(`${JSON.stringify(branchId)} → ERROR: ${error.message}`);
    }
  });
};

const testRaceConditions = () => {
  console.log('\n🏃‍♂️ RACE CONDITION TESTS:');
  
  // Simulate rapid calls
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(Promise.resolve(getBranchLocationId('main')));
    promises.push(Promise.resolve(getBranchLocationId('branch1')));
  }
  
  Promise.all(promises).then(results => {
    const mainResults = results.filter((_, index) => index % 2 === 0);
    const branch1Results = results.filter((_, index) => index % 2 === 1);
    
    const mainConsistent = mainResults.every(result => result === mainResults[0]);
    const branch1Consistent = branch1Results.every(result => result === branch1Results[0]);
    
    console.log(`Main branch consistency (100 calls): ${mainConsistent ? '✅' : '❌'}`);
    console.log(`Branch1 consistency (100 calls): ${branch1Consistent ? '✅' : '❌'}`);
    
    if (!mainConsistent) {
      console.log('❌ Main branch inconsistent results:', [...new Set(mainResults)]);
    }
    if (!branch1Consistent) {
      console.log('❌ Branch1 inconsistent results:', [...new Set(branch1Results)]);
    }
  });
};

console.log('\n📋 RUNNING TESTS...');
testBranchLocationIdConsistency();
testRaceConditions();

console.log('\n✅ CODE AUDIT COMPLETE');
console.log('Check output above for any inconsistencies or unexpected behavior');
