/**
 * Production Demo Account Setup
 * Run this script once to set up the demo account properly in production
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

// Production Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "930028194991",
  appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
};

const app = initializeApp(firebaseConfig, 'demo-setup');
const auth = getAuth(app);
const db = getFirestore(app);

// Demo account credentials
const DEMO_EMAIL = 'demo@coretrack.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_TENANT_ID = 'demo-tenant';

async function setupProductionDemoAccount() {
  try {
    console.log('🚀 Setting up production demo account...');
    
    // Step 1: Create or authenticate demo user
    console.log('1️⃣ Setting up demo user...');
    let user;
    
    try {
      // Try to create user
      const userCredential = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      user = userCredential.user;
      console.log('✅ Demo user created successfully');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign them in
        const userCredential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
        user = userCredential.user;
        console.log('✅ Demo user authenticated successfully');
      } else {
        throw error;
      }
    }

    // Step 2: Create user profile
    console.log('2️⃣ Creating user profile...');
    const userProfileRef = doc(db, 'users', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    
    if (!userProfileSnap.exists()) {
      const userProfile = {
        id: user.uid,
        email: user.email,
        name: 'Demo User',
        tenantId: DEMO_TENANT_ID,
        role: 'owner',
        permissions: ['all'],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      await setDoc(userProfileRef, userProfile);
      console.log('✅ User profile created');
    } else {
      console.log('✅ User profile already exists');
    }

    // Step 3: Create tenant
    console.log('3️⃣ Creating tenant...');
    const tenantRef = doc(db, 'tenants', DEMO_TENANT_ID);
    const tenantSnap = await getDoc(tenantRef);
    
    if (!tenantSnap.exists()) {
      const tenantData = {
        id: DEMO_TENANT_ID,
        name: 'CoreTrack Demo Business',
        createdAt: new Date().toISOString(),
        ownerId: user.uid,
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          taxRate: 8.5
        }
      };
      
      await setDoc(tenantRef, tenantData);
      console.log('✅ Tenant created');
    } else {
      // Update existing tenant to ensure enterprise status
      await setDoc(tenantRef, {
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Tenant updated to enterprise');
    }

    // Step 4: Create enterprise subscription
    console.log('4️⃣ Creating enterprise subscription...');
    const now = Timestamp.now();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 10); // 10 years for demo
    
    const enterpriseSubscription = {
      tenantId: DEMO_TENANT_ID,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: Timestamp.fromDate(endDate),
      trialEndDate: Timestamp.fromDate(endDate),
      currentUsage: {
        users: 1,
        locations: 1,
        products: 0,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };

    const subscriptionRef = doc(db, 'subscriptions', DEMO_TENANT_ID);
    await setDoc(subscriptionRef, enterpriseSubscription);
    console.log('✅ Enterprise subscription created');

    // Step 5: Create main location
    console.log('5️⃣ Creating main location...');
    const locationRef = doc(db, 'locations', 'main-location');
    const locationSnap = await getDoc(locationRef);
    
    if (!locationSnap.exists()) {
      const locationData = {
        id: 'main-location',
        name: 'Main Location',
        type: 'main',
        tenantId: DEMO_TENANT_ID,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        settings: {
          currency: 'USD',
          taxRate: 8.5,
          receiptFooter: 'Thank you for visiting CoreTrack Demo!'
        }
      };
      
      await setDoc(locationRef, locationData);
      console.log('✅ Main location created');
    } else {
      console.log('✅ Main location already exists');
    }

    // Step 6: Create sample menu items
    console.log('6️⃣ Creating sample menu items...');
    const sampleMenuItems = [
      {
        id: 'espresso',
        name: 'Espresso',
        category: 'Coffee',
        price: 2.50,
        cost: 0.75,
        tenantId: DEMO_TENANT_ID,
        locationId: 'main-location',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cappuccino',
        name: 'Cappuccino',
        category: 'Coffee',
        price: 3.50,
        cost: 1.25,
        tenantId: DEMO_TENANT_ID,
        locationId: 'main-location',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'latte',
        name: 'Latte',
        category: 'Coffee',
        price: 4.00,
        cost: 1.50,
        tenantId: DEMO_TENANT_ID,
        locationId: 'main-location',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    for (const item of sampleMenuItems) {
      const menuRef = doc(db, 'menuItems', item.id);
      const menuSnap = await getDoc(menuRef);
      
      if (!menuSnap.exists()) {
        await setDoc(menuRef, item);
      }
    }
    console.log(`✅ ${sampleMenuItems.length} sample menu items created`);

    console.log('\n🎉 Production demo account setup complete!');
    
    return {
      success: true,
      message: 'Demo account configured successfully with enterprise features'
    };

  } catch (error) {
    console.error('❌ Error setting up demo account:', error);
    return {
      success: false,
      message: 'Failed to setup demo account',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupProductionDemoAccount };
}

// Export for ES modules
export { setupProductionDemoAccount };

// Auto-run if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  setupProductionDemoAccount().then(result => {
    if (result.success) {
      console.log('\n✅ SUCCESS:', result.message);
      console.log('\n📋 Demo Account Details:');
      console.log(`Email: ${DEMO_EMAIL}`);
      console.log(`Password: ${DEMO_PASSWORD}`);
      console.log('Tenant: demo-tenant');
      console.log('Plan: Enterprise (Active)');
      console.log('\n🌐 Your production demo account is ready!');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED:', result.message);
      if (result.error) {
        console.log('Error:', result.error);
      }
      process.exit(1);
    }
  });
}
