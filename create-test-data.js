// CREATE TEST DATA for shift reset testing
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDma3bpLMVhcOTU_rPJfhMN1QK4Lxr6oy8",
  authDomain: "coretrack-web.firebaseapp.com",
  projectId: "coretrack-web",
  storageBucket: "coretrack-web.firebasestorage.app",
  messagingSenderId: "343946787418",
  appId: "1:343946787418:web:e13a13e8ced6f32dfa88c5",
  measurementId: "G-CPDEK10T79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestData() {
  const TENANT_ID = '6yZUO71agSaZZ2TSxLeQxhT6V0F3';
  const LOCATION_ID = 'location_branch1'; // Default branch location
  
  console.log('📝 CREATING TEST DATA for Archive Testing');
  console.log('=========================================');
  
  try {
    // Create test POS orders
    console.log('\n💰 Creating test POS orders...');
    const orders = [];
    
    for (let i = 1; i <= 3; i++) {
      const orderRef = await addDoc(collection(db, `tenants/${TENANT_ID}/posOrders`), {
        total: 50 + (i * 25),
        status: 'completed',
        locationId: LOCATION_ID,
        createdAt: Timestamp.now(),
        paymentMethod: i === 1 ? 'cash' : i === 2 ? 'card' : 'gcash',
        items: [
          {
            itemId: `item_${i}`,
            name: `Test Item ${i}`,
            quantity: i,
            price: 25,
            total: i * 25
          }
        ],
        testData: true,
        description: `Test order ${i} for archive verification`
      });
      
      orders.push({
        id: orderRef.id,
        total: 50 + (i * 25)
      });
    }
    
    // Create test expenses
    console.log('\n💸 Creating test expenses...');
    const expenses = [];
    
    for (let i = 1; i <= 2; i++) {
      const expenseRef = await addDoc(collection(db, `tenants/${TENANT_ID}/expenses`), {
        amount: 20 + (i * 10),
        description: `Test expense ${i}`,
        category: i === 1 ? 'supplies' : 'utilities',
        locationId: LOCATION_ID,
        date: Timestamp.now(),
        testData: true
      });
      
      expenses.push({
        id: expenseRef.id,
        amount: 20 + (i * 10)
      });
    }
    
    // Create test inventory transaction
    console.log('\n📦 Creating test inventory transaction...');
    const inventoryRef = await addDoc(collection(db, `tenants/${TENANT_ID}/inventory_transactions`), {
      itemId: 'test_item_001',
      itemName: 'Test Inventory Item',
      quantityChanged: -5,
      transactionType: 'sale',
      locationId: LOCATION_ID,
      createdAt: Timestamp.now(),
      testData: true,
      description: 'Test inventory transaction for archive verification'
    });
    
    console.log('\n✅ TEST DATA CREATED SUCCESSFULLY!');
    console.log('==================================');
    console.log(`📋 Created ${orders.length} POS orders:`, orders);
    console.log(`💸 Created ${expenses.length} expenses:`, expenses);
    console.log(`📦 Created 1 inventory transaction:`, { id: inventoryRef.id });
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    console.log('\n📊 TEST DATA SUMMARY:');
    console.log(`   Total Revenue: ₱${totalRevenue}`);
    console.log(`   Total Expenses: ₱${totalExpenses}`);
    console.log(`   Net Profit: ₱${totalRevenue - totalExpenses}`);
    
    console.log('\n🚀 READY FOR TESTING:');
    console.log('   1. Go to CoreTrack web app (http://localhost:3002)');
    console.log('   2. Click "End Shift" in the header');
    console.log('   3. This should now trigger the archive process');
    console.log('   4. Run "node test-archive-fix.js" after to verify');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

createTestData();
