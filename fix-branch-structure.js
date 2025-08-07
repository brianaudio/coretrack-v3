const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function fixBranchDataStructure() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔧 FIXING BRANCH DATA STRUCTURE');
    console.log('=' .repeat(60));
    
    // Check current locations and fix missing properties
    const locationsRef = collection(db, 'locations');
    const locationsQuery = query(locationsRef, where('tenantId', '==', TENANT_ID));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    console.log(`Found ${locationsSnapshot.size} locations to fix:`);
    
    for (let i = 0; i < locationsSnapshot.docs.length; i++) {
      const docSnapshot = locationsSnapshot.docs[i];
      const data = docSnapshot.data();
      
      console.log(`\n${i + 1}. Fixing "${data.name}"`);
      console.log(`   Current data:`, data);
      
      // Define the required structure for branch selector
      const fixedData = {
        ...data,
        // Ensure required fields
        name: data.name || `Branch ${i + 1}`,
        tenantId: TENANT_ID,
        status: data.status || 'active',
        manager: data.manager || 'Admin',
        isMain: i === 0, // First branch is main
        icon: data.icon || (i === 0 ? '🏢' : '🏪'),
        
        // Add missing stats structure
        stats: data.stats || {
          totalRevenue: 0,
          totalOrders: 0,
          activeProducts: 0,
          lowStockItems: 0
        },
        
        // Add timestamps if missing
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
        
        // Add address if missing
        address: data.address || 'Address not set',
        phone: data.phone || 'Phone not set',
        email: data.email || 'Email not set'
      };
      
      console.log(`   Fixed data:`, {
        name: fixedData.name,
        status: fixedData.status,
        manager: fixedData.manager,
        isMain: fixedData.isMain,
        icon: fixedData.icon,
        hasStats: !!fixedData.stats
      });
      
      // Update the document
      await setDoc(doc(db, 'locations', docSnapshot.id), fixedData, { merge: true });
      console.log(`   ✅ Updated`);
    }
    
    // Create a test location if none exist
    if (locationsSnapshot.size === 0) {
      console.log('\n🏪 Creating default location...');
      const defaultLocation = {
        name: 'Main Branch',
        tenantId: TENANT_ID,
        status: 'active',
        manager: 'Admin',
        isMain: true,
        icon: '🏢',
        stats: {
          totalRevenue: 0,
          totalOrders: 0,
          activeProducts: 0,
          lowStockItems: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        address: 'Main Office',
        phone: 'Not set',
        email: 'admin@example.com'
      };
      
      const newDocRef = doc(collection(db, 'locations'));
      await setDoc(newDocRef, defaultLocation);
      console.log('✅ Created default location:', newDocRef.id);
    }
    
    console.log('\n🎉 BRANCH DATA STRUCTURE FIXED!');
    console.log('\n🔄 Next steps:');
    console.log('1. Refresh your app');
    console.log('2. Check browser console for branch selector logs');
    console.log('3. Branch selector should now show all locations');
    console.log('4. Try switching between branches');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBranchDataStructure().then(() => process.exit(0));
