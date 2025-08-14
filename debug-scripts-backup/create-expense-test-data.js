const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

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
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

const sampleExpenses = [
  {
    description: "Office Rent",
    amount: 25000,
    category: "Rent & Utilities",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 7, 1)), // August 1
    notes: "Monthly office rental"
  },
  {
    description: "Electricity Bill",
    amount: 3500,
    category: "Rent & Utilities",
    paymentMethod: "cash",
    date: Timestamp.fromDate(new Date(2025, 7, 5)), // August 5
    notes: "Monthly electricity"
  },
  {
    description: "Coffee Supplies",
    amount: 2800,
    category: "Supplies",
    paymentMethod: "cash",
    date: Timestamp.fromDate(new Date(2025, 7, 8)), // August 8
    notes: "Coffee beans and supplies"
  },
  {
    description: "Marketing Materials",
    amount: 1500,
    category: "Marketing",
    paymentMethod: "card",
    date: Timestamp.fromDate(new Date(2025, 7, 10)), // August 10
    notes: "Flyers and business cards"
  },
  {
    description: "Equipment Repair",
    amount: 4200,
    category: "Maintenance",
    paymentMethod: "cash",
    date: Timestamp.fromDate(new Date(2025, 7, 12)), // August 12
    notes: "Coffee machine repair"
  },
  {
    description: "Staff Training",
    amount: 3000,
    category: "Training",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 7, 7)), // August 7
    notes: "Barista training course"
  },
  {
    description: "Cleaning Supplies",
    amount: 800,
    category: "Supplies",
    paymentMethod: "cash",
    date: Timestamp.fromDate(new Date(2025, 7, 9)), // August 9
    notes: "Sanitizers and cleaning materials"
  },
  {
    description: "Internet Service",
    amount: 2500,
    category: "Rent & Utilities",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 7, 3)), // August 3
    notes: "Monthly internet bill"
  },
  {
    description: "Insurance Premium",
    amount: 5500,
    category: "Insurance",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 7, 6)), // August 6
    notes: "Business insurance"
  },
  {
    description: "Food Inventory",
    amount: 8500,
    category: "Inventory",
    paymentMethod: "cash",
    date: Timestamp.fromDate(new Date(2025, 7, 11)), // August 11
    notes: "Fresh ingredients and food supplies"
  },
  // Previous month data
  {
    description: "Office Rent",
    amount: 25000,
    category: "Rent & Utilities",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 6, 1)), // July 1
    notes: "Monthly office rental"
  },
  {
    description: "Staff Salary",
    amount: 15000,
    category: "Payroll",
    paymentMethod: "bank_transfer",
    date: Timestamp.fromDate(new Date(2025, 6, 15)), // July 15
    notes: "Part-time staff salary"
  },
  {
    description: "Equipment Purchase",
    amount: 12000,
    category: "Equipment",
    paymentMethod: "card",
    date: Timestamp.fromDate(new Date(2025, 6, 20)), // July 20
    notes: "New coffee grinder"
  }
];

async function createSampleExpenses() {
  try {
    console.log('🚀 CREATING SAMPLE EXPENSE DATA');
    console.log('=' .repeat(50));
    
    const expensesRef = collection(db, `tenants/${tenantId}/expenses`);
    
    for (let i = 0; i < sampleExpenses.length; i++) {
      const expense = sampleExpenses[i];
      console.log(`Adding expense ${i + 1}/${sampleExpenses.length}: ${expense.description} - ₱${expense.amount.toLocaleString()}`);
      
      await addDoc(expensesRef, expense);
    }
    
    console.log('\n✅ SUCCESS! All sample expenses created.');
    console.log(`📊 Total expenses added: ${sampleExpenses.length}`);
    console.log(`💰 Total amount: ₱${sampleExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}`);
    
    // Categories summary
    const categories = {};
    sampleExpenses.forEach(exp => {
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    });
    
    console.log('\n📈 CATEGORIES CREATED:');
    Object.entries(categories).forEach(([category, amount]) => {
      console.log(`  ${category}: ₱${amount.toLocaleString()}`);
    });
    
    console.log('\n🎯 EXPENSE ANALYTICS IS NOW READY TO TEST!');
    
  } catch (error) {
    console.error('❌ Error creating expenses:', error);
  }
  
  process.exit(0);
}

createSampleExpenses();
