// Deep dive analysis to find why branch isolation isn't working
// This script will inspect the actual database state and component behavior

console.log('🔍 DEEP DIVE: Branch Isolation Analysis');
console.log('=====================================');

// Check 1: Inspect current menu items in database
console.log('\n🗄️ DATABASE INSPECTION:');
console.log('Run this in browser console to check database state:');

console.log(`
// DATABASE DIAGNOSTIC SCRIPT
(async function() {
  console.log('🔍 Inspecting menu items database state...');
  
  // Get current user
  const auth = window.auth || firebase.auth();
  const db = window.db || firebase.firestore();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No user logged in');
    return;
  }
  
  const tenantId = user.uid;
  console.log('🏢 Tenant ID:', tenantId);
  
  // Get all menu items (no filtering)
  const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
  const allMenuSnapshot = await menuItemsRef.get();
  
  console.log(\`\\n📋 TOTAL MENU ITEMS: \${allMenuSnapshot.size}\`);
  
  // Group by locationId
  const itemsByLocation = {};
  const itemsWithoutLocation = [];
  
  allMenuSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const locationId = data.locationId || 'NO_LOCATION';
    
    if (!data.locationId) {
      itemsWithoutLocation.push({ id: doc.id, name: data.name, category: data.category });
      return;
    }
    
    if (!itemsByLocation[locationId]) {
      itemsByLocation[locationId] = [];
    }
    itemsByLocation[locationId].push({
      id: doc.id,
      name: data.name,
      category: data.category,
      locationId: data.locationId,
      tenantId: data.tenantId
    });
  });
  
  console.log('\\n📊 ITEMS BY LOCATION:');
  Object.entries(itemsByLocation).forEach(([locationId, items]) => {
    console.log(\`  \${locationId}: \${items.length} items\`);
    items.forEach(item => {
      console.log(\`    - \${item.name} (\${item.category})\`);
    });
  });
  
  if (itemsWithoutLocation.length > 0) {
    console.log(\`\\n❌ ITEMS WITHOUT LOCATION: \${itemsWithoutLocation.length}\`);
    itemsWithoutLocation.forEach(item => {
      console.log(\`  - \${item.name} (\${item.category})\`);
    });
  }
  
  // Check current branch context
  console.log('\\n🏪 BRANCH CONTEXT CHECK:');
  const branchContext = window.branchContext; // If available
  if (branchContext) {
    console.log('  Selected Branch:', branchContext.selectedBranch);
  }
  
  // Check localStorage
  const storedBranchId = localStorage.getItem('selectedBranchId');
  console.log('  localStorage selectedBranchId:', storedBranchId);
  
  // Check if filtering is working
  if (storedBranchId) {
    const expectedLocationId = \`location_\${storedBranchId}\`;
    const branchItems = itemsByLocation[expectedLocationId] || [];
    console.log(\`\\n🎯 FILTERING TEST:\`);
    console.log(\`  Current branch ID: \${storedBranchId}\`);
    console.log(\`  Expected locationId: \${expectedLocationId}\`);
    console.log(\`  Items for this branch: \${branchItems.length}\`);
    
    if (branchItems.length === 0 && Object.keys(itemsByLocation).length > 0) {
      console.log('  🚨 PROBLEM: No items found for current branch, but items exist for other branches!');
      console.log('  This indicates a locationId mismatch or branch isolation failure.');
    }
  }
})();
`);

console.log('\n🔧 COMPONENT INSPECTION:');
console.log('Check these React DevTools components:');
console.log('1. MenuBuilder component state');
console.log('2. BranchContext selectedBranch value');
console.log('3. getMenuItems function calls and parameters');

console.log('\n🚨 POSSIBLE ROOT CAUSES:');
console.log('1. Menu items have wrong locationId values');
console.log('2. BranchContext not providing correct selectedBranch');
console.log('3. getMenuItems not receiving locationId parameter');
console.log('4. Client-side filtering being bypassed');
console.log('5. Multiple menu collections or data sources');

console.log('\n📋 VERIFICATION STEPS:');
console.log('1. Run the database diagnostic script above');
console.log('2. Check browser console for filtering warnings');
console.log('3. Verify selectedBranch context value');
console.log('4. Check if server-side filtering is working');

console.log('\n💡 EXPECTED BEHAVIOR:');
console.log('- Each menu item should have locationId like "location_branchId"');
console.log('- getMenuItems should filter by locationId on server-side');
console.log('- Client-side filtering should be additional safety check');
console.log('- No cross-branch contamination should occur');
