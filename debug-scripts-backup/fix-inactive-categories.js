// Fix Inactive Categories Script
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');
const readline = require('readline');

// Initialize Firebase
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

async function fixInactiveCategories() {
  try {
    console.log('🔧 Fixing Inactive Categories');
    
    rl.question('Enter your tenantId: ', async (tenantId) => {
      rl.question('Enter your branchId (e.g., branch_1): ', async (branchId) => {
        try {
          const locationId = `location_${branchId}`;
          console.log(`\n📍 Fixing categories for: ${locationId}`);
          
          // Get all categories for this tenant and location
          const categoriesRef = collection(db, 'menuCategories');
          const q = query(
            categoriesRef,
            where('tenantId', '==', tenantId),
            where('locationId', '==', locationId)
          );
          
          const snapshot = await getDocs(q);
          
          console.log(`📊 Found ${snapshot.docs.length} categories`);
          
          let activatedCount = 0;
          const updatePromises = [];
          
          for (const docRef of snapshot.docs) {
            const data = docRef.data();
            
            console.log(`📋 Category: ${data.name} - Currently: ${data.isActive ? 'ACTIVE' : 'INACTIVE'}`);
            
            if (!data.isActive) {
              console.log(`   ✅ Activating "${data.name}"`);
              updatePromises.push(
                updateDoc(doc(db, 'menuCategories', docRef.id), {
                  isActive: true,
                  updatedAt: new Date()
                })
              );
              activatedCount++;
            }
          }
          
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log(`\n🎉 Successfully activated ${activatedCount} categories!`);
          } else {
            console.log(`\n✅ All categories are already active!`);
          }
          
          console.log('\n💡 Now refresh your Menu Builder page and try creating a menu item again.');
          
        } catch (error) {
          console.error('❌ Error:', error);
        }
        
        rl.close();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

fixInactiveCategories();
