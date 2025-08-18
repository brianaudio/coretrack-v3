/**
 * REAL FIX - Create missing profile document for actual logged-in user
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

async function createProfileForUser() {
  console.log('🔧 CREATING PROFILE FOR LOGGED-IN USER');
  console.log('================================================================================');

  try {
    const app = initializeApp(firebaseConfig, 'profile-fix-app');
    const db = getFirestore(app);

    const userId = 'X49nndOgnnaJsw7VqTdkmM6Wblp1';
    const userEmail = 'cfcsms@gmail.com';
    
    console.log(`👤 Target User: ${userEmail} (${userId})`);

    // Create new tenantId for this user
    const newTenantId = `TENANT_${userId.substring(0, 8)}_${Date.now()}`;
    console.log(`🆕 Creating tenantId: ${newTenantId}`);

    // 1. Create/Update user document with enterprise setup
    console.log('\n1️⃣ Creating/updating user document...');
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email: userEmail,
      tenantId: newTenantId,
      role: 'owner',
      permissions: ['all'],
      plan: 'enterprise',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        notifications: true,
        theme: 'light'
      }
    });
    console.log('✅ User document created');

    // 2. Create profile document (THIS IS THE MISSING PIECE!)
    console.log('\n2️⃣ Creating profile document...');
    await setDoc(doc(db, 'profiles', userId), {
      uid: userId,
      email: userEmail,
      displayName: userEmail.split('@')[0], // Use email prefix as display name
      tenantId: newTenantId,
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
      assignedBranches: [],
      primaryBranch: undefined,
      branchPermissions: {}
    });
    console.log('✅ Profile document created');

    // 3. Create tenant document with FULL ENTERPRISE features
    console.log('\n3️⃣ Creating tenant document...');
    await setDoc(doc(db, 'tenants', newTenantId), {
      id: newTenantId,
      name: `${userEmail.split('@')[0]}'s Restaurant - Enterprise`,
      type: 'restaurant',
      plan: 'enterprise',
      status: 'active',
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        businessHours: {
          open: '09:00',
          close: '22:00',
        },
        businessType: 'restaurant'
      }
    });
    console.log('✅ Tenant document created');

    // 4. Create subscription document with ALL ENTERPRISE FEATURES
    console.log('\n4️⃣ Creating subscription document...');
    await setDoc(doc(db, 'subscriptions', newTenantId), {
      tenantId: newTenantId,
      planId: 'enterprise',
      status: 'active',
      billingCycle: 'monthly',
      pricePerMonth: 99,
      currency: 'USD',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      features: {
        users: true,
        inventory: true,
        pos: true,
        analytics: true,
        team: true,
        expenses: true,
        reports: true,
        api: true,
        customBranding: true,
        prioritySupport: true,
        advancedAnalytics: true,
        multiLocation: true,
        customIntegrations: true,
        purchaseOrders: true,
        menuBuilder: true,
        locationManagement: true,
        businessReports: true
      },
      limits: {
        users: -1,        // unlimited
        locations: -1,    // unlimited
        storage: -1,      // unlimited
        apiCalls: -1      // unlimited
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Subscription document created');

    // 5. Verification
    console.log('\n5️⃣ VERIFICATION:');
    const profileCheck = await getDoc(doc(db, 'profiles', userId));
    const tenantCheck = await getDoc(doc(db, 'tenants', newTenantId));
    const subscriptionCheck = await getDoc(doc(db, 'subscriptions', newTenantId));

    console.log(`Profile exists: ${profileCheck.exists() ? '✅ YES' : '❌ NO'}`);
    console.log(`Tenant exists: ${tenantCheck.exists() ? '✅ YES' : '❌ NO'}`);
    console.log(`Subscription exists: ${subscriptionCheck.exists() ? '✅ YES' : '❌ NO'}`);

    if (profileCheck.exists()) {
      const profileData = profileCheck.data();
      console.log(`Profile tenantId: ${profileData.tenantId}`);
      console.log(`Profile role: ${profileData.role}`);
    }

    console.log('\n🎉 SUCCESS! Complete enterprise setup created for user.');
    console.log('🔄 REFRESH YOUR BROWSER NOW at http://localhost:3002');
    console.log('🔍 Check debug page: http://localhost:3002/system-debug');
    console.log('📊 ALL ENTERPRISE MODULES should now be visible!');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n================================================================================');
  process.exit(0);
}

createProfileForUser();
