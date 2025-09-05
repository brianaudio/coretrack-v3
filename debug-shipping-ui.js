#!/usr/bin/env node

/**
 * 🔍 SHIPPING FEE UI DEBUG
 * 
 * This script adds debug logging to trace shipping fee data in the browser
 */

console.log('🔍 SHIPPING FEE UI DEBUG');
console.log('========================');

const fs = require('fs');
const path = require('path');

// Add debug logging to the purchase order creation
const poComponentFile = path.join(__dirname, 'src/components/modules/PurchaseOrders.tsx');
let content = fs.readFileSync(poComponentFile, 'utf8');

// Check if we already have debug logging
if (content.includes('SHIPPING_DEBUG')) {
  console.log('✅ Debug logging already present');
} else {
  console.log('⚠️ Adding debug logging...');
  
  // Add debug logging to shipping fee onChange
  const oldOnChange = `onChange={(e) => setNewOrder(prev => ({ ...prev, shippingFee: parseFloat(e.target.value) || 0 }))}`;
  const newOnChange = `onChange={(e) => {
          const shippingValue = parseFloat(e.target.value) || 0;
          console.log('SHIPPING_DEBUG: Setting shipping fee to:', shippingValue);
          setNewOrder(prev => ({ ...prev, shippingFee: shippingValue }));
        }}`;
  
  if (content.includes(oldOnChange)) {
    content = content.replace(oldOnChange, newOnChange);
    console.log('✅ Added shipping fee input debug logging');
  }
  
  // Add debug logging to order creation
  const orderCreationPattern = /const orderData = \{([^}]+)\}/s;
  const match = content.match(orderCreationPattern);
  
  if (match) {
    const orderDataSection = match[0];
    const debugOrderData = orderDataSection.replace(
      'const orderData = {',
      `console.log('SHIPPING_DEBUG: Creating order with newOrder.shippingFee:', newOrder.shippingFee);
        const orderData = {`
    );
    content = content.replace(orderDataSection, debugOrderData);
    console.log('✅ Added order creation debug logging');
  }
  
  // Save the file with debug logging
  fs.writeFileSync(poComponentFile, content);
  console.log('💾 Debug logging added to PurchaseOrders.tsx');
}

console.log('\n🧪 TESTING INSTRUCTIONS');
console.log('=======================');
console.log('1. Open your browser and go to CoreTrack');
console.log('2. Open Developer Tools (F12) and go to Console tab');
console.log('3. Create a new purchase order');
console.log('4. Scroll down to find the "Shipping & Fees" section');
console.log('5. Enter a shipping fee value (e.g., 25.50)');
console.log('6. Watch the console for SHIPPING_DEBUG messages');
console.log('7. Complete the purchase order creation');
console.log('8. Look for debug messages showing the shipping fee value');
console.log('\n💡 What to look for:');
console.log('   - "SHIPPING_DEBUG: Setting shipping fee to: [value]"');
console.log('   - "SHIPPING_DEBUG: Creating order with newOrder.shippingFee: [value]"');
console.log('\n❗ If you don\'t see the Shipping & Fees section:');
console.log('   - Make sure you scroll down in the modal');
console.log('   - It appears after the Notes section');
console.log('   - Look for a green truck icon with "Shipping & Fees" text');
