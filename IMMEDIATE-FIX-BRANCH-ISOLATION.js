// IMMEDIATE FIX - Run this in browser console RIGHT NOW
// This will identify and fix the branch isolation issue immediately

console.log('🚨 IMMEDIATE BRANCH ISOLATION FIX');
console.log('=================================');

(async function() {
  try {
    // Get Firebase instances
    const auth = window.firebase?.auth() || window.auth;
    const db = window.firebase?.firestore() || window.db;
    const user = auth?.currentUser;
    
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    const tenantId = user.uid;
    console.log('🏢 Tenant ID:', tenantId);
    
    // Get current branch from localStorage
    const currentBranchId = localStorage.getItem('selectedBranchId');
    console.log('🏪 Current Branch ID:', currentBranchId);
    
    if (!currentBranchId) {
      console.error('❌ No branch selected in localStorage');
      return;
    }
    
    // Expected locationId for current branch
    const expectedLocationId = `location_${currentBranchId}`;
    console.log('📍 Expected LocationId:', expectedLocationId);
    
    // Get ALL menu items
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const allMenuSnapshot = await menuItemsRef.get();
    
    console.log(`📋 Total menu items found: ${allMenuSnapshot.size}`);
    
    // Analyze and fix each item
    let itemsToFix = [];
    let correctItems = [];
    let itemsWithoutLocation = [];
    
    allMenuSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      
      if (!data.locationId) {
        itemsWithoutLocation.push({ id: docId, name: data.name, data });
      } else if (data.locationId !== expectedLocationId) {
        itemsToFix.push({ id: docId, name: data.name, currentLocationId: data.locationId, data });
      } else {
        correctItems.push({ id: docId, name: data.name, locationId: data.locationId });
      }
    });
    
    console.log(`✅ Correct items (already have ${expectedLocationId}): ${correctItems.length}`);
    correctItems.forEach(item => console.log(`  - ${item.name}`));
    
    console.log(`🔧 Items to fix (wrong locationId): ${itemsToFix.length}`);
    itemsToFix.forEach(item => console.log(`  - ${item.name} (current: ${item.currentLocationId})`));
    
    console.log(`❌ Items without locationId: ${itemsWithoutLocation.length}`);
    itemsWithoutLocation.forEach(item => console.log(`  - ${item.name}`));
    
    // IMMEDIATE FIX: Update all items to have correct locationId
    if (itemsToFix.length > 0 || itemsWithoutLocation.length > 0) {
      console.log('\n🔨 APPLYING IMMEDIATE FIX...');
      
      const batch = db.batch();
      let updateCount = 0;
      
      // Fix items with wrong locationId
      itemsToFix.forEach(item => {
        const docRef = menuItemsRef.doc(item.id);
        batch.update(docRef, { 
          locationId: expectedLocationId,
          tenantId: tenantId // Ensure tenantId is also set
        });
        updateCount++;
        console.log(`🔧 Fixing ${item.name}: ${item.currentLocationId} → ${expectedLocationId}`);
      });
      
      // Fix items without locationId
      itemsWithoutLocation.forEach(item => {
        const docRef = menuItemsRef.doc(item.id);
        batch.update(docRef, { 
          locationId: expectedLocationId,
          tenantId: tenantId // Ensure tenantId is also set
        });
        updateCount++;
        console.log(`🔧 Adding locationId to ${item.name}: → ${expectedLocationId}`);
      });
      
      // Execute batch update
      await batch.commit();
      console.log(`✅ FIXED ${updateCount} menu items!`);
      
      // Force refresh the menu
      console.log('🔄 Refreshing menu...');
      if (window.location.pathname.includes('menu-builder')) {
        window.location.reload();
      } else {
        console.log('Navigate to Menu Builder to see the fix');
      }
      
    } else {
      console.log('✅ All menu items already have correct locationId');
      
      // Check if there are items from other branches showing up
      const otherBranchItems = allMenuSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.locationId && data.locationId !== expectedLocationId;
      });
      
      if (otherBranchItems.length > 0) {
        console.log(`🚨 FOUND ${otherBranchItems.length} ITEMS FROM OTHER BRANCHES:`);
        otherBranchItems.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${data.name} (locationId: ${data.locationId})`);
        });
        console.log('These should NOT be visible in your current branch!');
        console.log('This indicates a client-side filtering problem.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
})();

console.log('\n📋 COPY AND PASTE THE ABOVE INTO YOUR BROWSER CONSOLE NOW!');
