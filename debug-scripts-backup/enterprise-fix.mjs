import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

console.log('🚀 ENTERPRISE TIER ACTIVATION');
console.log('================================================================================');

async function activateEnterprise() {
  const app = initializeApp(firebaseConfig, 'enterprise-fix');
  const db = getFirestore(app);
  
  const TARGET_USER_ID = '69Z6LG5jWISrGNzPOK2w1MsKTOU2';
  const TENANT_ID = 'TENANT_69Z6LG5j_1737649200000';

  console.log(`👤 Target User: ${TARGET_USER_ID}`);
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);

  try {
    // Update user document with FULL ENTERPRISE
    console.log('📝 Updating user document...');
    await updateDoc(doc(db, 'users', TARGET_USER_ID), {
      tenantId: TENANT_ID,
      role: 'owner',
      permissions: ['all'],
      plan: 'enterprise',
      subscription: {
        plan: 'enterprise',
        status: 'active',
        billingCycle: 'monthly',
        pricePerMonth: 99,
        features: {
          users: 'unlimited',
          locations: 'unlimited',
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
          customIntegrations: true
        }
      },
      settings: {
        notifications: true,
        theme: 'light'
      }
    });
    console.log('✅ User document updated successfully');

    // Create/update tenant document
    console.log('🏢 Creating tenant document...');
    await setDoc(doc(db, 'tenants', TENANT_ID), {
      name: 'My Restaurant - Enterprise',
      plan: 'enterprise',
      status: 'active',
      ownerId: TARGET_USER_ID,
      createdAt: new Date(),
      subscription: {
        plan: 'enterprise',
        status: 'active',
        billingCycle: 'monthly',
        pricePerMonth: 99,
        features: {
          users: 'unlimited',
          locations: 'unlimited',
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
          customIntegrations: true
        }
      },
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        businessType: 'restaurant'
      }
    });
    console.log('✅ Tenant document created successfully');

    // Verify the changes
    console.log('🔍 Verifying changes...');
    const userDoc = await getDoc(doc(db, 'users', TARGET_USER_ID));
    const tenantDoc = await getDoc(doc(db, 'tenants', TENANT_ID));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('👤 User plan:', userData.plan);
      console.log('👤 User subscription:', userData.subscription?.plan);
    }
    
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      console.log('🏢 Tenant plan:', tenantData.plan);
      console.log('🏢 Tenant features:', Object.keys(tenantData.subscription?.features || {}));
    }

    console.log('');
    console.log('🎉 ENTERPRISE TIER ACTIVATED SUCCESSFULLY!');
    console.log('🎉 ALL FEATURES SHOULD NOW BE AVAILABLE!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

activateEnterprise();
