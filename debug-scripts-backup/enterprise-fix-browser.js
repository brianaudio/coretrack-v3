// ENTERPRISE ACCOUNT FIXER - Run this in browser console
console.log('🚀 ENTERPRISE ACCOUNT FIXER - Browser Console Version');
console.log('====================================================');

async function fixEnterpriseAccountInBrowser() {
  try {
    console.log('1️⃣ Getting Firebase modules from the app...');
    
    // Try to get Firebase from the global scope or import it
    let auth, db;
    
    // Method 1: Try to get from window (if already initialized)
    if (window.firebase) {
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      console.log('✅ Using window.firebase');
    } else {
      // Method 2: Import from the app's modules
      try {
        const firebaseModule = await import('/src/lib/firebase.js');
        auth = firebaseModule.auth;
        db = firebaseModule.db;
        console.log('✅ Imported from app modules');
      } catch (error) {
        console.log('⚠️  Trying alternative import method...');
        
        // Method 3: Direct Firebase import
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
        const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
        
        // Use the same config as your app
        const firebaseConfig = {
          apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
          authDomain: "coretrack-inventory.firebaseapp.com",
          projectId: "coretrack-inventory",
          storageBucket: "coretrack-inventory.firebasestorage.app",
          messagingSenderId: "930028194991",
          appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
        };
        
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        console.log('✅ Initialized fresh Firebase connection');
      }
    }
    
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No user signed in. Please sign in first with: demo@coretrack.com / demo123456');
      return false;
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Import Firestore functions if not already available
    let docFunc, setDocFunc, getDocFunc;
    
    if (window.firebase) {
      docFunc = db.doc.bind(db);
      setDocFunc = (ref, data) => ref.set(data);
      getDocFunc = (ref) => ref.get();
    } else {
      const firestoreFunctions = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
      docFunc = firestoreFunctions.doc;
      setDocFunc = firestoreFunctions.setDoc;
      getDocFunc = firestoreFunctions.getDoc;
    }
    
    console.log('2️⃣ Getting user profile and tenant ID...');
    
    // Get user profile
    const userProfileRef = window.firebase ? 
      db.collection('users').doc(user.uid) : 
      docFunc(db, 'users', user.uid);
    
    const userProfileSnap = window.firebase ? 
      await userProfileRef.get() : 
      await getDocFunc(userProfileRef);
    
    if (!userProfileSnap.exists) {
      console.log('❌ User profile not found. Creating one...');
      
      // Create user profile
      const userProfile = {
        id: user.uid,
        email: user.email,
        name: 'Demo User',
        tenantId: 'demo-tenant',
        role: 'owner',
        permissions: ['all'],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      if (window.firebase) {
        await userProfileRef.set(userProfile);
      } else {
        await setDocFunc(userProfileRef, userProfile);
      }
      
      console.log('✅ User profile created');
    }
    
    // Get tenant ID
    const userProfile = window.firebase ? userProfileSnap.data() : userProfileSnap.data();
    const tenantId = userProfile.tenantId;
    
    if (!tenantId) {
      console.log('❌ No tenant ID found in user profile');
      return false;
    }
    
    console.log('✅ Tenant ID:', tenantId);
    
    console.log('3️⃣ Creating Enterprise subscription...');
    
    // Create enterprise subscription
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
    
    const subscriptionRef = window.firebase ? 
      db.collection('subscriptions').doc(tenantId) : 
      docFunc(db, 'subscriptions', tenantId);
    
    if (window.firebase) {
      await subscriptionRef.set(enterpriseSubscription);
    } else {
      await setDocFunc(subscriptionRef, enterpriseSubscription);
    }
    
    console.log('✅ Enterprise subscription created successfully!');
    
    console.log('4️⃣ Updating tenant document...');
    
    // Update/create tenant document
    const tenantRef = window.firebase ? 
      db.collection('tenants').doc(tenantId) : 
      docFunc(db, 'tenants', tenantId);
    
    const tenantData = {
      id: tenantId,
      name: 'CoreTrack Demo',
      createdAt: new Date().toISOString(),
      ownerId: user.uid,
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        taxRate: 8.5
      },
      updatedAt: new Date().toISOString()
    };
    
    if (window.firebase) {
      await tenantRef.set(tenantData, { merge: true });
    } else {
      await setDocFunc(tenantRef, tenantData, { merge: true });
    }
    
    console.log('✅ Tenant document updated');
    
    console.log('\n🎉 SUCCESS! Enterprise account is now fully configured!');
    console.log('\n📋 Your Enterprise Features (refresh page to see):');
    console.log('✅ Point of Sale');
    console.log('✅ Inventory Center');
    console.log('✅ Purchase Orders (Enterprise Feature)');
    console.log('✅ Menu Builder');
    console.log('✅ Analytics Dashboard');
    console.log('✅ Advanced Analytics (Enterprise Feature)');
    console.log('✅ Expense Management');
    console.log('✅ Team Management (Enterprise Feature)');
    console.log('✅ Location Management (Enterprise Feature)');
    console.log('✅ Business Reports (Enterprise Feature)');
    console.log('✅ Settings');
    
    console.log('\n🔄 IMPORTANT: Please refresh your browser page (F5 or Ctrl+R) to see all enterprise features!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing enterprise account:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure you are signed in to the app');
    console.log('2. Try refreshing the page and running this script again');
    console.log('3. Check that you are on the main app page (not a 404 page)');
    return false;
  }
}

// Auto-run the fix
console.log('🔧 Starting enterprise account fix...');
fixEnterpriseAccountInBrowser().then(success => {
  if (success) {
    console.log('\n✅ COMPLETED! Refresh your browser to see all enterprise features.');
    console.log('🎯 You should now see 11 features instead of just 4!');
  } else {
    console.log('\n❌ Fix failed. Please check the errors above and try again.');
  }
}).catch(error => {
  console.error('❌ Script failed:', error);
  console.log('💡 Please make sure you are on the main app page and signed in.');
});
