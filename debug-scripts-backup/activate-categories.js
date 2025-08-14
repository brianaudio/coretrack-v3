// Simple script to activate all categories
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');
const readline = require('readline');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCK3bj5ovHvDMbYs8fUhBdGZKtKBrb-P3E",
  authDomain: "coretrack-v3.firebaseapp.com",
  projectId: "coretrack-v3",
  storageBucket: "coretrack-v3.firebasestorage.app",
  messagingSenderId: "876018555502",
  appId: "1:876018555502:web:1ddd3a8c1ddd3ad8d3b8d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function activateCategories() {
  console.log('🔧 Category Activation Tool');
  
  rl.question('Enter your tenantId: ', async (tenantId) => {
    rl.question('Enter your branchId (e.g., branch_1): ', async (branchId) => {
      try {
        const locationId = `location_${branchId}`;
        console.log(`\n📍 Activating categories for: ${locationId}`);
        
        // Get categories
        const categoriesRef = collection(db, 'menuCategories');
        const q = query(
          categoriesRef,
          where('tenantId', '==', tenantId),
          where('locationId', '==', locationId)
        );
        
        const snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.docs.length} categories`);
        
        let activated = 0;
        for (const docRef of snapshot.docs) {
          const data = docRef.data();
          
          if (!data.isActive) {
            console.log(`✅ Activating: ${data.name}`);
            await updateDoc(doc(db, 'menuCategories', docRef.id), {
              isActive: true,
              updatedAt: new Date()
            });
            activated++;
          } else {
            console.log(`✓ Already active: ${data.name}`);
          }
        }
        
        console.log(`\n🎉 Activated ${activated} categories!`);
        console.log('💡 Now refresh your Menu Builder and try creating a menu item.');
        
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
      
      rl.close();
      process.exit(0);
    });
  });
}

activateCategories();
