# Purchase Order Price Management System

## Overview
CoreTrack now implements an intelligent **Weighted Average Cost** method to handle price changes between inventory items and purchase orders. This ensures that inventory costs accurately reflect the blended cost of all stock received over time.

## How It Works

### Problem Scenario
- **Inventory Item**: "Coffee Beans" - 100 units @ ₱1.0 per unit
- **New Purchase Order**: "Coffee Beans" - 50 units @ ₱1.5 per unit (price increased)

### Solution: Weighted Average Cost

When a purchase order is delivered with a different unit price than what's in inventory, the system calculates a new weighted average cost:

```
Existing Inventory Value = 100 units × ₱1.0 = ₱100.00
New Purchase Value = 50 units × ₱1.5 = ₱75.00
Total Value = ₱100.00 + ₱75.00 = ₱175.00
Total Quantity = 100 + 50 = 150 units
New Weighted Average = ₱175.00 ÷ 150 = ₱1.17 per unit
```

## System Behavior

### When Receiving Purchase Orders:

1. **No Existing Cost**: Uses the purchase order price directly
2. **Existing Cost = ₱0**: Uses the purchase order price directly  
3. **Existing Cost > ₱0**: Calculates weighted average between existing inventory and new purchase

### Inventory Movement Tracking

The system logs detailed movement records:
- **Regular deliveries**: "Purchase order delivery received"
- **Price changes**: "Purchase order delivery received - Price updated from ₱1.00 to ₱1.17 (weighted average)"

## Benefits

### 1. **Accurate Cost Tracking**
- Reflects true blended cost of inventory
- Accounts for price inflation over time
- Maintains cost history through movement logs

### 2. **Automatic Price Updates**
- No manual intervention required
- Transparent calculation method
- Detailed logging for audit trails

### 3. **Business Intelligence**
- Track price trends over time
- Calculate true inventory valuation
- Support accurate pricing decisions

## Examples

### Example 1: First Purchase
```
Inventory: Coffee Beans (0 units, no cost set)
Purchase Order: 100 units @ ₱1.0
Result: 100 units @ ₱1.0 per unit
```

### Example 2: Price Increase
```
Existing: Coffee Beans (100 units @ ₱1.0)
Purchase Order: 50 units @ ₱1.5
Calculation: (100×₱1.0 + 50×₱1.5) ÷ 150 = ₱1.17
Result: 150 units @ ₱1.17 per unit
```

### Example 3: Price Decrease
```
Existing: Coffee Beans (100 units @ ₱1.5)
Purchase Order: 200 units @ ₱1.0
Calculation: (100×₱1.5 + 200×₱1.0) ÷ 300 = ₱1.17
Result: 300 units @ ₱1.17 per unit
```

## Technical Implementation

### File: `/src/lib/firebase/inventory.ts`
- `updateInventoryFromDelivery()` function handles price calculations
- Weighted average formula applied automatically
- Enhanced movement logging includes price change details

### Console Logging
When prices change, the system outputs detailed calculation logs:
```
📊 Price Update for Coffee Beans:
   - Existing: 100 units @ ₱1.00 = ₱100.00
   - New: 50 units @ ₱1.50 = ₱75.00
   - Weighted Average: ₱1.17 per unit
```

## Best Practices

### For Business Owners:
1. **Monitor Price Trends**: Check inventory movement logs regularly
2. **Review Weighted Averages**: Ensure costs align with market expectations
3. **Update Selling Prices**: Adjust menu/product prices based on new weighted costs

### For Inventory Managers:
1. **Verify Delivery Prices**: Ensure purchase order prices are accurate before delivery
2. **Check Cost Updates**: Review inventory costs after major deliveries
3. **Track Supplier Changes**: Monitor which suppliers cause significant price changes

## Future Enhancements

### Potential Features:
- **Price Alert System**: Notify when unit costs change significantly
- **Cost History Dashboard**: Visual tracking of price changes over time
- **Supplier Price Comparison**: Compare costs across different suppliers
- **Manual Price Override**: Option to manually set costs when needed

## Related Features

- **Purchase Order Management**: Creates orders with current market prices
- **Inventory Center**: Displays weighted average costs
- **Movement History**: Tracks all cost changes with detailed reasons
- **Analytics Dashboard**: Uses accurate costs for profit calculations
