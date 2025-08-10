console.log('🚀 ENTERPRISE ACCOUNT FIXER - Browser Script');
console.log('==================================================');

// This script runs in the browser console to fix enterprise subscription
async function fixEnterpriseSubscription() {
  try {
    console.log('1️⃣ Importing Firebase...');
    
    // Get Firebase from the app
    const { auth, db } = window._firebaseInstances || {};
    
    if (!auth || !db) {
      console.log('❌ Firebase not initialized. Make sure you\'re on the main app page.');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user signed in. Please sign in first.');
      return;
    }
    
    console.log('✅ User signed in:', user.email);
    
    // Import Firestore functions
    const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    
    // Get tenant ID from user profile
    console.log('2️⃣ Getting user profile...');
    const userProfileRef = doc(db, 'users', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    
    if (!userProfileSnap.exists()) {
      console.log('❌ User profile not found');
      return;
    }
    
    const userProfile = userProfileSnap.data();
    const tenantId = userProfile.tenantId;
    
    if (!tenantId) {
      console.log('❌ No tenant ID in user profile');
      return;
    }
    
    console.log('✅ Tenant ID:', tenantId);
    
    // Create Enterprise subscription
    console.log('3️⃣ Creating Enterprise subscription...');
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
    
    const enterpriseSubscription = {
      tenantId: tenantId,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: endDate,
      trialEndDate: endDate,
      currentUsage: {
        users: 1,
        locations: 1,
        products: 3,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };

    const subscriptionRef = doc(db, 'subscriptions', tenantId);
    await setDoc(subscriptionRef, enterpriseSubscription, { merge: false });
    
    console.log('✅ Enterprise subscription created successfully!');
    
    // Update tenant document
    console.log('4️⃣ Updating tenant document...');
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantUpdate = {
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      updatedAt: now.toISOString()
    };
    
    await setDoc(tenantRef, tenantUpdate, { merge: true });
    console.log('✅ Tenant document updated');
    
    console.log('\n🎉 SUCCESS: Enterprise account configured!');
    console.log('\n📋 What you should now see:');
    console.log('✅ Point of Sale');
    console.log('✅ Inventory Center');
    console.log('✅ Purchase Orders (NEW!)');
    console.log('✅ Menu Builder');
    console.log('✅ Analytics Dashboard');
    console.log('✅ Advanced Analytics (NEW!)');
    console.log('✅ Expense Management');
    console.log('✅ Team Management (NEW!)');
    console.log('✅ Location Management (NEW!)');
    console.log('✅ Business Reports (NEW!)');
    console.log('✅ Settings');
    
    console.log('\n🔄 Please refresh your browser to see all enterprise features.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run the fix
fixEnterpriseSubscription().then(success => {
  if (success) {
    console.log('\n✅ Done! Refresh the page to see your enterprise features.');
  } else {
    console.log('\n❌ Fix failed. Please check the errors above.');
  }
});
