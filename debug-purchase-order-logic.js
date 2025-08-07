// Debug script to check purchase order and inventory records
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, limit, where } = require('firebase/firestore');

// You'll need to add your Firebase config here
const firebaseConfig = {
  // Add your actual Firebase configuration
  // apiKey: "your-api-key",
  // authDomain: "your-auth-domain",
  // projectId: "your-project-id",
  // etc...
};

// Replace with your actual tenant ID
const TENANT_ID = 'your-tenant-id-here';

async function debugPurchaseOrderAndInventory() {
  console.log('🔍 DEBUGGING PURCHASE ORDER & INVENTORY INTEGRATION');
  console.log('==================================================\n');

  try {
    // Uncomment these lines when you add your Firebase config
    // const app = initializeApp(firebaseConfig);
    // const db = getFirestore(app);

    console.log('📋 STEP 1: Check Recent Purchase Orders');
    console.log('=====================================');
    await checkRecentPurchaseOrders();

    console.log('\n📦 STEP 2: Check Inventory Items');
    console.log('===============================');
    await checkInventoryItems();

    console.log('\n📊 STEP 3: Check Inventory Movements');
    console.log('===================================');
    await checkInventoryMovements();

    console.log('\n🔄 STEP 4: Check Menu Items (if applicable)');
    console.log('==========================================');
    await checkMenuItems();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function checkRecentPurchaseOrders() {
  try {
    console.log('Looking for recent purchase orders...\n');
    
    // Check purchase orders collection
    // const ordersRef = collection(db, `tenants/${TENANT_ID}/purchaseOrders`);
    // const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
    // const ordersSnapshot = await getDocs(ordersQuery);

    console.log('📝 TO CHECK MANUALLY:');
    console.log('1. Go to Firebase Console');
    console.log(`2. Navigate to: tenants/${TENANT_ID}/purchaseOrders`);
    console.log('3. Look for orders with status: "delivered" or "partially_delivered"');
    console.log('4. Check the delivery details for unit prices');
    console.log('');
    
    console.log('🔍 WHAT TO LOOK FOR:');
    console.log('- Order items with unitPrice values');
    console.log('- deliveryHistory array with received quantities');
    console.log('- Items that match your inventory item names exactly');
    console.log('');

    // Example data structure to look for:
    console.log('📋 EXPECTED PURCHASE ORDER STRUCTURE:');
    console.log(`{
  "id": "po-123",
  "status": "delivered",
  "items": [
    {
      "itemName": "Coffee Beans",
      "quantity": 50,
      "unitPrice": 1.5,
      "unit": "kg",
      "quantityReceived": 50
    }
  ],
  "deliveryHistory": [
    {
      "date": "2025-01-15",
      "items": [
        {
          "itemName": "Coffee Beans",
          "quantityReceived": 50,
          "unitPrice": 1.5
        }
      ]
    }
  ]
}`);

  } catch (error) {
    console.error('Error checking purchase orders:', error);
  }
}

async function checkInventoryItems() {
  try {
    console.log('Looking for inventory items...\n');
    
    console.log('📝 TO CHECK MANUALLY:');
    console.log('1. Go to Firebase Console');
    console.log(`2. Navigate to: tenants/${TENANT_ID}/inventory`);
    console.log('3. Look for items that match your purchase order item names');
    console.log('4. Check costPerUnit values before and after delivery');
    console.log('');
    
    console.log('🔍 WHAT TO LOOK FOR:');
    console.log('- costPerUnit field (should show weighted average)');
    console.log('- currentStock field (should increase after delivery)');
    console.log('- lastUpdated timestamp (should be recent)');
    console.log('- Unit field matching purchase order units');
    console.log('');

    console.log('📦 EXPECTED INVENTORY STRUCTURE:');
    console.log(`{
  "id": "inv-123",
  "name": "Coffee Beans",
  "costPerUnit": 1.17,  // <-- Should be weighted average
  "currentStock": 150,   // <-- Should increase after delivery
  "unit": "kg",
  "minStock": 10,
  "lastUpdated": "2025-01-15T10:30:00Z"
}`);

  } catch (error) {
    console.error('Error checking inventory:', error);
  }
}

async function checkInventoryMovements() {
  try {
    console.log('Looking for inventory movements...\n');
    
    console.log('📝 TO CHECK MANUALLY:');
    console.log('1. Go to Firebase Console');
    console.log(`2. Navigate to: tenants/${TENANT_ID}/stockMovements`);
    console.log('3. Look for recent movements with type: "receiving"');
    console.log('4. Check for price change messages in reason field');
    console.log('');
    
    console.log('🔍 WHAT TO LOOK FOR:');
    console.log('- movementType: "receiving"');
    console.log('- reason containing "Purchase order delivery"');
    console.log('- reason containing "Price updated" (if costs changed)');
    console.log('- quantity matching delivered amounts');
    console.log('');

    console.log('📊 EXPECTED MOVEMENT STRUCTURE:');
    console.log(`{
  "id": "mov-123",
  "itemId": "inv-123",
  "itemName": "Coffee Beans",
  "movementType": "receiving",
  "quantity": 50,
  "previousStock": 100,
  "newStock": 150,
  "reason": "Purchase order delivery received - Price updated from ₱1.00 to ₱1.17 (weighted average)",
  "timestamp": "2025-01-15T10:30:00Z"
}`);

  } catch (error) {
    console.error('Error checking movements:', error);
  }
}

async function checkMenuItems() {
  try {
    console.log('Looking for menu items affected by price changes...\n');
    
    console.log('📝 TO CHECK MANUALLY:');
    console.log('1. Go to Firebase Console');
    console.log(`2. Navigate to: tenants/${TENANT_ID}/posItems`);
    console.log('3. Look for items with ingredients array');
    console.log('4. Check if ingredients reference updated inventory items');
    console.log('');
    
    console.log('🔍 WHAT TO LOOK FOR:');
    console.log('- ingredients array with inventoryItemId references');
    console.log('- lastPriceUpdate field (if menu prices were updated)');
    console.log('- cost field reflecting new ingredient costs');
    console.log('');

    console.log('🍽️ EXPECTED MENU ITEM STRUCTURE:');
    console.log(`{
  "id": "menu-123",
  "name": "Cappuccino",
  "price": 50.25,
  "cost": 0.59,
  "ingredients": [
    {
      "inventoryItemId": "inv-123",
      "inventoryItemName": "Coffee Beans",
      "quantity": 0.05,
      "unit": "kg"
    }
  ],
  "lastPriceUpdate": {
    "oldPrice": 50.00,
    "newPrice": 50.25,
    "reason": "Automatic price adjustment due to ingredient cost increase",
    "updatedAt": "2025-01-15T10:35:00Z"
  }
}`);

  } catch (error) {
    console.error('Error checking menu items:', error);
  }
}

// Troubleshooting guide
function showTroubleshootingGuide() {
  console.log('\n🛠️ TROUBLESHOOTING GUIDE');
  console.log('========================');
  console.log('');
  console.log('If the weighted average logic is not working, check:');
  console.log('');
  console.log('1. EXACT NAME MATCHING:');
  console.log('   - Purchase order item name: "Coffee Beans"');
  console.log('   - Inventory item name: "Coffee Beans"');
  console.log('   - Must match exactly (case sensitive)');
  console.log('');
  console.log('2. UNIT MATCHING:');
  console.log('   - Purchase order unit: "kg"');
  console.log('   - Inventory item unit: "kg"');
  console.log('   - Must match exactly');
  console.log('');
  console.log('3. DELIVERY PROCESS:');
  console.log('   - Purchase order status must be "delivered"');
  console.log('   - Items must have quantityReceived > 0');
  console.log('   - Items must have unitPrice > 0');
  console.log('');
  console.log('4. FUNCTION CALL:');
  console.log('   - updateInventoryFromDelivery() must be called');
  console.log('   - Check browser console for error messages');
  console.log('   - Check Firebase Functions logs if using cloud functions');
  console.log('');
  console.log('5. PERMISSIONS:');
  console.log('   - User must have inventory management permissions');
  console.log('   - Firebase rules must allow inventory updates');
  console.log('');
}

console.log('🚀 RUNNING DIAGNOSTIC...');
debugPurchaseOrderAndInventory().then(() => {
  showTroubleshootingGuide();
  console.log('\n✅ Diagnostic complete!');
  console.log('📧 Please share the Firebase data you find so I can help debug further.');
}).catch(error => {
  console.error('❌ Diagnostic failed:', error);
});
