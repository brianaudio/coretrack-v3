import { db } from '../firebase';
import { collection, doc, getDocs, updateDoc, query, where, Timestamp, getDoc } from 'firebase/firestore';

// Types for menu price synchronization
export interface MenuCostImpactAnalysis {
  menuItemId: string;
  menuItemName: string;
  currentPrice: number;
  oldCost: number;
  newCost: number;
  costChange: number;
  costChangePercent: number;
  oldMargin: number;
  newMargin: number;
  marginImpact: number;
  recommendedPrice: number;
  priceChangeNeeded: number;
  updatePriority: 'auto' | 'review' | 'manual';
  affectedIngredients: {
    ingredientId: string;
    ingredientName: string;
    oldCost: number;
    newCost: number;
    quantity: number;
  }[];
}

export interface MenuPriceUpdate {
  menuItemId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  costImpact: number;
  marginBefore: number;
  marginAfter: number;
}

export interface MenuPriceRecommendation {
  menuItemId: string;
  currentPrice: number;
  recommendedPrice: number;
  reasoning: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface MenuPricingSettings {
  autoUpdateThreshold: number;
  maintainMargins: boolean;
  roundingRules: {
    under10: number;    // e.g., 0.25
    under100: number;   // e.g., 1.00
    over100: number;    // e.g., 5.00
  };
  marginProtection: {
    targetMargin: number;
    minimumMargin: number;
    maxPriceIncrease: number;
  };
}

// Default pricing settings
const DEFAULT_PRICING_SETTINGS: MenuPricingSettings = {
  autoUpdateThreshold: 2, // 2% cost change threshold
  maintainMargins: true,
  roundingRules: {
    under10: 0.25,
    under100: 1.00,
    over100: 5.00
  },
  marginProtection: {
    targetMargin: 65, // 65% target margin
    minimumMargin: 20, // Never go below 20%
    maxPriceIncrease: 15 // Max 15% price increase
  }
};

/**
 * Analyze the cost impact on menu items when ingredient costs change
 */
export const analyzeMenuItemCostImpact = async (
  tenantId: string,
  updatedIngredientIds: string[]
): Promise<MenuCostImpactAnalysis[]> => {
  try {
    console.log('🔍 Analyzing menu cost impact for ingredients:', updatedIngredientIds);
    
    // Get all menu items for this tenant
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuItemsSnapshot = await getDocs(menuItemsRef);
    
    // Get current inventory costs
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    const inventoryMap = new Map();
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, {
        id: doc.id,
        name: data.name,
        costPerUnit: data.costPerUnit || 0,
        unit: data.unit
      });
    });
    
    const impactAnalyses: MenuCostImpactAnalysis[] = [];
    
    for (const menuDoc of menuItemsSnapshot.docs) {
      const menuItem = menuDoc.data();
      
      // Skip items without ingredients
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
        continue;
      }
      
      // Check if this menu item uses any of the updated ingredients
      const affectedIngredients = menuItem.ingredients.filter((ingredient: any) => {
        const ingredientId = ingredient.id || ingredient.inventoryItemId;
        return updatedIngredientIds.includes(ingredientId);
      });
      
      if (affectedIngredients.length === 0) {
        continue; // This menu item is not affected
      }
      
      // Calculate old and new costs
      let oldCost = 0;
      let newCost = 0;
      
      const affectedIngredientDetails = [];
      
      for (const ingredient of menuItem.ingredients) {
        // Support both 'id' and 'inventoryItemId' for backward compatibility
        const ingredientId = ingredient.id || ingredient.inventoryItemId;
        const inventoryItem = inventoryMap.get(ingredientId);
        if (!inventoryItem) continue;
        
        const ingredientCost = inventoryItem.costPerUnit * ingredient.quantity;
        newCost += ingredientCost;
        
        if (updatedIngredientIds.includes(ingredientId)) {
          // For affected ingredients, we need to calculate the old cost
          // We'll estimate this as the stored cost in the menu item or use a fallback
          const oldCostEstimate = menuItem.cost || ingredientCost; // Fallback to current if no old cost
          oldCost += oldCostEstimate;
          
          affectedIngredientDetails.push({
            ingredientId: ingredientId,
            ingredientName: inventoryItem.name,
            oldCost: oldCostEstimate,
            newCost: ingredientCost,
            quantity: ingredient.quantity
          });
        } else {
          // For unaffected ingredients, old and new costs are the same
          oldCost += ingredientCost;
        }
      }
      
      // Calculate impact metrics
      const costChange = newCost - oldCost;
      const costChangePercent = oldCost > 0 ? (costChange / oldCost) * 100 : 0;
      
      const currentPrice = menuItem.price || 0;
      const oldMargin = currentPrice > 0 ? ((currentPrice - oldCost) / currentPrice) * 100 : 0;
      const newMargin = currentPrice > 0 ? ((currentPrice - newCost) / currentPrice) * 100 : 0;
      const marginImpact = newMargin - oldMargin;
      
      // Calculate recommended price
      const settings = DEFAULT_PRICING_SETTINGS; // In future, get from tenant settings
      let recommendedPrice = currentPrice;
      
      if (settings.maintainMargins && costChange > 0) {
        // Calculate price to maintain target margin
        const targetMargin = settings.marginProtection.targetMargin / 100;
        recommendedPrice = newCost / (1 - targetMargin);
        
        // Apply rounding rules
        recommendedPrice = roundPrice(recommendedPrice, settings.roundingRules);
        
        // Apply maximum increase limit
        const maxIncrease = currentPrice * (settings.marginProtection.maxPriceIncrease / 100);
        recommendedPrice = Math.min(recommendedPrice, currentPrice + maxIncrease);
      }
      
      const priceChangeNeeded = recommendedPrice - currentPrice;
      const priceChangePercent = currentPrice > 0 ? (priceChangeNeeded / currentPrice) * 100 : 0;
      
      // Determine update priority
      let updatePriority: 'auto' | 'review' | 'manual' = 'manual';
      if (Math.abs(priceChangePercent) <= settings.autoUpdateThreshold) {
        updatePriority = 'auto';
      } else if (Math.abs(priceChangePercent) <= 10) {
        updatePriority = 'review';
      }
      
      impactAnalyses.push({
        menuItemId: menuDoc.id,
        menuItemName: menuItem.name,
        currentPrice,
        oldCost,
        newCost,
        costChange,
        costChangePercent,
        oldMargin,
        newMargin,
        marginImpact,
        recommendedPrice,
        priceChangeNeeded,
        updatePriority,
        affectedIngredients: affectedIngredientDetails
      });
    }
    
    console.log(`📊 Found ${impactAnalyses.length} menu items affected by ingredient cost changes`);
    return impactAnalyses;
    
  } catch (error) {
    console.error('Error analyzing menu cost impact:', error);
    throw error;
  }
};

/**
 * Update menu item prices based on cost changes
 */
export const updateMenuItemPrices = async (
  tenantId: string,
  priceUpdates: MenuPriceUpdate[]
): Promise<void> => {
  try {
    console.log(`💰 Updating ${priceUpdates.length} menu item prices`);
    
    for (const update of priceUpdates) {
      const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, update.menuItemId);
      
      await updateDoc(menuItemRef, {
        price: update.newPrice,
        // Update cost to reflect new ingredient costs
        cost: update.oldPrice - (update.marginBefore / 100 * update.oldPrice), // Calculate cost from old margin
        updatedAt: Timestamp.now(),
        lastPriceUpdate: {
          oldPrice: update.oldPrice,
          newPrice: update.newPrice,
          reason: update.reason,
          costImpact: update.costImpact,
          marginBefore: update.marginBefore,
          marginAfter: update.marginAfter,
          updatedAt: Timestamp.now()
        }
      });
      
      console.log(`✅ Updated ${update.menuItemId}: ₱${update.oldPrice.toFixed(2)} → ₱${update.newPrice.toFixed(2)}`);
    }
    
    console.log('💰 Menu price updates completed');
    
  } catch (error) {
    console.error('Error updating menu prices:', error);
    throw error;
  }
};

/**
 * Get price recommendations for menu items
 */
export const getMenuPriceRecommendations = async (
  tenantId: string,
  menuItemIds: string[]
): Promise<MenuPriceRecommendation[]> => {
  try {
    console.log('💡 Generating price recommendations for menu items:', menuItemIds);
    
    const recommendations: MenuPriceRecommendation[] = [];
    
    for (const menuItemId of menuItemIds) {
      const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, menuItemId);
      const menuItemDoc = await getDoc(menuItemRef);
      
      if (!menuItemDoc.exists()) continue;
      
      const menuItem = menuItemDoc.data();
      const currentPrice = menuItem.price || 0;
      
      // Calculate recommended price based on current costs and target margin
      const currentCost = await calculateCurrentMenuItemCost(tenantId, menuItemId);
      const settings = DEFAULT_PRICING_SETTINGS;
      const targetMargin = settings.marginProtection.targetMargin / 100;
      
      let recommendedPrice = currentCost / (1 - targetMargin);
      recommendedPrice = roundPrice(recommendedPrice, settings.roundingRules);
      
      // Determine confidence level
      let confidenceLevel: 'high' | 'medium' | 'low' = 'high';
      const priceChangePercent = Math.abs((recommendedPrice - currentPrice) / currentPrice) * 100;
      
      if (priceChangePercent > 20) {
        confidenceLevel = 'low';
      } else if (priceChangePercent > 10) {
        confidenceLevel = 'medium';
      }
      
      recommendations.push({
        menuItemId,
        currentPrice,
        recommendedPrice,
        reasoning: `Maintain ${settings.marginProtection.targetMargin}% target margin with current ingredient costs`,
        confidenceLevel
      });
    }
    
    return recommendations;
    
  } catch (error) {
    console.error('Error generating price recommendations:', error);
    throw error;
  }
};

/**
 * Calculate current cost of a menu item based on latest ingredient prices
 */
export const calculateCurrentMenuItemCost = async (
  tenantId: string,
  menuItemId: string
): Promise<number> => {
  try {
    const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, menuItemId);
    const menuItemDoc = await getDoc(menuItemRef);
    
    if (!menuItemDoc.exists()) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }
    
    const menuItem = menuItemDoc.data();
    
    if (!menuItem.ingredients || menuItem.ingredients.length === 0) {
      return 0;
    }
    
    // Get current inventory costs
    const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
    const inventorySnapshot = await getDocs(inventoryRef);
    const inventoryMap = new Map();
    
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap.set(doc.id, data.costPerUnit || 0);
    });
    
    // Calculate total cost
    let totalCost = 0;
    for (const ingredient of menuItem.ingredients) {
      const costPerUnit = inventoryMap.get(ingredient.inventoryItemId) || 0;
      totalCost += costPerUnit * ingredient.quantity;
    }
    
    return totalCost;
    
  } catch (error) {
    console.error('Error calculating menu item cost:', error);
    throw error;
  }
};

/**
 * Round price according to pricing psychology rules
 */
const roundPrice = (price: number, rules: MenuPricingSettings['roundingRules']): number => {
  if (price < 10) {
    return Math.round(price / rules.under10) * rules.under10;
  } else if (price < 100) {
    return Math.round(price / rules.under100) * rules.under100;
  } else {
    return Math.round(price / rules.over100) * rules.over100;
  }
};

/**
 * Process automatic price updates for menu items (called after purchase order delivery)
 */
export const processMenuPriceUpdatesAfterDelivery = async (
  tenantId: string,
  updatedIngredientIds: string[]
): Promise<{ autoUpdated: number; flaggedForReview: number; manualReviewRequired: number }> => {
  try {
    console.log('🔄 Processing menu price updates after purchase order delivery');
    
    // Analyze impact on menu items
    const impactAnalyses = await analyzeMenuItemCostImpact(tenantId, updatedIngredientIds);
    
    if (impactAnalyses.length === 0) {
      console.log('✅ No menu items affected by ingredient cost changes');
      return { autoUpdated: 0, flaggedForReview: 0, manualReviewRequired: 0 };
    }
    
    // Group by update priority
    const autoUpdates = impactAnalyses.filter(item => item.updatePriority === 'auto');
    const reviewRequired = impactAnalyses.filter(item => item.updatePriority === 'review');
    const manualRequired = impactAnalyses.filter(item => item.updatePriority === 'manual');
    
    // Process automatic updates
    if (autoUpdates.length > 0) {
      const priceUpdates: MenuPriceUpdate[] = autoUpdates.map(analysis => ({
        menuItemId: analysis.menuItemId,
        oldPrice: analysis.currentPrice,
        newPrice: analysis.recommendedPrice,
        reason: `Automatic price adjustment due to ingredient cost change (${analysis.costChangePercent.toFixed(1)}%)`,
        costImpact: analysis.costChange,
        marginBefore: analysis.oldMargin,
        marginAfter: analysis.newMargin
      }));
      
      await updateMenuItemPrices(tenantId, priceUpdates);
      console.log(`✅ Automatically updated ${autoUpdates.length} menu item prices`);
    }
    
    // Log items that need review
    if (reviewRequired.length > 0 || manualRequired.length > 0) {
      console.log(`⚠️ ${reviewRequired.length} items flagged for review, ${manualRequired.length} require manual attention`);
      
      // In a real system, you would:
      // 1. Create notifications for managers
      // 2. Update a dashboard with pending reviews
      // 3. Send email/SMS alerts
      // 4. Log to audit trail
    }
    
    return {
      autoUpdated: autoUpdates.length,
      flaggedForReview: reviewRequired.length,
      manualReviewRequired: manualRequired.length
    };
    
  } catch (error) {
    console.error('Error processing menu price updates:', error);
    throw error;
  }
};
