const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBGz3NRfPRu2OK8XtZdnF6_WR2vMTkXKOw",
  authDomain: "coretrack-71c1e.firebaseapp.com",
  projectId: "coretrack-71c1e",
  storageBucket: "coretrack-71c1e.firebasestorage.app",
  messagingSenderId: "1025806543509",
  appId: "1:1025806543509:web:b4b6e8d7b2b46c8c3e5d6f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugAddons() {
  try {
    console.log('🔍 Debug: Checking add-ons in database...');
    
    // Get all add-ons for the active tenant and location
    const addonsRef = collection(db, 'addons');
    const q = query(
      addonsRef,
      where('tenantId', '==', 'halYcRuDyldZNDp9H1mgtqwDpZh2'),
      where('locationId', '==', 'location_BLbvD7gDm0xGTW5E7dXA')
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.docs.length} add-ons:`);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('\n--- Add-on ---');
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('Price:', data.price);
      console.log('Cost:', data.cost);
      console.log('Status:', data.status);
      console.log('Has ingredients:', !!data.ingredients);
      console.log('Ingredients count:', data.ingredients?.length || 0);
      console.log('Legacy inventory ID:', data.inventoryItemId);
      console.log('Legacy inventory name:', data.inventoryItemName);
      console.log('Created at:', data.createdAt?.toDate?.());
      
      if (data.ingredients) {
        console.log('Ingredients:');
        data.ingredients.forEach((ing, i) => {
          console.log(`  ${i + 1}. ${ing.inventoryItemName} (${ing.quantity} ${ing.unit}) - ₱${ing.costPerUnit}`);
        });
      }
    });
    
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugAddons();
