# Menu Item Price Synchronization System

## Overview
When ingredient costs change due to purchase order deliveries, the system now automatically analyzes and optionally updates menu item prices to maintain target profit margins.

## How It Works

### Automatic Cost Recalculation
When a purchase order is delivered and ingredient costs change:

1. **Identify Affected Menu Items**: Find all menu items using the updated ingredient
2. **Recalculate Item Costs**: Apply new weighted average costs to menu items
3. **Analyze Profit Impact**: Calculate how price changes affect profit margins
4. **Suggest Price Updates**: Recommend new selling prices to maintain margins
5. **Update Menu Items**: Automatically or manually update prices based on settings

## Business Scenarios

### Scenario 1: Ingredient Price Increase
```
Original State:
- Coffee Beans: ₱1.0 per kg
- Cappuccino Recipe: 0.05 kg coffee beans = ₱0.05 ingredient cost
- Cappuccino Price: ₱50.00 (99% profit margin)

After Purchase Order:
- Coffee Beans: ₱1.5 per kg (50% increase)
- Cappuccino Recipe: 0.05 kg coffee beans = ₱0.075 ingredient cost (+₱0.025)
- Recommended Cappuccino Price: ₱50.25 (maintains 99% margin)
```

### Scenario 2: Multiple Ingredients Update
```
Chocolate Cake Recipe:
- Flour: 0.2 kg @ ₱1.0 = ₱0.20
- Chocolate: 0.1 kg @ ₱5.0 = ₱0.50
- Total Original Cost: ₱0.70

After Purchase Orders:
- Flour: ₱1.2 per kg (+20%)
- Chocolate: ₱6.0 per kg (+20%)
- New Total Cost: ₱0.84 (+₱0.14)

Impact Analysis:
- Old Selling Price: ₱15.00 (95.3% margin)
- New Cost Impact: Margin drops to 94.4%
- Recommended Price: ₱15.14 (maintains 95.3% margin)
```

## Implementation Features

### 1. Automatic Menu Analysis
- Triggered after purchase order delivery
- Identifies all affected menu items
- Calculates new ingredient costs
- Compares old vs new profit margins

### 2. Smart Price Recommendations
- Maintains target profit margins
- Considers price psychology (round numbers)
- Factors in competitor pricing limits
- Suggests minimal price adjustments

### 3. Flexible Update Options
- **Automatic**: Updates prices immediately
- **Review Required**: Flags items for manual review
- **Notification Only**: Alerts managers to review
- **Threshold Based**: Auto-update small changes, review large ones

### 4. Impact Reporting
- Shows cost change breakdown
- Calculates profit margin impact
- Estimates revenue impact
- Provides competitor price warnings

## Technical Implementation

### New Functions in `/src/lib/firebase/menuPriceSync.ts`

```typescript
// Analyze menu items affected by ingredient cost changes
export const analyzeMenuItemCostImpact = async (
  tenantId: string,
  updatedIngredientIds: string[]
): Promise<MenuCostImpactAnalysis[]>

// Update menu item prices based on cost changes
export const updateMenuItemPrices = async (
  tenantId: string,
  priceUpdates: MenuPriceUpdate[]
): Promise<void>

// Get price recommendations for menu items
export const getMenuPriceRecommendations = async (
  tenantId: string,
  menuItemIds: string[]
): Promise<MenuPriceRecommendation[]>
```

### Enhanced Purchase Order Delivery Process

1. **Existing**: Update inventory with weighted average costs
2. **New**: Analyze affected menu items
3. **New**: Calculate price recommendations
4. **New**: Apply automatic updates or flag for review
5. **New**: Log price changes and send notifications

## Business Rules

### Price Update Thresholds
- **Auto-Update**: Cost changes ≤ 2% of selling price
- **Review Required**: Cost changes > 2% but ≤ 10%
- **Manual Only**: Cost changes > 10% (significant impact)

### Margin Protection
- **Maintain Target**: Keep profit margins within ±1% of target
- **Minimum Margin**: Never allow margins below 20%
- **Maximum Increase**: Limit price increases to 15% per update

### Pricing Psychology
- **Round to Nearest**: ₱0.25 for prices under ₱10
- **Round to Nearest**: ₱1.00 for prices ₱10-100
- **Round to Nearest**: ₱5.00 for prices over ₱100

## User Experience

### Manager Dashboard
- **Price Change Alerts**: Notifications when ingredients affect menu prices
- **Impact Summary**: Visual dashboard showing cost change impact
- **Batch Approval**: Review and approve multiple price changes at once
- **Price History**: Track how ingredient costs affect menu pricing over time

### Automatic Notifications
- Email/SMS alerts for significant price changes
- Daily summary of automated price adjustments
- Weekly cost trend reports
- Monthly profit margin analysis

## Configuration Options

### Per-Tenant Settings
```typescript
interface MenuPricingSettings {
  autoUpdateThreshold: number;  // Max % change for auto-update
  maintainMargins: boolean;     // Auto-adjust to maintain margins
  roundingRules: PriceRounding; // How to round calculated prices
  notificationSettings: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
  };
  marginProtection: {
    targetMargin: number;       // Desired profit margin %
    minimumMargin: number;      // Never go below this %
    maxPriceIncrease: number;   // Max % increase per update
  };
}
```

## Benefits

### 1. **Automated Profit Protection**
- Maintains consistent profit margins
- Prevents revenue loss from cost increases
- Reduces manual price management overhead

### 2. **Real-Time Cost Accuracy**
- Menu prices reflect current ingredient costs
- Accurate profit calculations
- Better financial forecasting

### 3. **Competitive Intelligence**
- Price change impact analysis
- Market positioning maintenance
- Revenue optimization

### 4. **Operational Efficiency**
- Reduces manual price updates
- Eliminates calculation errors
- Saves management time

## Future Enhancements

### Advanced Features
- **Seasonal Pricing**: Automatic adjustments for seasonal ingredient costs
- **Competitor Monitoring**: API integration for competitor price tracking
- **Dynamic Pricing**: Time-based pricing optimization
- **Customer Segmentation**: Different pricing for different customer types

### Analytics Integration
- **Cost Trend Analysis**: Historical ingredient cost patterns
- **Price Elasticity**: Customer response to price changes
- **Profit Optimization**: AI-driven price recommendations
- **Market Analysis**: Regional pricing comparisons

## Implementation Status

✅ **Phase 1**: Ingredient cost tracking (Complete)
🚧 **Phase 2**: Menu cost impact analysis (In Progress)
⏳ **Phase 3**: Automatic price recommendations (Planned)
⏳ **Phase 4**: Advanced analytics and AI optimization (Future)
