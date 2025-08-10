const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

// Use production Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw",
  authDomain: "coretrack-inventory.firebaseapp.com",
  projectId: "coretrack-inventory",
  storageBucket: "coretrack-inventory.firebasestorage.app",
  messagingSenderId: "930028194991",
  appId: "1:930028194991:web:9736a0b2471cbf98ced85a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Demo account credentials
const DEMO_EMAIL = 'demo@coretrack.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_TENANT_ID = 'demo-tenant';

async function setupProductionData() {
  console.log('🚀 Setting up production data for CoreTrack...');
  
  try {
    // Step 1: Create or sign in demo user
    console.log('\n1️⃣ Setting up demo user...');
    let user;
    try {
      // Try to create the user first
      const userCredential = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      user = userCredential.user;
      console.log('✅ Demo user created successfully');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign them in
        const userCredential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
        user = userCredential.user;
        console.log('✅ Demo user signed in successfully');
      } else {
        throw error;
      }
    }

    // Step 2: Create tenant
    console.log('\n2️⃣ Creating demo tenant...');
    const tenantData = {
      id: DEMO_TENANT_ID,
      name: 'CoreTrack Demo',
      createdAt: new Date().toISOString(),
      ownerId: user.uid,
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        taxRate: 8.5
      }
    };
    
    await setDoc(doc(db, 'tenants', DEMO_TENANT_ID), tenantData);
    console.log('✅ Demo tenant created');

    // Step 3: Create user profile
    console.log('\n3️⃣ Creating user profile...');
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
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    console.log('✅ User profile created');

    // Step 4: Create main location
    console.log('\n4️⃣ Creating main location...');
    const mainLocationId = 'main-location';
    const locationData = {
      id: mainLocationId,
      name: 'Main Location',
      type: 'main',
      tenantId: DEMO_TENANT_ID,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      settings: {
        currency: 'USD',
        taxRate: 8.5,
        receiptFooter: 'Thank you for your business!'
      }
    };
    
    await setDoc(doc(db, 'locations', mainLocationId), locationData);
    console.log('✅ Main location created');

    // Step 5: Create sample menu items using batch
    console.log('\n5️⃣ Creating sample menu items...');
    const batch = writeBatch(db);
    
    const menuItems = [
      {
        id: 'espresso',
        name: 'Espresso',
        category: 'Coffee',
        price: 2.50,
        cost: 0.75,
        tenantId: DEMO_TENANT_ID,
        locationId: mainLocationId,
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
        locationId: mainLocationId,
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
        locationId: mainLocationId,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    menuItems.forEach(item => {
      const menuRef = doc(db, 'menuItems', item.id);
      batch.set(menuRef, item);
    });

    await batch.commit();
    console.log(`✅ ${menuItems.length} menu items created`);

    // Step 6: Create sample inventory
    console.log('\n6️⃣ Creating sample inventory...');
    const inventoryBatch = writeBatch(db);
    
    const inventoryItems = [
      {
        id: 'coffee-beans',
        name: 'Coffee Beans',
        category: 'Raw Materials',
        unit: 'lb',
        currentStock: 50,
        minStock: 10,
        maxStock: 100,
        costPerUnit: 8.00,
        tenantId: DEMO_TENANT_ID,
        locationId: mainLocationId,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'milk',
        name: 'Whole Milk',
        category: 'Dairy',
        unit: 'gallon',
        currentStock: 20,
        minStock: 5,
        maxStock: 30,
        costPerUnit: 3.50,
        tenantId: DEMO_TENANT_ID,
        locationId: mainLocationId,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'cups-12oz',
        name: '12oz Paper Cups',
        category: 'Supplies',
        unit: 'unit',
        currentStock: 500,
        minStock: 100,
        maxStock: 1000,
        costPerUnit: 0.15,
        tenantId: DEMO_TENANT_ID,
        locationId: mainLocationId,
        lastUpdated: new Date().toISOString()
      }
    ];

    inventoryItems.forEach(item => {
      const inventoryRef = doc(db, 'inventory', item.id);
      inventoryBatch.set(inventoryRef, item);
    });

    await inventoryBatch.commit();
    console.log(`✅ ${inventoryItems.length} inventory items created`);

    console.log('\n🎉 SUCCESS: Production data setup complete!');
    console.log('\n📋 Demo Account Details:');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    console.log(`Tenant: ${DEMO_TENANT_ID}`);
    console.log('\n🌐 Your app is now ready to use with production data!');

  } catch (error) {
    console.error('❌ Error setting up production data:', error);
  }
}

setupProductionData().then(() => {
  process.exit(0);
});
