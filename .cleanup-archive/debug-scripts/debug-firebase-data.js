// Firebase Data Inspection Tool
// Run this in the browser console or as a standalone script

const inspectFirebaseData = async () => {
  console.log('🔍 Inspecting Firebase Data for Reports...')
  
  // This assumes you have access to Firebase in the browser console
  if (typeof db === 'undefined') {
    console.log('❌ Firebase db not available. Run this in the app context.')
    return
  }
  
  const tenantId = localStorage.getItem('activeTenant') || 'your-tenant-id'
  const locationId = localStorage.getItem('activeLocation') || 'your-location-id'
  
  console.log(`🏢 Tenant ID: ${tenantId}`)
  console.log(`📍 Location ID: ${locationId}`)
  
  try {
    // Check POS Orders collection
    const posOrdersRef = db.collection(`tenants/${tenantId}/posOrders`)
    const posOrdersSnapshot = await posOrdersRef.limit(5).get()
    
    console.log(`📦 POS Orders Collection: ${posOrdersSnapshot.size} documents`)
    if (!posOrdersSnapshot.empty) {
      posOrdersSnapshot.docs.forEach((doc, index) => {
        console.log(`   Order ${index + 1}:`, doc.data())
      })
    }
    
    // Check Expenses collection
    const expensesRef = db.collection(`tenants/${tenantId}/expenses`)
    const expensesSnapshot = await expensesRef.limit(5).get()
    
    console.log(`💸 Expenses Collection: ${expensesSnapshot.size} documents`)
    if (!expensesSnapshot.empty) {
      expensesSnapshot.docs.forEach((doc, index) => {
        console.log(`   Expense ${index + 1}:`, doc.data())
      })
    }
    
    // Check Inventory collection
    const inventoryRef = db.collection(`tenants/${tenantId}/inventory`)
    const inventorySnapshot = await inventoryRef.limit(5).get()
    
    console.log(`📊 Inventory Collection: ${inventorySnapshot.size} documents`)
    if (!inventorySnapshot.empty) {
      inventorySnapshot.docs.forEach((doc, index) => {
        console.log(`   Inventory ${index + 1}:`, doc.data())
      })
    }
    
    // Summary
    console.log('\n📋 Summary for Reports:')
    console.log(`- Sales Data: ${posOrdersSnapshot.size > 0 ? '✅ Available' : '❌ Empty'}`)
    console.log(`- Expense Data: ${expensesSnapshot.size > 0 ? '✅ Available' : '❌ Empty'}`)
    console.log(`- Inventory Data: ${inventorySnapshot.size > 0 ? '✅ Available' : '❌ Empty'}`)
    
    if (posOrdersSnapshot.empty && expensesSnapshot.empty) {
      console.log('\n💡 Recommendations:')
      console.log('1. Create some test sales through the POS system')
      console.log('2. Add some expenses through the Expenses module')
      console.log('3. Ensure data is being saved to the correct tenant/location')
    }
    
  } catch (error) {
    console.error('❌ Error inspecting Firebase data:', error)
  }
}

// Auto-run if in browser context
if (typeof window !== 'undefined') {
  console.log('🚀 Firebase Data Inspector loaded. Run inspectFirebaseData() in console.')
  window.inspectFirebaseData = inspectFirebaseData
}

// Export for Node.js context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { inspectFirebaseData }
}
