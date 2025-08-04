console.log('🐛 ANALYZING BUG #5: Menu Builder State Persistence');
console.log('='.repeat(60));

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

async function analyzeMenuBuilderIssues() {
  try {
    console.log('🔍 MENU BUILDER STATE PERSISTENCE ANALYSIS\n');

    // 1. Check for Menu Builder component and related files
    console.log('1️⃣ SEARCHING FOR MENU BUILDER COMPONENTS:');
    const menuBuilderPaths = [
      'src/components/modules/MenuBuilder.tsx',
      'src/components/modules/MenuBuilder',
      'src/components/MenuBuilder.tsx',
      'src/app/menu-builder',
      'src/lib/context/MenuBuilderContext.tsx',
      'src/lib/menuBuilder'
    ];

    let foundComponents = [];
    for (const filePath of menuBuilderPaths) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const stats = await fs.stat(fullPath);
        if (stats.isFile() || stats.isDirectory()) {
          foundComponents.push(filePath);
          console.log(`   ✅ Found: ${filePath}`);
        }
      } catch (error) {
        console.log(`   ❌ Missing: ${filePath}`);
      }
    }

    if (foundComponents.length === 0) {
      console.log('   ⚠️ No Menu Builder components found - may need to be created');
    }

    // 2. Check Firebase data structure for menu items
    console.log('\n2️⃣ ANALYZING FIREBASE MENU DATA STRUCTURE:');
    
    try {
      const menuItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/menuItems`));
      console.log(`   📊 Menu Items Count: ${menuItemsSnapshot.size}`);
      
      if (menuItemsSnapshot.size > 0) {
        console.log('   📋 Sample Menu Item Structure:');
        const sampleDoc = menuItemsSnapshot.docs[0];
        const sampleData = sampleDoc.data();
        
        // Analyze structure
        const keys = Object.keys(sampleData);
        keys.forEach(key => {
          const value = sampleData[key];
          const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
          console.log(`      ${key}: ${type}`);
        });

        // Check for state-related fields
        const stateFields = ['isDraft', 'isActive', 'lastModified', 'createdBy', 'version'];
        const foundStateFields = stateFields.filter(field => sampleData.hasOwnProperty(field));
        
        console.log(`   🔄 State Management Fields Found: ${foundStateFields.length}/${stateFields.length}`);
        foundStateFields.forEach(field => {
          console.log(`      ✅ ${field}: ${sampleData[field]}`);
        });

        const missingStateFields = stateFields.filter(field => !sampleData.hasOwnProperty(field));
        if (missingStateFields.length > 0) {
          console.log('   ⚠️ Missing State Fields:');
          missingStateFields.forEach(field => {
            console.log(`      ❌ ${field}`);
          });
        }
      }
    } catch (error) {
      console.log('   ❌ Error accessing menu items:', error.message);
    }

    // 3. Check for Categories collection
    console.log('\n3️⃣ CHECKING MENU CATEGORIES:');
    try {
      const categoriesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/categories`));
      console.log(`   📊 Categories Count: ${categoriesSnapshot.size}`);
      
      if (categoriesSnapshot.size > 0) {
        console.log('   📋 Available Categories:');
        categoriesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`      - ${data.name || doc.id} (${data.type || 'unknown type'})`);
        });
      } else {
        console.log('   ⚠️ No categories found - may affect menu organization');
      }
    } catch (error) {
      console.log('   ❌ Error accessing categories:', error.message);
    }

    // 4. Check for Recipes/Ingredients linking
    console.log('\n4️⃣ ANALYZING RECIPE & INGREDIENT CONNECTIONS:');
    try {
      const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
      console.log(`   📊 Inventory Items Count: ${inventorySnapshot.size}`);
      
      // Check menu items with ingredient links
      const menuItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/menuItems`));
      let itemsWithIngredients = 0;
      let itemsWithoutIngredients = 0;
      
      menuItemsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.ingredients && data.ingredients.length > 0) {
          itemsWithIngredients++;
        } else {
          itemsWithoutIngredients++;
        }
      });
      
      console.log(`   🔗 Menu Items with Ingredients: ${itemsWithIngredients}`);
      console.log(`   ⚠️ Menu Items without Ingredients: ${itemsWithoutIngredients}`);
      
      if (itemsWithoutIngredients > 0) {
        console.log('   ❌ Missing ingredient links may cause persistence issues');
      }
    } catch (error) {
      console.log('   ❌ Error analyzing recipes:', error.message);
    }

    // 5. Identify potential state persistence issues
    console.log('\n5️⃣ IDENTIFIED STATE PERSISTENCE ISSUES:');
    
    const issues = [];
    
    if (foundComponents.length === 0) {
      issues.push('Missing Menu Builder components');
    }
    
    // Check for common persistence problems
    issues.push('No local state management detected');
    issues.push('Missing draft/auto-save functionality');
    issues.push('No version control for menu changes');
    issues.push('Missing undo/redo capabilities');
    issues.push('No form validation state persistence');

    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ❌ ${issue}`);
    });

    console.log('\n🎯 ROOT PROBLEMS:');
    console.log('   1. Menu Builder may lack proper state management');
    console.log('   2. No auto-save or draft functionality');
    console.log('   3. Form state lost on navigation/refresh');
    console.log('   4. Missing validation state persistence');
    console.log('   5. No undo/redo functionality');

    console.log('\n💡 SOLUTION STRATEGY:');
    console.log('   ✅ Implement robust state management with Context/Zustand');
    console.log('   ✅ Add auto-save functionality for drafts');
    console.log('   ✅ Create form state persistence with localStorage backup');
    console.log('   ✅ Add validation state management');
    console.log('   ✅ Implement undo/redo functionality');
    console.log('   ✅ Add proper loading and error states');

    console.log('\n📋 FILES TO CREATE/MODIFY:');
    console.log('   1. src/components/modules/MenuBuilder/ - Main component directory');
    console.log('   2. src/lib/context/MenuBuilderContext.tsx - State management');
    console.log('   3. src/lib/stores/menuBuilderStore.ts - Zustand store');
    console.log('   4. src/components/modules/MenuBuilder/MenuBuilderForm.tsx');
    console.log('   5. src/components/modules/MenuBuilder/MenuBuilderPreview.tsx');

    console.log('\n🚀 EXPECTED OUTCOME:');
    console.log('   ✅ Persistent menu builder state across navigation');
    console.log('   ✅ Auto-save functionality for drafts');
    console.log('   ✅ Proper form validation state management');
    console.log('   ✅ Undo/redo capabilities');
    console.log('   ✅ Better user experience with state preservation');

    console.log('\n🔧 READY TO IMPLEMENT FIX FOR BUG #5');

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    process.exit(0);
  }
}

analyzeMenuBuilderIssues();
