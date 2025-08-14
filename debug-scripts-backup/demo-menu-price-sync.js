// Demo script to test menu price synchronization after ingredient cost changes
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, updateDoc, addDoc, getDoc } = require('firebase/firestore');

// Firebase configuration (use your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TENANT_ID = 'active-tenant-123'; // Replace with your tenant ID

async function demoMenuPriceSynchronization() {
  console.log('🎬 DEMO: Menu Price Synchronization System');
  console.log('=====================================\n');

  try {
    // Step 1: Check current menu items and their ingredient costs
    console.log('1️⃣ ANALYZING CURRENT MENU ITEMS AND COSTS');
    await analyzeCurrentMenuCosts();

    // Step 2: Simulate a purchase order delivery with price changes
    console.log('\n2️⃣ SIMULATING PURCHASE ORDER DELIVERY');
    await simulatePurchaseOrderDelivery();

    // Step 3: Analyze menu price impact
    console.log('\n3️⃣ ANALYZING MENU PRICE IMPACT');
    await analyzeMenuPriceImpact();

    // Step 4: Show recommendations and apply updates
    console.log('\n4️⃣ PRICE RECOMMENDATIONS AND UPDATES');
    await showPriceRecommendations();

    console.log('\n✅ Demo completed successfully!');
    console.log('\n📋 SUMMARY:');
    console.log('- Ingredient costs updated via purchase order delivery');
    console.log('- Menu item costs automatically recalculated');
    console.log('- Price recommendations generated');
    console.log('- Automatic price updates applied where appropriate');
    console.log('- Items requiring manual review flagged');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

async function analyzeCurrentMenuCosts() {
  try {
    // Get menu items (POS items)
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posItemsSnapshot = await getDocs(posItemsRef);

    // Get inventory items
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        name: data.name,
        costPerUnit: data.costPerUnit || 0,
        unit: data.unit,
        currentStock: data.currentStock || 0
      });
    });

    console.log(`📊 Found ${posItemsSnapshot.size} menu items and ${inventorySnapshot.size} inventory items\n`);

    // Analyze menu items with ingredients
    let itemsWithIngredients = 0;
    let totalIngredientCost = 0;

    for (const doc of posItemsSnapshot.docs) {
      const menuItem = doc.data();
      
      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        itemsWithIngredients++;
        
        let itemCost = 0;
        console.log(`🍽️ ${menuItem.name} (₱${menuItem.price || 0})`);
        
        for (const ingredient of menuItem.ingredients) {
          const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
          if (inventoryItem) {
            const cost = inventoryItem.costPerUnit * ingredient.quantity;
            itemCost += cost;
            console.log(`   - ${inventoryItem.name}: ${ingredient.quantity} ${inventoryItem.unit} @ ₱${inventoryItem.costPerUnit.toFixed(2)} = ₱${cost.toFixed(2)}`);
          }
        }
        
        const margin = menuItem.price > 0 ? ((menuItem.price - itemCost) / menuItem.price * 100) : 0;
        console.log(`   💰 Total Cost: ₱${itemCost.toFixed(2)} | Margin: ${margin.toFixed(1)}%\n`);
        totalIngredientCost += itemCost;
      }
    }

    console.log(`📈 Summary: ${itemsWithIngredients} menu items with ingredients, total cost: ₱${totalIngredientCost.toFixed(2)}`);

  } catch (error) {
    console.error('Error analyzing current costs:', error);
  }
}

async function simulatePurchaseOrderDelivery() {
  try {
    console.log('📦 Simulating delivery with price changes...\n');

    // Get some inventory items to update
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    if (inventorySnapshot.empty) {
      console.log('⚠️ No inventory items found to update');
      return;
    }

    // Take first few items and simulate price increases
    const itemsToUpdate = inventorySnapshot.docs.slice(0, 3);
    
    for (const doc of itemsToUpdate) {
      const data = doc.data();
      const oldCost = data.costPerUnit || 0;
      
      // Simulate 20-50% price increase
      const increasePercent = 20 + Math.random() * 30;
      const newCost = oldCost * (1 + increasePercent / 100);
      
      console.log(`📊 ${data.name}:`);
      console.log(`   - Old Cost: ₱${oldCost.toFixed(2)} per ${data.unit}`);
      console.log(`   - New Cost: ₱${newCost.toFixed(2)} per ${data.unit} (+${increasePercent.toFixed(1)}%)`);
      
      // Update the inventory item
      const itemRef = doc.ref;
      await updateDoc(itemRef, {
        costPerUnit: newCost,
        lastPriceUpdate: {
          oldCost: oldCost,
          newCost: newCost,
          increasePercent: increasePercent,
          updatedAt: new Date(),
          reason: 'Purchase order delivery - demo price increase'
        }
      });
      
      console.log(`   ✅ Updated in database\n`);
    }

  } catch (error) {
    console.error('Error simulating purchase order:', error);
  }
}

async function analyzeMenuPriceImpact() {
  try {
    // Get all menu items and check which ones are affected
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posItemsSnapshot = await getDocs(posItemsRef);

    // Get updated inventory costs
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        name: data.name,
        costPerUnit: data.costPerUnit || 0,
        unit: data.unit,
        lastPriceUpdate: data.lastPriceUpdate
      });
    });

    console.log('🔍 Analyzing impact on menu items...\n');

    let affectedItems = 0;
    let totalCostIncrease = 0;

    for (const doc of posItemsSnapshot.docs) {
      const menuItem = doc.data();
      
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) continue;

      // Check if any ingredients had price updates
      const affectedIngredients = menuItem.ingredients.filter(ingredient => {
        const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
        return inventoryItem && inventoryItem.lastPriceUpdate;
      });

      if (affectedIngredients.length === 0) continue;

      affectedItems++;
      
      // Calculate old and new costs
      let oldCost = 0;
      let newCost = 0;
      
      console.log(`🍽️ ${menuItem.name} - AFFECTED`);
      
      for (const ingredient of menuItem.ingredients) {
        const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
        if (!inventoryItem) continue;
        
        const currentCost = inventoryItem.costPerUnit * ingredient.quantity;
        newCost += currentCost;
        
        if (inventoryItem.lastPriceUpdate) {
          const oldUnitCost = inventoryItem.lastPriceUpdate.oldCost || inventoryItem.costPerUnit;
          oldCost += oldUnitCost * ingredient.quantity;
          
          console.log(`   📈 ${inventoryItem.name}: ₱${oldUnitCost.toFixed(2)} → ₱${inventoryItem.costPerUnit.toFixed(2)} per ${inventoryItem.unit}`);
        } else {
          oldCost += currentCost;
        }
      }
      
      const costIncrease = newCost - oldCost;
      const costIncreasePercent = oldCost > 0 ? (costIncrease / oldCost) * 100 : 0;
      
      const currentPrice = menuItem.price || 0;
      const oldMargin = currentPrice > 0 ? ((currentPrice - oldCost) / currentPrice) * 100 : 0;
      const newMargin = currentPrice > 0 ? ((currentPrice - newCost) / currentPrice) * 100 : 0;
      const marginDrop = oldMargin - newMargin;
      
      console.log(`   💰 Cost Impact: ₱${oldCost.toFixed(2)} → ₱${newCost.toFixed(2)} (+₱${costIncrease.toFixed(2)}, +${costIncreasePercent.toFixed(1)}%)`);
      console.log(`   📊 Margin Impact: ${oldMargin.toFixed(1)}% → ${newMargin.toFixed(1)}% (-${marginDrop.toFixed(1)}%)`);
      
      // Calculate recommended price to maintain margin
      const targetMargin = 65; // 65% target
      const recommendedPrice = newCost / (1 - targetMargin / 100);
      const priceIncrease = recommendedPrice - currentPrice;
      const priceIncreasePercent = currentPrice > 0 ? (priceIncrease / currentPrice) * 100 : 0;
      
      console.log(`   💡 Recommended Price: ₱${currentPrice.toFixed(2)} → ₱${recommendedPrice.toFixed(2)} (+₱${priceIncrease.toFixed(2)}, +${priceIncreasePercent.toFixed(1)}%)`);
      
      // Determine action needed
      let action = '🔴 Manual Review Required';
      if (priceIncreasePercent <= 2) {
        action = '🟢 Auto-Update Approved';
      } else if (priceIncreasePercent <= 10) {
        action = '🟡 Review & Approve';
      }
      
      console.log(`   🎯 Action: ${action}\n`);
      
      totalCostIncrease += costIncrease;
    }

    console.log(`📋 IMPACT SUMMARY:`);
    console.log(`   - Affected Menu Items: ${affectedItems}`);
    console.log(`   - Total Cost Increase: ₱${totalCostIncrease.toFixed(2)}`);
    console.log(`   - Average Cost Increase: ₱${affectedItems > 0 ? (totalCostIncrease / affectedItems).toFixed(2) : '0.00'} per item`);

  } catch (error) {
    console.error('Error analyzing menu impact:', error);
  }
}

async function showPriceRecommendations() {
  try {
    console.log('💡 Generating price recommendations and applying updates...\n');

    // Get menu items
    const posItemsRef = collection(db, `tenants/${TENANT_ID}/posItems`);
    const posItemsSnapshot = await getDocs(posItemsRef);

    // Get inventory
    const inventoryRef = collection(db, `tenants/${TENANT_ID}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        name: data.name,
        costPerUnit: data.costPerUnit || 0,
        unit: data.unit
      });
    });

    let autoUpdated = 0;
    let flaggedForReview = 0;
    let manualRequired = 0;

    for (const doc of posItemsSnapshot.docs) {
      const menuItem = doc.data();
      
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) continue;

      // Calculate current cost
      let currentCost = 0;
      for (const ingredient of menuItem.ingredients) {
        const inventoryItem = inventoryMap.get(ingredient.inventoryItemId);
        if (inventoryItem) {
          currentCost += inventoryItem.costPerUnit * ingredient.quantity;
        }
      }

      const currentPrice = menuItem.price || 0;
      const currentMargin = currentPrice > 0 ? ((currentPrice - currentCost) / currentPrice) * 100 : 0;
      
      // Calculate recommended price for 65% margin
      const targetMargin = 65;
      const recommendedPrice = currentCost / (1 - targetMargin / 100);
      const priceChange = recommendedPrice - currentPrice;
      const priceChangePercent = currentPrice > 0 ? Math.abs(priceChange / currentPrice) * 100 : 0;

      // Apply rounding rules
      let roundedPrice = recommendedPrice;
      if (recommendedPrice < 10) {
        roundedPrice = Math.round(recommendedPrice / 0.25) * 0.25;
      } else if (recommendedPrice < 100) {
        roundedPrice = Math.round(recommendedPrice);
      } else {
        roundedPrice = Math.round(recommendedPrice / 5) * 5;
      }

      console.log(`🍽️ ${menuItem.name}`);
      console.log(`   Current: ₱${currentPrice.toFixed(2)} (${currentMargin.toFixed(1)}% margin)`);
      console.log(`   Cost: ₱${currentCost.toFixed(2)}`);
      console.log(`   Recommended: ₱${roundedPrice.toFixed(2)} (${targetMargin}% margin)`);

      // Determine action and apply if appropriate
      if (priceChangePercent <= 2 && priceChange > 0) {
        // Auto-update
        await updateDoc(doc.ref, {
          price: roundedPrice,
          cost: currentCost,
          lastPriceUpdate: {
            oldPrice: currentPrice,
            newPrice: roundedPrice,
            reason: 'Automatic price adjustment due to ingredient cost increase',
            oldMargin: currentMargin,
            newMargin: targetMargin,
            updatedAt: new Date()
          }
        });
        
        autoUpdated++;
        console.log(`   ✅ AUTO-UPDATED: ₱${currentPrice.toFixed(2)} → ₱${roundedPrice.toFixed(2)}`);
        
      } else if (priceChangePercent <= 10 && priceChange > 0) {
        // Flag for review
        flaggedForReview++;
        console.log(`   🟡 FLAGGED FOR REVIEW: Needs approval for ₱${priceChange.toFixed(2)} increase`);
        
      } else if (priceChange > 0) {
        // Manual review required
        manualRequired++;
        console.log(`   🔴 MANUAL REVIEW: Large price change (${priceChangePercent.toFixed(1)}%)`);
        
      } else {
        console.log(`   ⚪ NO ACTION: Price is adequate`);
      }
      
      console.log('');
    }

    console.log(`📊 UPDATE SUMMARY:`);
    console.log(`   🟢 Auto-updated: ${autoUpdated} items`);
    console.log(`   🟡 Flagged for review: ${flaggedForReview} items`);
    console.log(`   🔴 Manual review required: ${manualRequired} items`);

    // Create summary log entry
    const logsRef = collection(db, `tenants/${TENANT_ID}/pricingLogs`);
    await addDoc(logsRef, {
      type: 'menu_price_sync',
      timestamp: new Date(),
      summary: {
        autoUpdated,
        flaggedForReview,
        manualRequired,
        totalItemsAnalyzed: autoUpdated + flaggedForReview + manualRequired
      },
      reason: 'Purchase order delivery caused ingredient cost changes'
    });

  } catch (error) {
    console.error('Error in price recommendations:', error);
  }
}

// Run the demo
demoMenuPriceSynchronization().then(() => {
  console.log('\n🎉 Demo completed! Check your Firebase console to see the updates.');
  process.exit(0);
}).catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
