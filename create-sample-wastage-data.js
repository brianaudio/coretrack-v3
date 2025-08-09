// Test script to create sample wastage data for CoreTrack
// Usage: node create-sample-wastage-data.js

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore'

// Firebase configuration (same as your main config)
const firebaseConfig = {
  apiKey: "AIzaSyDvU47s7dB7xeGYFDJz2n6xKqzN21xVkM8",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "77306527007",
  appId: "1:77306527007:web:2b834b513c4bd9e0eb8c8f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Sample data
const sampleWastageEntries = [
  {
    reason: "Expired product past shelf life",
    category: "expired",
    quantity: 5,
    notes: "Found during routine inventory check"
  },
  {
    reason: "Dropped during restocking",
    category: "damaged",
    quantity: 2,
    notes: "Glass container broke when dropped"
  },
  {
    reason: "Spilled during preparation",
    category: "spillage",
    quantity: 1,
    notes: "Accidentally knocked over container"
  },
  {
    reason: "Missing from inventory count",
    category: "theft",
    quantity: 3,
    notes: "Noticed during stock reconciliation"
  },
  {
    reason: "Customer return - opened package",
    category: "other",
    quantity: 1,
    notes: "Customer didn't like the product"
  }
]

const sampleThresholds = [
  {
    dailyThreshold: 2,
    weeklyThreshold: 10,
    monthlyThreshold: 30,
    alertEnabled: true
  },
  {
    dailyThreshold: 1,
    weeklyThreshold: 5,
    monthlyThreshold: 15,
    alertEnabled: true
  },
  {
    dailyThreshold: 3,
    weeklyThreshold: 15,
    monthlyThreshold: 45,
    alertEnabled: false
  }
]

async function findActiveTenant() {
  console.log('🔍 Looking for active tenant...')
  
  try {
    // Look for users to find tenant
    const usersQuery = query(collection(db, 'users'), limit(1))
    const usersSnapshot = await getDocs(usersQuery)
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found')
      return null
    }
    
    const userData = usersSnapshot.docs[0].data()
    const tenantId = userData.tenantId
    
    if (!tenantId) {
      console.log('❌ No tenantId found in user data')
      return null
    }
    
    console.log('✅ Found tenant:', tenantId)
    return { tenantId, userId: usersSnapshot.docs[0].id, userData }
  } catch (error) {
    console.error('❌ Error finding tenant:', error)
    return null
  }
}

async function findActiveBranch(tenantId) {
  console.log('🔍 Looking for active branch...')
  
  try {
    // Look for locations for this tenant (locations are the branches)
    const locationsQuery = query(
      collection(db, 'locations'),
      where('tenantId', '==', tenantId),
      limit(1)
    )
    const locationsSnapshot = await getDocs(locationsQuery)
    
    if (locationsSnapshot.empty) {
      console.log('❌ No locations found')
      return null
    }
    
    const locationData = locationsSnapshot.docs[0].data()
    const branchId = locationsSnapshot.docs[0].id // Use the document ID as branchId
    
    console.log('✅ Found location:', locationData.name, branchId)
    return { branchId, branchData: locationData }
  } catch (error) {
    console.error('❌ Error finding branch:', error)
    return null
  }
}

async function findInventoryItems(tenantId, branchId) {
  console.log('🔍 Looking for inventory items...')
  
  try {
    // Look for inventory items in this branch
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('tenantId', '==', tenantId),
      where('locationId', '==', branchId),
      limit(10)
    )
    const inventorySnapshot = await getDocs(inventoryQuery)
    
    if (inventorySnapshot.empty) {
      console.log('📦 No inventory items found, creating sample items...')
      return await createSampleInventoryItems(tenantId, branchId)
    }
    
    const items = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log(`✅ Found ${items.length} inventory items`)
    return items
  } catch (error) {
    console.error('❌ Error finding inventory items:', error)
    return []
  }
}

async function createSampleInventoryItems(tenantId, branchId) {
  const sampleItems = [
    {
      name: "Coffee Beans - Premium Blend",
      category: "Ingredients",
      currentStock: 50,
      minStock: 10,
      unit: "kg",
      costPerUnit: 850.00
    },
    {
      name: "Milk - Fresh Dairy",
      category: "Dairy",
      currentStock: 25,
      minStock: 5,
      unit: "liters",
      costPerUnit: 65.00
    },
    {
      name: "Sugar - White Granulated",
      category: "Ingredients",
      currentStock: 30,
      minStock: 8,
      unit: "kg",
      costPerUnit: 55.00
    },
    {
      name: "Chocolate Syrup",
      category: "Syrups",
      currentStock: 15,
      minStock: 3,
      unit: "bottles",
      costPerUnit: 125.00
    },
    {
      name: "Vanilla Extract",
      category: "Flavorings",
      currentStock: 8,
      minStock: 2,
      unit: "bottles",
      costPerUnit: 280.00
    }
  ]
  
  const createdItems = []
  
  for (const itemData of sampleItems) {
    try {
      const item = {
        ...itemData,
        tenantId,
        locationId: branchId,
        status: 'good',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      }
      
      const docRef = await addDoc(collection(db, 'inventory'), item)
      createdItems.push({
        id: docRef.id,
        ...item
      })
      
      console.log(`✅ Created inventory item: ${item.name}`)
    } catch (error) {
      console.error(`❌ Error creating ${itemData.name}:`, error)
    }
  }
  
  console.log(`📦 Created ${createdItems.length} sample inventory items`)
  return createdItems
}

async function createWastageEntry(tenantId, branchId, item, wastageData, userId) {
  const entry = {
    tenantId,
    branchId,
    itemId: item.id,
    itemName: item.name,
    quantity: wastageData.quantity,
    unitCost: item.costPerUnit || 10, // Default cost if not available
    totalCost: wastageData.quantity * (item.costPerUnit || 10),
    reason: wastageData.reason,
    category: wastageData.category,
    reportedBy: userId,
    reportedByName: 'System Test User',
    timestamp: Timestamp.now(),
    notes: wastageData.notes,
    status: 'confirmed'
  }
  
  try {
    const docRef = await addDoc(collection(db, 'wastageEntries'), entry)
    console.log(`✅ Created wastage entry for ${item.name}: ${wastageData.quantity} items (₱${entry.totalCost})`)
    return docRef.id
  } catch (error) {
    console.error(`❌ Error creating wastage entry for ${item.name}:`, error)
    return null
  }
}

async function createWastageThreshold(tenantId, branchId, item, thresholdData) {
  const threshold = {
    tenantId,
    branchId,
    itemId: item.id,
    itemName: item.name,
    dailyThreshold: thresholdData.dailyThreshold,
    weeklyThreshold: thresholdData.weeklyThreshold,
    monthlyThreshold: thresholdData.monthlyThreshold,
    alertEnabled: thresholdData.alertEnabled,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
  
  try {
    const docRef = await addDoc(collection(db, 'wastageThresholds'), threshold)
    console.log(`✅ Created threshold for ${item.name}: daily=${thresholdData.dailyThreshold}, weekly=${thresholdData.weeklyThreshold}`)
    return docRef.id
  } catch (error) {
    console.error(`❌ Error creating threshold for ${item.name}:`, error)
    return null
  }
}

async function main() {
  console.log('🚀 Creating sample wastage data for CoreTrack...\n')
  
  // Find active tenant and branch
  const tenantInfo = await findActiveTenant()
  if (!tenantInfo) {
    console.log('❌ Could not find active tenant. Exiting.')
    process.exit(1)
  }
  
  const branchInfo = await findActiveBranch(tenantInfo.tenantId)
  if (!branchInfo) {
    console.log('❌ Could not find active branch. Exiting.')
    process.exit(1)
  }
  
  // Find inventory items
  const inventoryItems = await findInventoryItems(tenantInfo.tenantId, branchInfo.branchId)
  if (inventoryItems.length === 0) {
    console.log('❌ No inventory items found. Cannot create wastage data.')
    process.exit(1)
  }
  
  console.log(`\n📊 Creating wastage data for tenant: ${tenantInfo.tenantId}`)
  console.log(`📍 Branch: ${branchInfo.branchData.name} (${branchInfo.branchId})`)
  console.log(`📦 Available items: ${inventoryItems.length}\n`)
  
  // Create wastage entries
  console.log('📝 Creating wastage entries...')
  let totalWastageValue = 0
  let wastageCount = 0
  
  for (let i = 0; i < Math.min(sampleWastageEntries.length, inventoryItems.length); i++) {
    const item = inventoryItems[i]
    const wastageData = sampleWastageEntries[i]
    
    const entryId = await createWastageEntry(
      tenantInfo.tenantId,
      branchInfo.branchId,
      item,
      wastageData,
      tenantInfo.userId
    )
    
    if (entryId) {
      totalWastageValue += wastageData.quantity * (item.costPerUnit || 10)
      wastageCount++
    }
  }
  
  // Create wastage thresholds
  console.log('\n⚠️ Creating wastage thresholds...')
  let thresholdCount = 0
  
  for (let i = 0; i < Math.min(sampleThresholds.length, inventoryItems.length); i++) {
    const item = inventoryItems[i]
    const thresholdData = sampleThresholds[i]
    
    const thresholdId = await createWastageThreshold(
      tenantInfo.tenantId,
      branchInfo.branchId,
      item,
      thresholdData
    )
    
    if (thresholdId) {
      thresholdCount++
    }
  }
  
  // Summary
  console.log('\n📊 WASTAGE DATA CREATION SUMMARY')
  console.log('=' .repeat(50))
  console.log(`✅ Wastage Entries Created: ${wastageCount}`)
  console.log(`💰 Total Wastage Value: ₱${totalWastageValue.toFixed(2)}`)
  console.log(`⚠️ Thresholds Created: ${thresholdCount}`)
  console.log(`🏪 Tenant ID: ${tenantInfo.tenantId}`)
  console.log(`📍 Branch ID: ${branchInfo.branchId}`)
  console.log('=' .repeat(50))
  console.log('🎉 Sample wastage data created successfully!')
  console.log('\n💡 You can now test the wastage tracking features in the Inventory Center!')
}

// Run the script
main().catch(console.error)
