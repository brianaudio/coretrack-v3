// SIMPLE BRANCH FIX - Run this in browser console after logging in
console.log('🔒 Simple Branch Fix Script');
console.log('==========================');

// Wait for user to be authenticated
function waitForAuth() {
  return new Promise((resolve) => {
    const checkAuth = () => {
      const auth = firebase?.auth?.() || window.firebase?.auth?.();
      if (auth?.currentUser) {
        resolve(auth.currentUser);
      } else {
        console.log('⏳ Waiting for authentication...');
        setTimeout(checkAuth, 1000);
      }
    };
    checkAuth();
  });
}

// Main fix function
async function fixBranches() {
  try {
    console.log('🔍 Checking authentication...');
    const user = await waitForAuth();
    console.log('✅ User authenticated:', user.email);
    
    const db = firebase.firestore();
    const tenantId = user.uid;
    
    // Get selected branch
    const currentBranchId = localStorage.getItem('selectedBranchId');
    if (!currentBranchId) {
      console.error('❌ No branch selected. Please select a branch first.');
      return;
    }
    
    const expectedLocationId = `location_${currentBranchId}`;
    console.log('📍 Fixing items for branch:', expectedLocationId);
    
    // Get all menu items
    const menuItemsRef = db.collection('tenants').doc(tenantId).collection('menuItems');
    const snapshot = await menuItemsRef.get();
    
    console.log(`📋 Found ${snapshot.size} total menu items`);
    
    // Find items to fix
    const batch = db.batch();
    let fixedCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const needsFix = !data.locationId || data.locationId !== expectedLocationId;
      
      if (needsFix) {
        batch.update(doc.ref, {
          locationId: expectedLocationId,
          tenantId: tenantId,
          updatedAt: new Date()
        });
        console.log(`🔧 Fixing: "${data.name}" → ${expectedLocationId}`);
        fixedCount++;
      }
    });
    
    // Apply fixes
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`✅ FIXED ${fixedCount} menu items!`);
      console.log('🔄 Reloading page in 2 seconds...');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      console.log('✅ All menu items already have correct locationId');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('auth')) {
      console.log('👉 Please make sure you are logged in to the app first');
    }
  }
}

// Run the fix
fixBranches();

console.log('📋 Copy this entire script and paste it in your browser console');
console.log('🔑 Make sure you are logged in to the app first!');
