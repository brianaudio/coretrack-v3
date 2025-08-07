// Test undefined value handling in menu item creation
const testUndefinedHandling = () => {
  console.log('🧪 Testing undefined value handling...');
  
  // Simulate the data cleaning function
  const removeUndefinedValues = (obj) => {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
          // Recursively clean nested objects
          cleaned[key] = removeUndefinedValues(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    });
    return cleaned;
  };
  
  // Test data with undefined values
  const testData = {
    name: 'Test Item',
    description: 'Test description',
    price: 10.99,
    image: undefined, // This was causing the error
    emoji: '🍔',
    category: 'Main Course',
    allergens: [],
    ingredients: [
      {
        inventoryItemId: 'item1',
        inventoryItemName: 'Beef Patty',
        quantity: 1,
        unit: 'piece',
        cost: 5.0
      }
    ],
    calories: undefined, // Another potential undefined
    preparationTime: 15,
    locationId: 'location_branch1',
    tenantId: 'tenant123'
  };
  
  console.log('Before cleaning:', Object.keys(testData));
  console.log('Undefined fields:', Object.keys(testData).filter(key => testData[key] === undefined));
  
  const cleaned = removeUndefinedValues(testData);
  
  console.log('After cleaning:', Object.keys(cleaned));
  console.log('Removed fields:', Object.keys(testData).filter(key => !(key in cleaned)));
  
  // Verify no undefined values remain
  const hasUndefined = Object.values(cleaned).some(val => val === undefined);
  console.log('Has undefined values after cleaning:', hasUndefined);
  
  if (!hasUndefined) {
    console.log('✅ Undefined value handling test PASSED');
  } else {
    console.log('❌ Undefined value handling test FAILED');
  }
  
  return cleaned;
};

// Run the test
const result = testUndefinedHandling();
console.log('\n📋 Cleaned data:', result);
