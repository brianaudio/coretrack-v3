const { initializeApp } = require('firebase/app')
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore')

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlTKDKHdJOvfNBAoLDrWxBqGDKN8rJXWg",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "60926130943",
  appId: "1:60926130943:web:9ad6e4c15ad0bb2c22a077"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function analyzeAddonData() {
  try {
    console.log('🔍 Analyzing addon data structure and flow...\n')

    // Step 1: Find the active tenant (assuming you're the only user for now)
    const usersRef = collection(db, 'users')
    const usersSnapshot = await getDocs(usersRef)
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found')
      return
    }

    let tenantId = null
    let locationId = null
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data()
      if (userData.tenantId) {
        tenantId = userData.tenantId
        console.log(`✅ Found tenant: ${tenantId}`)
      }
    })

    if (!tenantId) {
      console.log('❌ No tenant found')
      return
    }

    // Step 2: Get locations for this tenant
    const locationsRef = collection(db, 'tenants', tenantId, 'locations')
    const locationsSnapshot = await getDocs(locationsRef)
    
    if (!locationsSnapshot.empty) {
      locationId = locationsSnapshot.docs[0].id
      console.log(`✅ Found location: ${locationId}`)
    } else {
      console.log('❌ No locations found')
      return
    }

    // Step 3: Analyze Menu Builder Addons
    console.log('\n📋 MENU BUILDER ADDONS:')
    console.log('=' .repeat(50))
    
    const addonsRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'addons')
    const addonsSnapshot = await getDocs(addonsRef)
    
    if (addonsSnapshot.empty) {
      console.log('❌ No addons found in Menu Builder')
    } else {
      addonsSnapshot.forEach(doc => {
        const addon = { id: doc.id, ...doc.data() }
        console.log(`\n🔗 Addon: "${addon.name}"`)
        console.log(`   ID: ${addon.id}`)
        console.log(`   Price: ₱${addon.price}`)
        console.log(`   Status: ${addon.status}`)
        
        // Check ingredients structure
        if (addon.ingredients && addon.ingredients.length > 0) {
          console.log(`   📦 Ingredients (${addon.ingredients.length}):`)
          addon.ingredients.forEach((ingredient, idx) => {
            console.log(`     ${idx + 1}. ${ingredient.inventoryItemName}`)
            console.log(`        - Inventory ID: ${ingredient.inventoryItemId}`)
            console.log(`        - Quantity: ${ingredient.quantity} ${ingredient.unit}`)
            console.log(`        - Cost per unit: ₱${ingredient.costPerUnit}`)
          })
        } else if (addon.inventoryItemId) {
          console.log(`   📦 Single Inventory Link:`)
          console.log(`     - Inventory ID: ${addon.inventoryItemId}`)
          console.log(`     - Inventory Name: ${addon.inventoryItemName}`)
          console.log(`     - Quantity: ${addon.inventoryQuantity}`)
        } else {
          console.log('   ⚠️  NO INVENTORY LINKAGE FOUND!')
        }
      })
    }

    // Step 4: Check inventory items to see what exists
    console.log('\n📦 INVENTORY ITEMS:')
    console.log('=' .repeat(50))
    
    const inventoryRef = collection(db, 'tenants', tenantId, 'inventory')
    const inventorySnapshot = await getDocs(inventoryRef)
    
    if (inventorySnapshot.empty) {
      console.log('❌ No inventory items found')
    } else {
      console.log(`✅ Found ${inventorySnapshot.size} inventory items:`)
      inventorySnapshot.forEach(doc => {
        const item = { id: doc.id, ...doc.data() }
        console.log(`   - ${item.name} (ID: ${item.id}) - Stock: ${item.quantity} ${item.unit}`)
      })
    }

    // Step 5: Check what POS would load
    console.log('\n🖥️  POS ADDON LOADING SIMULATION:')
    console.log('=' .repeat(50))
    
    // Simulate what POS_Enhanced does
    const standAloneAddons = []
    addonsSnapshot.forEach(doc => {
      const addon = { id: doc.id, ...doc.data() }
      if (addon.status === 'active') {
        standAloneAddons.push({
          id: addon.id,
          name: addon.name,
          price: addon.price,
          category: 'extra',
          required: false,
          options: undefined,
          // Keep reference to original data for inventory deduction
          _originalAddon: addon
        })
      }
    })
    
    console.log(`✅ POS would load ${standAloneAddons.length} active addons`)
    standAloneAddons.forEach(addon => {
      console.log(`   - ${addon.name} (₱${addon.price})`)
    })

    // Step 6: Check if Menu Builder addon would be found during inventory deduction
    console.log('\n🔍 INVENTORY DEDUCTION ANALYSIS:')
    console.log('=' .repeat(50))
    
    for (const posAddon of standAloneAddons) {
      console.log(`\n🎯 Testing addon: "${posAddon.name}"`)
      
      // Check if POS addon would find Menu Builder addon
      const menuBuilderAddon = standAloneAddons.find(mba => mba.id === posAddon.id)
      if (menuBuilderAddon) {
        console.log(`   ✅ Would find Menu Builder addon match`)
        
        // Check ingredients path
        if (posAddon._originalAddon.ingredients && posAddon._originalAddon.ingredients.length > 0) {
          console.log(`   🧪 Would try ingredients-based deduction:`)
          posAddon._originalAddon.ingredients.forEach(ingredient => {
            console.log(`      - Deduct ${ingredient.quantity} ${ingredient.unit} of "${ingredient.inventoryItemName}" (ID: ${ingredient.inventoryItemId})`)
          })
        } else if (posAddon._originalAddon.inventoryItemId) {
          console.log(`   🧪 Would try single inventory deduction:`)
          console.log(`      - Deduct ${posAddon._originalAddon.inventoryQuantity || 1} of "${posAddon._originalAddon.inventoryItemName}" (ID: ${posAddon._originalAddon.inventoryItemId})`)
        } else {
          console.log(`   ❌ Would try name-based fallback: "${posAddon.name}"`)
        }
      } else {
        console.log(`   ❌ Would NOT find Menu Builder addon match`)
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing addon data:', error)
  }
}

analyzeAddonData()
