// Quick script to mark an existing Menu Builder item as an add-on
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDocs, collection, query, where } from "firebase/firestore";

// Firebase configuration
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

async function markItemAsAddon() {
  try {
    const tenantId = "halYcRuDyldZNDp9H1mgtqwDpZh2"; // Your tenant ID from logs
    const locationId = "location_BLbvD7gDm0xGTW5E7dXA"; // Your location ID from logs
    
    // Get your menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const snapshot = await getDocs(menuItemsRef);
    
    console.log('📋 Current Menu Items:');
    const items = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      items.push({ id: doc.id, ...data });
      console.log(`- ${data.name} (${doc.id}) - isAddonOnly: ${data.isAddonOnly}`);
    });
    
    if (items.length > 0) {
      // Mark the first item as an add-on for testing
      const firstItem = items[0];
      const itemRef = doc(db, `tenants/${tenantId}/menuItems`, firstItem.id);
      
      await updateDoc(itemRef, {
        isAddonOnly: true,
        addonType: 'extra',
        isRequired: false,
        maxQuantity: 5
      });
      
      console.log(`✅ Marked "${firstItem.name}" as an add-on!`);
      console.log('🔄 Refresh your POS to see it in the add-ons modal');
    } else {
      console.log('❌ No menu items found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

markItemAsAddon();
