// Comprehensive branch isolation diagnostic and fix
const fs = require('fs');

console.log('🔍 COMPREHENSIVE BRANCH ISOLATION DIAGNOSTIC');
console.log('============================================');

// Check the current implementation files for potential issues
console.log('\n📂 IMPLEMENTATION FILES CHECK:');

const filesToCheck = [
  'src/lib/firebase/menuBuilder.ts',
  'src/lib/firebase/branchDataIsolation.ts', 
  'src/components/modules/MenuBuilder.tsx',
  'src/components/modules/POS_Enhanced.tsx',
  'src/lib/context/BranchContext.tsx'
];

console.log('Files that should be using branch isolation:');
filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    console.log(`✅ ${file} exists`);
    
    // Check for key patterns
    const hasLocationIdFilter = content.includes('locationId') && content.includes('where');
    const hasGetMenuItems = content.includes('getMenuItems');
    const hasBranchIsolation = content.includes('getBranchMenuItems') || content.includes('branchDataIsolation');
    
    console.log(`  - Has locationId filtering: ${hasLocationIdFilter ? '✅' : '❌'}`);
    console.log(`  - Uses getMenuItems: ${hasGetMenuItems ? '✅' : '❌'}`);  
    console.log(`  - Has branch isolation: ${hasBranchIsolation ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`❌ ${file} not found`);
  }
});

console.log('\n🔧 BROWSER DIAGNOSTIC SCRIPT:');
console.log('Copy and paste this script into your browser console while on the app:');

console.log(`
// COMPREHENSIVE BROWSER DIAGNOSTIC
(async function() {
  console.log('🔍 Starting comprehensive branch isolation diagnostic...');
  
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No user logged in');
    return;
  }
  
  const tenantId = user.uid;
  console.log('🏢 Tenant ID:', tenantId);
  
  // 1. CHECK BRANCH CONTEXT
  console.log('\\n1️⃣ BRANCH CONTEXT CHECK:');
  const branchContext = window.React && window.React.useContext ? 'Available' : 'Not Available';
  console.log('React Context Available:', branchContext);
  
  // Check localStorage
  const storedBranchId = localStorage.getItem('selectedBranchId');
  console.log('localStorage selectedBranchId:', storedBranchId || 'NONE');
  
  // Check sessionStorage  
  const sessionBranchId = sessionStorage.getItem('selectedBranchId');
  console.log('sessionStorage selectedBranchId:', sessionBranchId || 'NONE');
  
  // 2. CHECK DATABASE STATE
  console.log('\\n2️⃣ DATABASE STATE CHECK:');
  
  // Get all menu items
  const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
  const allMenuSnapshot = await menuItemsRef.get();
  console.log(\`Total menu items: \${allMenuSnapshot.size}\`);
  
  // Analyze locationIds
  const locationIdCounts = {};
  const itemsWithoutLocation = [];
  const allItems = [];
  
  allMenuSnapshot.docs.forEach(doc => {
    const data = doc.data();
    allItems.push({
      id: doc.id,
      name: data.name,
      category: data.category,
      locationId: data.locationId,
      tenantId: data.tenantId
    });
    
    const locationId = data.locationId || 'NO_LOCATION';
    locationIdCounts[locationId] = (locationIdCounts[locationId] || 0) + 1;
    
    if (!data.locationId) {
      itemsWithoutLocation.push(data.name);
    }
  });
  
  console.log('LocationId distribution:');
  Object.entries(locationIdCounts).forEach(([locationId, count]) => {
    console.log(\`  \${locationId}: \${count} items\`);
  });
  
  if (itemsWithoutLocation.length > 0) {
    console.log(\`\\n❌ Items without locationId: \${itemsWithoutLocation.length}\`);
    console.log('Items:', itemsWithoutLocation);
  }
  
  // 3. CHECK BRANCHES COLLECTION
  console.log('\\n3️⃣ BRANCHES COLLECTION CHECK:');
  const branchesRef = db.collection('locations').where('tenantId', '==', tenantId);
  const branchesSnapshot = await branchesRef.get();
  console.log(\`Found \${branchesSnapshot.size} branches\`);
  
  const validBranches = [];
  branchesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const branch = {
      id: doc.id,
      name: data.name,
      locationId: \`location_\${doc.id}\`
    };
    validBranches.push(branch);
    console.log(\`  Branch: \${data.name} (ID: \${doc.id}) → Expected locationId: \${branch.locationId}\`);
  });
  
  // 4. IDENTIFY ISSUES
  console.log('\\n4️⃣ ISSUE IDENTIFICATION:');
  
  const validLocationIds = validBranches.map(b => b.locationId);
  const invalidLocationIds = Object.keys(locationIdCounts).filter(id => 
    !validLocationIds.includes(id) && id !== 'NO_LOCATION'
  );
  
  if (invalidLocationIds.length > 0) {
    console.log('🚨 INVALID LOCATION IDs FOUND:');
    invalidLocationIds.forEach(id => {
      console.log(\`  ❌ \${id} (\${locationIdCounts[id]} items) - Not matching any branch\`);
    });
  }
  
  // 5. FILTERING TEST
  console.log('\\n5️⃣ FILTERING SIMULATION:');
  
  const currentBranchId = storedBranchId || (validBranches.length > 0 ? validBranches[0].id : null);
  if (currentBranchId) {
    const expectedLocationId = \`location_\${currentBranchId}\`;
    const filteredItems = allItems.filter(item => 
      item.tenantId === tenantId && item.locationId === expectedLocationId
    );
    
    console.log(\`Current branch ID: \${currentBranchId}\`);
    console.log(\`Expected locationId: \${expectedLocationId}\`);
    console.log(\`Items that should show: \${filteredItems.length}\`);
    console.log(\`Total items in database: \${allItems.length}\`);
    
    if (filteredItems.length === 0 && allItems.length > 0) {
      console.log('🚨 CRITICAL ISSUE: No items would show for current branch!');
      console.log('This explains why you see all menus on all branches.');
    }
    
    // Show what would be filtered
    if (filteredItems.length > 0) {
      console.log('Items that SHOULD show:');
      filteredItems.forEach(item => {
        console.log(\`  ✅ \${item.name} (\${item.category})\`);
      });
    }
    
    const otherItems = allItems.filter(item => item.locationId !== expectedLocationId);
    if (otherItems.length > 0) {
      console.log(\`\\nItems that should NOT show: \${otherItems.length}\`);
      otherItems.slice(0, 5).forEach(item => {
        console.log(\`  ❌ \${item.name} - locationId: \${item.locationId}\`);
      });
      if (otherItems.length > 5) {
        console.log(\`  ... and \${otherItems.length - 5} more\`);
      }
    }
  }
  
  // 6. RECOMMENDATIONS
  console.log('\\n6️⃣ RECOMMENDATIONS:');
  
  if (itemsWithoutLocation.length > 0) {
    console.log('1. Fix items without locationId');
  }
  
  if (invalidLocationIds.length > 0) {
    console.log('2. Fix items with invalid locationIds');
  }
  
  if (validBranches.length === 0) {
    console.log('3. Create proper branches in locations collection');
  }
  
  const currentBranchLocationId = storedBranchId ? \`location_\${storedBranchId}\` : null;
  const itemsForCurrentBranch = currentBranchLocationId ? locationIdCounts[currentBranchLocationId] || 0 : 0;
  
  if (itemsForCurrentBranch === 0 && Object.keys(locationIdCounts).length > 1) {
    console.log('4. Redistribute items to current branch or fix branch selection');
  }
  
  console.log('\\n✅ Diagnostic complete!');
})();
`);

console.log('\n🔧 POTENTIAL FIXES:');
console.log('Based on the diagnostic results, you may need:');
console.log('1. Fix locationId assignments on existing menu items');
console.log('2. Ensure proper branch creation in locations collection'); 
console.log('3. Fix branch selection context');
console.log('4. Verify server-side filtering is actually working');

console.log('\n📋 NEXT STEPS:');
console.log('1. Run the browser diagnostic script');
console.log('2. Identify which specific issue is causing the problem');
console.log('3. Apply the appropriate fix based on the results');
