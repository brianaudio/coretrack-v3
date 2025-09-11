// Capital Intelligence Data Diagnostic Script
// Run this in browser console to analyze data inconsistencies

console.log('🔍 CAPITAL INTELLIGENCE DATA DIAGNOSTIC')
console.log('=====================================')

async function diagnosticCapitalIntelligence() {
  try {
    // Check if we have the required Firebase setup
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('📍 Running on localhost - checking data sources...')
      
      // Mock diagnostic data for analysis
      const diagnosticData = {
        recentOrders: [
          { id: 'order1', total: 1250, type: 'sales', date: '2025-09-10', status: 'completed' },
          { id: 'order2', total: 890, type: 'sales', date: '2025-09-09', status: 'completed' },
          { id: 'order3', total: 2100, type: 'sales', date: '2025-09-08', status: 'completed' }
        ],
        purchaseOrders: [
          { id: 'po1', total: 5000, supplier: 'ABC Supplies', date: '2025-09-05', status: 'received' },
          { id: 'po2', total: 3200, supplier: 'XYZ Trading', date: '2025-09-03', status: 'received' },
          { id: 'po3', total: 1800, supplier: 'DEF Corp', date: '2025-09-01', status: 'pending' }
        ],
        inventory: [
          { id: 'item1', name: 'Coffee Beans', stock: 50, costPerUnit: 25, value: 1250 },
          { id: 'item2', name: 'Milk', stock: 30, costPerUnit: 15, value: 450 },
          { id: 'item3', name: 'Sugar', stock: 100, costPerUnit: 5, value: 500 }
        ]
      }
      
      console.log('📊 DIAGNOSTIC ANALYSIS:')
      console.log('=======================')
      
      // 1. Data Source Analysis
      console.log('1️⃣ DATA SOURCES:')
      console.log('   - Recent Orders (Sales):', diagnosticData.recentOrders.length, 'records')
      console.log('   - Purchase Orders:', diagnosticData.purchaseOrders.length, 'records') 
      console.log('   - Inventory Items:', diagnosticData.inventory.length, 'records')
      
      // 2. Financial Flow Analysis
      const totalSales = diagnosticData.recentOrders.reduce((sum, order) => sum + order.total, 0)
      const totalPurchases = diagnosticData.purchaseOrders.reduce((sum, po) => sum + po.total, 0)
      const totalInventoryValue = diagnosticData.inventory.reduce((sum, item) => sum + item.value, 0)
      
      console.log('2️⃣ FINANCIAL FLOW:')
      console.log('   - Total Recent Sales: ₱', totalSales.toLocaleString())
      console.log('   - Total Purchase Orders: ₱', totalPurchases.toLocaleString())
      console.log('   - Current Inventory Value: ₱', totalInventoryValue.toLocaleString())
      
      // 3. Inconsistency Detection
      console.log('3️⃣ INCONSISTENCY ANALYSIS:')
      
      const moneyDifference = totalPurchases - totalInventoryValue
      console.log('   - Money Difference: ₱', moneyDifference.toLocaleString())
      console.log('   - Sales vs Missing Money: ', totalSales > 0 ? Math.round((totalSales/moneyDifference)*100) + '%' : 'N/A')
      
      // 4. Potential Issues
      console.log('4️⃣ POTENTIAL ISSUES:')
      
      if (totalSales < moneyDifference * 0.5) {
        console.log('   ⚠️  Sales too low to explain missing inventory')
        console.log('   💡 Possible causes:')
        console.log('      - Inventory shrinkage (theft, damage, expiry)')
        console.log('      - Incorrect cost pricing in inventory')
        console.log('      - Missing sales records')
        console.log('      - Supplier overcharging')
      }
      
      if (diagnosticData.recentOrders.length < diagnosticData.purchaseOrders.length) {
        console.log('   ⚠️  More purchase orders than sales orders')
        console.log('   💡 This could indicate:')
        console.log('      - Slow inventory turnover')
        console.log('      - Overstocking')
        console.log('      - Seasonal business patterns')
      }
      
      // 5. Data Quality Issues
      console.log('5️⃣ DATA QUALITY CHECKS:')
      
      const ordersWithoutTotal = diagnosticData.recentOrders.filter(o => !o.total || o.total <= 0)
      const poWithoutTotal = diagnosticData.purchaseOrders.filter(po => !po.total || po.total <= 0)
      const itemsWithoutValue = diagnosticData.inventory.filter(i => !i.value || i.value <= 0)
      
      if (ordersWithoutTotal.length > 0) {
        console.log('   ⚠️ ', ordersWithoutTotal.length, 'orders missing total amount')
      }
      
      if (poWithoutTotal.length > 0) {
        console.log('   ⚠️ ', poWithoutTotal.length, 'purchase orders missing total amount')
      }
      
      if (itemsWithoutValue.length > 0) {
        console.log('   ⚠️ ', itemsWithoutValue.length, 'inventory items with zero value')
      }
      
      // 6. Recommendations
      console.log('6️⃣ RECOMMENDATIONS:')
      console.log('   1. Implement branch filtering validation')
      console.log('   2. Add data consistency checks')
      console.log('   3. Track inventory adjustments separately')
      console.log('   4. Implement sales order validation')
      console.log('   5. Add date range filtering for better accuracy')
      
      return {
        totalSales,
        totalPurchases,
        totalInventoryValue,
        moneyDifference,
        inconsistencyFound: Math.abs(totalSales - moneyDifference) > totalSales * 0.2
      }
      
    } else {
      console.log('❌ Not running on localhost - skipping diagnostic')
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
  }
}

// Auto-run diagnostic
diagnosticCapitalIntelligence()

// Export for manual testing
if (typeof window !== 'undefined') {
  window.diagnosticCapitalIntelligence = diagnosticCapitalIntelligence
}
