// Fix Coke Float 16 oz - remove it from being an add-on
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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

async function fixCokeFloat() {
  try {
    const tenantId = "halYcRuDyldZNDp9H1mgtqwDpZh2";
    
    // Update Coke Float 16 oz to NOT be an add-on
    const cokeFloatRef = doc(db, `tenants/${tenantId}/menuItems`, 'VppZJHwvqye2fuG988KR');
    
    await updateDoc(cokeFloatRef, {
      isAddonOnly: false,
      addonType: null
    });
    
    console.log('✅ Fixed "Coke Float 16 oz" - removed from add-ons');
    console.log('🔄 Refresh your POS to see it back as a regular menu item');
    console.log('');
    console.log('Now only your custom add-ons should appear:');
    console.log('- 🍫 Choco Syrup (₱5.00)');
    
  } catch (error) {
    console.error('❌ Error fixing Coke Float:', error);
  }
}

fixCokeFloat();
