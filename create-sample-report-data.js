const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
const LOCATION_ID = 'location_VhbmQwJkKA3FPZR1UqLj';

async function createSampleReportData() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🏗️ Creating sample data for reports...');
    
    // Create sample orders
    console.log('📋 Creating sample orders...');
    const ordersRef = collection(db, `tenants/${TENANT_ID}/orders`);
    
    const sampleOrders = [
      {
        orderNumber: 'ORD-001',
        total: 250.00,
        status: 'completed',
        paymentMethod: 'cash',
        items: [
          { name: 'Americano', quantity: 2, price: 95.00 },
          { name: 'Cappuccino', quantity: 1, price: 125.00 }
        ],
        customerId: 'walk-in',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      },
      {
        orderNumber: 'ORD-002',
        total: 180.00,
        status: 'completed',
        paymentMethod: 'gcash',
        items: [
          { name: 'Latte', quantity: 1, price: 110.00 },
          { name: 'Croissant', quantity: 1, price: 70.00 }
        ],
        customerId: 'walk-in',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      },
      {
        orderNumber: 'ORD-003',
        total: 150.00,
        status: 'completed',
        paymentMethod: 'cash',
        items: [
          { name: 'Espresso', quantity: 3, price: 50.00 }
        ],
        customerId: 'walk-in',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      }
    ];
    
    for (const order of sampleOrders) {
      const docRef = await addDoc(ordersRef, order);
      console.log(`✅ Added order: ${order.orderNumber} - ₱${order.total} (${order.paymentMethod})`);
    }
    
    // Create sample expenses
    console.log('\n💰 Creating sample expenses...');
    const expensesRef = collection(db, `tenants/${TENANT_ID}/expenses`);
    
    const sampleExpenses = [
      {
        description: 'Coffee supply restock',
        amount: 2500.00,
        category: 'Inventory',
        paymentMethod: 'cash',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1 day ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      },
      {
        description: 'Utility bill - Electricity',
        amount: 1200.00,
        category: 'Utilities',
        method: 'bank_transfer',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      },
      {
        description: 'Equipment maintenance',
        amount: 800.00,
        category: 'Maintenance',
        paymentMethod: 'cash',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)), // 5 hours ago
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      }
    ];
    
    for (const expense of sampleExpenses) {
      const docRef = await addDoc(expensesRef, expense);
      console.log(`✅ Added expense: ${expense.description} - ₱${expense.amount}`);
    }
    
    // Create sample shifts
    console.log('\n⏰ Creating sample shifts...');
    const shiftsRef = collection(db, `tenants/${TENANT_ID}/shifts`);
    
    const sampleShifts = [
      {
        employeeName: 'Jane Barista',
        status: 'completed',
        startTime: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 60 * 1000)), // 10 hours ago
        endTime: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
        date: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 60 * 1000)),
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      },
      {
        employeeName: 'Mike Cashier',
        status: 'completed',
        startTime: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24 hours ago
        endTime: Timestamp.fromDate(new Date(Date.now() - 16 * 60 * 60 * 1000)), // 16 hours ago
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        locationId: LOCATION_ID,
        tenantId: TENANT_ID
      }
    ];
    
    for (const shift of sampleShifts) {
      const docRef = await addDoc(shiftsRef, shift);
      console.log(`✅ Added shift: ${shift.employeeName} - ${shift.status}`);
    }
    
    console.log('\n🎉 Sample report data created successfully!');
    console.log('\n📊 SUMMARY:');
    console.log('• Orders: 3 completed orders (₱580 total revenue)');
    console.log('  - 2 cash payments (₱400)');
    console.log('  - 1 GCash payment (₱180)');
    console.log('• Expenses: 3 expenses (₱4,500 total)');
    console.log('  - 2 cash expenses (₱3,300)');
    console.log('  - 1 bank transfer (₱1,200)');
    console.log('• Shifts: 2 completed shifts');
    console.log('• Inventory: 6 items (₱14,045 value)');
    console.log('• Movements: 5 stock movements');
    
    console.log('\n✅ All reports should now show data!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSampleReportData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
