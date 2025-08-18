// CoreTrack Test Data Creator - Testing Feature Integration
console.log('🧪 Testing CoreTrack Feature Integration...');

// Test Data for MenuBuilder
const testMenuItems = [
  {
    name: 'Cappuccino',
    category: 'Beverages',
    description: 'Rich espresso with steamed milk foam',
    price: 145,
    emoji: '☕',
    ingredients: [
      { name: 'Ground Coffee Beans', quantity: 0.02, unit: 'kg' },
      { name: 'Whole Milk', quantity: 0.15, unit: 'liter' }
    ]
  },
  {
    name: 'Chicken Sandwich',
    category: 'Main Course', 
    description: 'Grilled chicken breast with fresh vegetables',
    price: 185,
    emoji: '🥪',
    ingredients: [
      { name: 'Chicken Breast', quantity: 0.15, unit: 'kg' },
      { name: 'Bread', quantity: 0.1, unit: 'kg' },
      { name: 'Tomatoes', quantity: 0.05, unit: 'kg' }
    ]
  }
];

// Test Data for Inventory
const testInventoryItems = [
  { name: 'Ground Coffee Beans', unit: 'kg', quantity: 25, cost: 350 },
  { name: 'Whole Milk', unit: 'liter', quantity: 15, cost: 65 },
  { name: 'Chicken Breast', unit: 'kg', quantity: 8, cost: 280 },
  { name: 'Bread', unit: 'kg', quantity: 20, cost: 85 },
  { name: 'Tomatoes', unit: 'kg', quantity: 5, cost: 120 }
];

// Test Data for Add-ons
const testAddons = [
  {
    name: 'Extra Shot',
    description: 'Additional espresso shot',
    price: 25,
    cost: 5
  },
  {
    name: 'Extra Cheese',
    description: 'Additional cheese portion', 
    price: 35,
    cost: 15
  }
];

console.log('📊 Test Data Summary:');
console.log(`🍽️ Menu Items: ${testMenuItems.length}`);
console.log(`📦 Inventory Items: ${testInventoryItems.length}`);
console.log(`➕ Add-ons: ${testAddons.length}`);

// Calculate expected costs
testMenuItems.forEach(item => {
  let totalCost = 0;
  item.ingredients.forEach(ingredient => {
    const inventoryItem = testInventoryItems.find(inv => inv.name === ingredient.name);
    if (inventoryItem) {
      totalCost += ingredient.quantity * inventoryItem.cost;
    }
  });
  const profit = item.price - totalCost;
  const margin = totalCost > 0 ? ((profit / item.price) * 100).toFixed(1) : 0;
  
  console.log(`\n${item.emoji} ${item.name}:`);
  console.log(`   Price: ₱${item.price}`);
  console.log(`   Cost: ₱${totalCost.toFixed(2)}`);
  console.log(`   Profit: ₱${profit.toFixed(2)} (${margin}% margin)`);
});

console.log('\n✅ Test calculations complete!');
console.log('🌐 Ready to test in browser at http://localhost:3002');
