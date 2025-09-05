#!/usr/bin/env node

/**
 * 🧪 SHIPPING DISTRIBUTION TEST
 * Tests the shipping cost distribution functionality
 */

// Mock the shipping distribution logic for testing
function distributeShippingByValue(items, shippingFee) {
  const totalValue = items.reduce((sum, item) => sum + item.total, 0);
  
  if (totalValue === 0) {
    throw new Error('Cannot distribute shipping by value when total value is zero');
  }

  let remainingShipping = shippingFee;
  const result = [];

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

console.log('🧪 SHIPPING DISTRIBUTION TEST');
console.log('=============================');

// Test case: Real-world example
const items = [
  { itemName: 'Coffee Beans', quantity: 100, unitPrice: 1.00, total: 100.00 },
  { itemName: 'Sugar', quantity: 50, unitPrice: 0.50, total: 25.00 },
  { itemName: 'Milk', quantity: 20, unitPrice: 2.00, total: 40.00 }
];

const shippingFee = 20.00;
const originalSubtotal = items.reduce((sum, item) => sum + item.total, 0);

console.log(`Original Order:`);
console.log(`- Subtotal: $${originalSubtotal.toFixed(2)}`);
console.log(`- Shipping: $${shippingFee.toFixed(2)}`);
console.log(`- Total: $${(originalSubtotal + shippingFee).toFixed(2)}`);
console.log();

const distributed = distributeShippingByValue(items, shippingFee);

console.log('After Shipping Distribution:');
console.log('Item                  | Qty | Base Price | Shipping | New Price | Total Impact');
console.log('---------------------+-----+------------+----------+-----------+-------------');

let totalDistributedShipping = 0;
let totalNewValue = 0;

distributed.forEach(item => {
  const oldTotal = item.quantity * item.unitPrice;
  const newTotal = item.quantity * item.adjustedUnitPrice;
  const impact = newTotal - oldTotal;
  
  totalDistributedShipping += item.distributedShipping;
  totalNewValue += newTotal;
  
  console.log(`${item.itemName.padEnd(20)} | ${item.quantity.toString().padStart(3)} | $${item.unitPrice.toFixed(4).padStart(8)} | $${item.distributedShipping.toFixed(2).padStart(6)} | $${item.adjustedUnitPrice.toFixed(4).padStart(7)} | $${impact.toFixed(2).padStart(9)}`);
});

console.log('---------------------+-----+------------+----------+-----------+-------------');
console.log(`${'TOTALS'.padEnd(20)} | ${items.reduce((sum, item) => sum + item.quantity, 0).toString().padStart(3)} | $${originalSubtotal.toFixed(2).padStart(8)} | $${totalDistributedShipping.toFixed(2).padStart(6)} | ${''.padStart(7)} | $${(totalNewValue - originalSubtotal).toFixed(2).padStart(9)}`);

console.log();
console.log('Validation:');
console.log(`- Shipping to distribute: $${shippingFee.toFixed(2)}`);
console.log(`- Shipping distributed: $${totalDistributedShipping.toFixed(2)}`);
console.log(`- Difference: $${Math.abs(shippingFee - totalDistributedShipping).toFixed(2)}`);
console.log(`- Status: ${Math.abs(shippingFee - totalDistributedShipping) < 0.01 ? '✅ PASS' : '❌ FAIL'}`);

console.log();
console.log('Business Impact Example:');
console.log('Before Fix: Coffee cost was $1.00/unit');
console.log(`After Fix: Coffee cost is $${distributed[0].adjustedUnitPrice.toFixed(4)}/unit`);
console.log(`Difference: $${(distributed[0].adjustedUnitPrice - 1.00).toFixed(4)}/unit more accurate`);
console.log();
console.log('For a coffee shop selling 1000 cups using 1 unit per cup:');
console.log(`- Old cost calculation: 1000 × $1.00 = $1,000.00`);
console.log(`- New cost calculation: 1000 × $${distributed[0].adjustedUnitPrice.toFixed(4)} = $${(1000 * distributed[0].adjustedUnitPrice).toFixed(2)}`);
console.log(`- Cost accuracy improvement: $${(1000 * (distributed[0].adjustedUnitPrice - 1.00)).toFixed(2)}`);
