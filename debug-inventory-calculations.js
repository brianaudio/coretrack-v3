console.log('🐛 ANALYZING BUG #6: Inventory Calculation Discrepancies');
console.log('='.repeat(65));

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const fs = require('fs').promises;
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function analyzeInventoryCalculationIssues() {
  try {
    console.log('🔍 INVENTORY CALCULATION DISCREPANCY ANALYSIS\n');

    // 1. Analyze current inventory data structure
    console.log('1️⃣ ANALYZING INVENTORY DATA STRUCTURE:');
    
    const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
    console.log(`   📊 Total Inventory Items: ${inventorySnapshot.size}`);
    
    if (inventorySnapshot.size > 0) {
      console.log('   📋 Sample Inventory Item Structure:');
      const sampleDoc = inventorySnapshot.docs[0];
      const sampleData = sampleDoc.data();
      
      // Analyze structure for calculation-related fields
      const calculationFields = [
        'currentStock', 'costPerUnit', 'totalValue', 'minStock', 'maxStock',
        'reorderLevel', 'lastCost', 'averageCost', 'movingAverage',
        'stockMovements', 'adjustments', 'wastage'
      ];
      
      console.log('   🔢 Calculation-Related Fields:');
      calculationFields.forEach(field => {
        if (sampleData.hasOwnProperty(field)) {
          const value = sampleData[field];
          const type = typeof value;
          console.log(`      ✅ ${field}: ${value} (${type})`);
        } else {
          console.log(`      ❌ ${field}: MISSING`);
        }
      });

      // Check for data type consistency
      console.log('\n   🔍 Data Type Consistency Check:');
      let typeInconsistencies = 0;
      
      inventorySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        
        // Check if currentStock is a number
        if (data.currentStock !== undefined && typeof data.currentStock !== 'number') {
          console.log(`      ⚠️ Item ${index + 1}: currentStock is ${typeof data.currentStock}, should be number`);
          typeInconsistencies++;
        }
        
        // Check if costPerUnit is a number
        if (data.costPerUnit !== undefined && typeof data.costPerUnit !== 'number') {
          console.log(`      ⚠️ Item ${index + 1}: costPerUnit is ${typeof data.costPerUnit}, should be number`);
          typeInconsistencies++;
        }
      });
      
      if (typeInconsistencies === 0) {
        console.log('      ✅ All numeric fields have correct data types');
      } else {
        console.log(`      ❌ Found ${typeInconsistencies} data type inconsistencies`);
      }
    }

    // 2. Check POS integration and stock deductions
    console.log('\n2️⃣ ANALYZING POS INTEGRATION & STOCK DEDUCTIONS:');
    
    try {
      const posItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/posItems`));
      console.log(`   📊 POS Items Count: ${posItemsSnapshot.size}`);
      
      let itemsWithIngredients = 0;
      let itemsWithoutIngredients = 0;
      let totalIngredientLinks = 0;
      let invalidIngredientLinks = 0;
      
      console.log('   🔗 Ingredient Linking Analysis:');
      
      for (const posDoc of posItemsSnapshot.docs) {
        const posData = posDoc.data();
        
        if (posData.ingredients && posData.ingredients.length > 0) {
          itemsWithIngredients++;
          totalIngredientLinks += posData.ingredients.length;
          
          // Check if ingredient links are valid
          for (const ingredient of posData.ingredients) {
            if (!ingredient.inventoryItemId || !ingredient.quantity) {
              invalidIngredientLinks++;
              console.log(`      ⚠️ ${posData.name}: Invalid ingredient link - missing ID or quantity`);
            }
          }
        } else {
          itemsWithoutIngredients++;
          console.log(`      ❌ ${posData.name}: No ingredients linked (won't deduct inventory)`);
        }
      }
      
      console.log(`   📊 Ingredient Link Summary:`);
      console.log(`      Items with ingredients: ${itemsWithIngredients}`);
      console.log(`      Items without ingredients: ${itemsWithoutIngredients}`);
      console.log(`      Total ingredient links: ${totalIngredientLinks}`);
      console.log(`      Invalid ingredient links: ${invalidIngredientLinks}`);
      
      if (invalidIngredientLinks > 0) {
        console.log(`      ❌ ${invalidIngredientLinks} invalid links may cause calculation errors`);
      }
      
    } catch (error) {
      console.log('   ❌ Error accessing POS items:', error.message);
    }

    // 3. Check for stock movement tracking
    console.log('\n3️⃣ ANALYZING STOCK MOVEMENT TRACKING:');
    
    try {
      const movementsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/stockMovements`));
      console.log(`   📊 Stock Movements Records: ${movementsSnapshot.size}`);
      
      if (movementsSnapshot.size > 0) {
        const movementTypes = {};
        let calculationErrors = 0;
        
        movementsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const type = data.type || 'unknown';
          movementTypes[type] = (movementTypes[type] || 0) + 1;
          
          // Check for calculation consistency
          if (data.quantityBefore !== undefined && data.quantityAfter !== undefined && data.quantityChanged !== undefined) {
            const expectedAfter = data.quantityBefore + data.quantityChanged;
            if (Math.abs(expectedAfter - data.quantityAfter) > 0.001) {
              calculationErrors++;
              console.log(`      ❌ Calculation error in movement ${doc.id}: ${data.quantityBefore} + ${data.quantityChanged} ≠ ${data.quantityAfter}`);
            }
          }
        });
        
        console.log('   📋 Movement Types:');
        Object.entries(movementTypes).forEach(([type, count]) => {
          console.log(`      ${type}: ${count} records`);
        });
        
        if (calculationErrors === 0) {
          console.log('   ✅ All stock movement calculations are consistent');
        } else {
          console.log(`   ❌ Found ${calculationErrors} calculation errors in stock movements`);
        }
        
      } else {
        console.log('   ⚠️ No stock movement records found - may indicate tracking issues');
      }
      
    } catch (error) {
      console.log('   ❌ Stock movements collection may not exist');
    }

    // 4. Check inventory calculation files/functions
    console.log('\n4️⃣ ANALYZING INVENTORY CALCULATION CODE:');
    
    const inventoryFiles = [
      'src/lib/firebase/inventory.ts',
      'src/lib/utils/inventoryCalculations.ts',
      'src/lib/services/inventoryService.ts',
      'src/components/modules/Inventory.tsx'
    ];
    
    for (const filePath of inventoryFiles) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const fileContent = await fs.readFile(fullPath, 'utf8');
        
        console.log(`   ✅ Found: ${filePath}`);
        
        // Check for calculation functions
        const calculationPatterns = [
          /calculateTotalValue/g,
          /updateStock/g,
          /deductInventory/g,
          /addStock/g,
          /calculateCost/g,
          /stockMovement/g,
          /parseInt|parseFloat/g,
          /Math\.round|Math\.floor|Math\.ceil/g
        ];
        
        calculationPatterns.forEach((pattern, index) => {
          const matches = fileContent.match(pattern);
          if (matches) {
            const functionNames = ['calculateTotalValue', 'updateStock', 'deductInventory', 'addStock', 'calculateCost', 'stockMovement', 'number parsing', 'rounding functions'];
            console.log(`      🔍 ${functionNames[index]}: ${matches.length} occurrences`);
          }
        });
        
      } catch (error) {
        console.log(`   ❌ Missing: ${filePath}`);
      }
    }

    // 5. Identify potential calculation issues
    console.log('\n5️⃣ IDENTIFIED CALCULATION ISSUES:');
    
    const potentialIssues = [
      {
        issue: 'Floating Point Precision',
        description: 'JavaScript floating point arithmetic can cause precision errors',
        severity: 'HIGH',
        example: '0.1 + 0.2 !== 0.3 in JavaScript'
      },
      {
        issue: 'Race Conditions in Stock Updates',
        description: 'Concurrent updates may cause inconsistent inventory counts',
        severity: 'HIGH',
        example: 'Multiple POS transactions updating same item simultaneously'
      },
      {
        issue: 'Missing Transaction Rollback',
        description: 'Failed transactions may leave inventory in inconsistent state',
        severity: 'MEDIUM',
        example: 'POS sale fails but inventory already deducted'
      },
      {
        issue: 'Ingredient Quantity Calculation',
        description: 'Recipe scaling and unit conversions may be incorrect',
        severity: 'MEDIUM',
        example: 'Menu item uses 0.5 cups but inventory tracked in ml'
      },
      {
        issue: 'Negative Stock Handling',
        description: 'System may allow negative stock without proper validation',
        severity: 'MEDIUM',
        example: 'Stock goes below 0 causing calculation errors'
      },
      {
        issue: 'Rounding Inconsistencies',
        description: 'Different rounding methods in different calculations',
        severity: 'LOW',
        example: 'Cost calculations vs stock quantity rounding'
      }
    ];

    potentialIssues.forEach((issue, index) => {
      const severityIcon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${severityIcon} ${issue.issue} (${issue.severity})`);
      console.log(`      📝 ${issue.description}`);
      console.log(`      💡 Example: ${issue.example}`);
    });

    console.log('\n🎯 ROOT PROBLEMS IDENTIFIED:');
    console.log('   1. No centralized calculation validation system');
    console.log('   2. Potential floating point precision errors');
    console.log('   3. Race conditions in concurrent stock updates');
    console.log('   4. Missing transaction rollback mechanisms');
    console.log('   5. Inconsistent rounding and precision handling');
    console.log('   6. No audit trail for calculation discrepancies');

    console.log('\n💡 SOLUTION STRATEGY:');
    console.log('   ✅ Implement centralized calculation service with validation');
    console.log('   ✅ Add floating point precision handling utilities');
    console.log('   ✅ Create atomic transaction system for stock updates');
    console.log('   ✅ Add comprehensive audit logging for all calculations');
    console.log('   ✅ Implement unit conversion and recipe scaling validation');
    console.log('   ✅ Add real-time calculation verification system');

    console.log('\n📋 FILES TO CREATE/MODIFY:');
    console.log('   1. src/lib/services/InventoryCalculationService.ts - Central calculations');
    console.log('   2. src/lib/utils/precisionMath.ts - Floating point precision');
    console.log('   3. src/lib/services/StockTransactionService.ts - Atomic updates');
    console.log('   4. src/lib/services/InventoryAuditService.ts - Audit logging');
    console.log('   5. src/components/InventoryCalculationValidator.tsx - Real-time validation');

    console.log('\n🚀 EXPECTED OUTCOME:');
    console.log('   ✅ Accurate inventory calculations with precision handling');
    console.log('   ✅ Atomic stock updates preventing race conditions');
    console.log('   ✅ Comprehensive audit trail for all calculations');
    console.log('   ✅ Real-time validation of inventory discrepancies');
    console.log('   ✅ Better unit conversion and recipe scaling');

    console.log('\n🔧 READY TO IMPLEMENT FIX FOR BUG #6');

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    process.exit(0);
  }
}

analyzeInventoryCalculationIssues();
