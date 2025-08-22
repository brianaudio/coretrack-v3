// 🚨 EMERGENCY DEBUG: Payment Analytics $0 Issue
// This will help us understand exactly what's wrong with the payment calculation

console.log('🔧 PAYMENT ANALYTICS DEBUG');
console.log('='.repeat(50));

// From your console logs, we know:
// 1. You have an active shift: currentShiftId: 'hZ164cMywb3uheP32KRk'
// 2. 1 order from current shift (out of 8 total)
// 3. Order total: $135 (3x Mirinda Float 16 oz @ $45 each)
// 4. Payment method: cash

// The issue is likely in the PaymentMethodsAnalytics component
// Let's check the order structure from your logs:

const simulatedOrder = {
  id: "aubObQZDHaFYjYX1PpPK",
  total: 135,
  status: "completed",
  paymentMethod: "cash", // This is the key field!
  items: [
    { name: "Mirinda Float 16 oz", quantity: 3, price: 45 }
  ],
  createdAt: new Date(), // Current time (in shift)
  locationId: "location_9Uvi4cOJf8LyTSyqn6Xb"
};

console.log('📋 Simulated Order Structure:');
console.log(JSON.stringify(simulatedOrder, null, 2));

// Test the payment processing logic from PaymentMethodsAnalytics.tsx
function testPaymentProcessing(order) {
  console.log('\n🔍 Testing Payment Processing Logic...');
  
  const totals = {
    cash: { amount: 0, count: 0 },
    maya: { amount: 0, count: 0 },
    gcash: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 }
  };

  let totalAmount = 0;
  const orderTotal = order.total || 0;
  totalAmount += orderTotal;

  console.log(`Order Total: $${orderTotal}`);

  // This is the exact logic from PaymentMethodsAnalytics.tsx
  if (order.paymentMethods && Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
    console.log('Using paymentMethods array...');
    order.paymentMethods.forEach((payment) => {
      const method = payment.method?.toLowerCase();
      const amount = payment.amount || 0;
      console.log(`Payment: ${method} = $${amount}`);
    });
  } else if (order.paymentMethod) {
    console.log('Using single paymentMethod...');
    const method = order.paymentMethod.toLowerCase();
    console.log(`Payment Method: ${method}`);
    
    let mappedMethod = method;
    if (method === 'paymaya' || method === 'maya') {
      mappedMethod = 'maya';
    } else if (method === 'cash') {
      mappedMethod = 'cash';
    } else if (method === 'gcash') {
      mappedMethod = 'gcash';
    } else if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
      mappedMethod = 'card';
    }

    console.log(`Mapped Method: ${mappedMethod}`);

    if (totals[mappedMethod]) {
      totals[mappedMethod].amount += orderTotal;
      totals[mappedMethod].count += 1;
      console.log(`✅ Added $${orderTotal} to ${mappedMethod}`);
    } else {
      console.log(`❌ Method ${mappedMethod} not found in totals`);
    }
  } else {
    console.log('No payment method found - defaulting to cash...');
    totals.cash.amount += orderTotal;
    totals.cash.count += 1;
  }

  console.log('\n📊 Final Totals:');
  console.log(`Cash: $${totals.cash.amount} (${totals.cash.count} transactions)`);
  console.log(`Maya: $${totals.maya.amount} (${totals.maya.count} transactions)`);
  console.log(`GCash: $${totals.gcash.amount} (${totals.gcash.count} transactions)`);
  console.log(`Card: $${totals.card.amount} (${totals.card.count} transactions)`);
  console.log(`Total Amount: $${totalAmount}`);

  return { totals, totalAmount };
}

// Test with our simulated order
const result = testPaymentProcessing(simulatedOrder);

console.log('\n🎯 DIAGNOSIS:');
if (result.totalAmount > 0 && result.totals.cash.amount > 0) {
  console.log('✅ Logic works correctly - issue must be elsewhere');
  console.log('🔍 Possible causes:');
  console.log('   1. Order structure in Firebase is different');
  console.log('   2. Time filtering is excluding the order');
  console.log('   3. Component is using cached/stale data');
  console.log('   4. Multiple instances of the component running');
} else {
  console.log('❌ Logic has an issue');
}

console.log('\n🚀 NEXT STEPS:');
console.log('1. Check if PaymentMethodsAnalytics is getting the correct orders');
console.log('2. Add console.logs to see what orders are being processed');
console.log('3. Verify the timeFilter is working correctly');
console.log('4. Check if component is re-rendering with stale data');
