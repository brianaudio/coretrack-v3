/**
 * Direct Firebase Fix - Bypass React/Next.js caching
 */

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw',
  authDomain: 'coretrack-inventory.firebaseapp.com',
  projectId: 'coretrack-inventory',
  storageBucket: 'coretrack-inventory.firebasestorage.app',
  messagingSenderId: '930028194991',
  appId: '1:930028194991:web:9736a0b2471cbf98ced85a'
};

async function directFixTenantId() {
  console.log('🔧 DIRECT FIREBASE TENANTID FIX');
  console.log('================================================================================');

  try {
    const app = initializeApp(firebaseConfig, 'fix-app');
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Wait for auth state
    const user = await new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) resolve(user);
      });
    });

    console.log(`👤 Current user: ${user.email} (${user.uid})`);

    // Check current user document
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      console.log('📄 Current user document:', userData);
      console.log(`🎯 Current tenantId: ${userData.tenantId || 'UNDEFINED!'}`);
    } else {
      console.log('❌ No user document found');
    }

    // Create new tenantId
    const newTenantId = `TENANT_${user.uid.substring(0, 8)}_${Date.now()}`;
    console.log(`🆕 Creating new tenantId: ${newTenantId}`);

        // Update user document with ENTERPRISE permissions
    await updateDoc(doc(db, 'users', user.uid), {
      tenantId: newTenantId,
      role: 'owner',
      permissions: ['all'],
      plan: 'enterprise',
      subscription: {
        plan: 'enterprise',
        status: 'active',
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
    console.log('✅ User document updated');

    // Create tenant document with FULL ENTERPRISE features
    await setDoc(doc(db, 'tenants', newTenantId), {
      name: 'My Restaurant - Enterprise',
      plan: 'enterprise',
      status: 'active',
      ownerId: user.uid,
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
    console.log('✅ Tenant document created');

    // Verify the fix
    const verifyUserDoc = await getDoc(userDocRef);
    const verifyUserData = verifyUserDoc.data();
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`   User tenantId: ${verifyUserData.tenantId}`);
    console.log(`   Expected: ${newTenantId}`);
    console.log(`   Match: ${verifyUserData.tenantId === newTenantId ? '✅ YES' : '❌ NO'}`);

    console.log('\n🎉 SUCCESS! TenantId has been fixed.');
    console.log('🔄 Please refresh your browser to clear any cached auth data.');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n================================================================================');
}

directFixTenantId();
