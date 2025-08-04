const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

// Firebase configuration - Same as main app
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2'; // Active tenant

async function debugInventoryDeductionFlow() {
  try {
    console.log('🔍 DEBUGGING INVENTORY DEDUCTION FLOW');
    console.log('=' .repeat(50));
    
    // Step 1: Check inventory current state
    console.log('\n📦 STEP 1: Current Inventory State');
    console.log('-'.repeat(30));
    const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  📋 ${data.name}: ${data.currentStock} ${data.unit} (${data.status})`);
    });
    
    // Step 2: Check POS items and their ingredients
    console.log('\n📦 STEP 2: POS Items with Ingredients');
    console.log('-'.repeat(30));
    const posSnapshot = await getDocs(collection(db, `tenants/${tenantId}/posItems`));
    
    posSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  🍽️  ${data.name} (ID: ${doc.id}):`);
      if (data.ingredients && data.ingredients.length > 0) {
        data.ingredients.forEach(ing => {
          console.log(`    - ${ing.inventoryItemName}: ${ing.quantity} ${ing.unit} (ID: ${ing.inventoryItemId})`);
        });
      } else {
        console.log(`    ❌ NO INGREDIENTS`);
      }
    });
    
    // Step 3: Simulate inventory deduction for "Coke Float 16 oz"
    console.log('\n📦 STEP 3: Simulating Order Processing');
    console.log('-'.repeat(30));
    
    // Find "Coke Float 16 oz" POS item
    const cokeFloatItem = posSnapshot.docs.find(doc => 
      doc.data().name.toLowerCase().includes('coke float 16')
    );
    
    if (cokeFloatItem) {
      const itemData = cokeFloatItem.data();
      console.log(`🎯 Testing with: ${itemData.name}`);
      console.log(`   POS Item ID: ${cokeFloatItem.id}`);
      console.log(`   Has ingredients: ${itemData.ingredients ? 'YES' : 'NO'}`);
      
      if (itemData.ingredients) {
        console.log(`   Ingredients to deduct:`);
        itemData.ingredients.forEach(ing => {
          console.log(`     - ${ing.inventoryItemName} (${ing.quantity} ${ing.unit})`);
        });
        
        // Check if each ingredient exists in inventory
        console.log(`\n🔍 Checking ingredient availability in inventory:`);
        for (const ingredient of itemData.ingredients) {
          if (ingredient.inventoryItemId) {
            const inventoryDoc = await getDoc(doc(db, `tenants/${tenantId}/inventory`, ingredient.inventoryItemId));
            if (inventoryDoc.exists()) {
              const invData = inventoryDoc.data();
              console.log(`     ✅ ${ingredient.inventoryItemName}: Found (${invData.currentStock} available)`);
            } else {
              console.log(`     ❌ ${ingredient.inventoryItemName}: NOT FOUND by ID`);
            }
          } else {
            console.log(`     ⚠️  ${ingredient.inventoryItemName}: No inventory ID linked`);
          }
        }
      }
    } else {
      console.log('❌ Could not find "Coke Float 16 oz" item');
    }
    
    console.log('\n🎉 DEBUG COMPLETE');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugInventoryDeductionFlow();
