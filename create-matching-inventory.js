// Quick fix script to add matching inventory item
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// This will create an inventory item that matches your POS item
async function addMatchingInventoryItem() {
  try {
    const tenantId = 'C7riCIXn20bY11dUrRGKGZgC4uG3'; // Your tenant ID from logs
    const locationId = 'location_NgZiHMfygRnoLjIDMTtB'; // Your location ID from logs
    
    // Create inventory item that matches POS item name
    const inventoryItem = {
      name: 'Coke Float 16 oz', // Exact match with POS item
      description: 'Coke Float 16 oz beverage',
      sku: 'CF16OZ001',
      category: 'Beverage',
      currentStock: 100, // Start with 100 units
      unit: 'piece',
      costPerUnit: 25, // Cost per unit
      price: 45, // Selling price
      minStock: 10,
      maxStock: 500,
      supplier: 'Beverage Supplier',
      location: locationId,
      status: 'good',
      lastUpdated: Timestamp.now(),
      tenantId: tenantId
    };
    
    console.log('Creating inventory item:', inventoryItem);
    
    // Note: This is a template - you would need to run this in your Firebase environment
    // For now, let's create this through the UI instead
    
  } catch (error) {
    console.error('Error creating inventory item:', error);
  }
}

module.exports = { addMatchingInventoryItem };
