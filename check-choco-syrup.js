// Check for your specific Choco Syrup add-on
import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkChocoSyrup() {
  try {
    const tenantId = "halYcRuDyldZNDp9H1mgtqwDpZh2";
    
    console.log('🔍 Checking for Choco Syrup add-on...');
    
    // Check in Menu Builder items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuSnapshot = await getDocs(menuItemsRef);
    
    console.log('\n📋 ALL Menu Builder Items:');
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- "${data.name}" (${doc.id})`);
      console.log(`  └─ Price: ₱${data.price}`);
      console.log(`  └─ Category: ${data.category}`);
      console.log(`  └─ isAddonOnly: ${data.isAddonOnly}`);
      console.log(`  └─ addonType: ${data.addonType}`);
      console.log(`  └─ locationId: ${data.locationId}`);
      console.log('');
    });
    
    // Check if Choco Syrup exists
    const chocoSyrup = [];
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('choco')) {
        chocoSyrup.push({ id: doc.id, ...data });
      }
    });
    
    if (chocoSyrup.length > 0) {
      console.log('🍫 Found Choco Syrup items:');
      chocoSyrup.forEach(item => {
        console.log(`- "${item.name}" - isAddonOnly: ${item.isAddonOnly}, addonType: ${item.addonType}`);
      });
    } else {
      console.log('❌ No Choco Syrup found in Menu Builder');
    }
    
    // Check in simple add-ons collection
    console.log('\n🎯 Checking Simple Add-ons Collection:');
    try {
      const addonsRef = collection(db, `tenants/${tenantId}/addons`);
      const addonsSnapshot = await getDocs(addonsRef);
      
      if (addonsSnapshot.empty) {
        console.log('📭 Simple add-ons collection is empty');
      } else {
        console.log('📦 Simple Add-ons found:');
        addonsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- "${data.name}" - ₱${data.price} (${data.category})`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking simple add-ons:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkChocoSyrup();
