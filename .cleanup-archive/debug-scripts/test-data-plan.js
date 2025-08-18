#!/usr/bin/env node
/**
 * CoreTrack Complete Feature Testing Script
 * This script creates comprehensive test data for all modules
 */

const testData = {
  // Test Inventory Items
  inventoryItems: [
    { name: 'Ground Coffee Beans', unit: 'kg', quantity: 25, cost: 350, category: 'Beverages' },
    { name: 'Whole Milk', unit: 'liter', quantity: 15, cost: 65, category: 'Beverages' },
    { name: 'Sugar', unit: 'kg', quantity: 10, cost: 45, category: 'Ingredients' },
    { name: 'Bread Flour', unit: 'kg', quantity: 20, cost: 85, category: 'Bakery' },
    { name: 'Chicken Breast', unit: 'kg', quantity: 8, cost: 280, category: 'Meat' },
    { name: 'Tomatoes', unit: 'kg', quantity: 5, cost: 120, category: 'Vegetables' },
    { name: 'Cheese', unit: 'kg', quantity: 3, cost: 450, category: 'Dairy' },
    { name: 'Pasta', unit: 'kg', quantity: 12, cost: 95, category: 'Grains' },
    { name: 'Vegetable Oil', unit: 'liter', quantity: 8, cost: 125, category: 'Cooking' },
    { name: 'Salt', unit: 'kg', quantity: 2, cost: 25, category: 'Seasonings' }
  ],

  // Test Menu Items
  menuItems: [
    {
      name: 'Cappuccino',
      category: 'Beverages',
      description: 'Rich espresso with steamed milk foam',
      price: 145,
      emoji: '☕',
      ingredients: [
        { item: 'Ground Coffee Beans', quantity: 0.02, unit: 'kg' },
        { item: 'Whole Milk', quantity: 0.15, unit: 'liter' }
      ]
    },
    {
      name: 'Chicken Sandwich',
      category: 'Main Course',
      description: 'Grilled chicken breast with fresh vegetables',
      price: 185,
      emoji: '🥪',
      ingredients: [
        { item: 'Chicken Breast', quantity: 0.15, unit: 'kg' },
        { item: 'Bread Flour', quantity: 0.1, unit: 'kg' },
        { item: 'Tomatoes', quantity: 0.05, unit: 'kg' }
      ]
    },
    {
      name: 'Cheese Pasta',
      category: 'Main Course',
      description: 'Creamy pasta with melted cheese',
      price: 165,
      emoji: '🍝',
      ingredients: [
        { item: 'Pasta', quantity: 0.12, unit: 'kg' },
        { item: 'Cheese', quantity: 0.08, unit: 'kg' },
        { item: 'Whole Milk', quantity: 0.05, unit: 'liter' }
      ]
    },
    {
      name: 'Garden Salad',
      category: 'Appetizers',
      description: 'Fresh mixed vegetables with dressing',
      price: 125,
      emoji: '🥗',
      ingredients: [
        { item: 'Tomatoes', quantity: 0.1, unit: 'kg' },
        { item: 'Vegetable Oil', quantity: 0.02, unit: 'liter' }
      ]
    }
  ],

  // Test Add-ons
  addons: [
    {
      name: 'Extra Shot',
      description: 'Additional espresso shot',
      price: 25,
      cost: 5,
      ingredients: [{ item: 'Ground Coffee Beans', quantity: 0.01, unit: 'kg' }]
    },
    {
      name: 'Extra Cheese',
      description: 'Additional cheese portion',
      price: 35,
      cost: 15,
      ingredients: [{ item: 'Cheese', quantity: 0.03, unit: 'kg' }]
    },
    {
      name: 'Garlic Bread',
      description: 'Toasted bread with garlic',
      price: 45,
      cost: 12,
      ingredients: [
        { item: 'Bread Flour', quantity: 0.05, unit: 'kg' },
        { item: 'Vegetable Oil', quantity: 0.01, unit: 'liter' }
      ]
    }
  ],

  // Test Expenses
  expenses: [
    { category: 'Utilities', description: 'Electricity Bill', amount: 3500, date: '2025-08-15' },
    { category: 'Rent', description: 'Monthly Store Rent', amount: 25000, date: '2025-08-01' },
    { category: 'Marketing', description: 'Social Media Ads', amount: 2000, date: '2025-08-10' },
    { category: 'Equipment', description: 'Coffee Machine Maintenance', amount: 1500, date: '2025-08-12' },
    { category: 'Staff', description: 'Part-time Staff Salary', amount: 8000, date: '2025-08-05' }
  ],

  // Test Purchase Orders
  purchaseOrders: [
    {
      supplier: 'Coffee Beans Co.',
      items: [
        { name: 'Ground Coffee Beans', quantity: 10, unit: 'kg', cost: 350 }
      ],
      status: 'pending',
      totalAmount: 3500,
      expectedDate: '2025-08-20'
    },
    {
      supplier: 'Fresh Dairy Farm',
      items: [
        { name: 'Whole Milk', quantity: 20, unit: 'liter', cost: 65 },
        { name: 'Cheese', quantity: 2, unit: 'kg', cost: 450 }
      ],
      status: 'completed',
      totalAmount: 2200,
      expectedDate: '2025-08-16'
    }
  ],

  // Test Sales Transactions
  salesTransactions: [
    {
      items: [
        { name: 'Cappuccino', quantity: 2, price: 145 },
        { name: 'Chicken Sandwich', quantity: 1, price: 185 }
      ],
      addons: [
        { name: 'Extra Shot', quantity: 1, price: 25 }
      ],
      total: 500,
      paymentMethod: 'cash',
      timestamp: new Date()
    },
    {
      items: [
        { name: 'Cheese Pasta', quantity: 1, price: 165 },
        { name: 'Garden Salad', quantity: 1, price: 125 }
      ],
      total: 290,
      paymentMethod: 'gcash',
      timestamp: new Date()
    }
  ]
}

console.log('📊 CoreTrack Test Data Structure:')
console.log('=====================================')
console.log(`📦 Inventory Items: ${testData.inventoryItems.length}`)
console.log(`🍽️ Menu Items: ${testData.menuItems.length}`)
console.log(`➕ Add-ons: ${testData.addons.length}`)
console.log(`💰 Expenses: ${testData.expenses.length}`)
console.log(`📋 Purchase Orders: ${testData.purchaseOrders.length}`)
console.log(`🛒 Sales Transactions: ${testData.salesTransactions.length}`)
console.log('=====================================')

module.exports = testData
