/**
 * 🚢 SHIPPING COST DISTRIBUTION UTILITY
 * 
 * Distributes shipping fees across purchase order items proportionally
 * to calculate accurate total unit costs for inventory management.
 * 
 * Methods:
 * - By Item Value (default): Distributes shipping based on item total value
 * - By Quantity: Distributes shipping equally across all units
 * - By Weight: Distributes shipping based on item weight (future enhancement)
 */

export interface ShippingDistributionItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number; // For weight-based distribution (future)
}

export interface DistributedItem extends ShippingDistributionItem {
  distributedShipping: number;
  adjustedUnitPrice: number; // unitPrice + (distributedShipping / quantity)
}

export type DistributionMethod = 'by-value' | 'by-quantity' | 'by-weight';

/**
 * Distributes shipping costs across items proportionally
 */
export function distributeShippingCosts(
  items: ShippingDistributionItem[],
  shippingFee: number,
  method: DistributionMethod = 'by-value'
): DistributedItem[] {
  if (shippingFee <= 0 || items.length === 0) {
    // No shipping to distribute, return original prices
    return items.map(item => ({
      ...item,
      distributedShipping: 0,
      adjustedUnitPrice: item.unitPrice
    }));
  }

  switch (method) {
    case 'by-value':
      return distributeByValue(items, shippingFee);
    
    case 'by-quantity':
      return distributeByQuantity(items, shippingFee);
    
    case 'by-weight':
      return distributeByWeight(items, shippingFee);
    
    default:
      throw new Error(`Unknown distribution method: ${method}`);
  }
}

/**
 * Distributes shipping proportionally based on item total value
 * Higher value items get more shipping cost allocated
 */
function distributeByValue(items: ShippingDistributionItem[], shippingFee: number): DistributedItem[] {
  const totalValue = items.reduce((sum, item) => sum + item.total, 0);
  
  if (totalValue === 0) {
    throw new Error('Cannot distribute shipping by value when total value is zero');
  }

  let remainingShipping = shippingFee;
  const result: DistributedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // For the last item, use remaining shipping to avoid rounding errors
    const distributedShipping = i === items.length - 1 
      ? remainingShipping 
      : Math.round((item.total / totalValue) * shippingFee * 100) / 100;
    
    remainingShipping -= distributedShipping;
    
    const adjustedUnitPrice = item.unitPrice + (distributedShipping / item.quantity);
    
    result.push({
      ...item,
      distributedShipping,
      adjustedUnitPrice
    });
  }

  return result;
}

/**
 * Distributes shipping equally across all units
 * Each unit gets the same shipping cost added
 */
function distributeByQuantity(items: ShippingDistributionItem[], shippingFee: number): DistributedItem[] {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalQuantity === 0) {
    throw new Error('Cannot distribute shipping by quantity when total quantity is zero');
  }

  const shippingPerUnit = shippingFee / totalQuantity;
  
  return items.map(item => ({
    ...item,
    distributedShipping: shippingPerUnit * item.quantity,
    adjustedUnitPrice: item.unitPrice + shippingPerUnit
  }));
}

/**
 * Distributes shipping based on item weight
 * Heavier items get more shipping cost allocated
 * Note: Requires weight data for each item
 */
function distributeByWeight(items: ShippingDistributionItem[], shippingFee: number): DistributedItem[] {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  
  if (totalWeight === 0) {
    throw new Error('Cannot distribute shipping by weight when no weight data is available');
  }

  let remainingShipping = shippingFee;
  const result: DistributedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemWeight = item.weight || 0;
    
    // For the last item, use remaining shipping to avoid rounding errors
    const distributedShipping = i === items.length - 1 
      ? remainingShipping 
      : Math.round((itemWeight / totalWeight) * shippingFee * 100) / 100;
    
    remainingShipping -= distributedShipping;
    
    const adjustedUnitPrice = item.unitPrice + (distributedShipping / item.quantity);
    
    result.push({
      ...item,
      distributedShipping,
      adjustedUnitPrice
    });
  }

  return result;
}

/**
 * Validates distribution results
 * Ensures all shipping fee is accounted for (within rounding tolerance)
 */
export function validateDistribution(
  distributedItems: DistributedItem[],
  originalShippingFee: number,
  tolerance: number = 0.01
): { isValid: boolean; actualTotal: number; difference: number } {
  const actualTotal = distributedItems.reduce((sum, item) => sum + item.distributedShipping, 0);
  const difference = Math.abs(actualTotal - originalShippingFee);
  const isValid = difference <= tolerance;

  return {
    isValid,
    actualTotal,
    difference
  };
}

/**
 * Example usage and testing
 */
export function exampleUsage() {
  const items: ShippingDistributionItem[] = [
    { itemName: 'Coffee Beans', quantity: 100, unitPrice: 1.00, total: 100.00 },
    { itemName: 'Sugar', quantity: 50, unitPrice: 0.50, total: 25.00 },
    { itemName: 'Milk', quantity: 20, unitPrice: 2.00, total: 40.00 }
  ];
  
  const shippingFee = 20.00;
  
  console.log('=== SHIPPING DISTRIBUTION EXAMPLE ===');
  console.log(`Shipping Fee to Distribute: $${shippingFee}`);
  console.log(`Items Subtotal: $${items.reduce((sum, item) => sum + item.total, 0)}`);
  console.log();
  
  // Test by-value distribution
  const byValue = distributeShippingCosts(items, shippingFee, 'by-value');
  console.log('BY VALUE DISTRIBUTION:');
  byValue.forEach(item => {
    console.log(`${item.itemName}: $${item.unitPrice} → $${item.adjustedUnitPrice.toFixed(4)} (+$${item.distributedShipping.toFixed(2)} shipping)`);
  });
  
  const validation = validateDistribution(byValue, shippingFee);
  console.log(`Validation: ${validation.isValid ? 'PASS' : 'FAIL'} (difference: $${validation.difference.toFixed(2)})`);
  
  return byValue;
}

// For testing in Node.js
if (typeof module !== 'undefined' && require.main === module) {
  exampleUsage();
}
