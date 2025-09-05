#!/usr/bin/env node

/**
 * 🔍 SHIPPING FEE DATA FLOW DEBUG
 * 
 * This script helps debug the exact flow of shipping fee data from UI to database
 * to delivery calculation to verify where the issue might be occurring.
 */

console.log('🔍 SHIPPING FEE DATA FLOW DEBUG');
console.log('===============================');
console.log(`Debug Date: ${new Date().toISOString()}`);
console.log();

const fs = require('fs');
const path = require('path');

// Check 1: Verify PurchaseOrders.tsx has shipping fee input
console.log('📊 CHECK 1: UI SHIPPING FEE INPUT');
console.log('==================================');

const poComponentFile = path.join(__dirname, 'src/components/modules/PurchaseOrders.tsx');
const poContent = fs.readFileSync(poComponentFile, 'utf8');

// Look for shipping fee input field
const hasShippingInput = poContent.includes('placeholder="Enter shipping fee"') || 
                        poContent.includes('shippingFee') && poContent.includes('input');

console.log(`✅ Shipping fee input field: ${hasShippingInput ? 'FOUND' : 'NOT FOUND'}`);

// Look for shipping fee in state
const hasShippingInState = poContent.includes('shippingFee: 0') || 
                          poContent.includes('shippingFee:');

console.log(`✅ Shipping fee in component state: ${hasShippingInState ? 'FOUND' : 'NOT FOUND'}`);

// Look for shipping fee in order data
const hasShippingInOrderData = poContent.includes('shippingFee: newOrder.shippingFee');

console.log(`✅ Shipping fee in orderData: ${hasShippingInOrderData ? 'FOUND' : 'NOT FOUND'}`);

// Check 2: Verify interface includes shipping fee
console.log('\n📊 CHECK 2: INTERFACE DEFINITIONS');
console.log('==================================');

const interfaceFile = path.join(__dirname, 'src/lib/firebase/purchaseOrders.ts');
const interfaceContent = fs.readFileSync(interfaceFile, 'utf8');

const hasShippingInPOInterface = interfaceContent.includes('shippingFee?: number') && 
                                interfaceContent.includes('export interface PurchaseOrder');

const hasShippingInCreateInterface = interfaceContent.includes('shippingFee?: number') && 
                                   interfaceContent.includes('export interface CreatePurchaseOrder');

console.log(`✅ PurchaseOrder interface has shippingFee: ${hasShippingInPOInterface ? 'YES' : 'NO'}`);
console.log(`✅ CreatePurchaseOrder interface has shippingFee: ${hasShippingInCreateInterface ? 'YES' : 'NO'}`);

// Check 3: Verify createPurchaseOrder function spreads all data
console.log('\n📊 CHECK 3: PURCHASE ORDER CREATION');
console.log('====================================');

const hasDataSpread = interfaceContent.includes('...order') && 
                     interfaceContent.includes('createPurchaseOrder');

console.log(`✅ createPurchaseOrder spreads order data: ${hasDataSpread ? 'YES' : 'NO'}`);

// Check 4: Verify delivery function imports and usage
console.log('\n📊 CHECK 4: DELIVERY FUNCTION ROUTING');
console.log('=====================================');

// Check which delivery function is being exported
const usesQuotaOptimized = interfaceContent.includes('export { deliverPurchaseOrderQuotaOptimized as deliverPurchaseOrderAtomic }');

console.log(`✅ Uses quota-optimized delivery: ${usesQuotaOptimized ? 'YES' : 'NO'}`);

// Check 5: Verify quota-optimized function has shipping logic
console.log('\n📊 CHECK 5: QUOTA-OPTIMIZED SHIPPING LOGIC');
console.log('==========================================');

const quotaFile = path.join(__dirname, 'src/lib/firebase/purchaseOrdersQuotaOptimized.ts');
const quotaContent = fs.readFileSync(quotaFile, 'utf8');

const hasOrderDataShipping = quotaContent.includes('orderData.shippingFee');
const hasEffectiveUnitPrice = quotaContent.includes('effectiveUnitPrice');
const hasDistributedShipping = quotaContent.includes('distributedShipping');

console.log(`✅ Accesses orderData.shippingFee: ${hasOrderDataShipping ? 'YES' : 'NO'}`);
console.log(`✅ Calculates effectiveUnitPrice: ${hasEffectiveUnitPrice ? 'YES' : 'NO'}`);
console.log(`✅ Handles distributedShipping: ${hasDistributedShipping ? 'YES' : 'NO'}`);

// Check 6: Debug specific quota-optimized logic
console.log('\n📊 CHECK 6: DETAILED SHIPPING CALCULATION');
console.log('==========================================');

const hasShippingCondition = quotaContent.includes('if (orderShippingFee > 0)');
const hasSubtotalCalc = quotaContent.includes('orderData.items.reduce');
const hasShippingDistribution = quotaContent.includes('(itemTotal / orderSubtotal) * orderShippingFee');

console.log(`✅ Checks if shipping fee > 0: ${hasShippingCondition ? 'YES' : 'NO'}`);
console.log(`✅ Calculates order subtotal: ${hasSubtotalCalc ? 'YES' : 'NO'}`);
console.log(`✅ Distributes shipping proportionally: ${hasShippingDistribution ? 'YES' : 'NO'}`);

// Summary
console.log('\n🎯 SUMMARY DIAGNOSIS');
console.log('====================');

const checks = [
  hasShippingInput,
  hasShippingInState,
  hasShippingInOrderData,
  hasShippingInPOInterface,
  hasShippingInCreateInterface,
  hasDataSpread,
  usesQuotaOptimized,
  hasOrderDataShipping,
  hasEffectiveUnitPrice,
  hasDistributedShipping,
  hasShippingCondition,
  hasSubtotalCalc,
  hasShippingDistribution
];

const passedChecks = checks.filter(Boolean).length;
const totalChecks = checks.length;
const healthScore = (passedChecks / totalChecks) * 100;

console.log(`Health Score: ${passedChecks}/${totalChecks} (${healthScore.toFixed(1)}%)`);

if (healthScore >= 90) {
  console.log('✅ Data flow appears to be complete - issue might be elsewhere');
} else if (healthScore >= 70) {
  console.log('⚠️ Most data flow is correct - some missing pieces');
} else {
  console.log('❌ Significant data flow issues detected');
}

// Specific debugging suggestions
console.log('\n🔧 DEBUGGING SUGGESTIONS');
console.log('========================');

if (!hasShippingInput) {
  console.log('❌ Add shipping fee input field to the UI');
}

if (!hasShippingInOrderData) {
  console.log('❌ Ensure shipping fee is included in orderData object');
}

if (!usesQuotaOptimized) {
  console.log('❌ The delivery function routing might be incorrect');
}

if (!hasOrderDataShipping) {
  console.log('❌ The delivery function is not accessing shipping fee from order data');
}

if (healthScore >= 90) {
  console.log('🧪 Suggested next step: Add console.log debugging to trace actual data values');
  console.log('   1. Log orderData before saving to database');
  console.log('   2. Log orderData when retrieved during delivery');
  console.log('   3. Log calculated effectiveUnitPrice values');
}

console.log();
console.log('💡 If data flow is complete but shipping not working:');
console.log('   - Check browser console for error messages');
console.log('   - Verify shipping fee field is actually being filled by user');
console.log('   - Add debug logs to trace values through the system');
console.log('   - Test with a fresh purchase order (not existing ones without shipping)');
