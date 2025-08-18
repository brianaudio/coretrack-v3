/**
 * Create Demo User for Production Firebase Project
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

async function createDemoUser() {
  console.log('🔍 DEMO USER SETUP FOR CORETRACK-INVENTORY');
  console.log('================================================================================');

  try {
    // Read environment variables
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const firebaseConfig = {
      apiKey: envContent.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/)?.[1]?.trim(),
      authDomain: envContent.match(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=(.+)/)?.[1]?.trim(),
      projectId: envContent.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim(),
      storageBucket: envContent.match(/NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=(.+)/)?.[1]?.trim(),
      messagingSenderId: envContent.match(/NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=(.+)/)?.[1]?.trim(),
      appId: envContent.match(/NEXT_PUBLIC_FIREBASE_APP_ID=(.+)/)?.[1]?.trim()
    };

    const demoEmail = envContent.match(/NEXT_PUBLIC_DEMO_EMAIL=(.+)/)?.[1]?.trim();
    const demoPassword = envContent.match(/NEXT_PUBLIC_DEMO_PASSWORD=(.+)/)?.[1]?.trim();

    console.log(`🎯 Target Project: ${firebaseConfig.projectId}`);
    console.log(`👤 Demo Email: ${demoEmail}`);

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Generate a demo tenant ID
    const demoTenantId = 'DEMO_TENANT_' + Date.now();

    try {
      // Try to create the user
      console.log('\n🔐 Creating demo user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      const user = userCredential.user;
      console.log(`✅ User created with UID: ${user.uid}`);

      // Create user document in Firestore
      console.log('\n📄 Creating user document in Firestore...');
      await setDoc(doc(db, 'users', user.uid), {
        email: demoEmail,
        displayName: 'Demo User',
        role: 'owner',
        tenantId: demoTenantId,
        createdAt: new Date(),
        assignedBranches: ['main'],
        permissions: {
          inventory: true,
          pos: true,
          analytics: true,
          team: true,
          settings: true
        }
      });
      console.log('✅ User document created');

      // Create demo tenant
      console.log('\n🏢 Creating demo tenant...');
      await setDoc(doc(db, 'tenants', demoTenantId), {
        name: 'Demo Restaurant',
        plan: 'professional',
        status: 'active',
        ownerId: user.uid,
        createdAt: new Date(),
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          businessType: 'restaurant'
        }
      });
      console.log('✅ Demo tenant created');

      console.log('\n🎉 SUCCESS! Demo user setup complete');
      console.log(`📧 Email: ${demoEmail}`);
      console.log(`🔑 Password: ${demoPassword}`);
      console.log(`👤 User ID: ${user.uid}`);
      console.log(`🏢 Tenant ID: ${demoTenantId}`);

    } catch (createError) {
      if (createError.code === 'auth/email-already-in-use') {
        console.log('⚠️  User already exists, checking existing setup...');
        
        // Sign in to check existing user
        const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
        const user = userCredential.user;
        console.log(`👤 Existing user UID: ${user.uid}`);
        
        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          console.log('✅ User document exists:', userDoc.data());
        } else {
          console.log('❌ User document missing - this might be the issue!');
          console.log('Creating user document...');
          
          await setDoc(doc(db, 'users', user.uid), {
            email: demoEmail,
            displayName: 'Demo User',
            role: 'owner',
            tenantId: demoTenantId,
            createdAt: new Date(),
            assignedBranches: ['main'],
            permissions: {
              inventory: true,
              pos: true,
              analytics: true,
              team: true,
              settings: true
            }
          });
          console.log('✅ User document created');
        }
      } else {
        throw createError;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n================================================================================');
}

createDemoUser();
