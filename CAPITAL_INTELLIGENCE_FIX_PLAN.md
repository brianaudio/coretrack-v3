// Capital Intelligence Fix Plan
// Addressing data inconsistency issues

## IMMEDIATE FIXES NEEDED:

### 1. UI Label Corrections
- "Recent Orders" → "Recent Sales" (customer purchases)
- "Purchase Orders" → "Recent Purchases" (supplier orders)

### 2. Data Logic Separation
Current Problem:
- Mixing customer sales data with supplier purchase data
- Comparing different time periods
- Confusing money IN vs money OUT

### 3. Proposed New Structure:

#### Section A: Sales Performance (Money IN)
- Recent customer orders (last 30 days)
- Daily sales velocity
- Revenue trends

#### Section B: Procurement Analysis (Money OUT) 
- Recent purchase orders to suppliers
- Capital deployed to inventory
- Supplier spending patterns

#### Section C: Capital Flow Analysis
- Inventory turnover rate
- Cash conversion cycle
- Money flow from purchases → inventory → sales

### 4. Technical Implementation:

```typescript
interface CapitalFlowAnalysis {
  // Sales Performance (Money IN)
  salesPerformance: {
    recentSales: SalesOrder[]
    totalRevenue: number
    dailySalesVelocity: number
    averageOrderValue: number
  }
  
  // Procurement Analysis (Money OUT)
  procurementAnalysis: {
    recentPurchases: PurchaseOrder[]
    totalCapitalDeployed: number
    averagePurchaseValue: number
    supplierBreakdown: SupplierSpending[]
  }
  
  // Inventory Analysis (Money TIED UP)
  inventoryAnalysis: {
    currentValue: number
    turnoverRate: number
    slowMovingItems: InventoryItem[]
    stockoutRisk: InventoryItem[]
  }
  
  // Integrated Capital Flow
  capitalFlow: {
    purchaseToSalesRatio: number
    inventoryTurnoverDays: number
    cashConversionCycle: number
    capitalEfficiencyScore: number
  }
}
```

### 5. Root Cause Analysis:
- Business logic confusion between different order types
- Time period misalignment  
- Missing inventory movement tracking
- Inconsistent branch filtering across collections

### 6. Data Quality Issues:
- Purchase orders and sales orders may have different branch ID schemas
- Date ranges not aligned between data sources
- Missing validation for zero/null values
- No audit trail for inventory adjustments

### 7. Proposed Solution Priority:
1. 🔴 HIGH: Fix UI labels and user confusion
2. 🟡 MEDIUM: Implement separate analysis sections  
3. 🟢 LOW: Add inventory movement tracking system
