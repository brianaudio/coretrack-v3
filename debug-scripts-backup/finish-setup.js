const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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

async function finishSetup() {
  console.log('🚀 Finishing production data setup...');
  
  try {
    // Sign in the demo user
    const userCredential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    const user = userCredential.user;
    console.log('✅ Demo user signed in');

    const mainLocationId = 'main-location';

    // Create inventory items one by one
    console.log('\n📦 Creating sample inventory...');
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

    for (const item of inventoryItems) {
      try {
        await setDoc(doc(db, 'inventory', item.id), item);
        console.log(`✅ Created inventory item: ${item.name}`);
      } catch (error) {
        console.log(`❌ Failed to create ${item.name}:`, error.message);
      }
    }

    console.log('\n🎉 SUCCESS: Production data setup complete!');
    console.log('\n📋 Demo Account Details:');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    console.log(`Tenant: ${DEMO_TENANT_ID}`);

  } catch (error) {
    console.error('❌ Error finishing setup:', error);
  }
}

finishSetup().then(() => {
  process.exit(0);
});
