import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';
import { syncMenuItemToPOS } from './menuPOSSync';
import { getBranchMenuItems, createBranchMenuItem } from './branchDataIsolation';

export interface MenuIngredient {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  cost: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  ingredients: MenuIngredient[];
  preparationTime: number; // in minutes
  calories?: number;
  allergens: string[];
  image?: string;
  emoji?: string; // Emoji for visual representation
  status: 'active' | 'inactive' | 'out_of_stock';
  isPopular: boolean;
  displayOrder: number;
  tenantId: string;
  locationId?: string; // Added for branch-specific menu items
  
  // 🎯 Add-on Enhancement Fields
  isAddonOnly?: boolean; // Mark as add-on only item
  addonType?: 'size' | 'extra' | 'modification' | 'special'; // Add-on category
  applicableItems?: string[]; // Menu item IDs this add-on applies to
  isRequired?: boolean; // Required add-on selection
  maxQuantity?: number; // Maximum quantity per order
  priceType?: 'fixed' | 'percentage'; // Fixed price or percentage of base item
  percentageValue?: number; // If priceType is percentage
  
  // 📊 PHASE 1: NUTRITIONAL INFORMATION
  nutrition?: {
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fat: number; // grams
    fiber: number; // grams
    sugar: number; // grams
    sodium: number; // mg
    cholesterol: number; // mg
    vitaminC?: number; // mg
    calcium?: number; // mg
    iron?: number; // mg
  };
  
  // Allergen Management (Enhanced)
  allergenInfo?: {
    contains: string[]; // Confirmed allergens
    mayContain: string[]; // Cross-contamination risk
    freeFrom: string[]; // Explicitly allergen-free
    severity: 'mild' | 'moderate' | 'severe'; // Allergen severity level
  };
  
  // Dietary Labels
  dietaryLabels?: {
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isKeto: boolean;
    isPaleo: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
    isLowCarb: boolean;
    isLowSodium: boolean;
    isOrganic: boolean;
    isHalal: boolean;
    isKosher: boolean;
  };
  
  // Portion Size Variations
  portionSizes?: {
    id: string;
    name: string; // Small, Medium, Large, etc.
    size: number; // Multiplier (1.0 = standard)
    priceMultiplier: number; // Price adjustment multiplier
    nutritionMultiplier: number; // Nutrition adjustment multiplier
    description?: string;
  }[];
  
  // 💰 PHASE 2: ADVANCED PRICING & COSTING
  pricing?: {
    baseCost: number; // Base ingredient cost
    laborCost: number; // Preparation labor cost
    overheadCost: number; // Utilities, rent allocation
    totalCost: number; // baseCost + laborCost + overheadCost
    targetMargin: number; // Desired profit margin %
    suggestedPrice: number; // Auto-calculated suggested price
    competitorPrice?: number; // Market research price
    
    // Dynamic Pricing
    dynamicPricing?: {
      enabled: boolean;
      peakHours?: {
        start: string; // "18:00"
        end: string; // "21:00"
        multiplier: number; // 1.2 = 20% increase
      };
      offPeakDiscount?: {
        start: string;
        end: string;
        multiplier: number; // 0.8 = 20% discount
      };
      demandBased?: {
        enabled: boolean;
        highDemandMultiplier: number;
        lowDemandMultiplier: number;
      };
    };
    
    // Multi-location Pricing
    locationPricing?: {
      [locationId: string]: {
        price: number;
        cost: number;
        margin: number;
        reason?: string; // "Higher rent area", "Premium location"
      };
    };
  };
  
  // Profit Analysis
  profitAnalysis?: {
    dailyVolume: number; // Average daily sales
    weeklyRevenue: number; // Estimated weekly revenue
    monthlyRevenue: number; // Estimated monthly revenue
    profitPerItem: number; // Profit per item sold
    contribution: number; // % contribution to total revenue
    lastUpdated: Timestamp;
  };
  
  // 🏷️ PHASE 3: MENU CATEGORIZATION & ORGANIZATION
  categoryHierarchy?: {
    mainCategory: string; // "Beverages"
    subCategory?: string; // "Hot Drinks"
    subSubCategory?: string; // "Coffee"
    tags: string[]; // ["premium", "signature", "new"]
  };
  
  // Menu Templates & Scheduling
  menuScheduling?: {
    availability: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    seasonalAvailability?: {
      seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
      startDate?: Timestamp;
      endDate?: Timestamp;
      autoActivate: boolean;
    };
    specialEvents?: {
      eventName: string;
      startDate: Timestamp;
      endDate: Timestamp;
      specialPrice?: number;
    }[];
  };
  
  // Menu Templates
  templateInfo?: {
    templateId?: string; // Reference to menu template
    templateName?: string; // "Breakfast Menu", "Happy Hour"
    isTemplateItem: boolean;
    templatePriority: number; // Display order within template
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  tenantId: string;
  
  // 🏷️ PHASE 3: ENHANCED CATEGORIZATION
  hierarchy?: {
    level: 1 | 2 | 3; // Main, Sub, Sub-Sub category
    parentId?: string; // Parent category ID
    childCategories?: string[]; // Child category IDs
    fullPath: string; // "Beverages > Hot Drinks > Coffee"
  };
  
  // Category Styling & Display
  styling?: {
    color: string; // Hex color for category
    icon?: string; // Icon/emoji for category
    backgroundColor?: string;
    textColor?: string;
  };
  
  // Category Rules
  rules?: {
    maxItems: number; // Maximum items in this category
    requiresApproval: boolean; // New items need approval
    autoSort: boolean; // Auto-sort items by popularity/price
    defaultPreparationTime: number; // Default prep time for new items
  };
  
  // Availability Scheduling
  availability?: {
    schedule: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    seasonalAvailability?: {
      seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
      autoActivate: boolean;
    };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 🏷️ PHASE 3: MENU TEMPLATES
export interface MenuTemplate {
  id: string;
  name: string; // "Breakfast Menu", "Happy Hour", "Weekend Special"
  description: string;
  tenantId: string;
  
  // Template Configuration
  config: {
    type: 'scheduled' | 'event' | 'location' | 'seasonal';
    isActive: boolean;
    priority: number; // Higher priority overrides lower
  };
  
  // Scheduling
  schedule?: {
    dailySchedule: {
      monday: { start: string; end: string; enabled: boolean };
      tuesday: { start: string; end: string; enabled: boolean };
      wednesday: { start: string; end: string; enabled: boolean };
      thursday: { start: string; end: string; enabled: boolean };
      friday: { start: string; end: string; enabled: boolean };
      saturday: { start: string; end: string; enabled: boolean };
      sunday: { start: string; end: string; enabled: boolean };
    };
    dateRange?: {
      startDate: Timestamp;
      endDate: Timestamp;
      recurring: boolean;
    };
    autoActivation: boolean;
  };
  
  // Location Targeting
  locations?: string[]; // Location IDs where this template applies
  
  // Template Items
  items: {
    categoryId: string;
    menuItemIds: string[];
    displayOrder: number;
    specialPricing?: {
      discountPercentage: number;
      specialPrice: number;
    };
  }[];
  
  // Analytics
  analytics?: {
    timesUsed: number;
    totalRevenue: number;
    averageOrderValue: number;
    popularItems: string[]; // Menu item IDs
    lastUsed: Timestamp;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 📊 NUTRITION DATABASE
export interface NutritionData {
  id: string;
  name: string;
  category: 'ingredient' | 'additive' | 'preparation_method';
  
  // Nutrition per 100g/100ml
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
  };
  
  // Allergen Information
  allergens: {
    contains: string[];
    mayContain: string[];
    processingFacility: string[]; // "Processed in facility that also processes nuts"
  };
  
  // Dietary Classifications
  dietary: {
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isKeto: boolean;
    isPaleo: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
    isOrganic: boolean;
    isHalal: boolean;
    isKosher: boolean;
  };
  
  // Cost Information
  costPer100g: number;
  supplier?: string;
  lastUpdated: Timestamp;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  name: string;
  instructions: string[];
  servingSize: number;
  notes?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateMenuItem {
  name: string;
  description: string;
  category: string;
  price: number;
  ingredients: MenuIngredient[];
  preparationTime: number;
  calories?: number;
  allergens: string[];
  image?: string;
  emoji?: string; // Emoji for visual representation
  isPopular?: boolean;
  displayOrder?: number;
  tenantId: string;
  locationId?: string; // Added for branch-specific menu items
  
  // 🎯 Add-on specific fields
  isAddonOnly?: boolean;
  addonType?: 'ingredient' | 'size' | 'modification' | 'special';
  applicableItems?: string[];
  isRequired?: boolean;
  maxQuantity?: number;
  priceType?: 'fixed' | 'percentage';
  
  // 📊 PHASE 1: NUTRITIONAL INFORMATION
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
  };
  
  allergenInfo?: {
    contains: string[];
    mayContain: string[];
    freeFrom: string[];
    severity: 'mild' | 'moderate' | 'severe';
  };
  
  dietaryLabels?: {
    isVegan: boolean;
    isVegetarian: boolean;
    isGlutenFree: boolean;
    isKeto: boolean;
    isPaleo: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
    isLowCarb: boolean;
    isLowSodium: boolean;
    isOrganic: boolean;
    isHalal: boolean;
    isKosher: boolean;
  };
  
  portionSizes?: {
    id: string;
    name: string;
    size: number;
    priceMultiplier: number;
    nutritionMultiplier: number;
    description?: string;
  }[];
  
  // 💰 PHASE 2: ADVANCED PRICING & COSTING
  pricing?: {
    baseCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
    targetMargin: number;
    suggestedPrice: number;
    competitorPrice?: number;
    dynamicPricing?: {
      enabled: boolean;
      peakHours?: {
        start: string;
        end: string;
        multiplier: number;
      };
      offPeakDiscount?: {
        start: string;
        end: string;
        multiplier: number;
      };
      demandBased?: {
        enabled: boolean;
        highDemandMultiplier: number;
        lowDemandMultiplier: number;
      };
    };
    locationPricing?: {
      [locationId: string]: {
        price: number;
        cost: number;
        margin: number;
        reason?: string;
      };
    };
  };
  
  // 🏷️ PHASE 3: MENU CATEGORIZATION & ORGANIZATION
  categoryHierarchy?: {
    mainCategory: string;
    subCategory?: string;
    subSubCategory?: string;
    tags: string[];
  };
  
  menuScheduling?: {
    availability: {
      monday: { start: string; end: string; available: boolean };
      tuesday: { start: string; end: string; available: boolean };
      wednesday: { start: string; end: string; available: boolean };
      thursday: { start: string; end: string; available: boolean };
      friday: { start: string; end: string; available: boolean };
      saturday: { start: string; end: string; available: boolean };
      sunday: { start: string; end: string; available: boolean };
    };
    seasonalAvailability?: {
      seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
      startDate?: Timestamp;
      endDate?: Timestamp;
      autoActivate: boolean;
    };
    specialEvents?: {
      eventName: string;
      startDate: Timestamp;
      endDate: Timestamp;
      specialPrice?: number;
    }[];
  };
  
  templateInfo?: {
    templateId?: string;
    templateName?: string;
    isTemplateItem: boolean;
    templatePriority: number;
  };
}

export interface CreateMenuCategory {
  name: string;
  description: string;
  displayOrder?: number;
  tenantId: string;
  locationId?: string; // For branch-specific categories
}

export interface CreateRecipe {
  menuItemId: string;
  name: string;
  instructions: string[];
  servingSize: number;
  notes?: string;
  tenantId: string;
}

// Get collection references
const getMenuItemsCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/menuItems`);
};

const getMenuCategoriesCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/menuCategories`);
};

const getRecipesCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/recipes`);
};

// Auto-calculate cost from ingredients
const calculateMenuItemCost = (ingredients: MenuIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => total + ingredient.cost, 0);
};

// 📊 PHASE 1: NUTRITION CALCULATION HELPERS
export const calculateNutritionFromIngredients = (ingredients: MenuIngredient[], nutritionDb: NutritionData[]): MenuItem['nutrition'] => {
  const totalNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
    vitaminC: 0,
    calcium: 0,
    iron: 0
  };
  
  ingredients.forEach(ingredient => {
    const nutritionData = nutritionDb.find(n => n.name.toLowerCase() === ingredient.inventoryItemName.toLowerCase());
    if (nutritionData) {
      const ratio = ingredient.quantity / 100; // Convert to per 100g ratio
      
      totalNutrition.calories += nutritionData.nutritionPer100g.calories * ratio;
      totalNutrition.protein += nutritionData.nutritionPer100g.protein * ratio;
      totalNutrition.carbs += nutritionData.nutritionPer100g.carbs * ratio;
      totalNutrition.fat += nutritionData.nutritionPer100g.fat * ratio;
      totalNutrition.fiber += nutritionData.nutritionPer100g.fiber * ratio;
      totalNutrition.sugar += nutritionData.nutritionPer100g.sugar * ratio;
      totalNutrition.sodium += nutritionData.nutritionPer100g.sodium * ratio;
      totalNutrition.cholesterol += nutritionData.nutritionPer100g.cholesterol * ratio;
      totalNutrition.vitaminC += (nutritionData.nutritionPer100g.vitaminC || 0) * ratio;
      totalNutrition.calcium += (nutritionData.nutritionPer100g.calcium || 0) * ratio;
      totalNutrition.iron += (nutritionData.nutritionPer100g.iron || 0) * ratio;
    }
  });
  
  // Round to 2 decimal places
  Object.keys(totalNutrition).forEach(key => {
    totalNutrition[key as keyof typeof totalNutrition] = Math.round(totalNutrition[key as keyof typeof totalNutrition] * 100) / 100;
  });
  
  return totalNutrition;
};

export const calculateAllergenInfo = (ingredients: MenuIngredient[], nutritionDb: NutritionData[]): MenuItem['allergenInfo'] => {
  const allergenInfo = {
    contains: [] as string[],
    mayContain: [] as string[],
    freeFrom: [] as string[],
    severity: 'mild' as 'mild' | 'moderate' | 'severe'
  };
  
  const allAllergens = ['milk', 'eggs', 'peanuts', 'tree_nuts', 'soy', 'wheat', 'fish', 'shellfish', 'sesame'];
  let maxSeverity = 'mild';
  
  ingredients.forEach(ingredient => {
    const nutritionData = nutritionDb.find(n => n.name.toLowerCase() === ingredient.inventoryItemName.toLowerCase());
    if (nutritionData) {
      // Add confirmed allergens
      nutritionData.allergens.contains.forEach(allergen => {
        if (!allergenInfo.contains.includes(allergen)) {
          allergenInfo.contains.push(allergen);
          if (['peanuts', 'tree_nuts', 'shellfish'].includes(allergen)) maxSeverity = 'severe';
          else if (['milk', 'eggs', 'soy'].includes(allergen)) maxSeverity = 'moderate';
        }
      });
      
      // Add cross-contamination risks
      nutritionData.allergens.mayContain.forEach(allergen => {
        if (!allergenInfo.contains.includes(allergen) && !allergenInfo.mayContain.includes(allergen)) {
          allergenInfo.mayContain.push(allergen);
        }
      });
    }
  });
  
  // Determine allergen-free items
  allergenInfo.freeFrom = allAllergens.filter(allergen => 
    !allergenInfo.contains.includes(allergen) && !allergenInfo.mayContain.includes(allergen)
  );
  
  allergenInfo.severity = maxSeverity as 'mild' | 'moderate' | 'severe';
  return allergenInfo;
};

// 🏷️ PHASE 3: ENTERPRISE MENU TEMPLATE OPERATIONS
export const getMenuTemplates = async (tenantId: string): Promise<MenuTemplate[]> => {
  try {
    const templatesRef = collection(db, `tenants/${tenantId}/menuTemplates`);
    const snapshot = await getDocs(query(templatesRef, orderBy('createdAt', 'desc')));
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuTemplate[];
  } catch (error) {
    console.error('Error fetching menu templates:', error);
    throw error;
  }
};

export const createMenuTemplate = async (templateData: Omit<MenuTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const templatesRef = collection(db, `tenants/${templateData.tenantId}/menuTemplates`);
    const now = Timestamp.now();
    
    const docRef = await addDoc(templatesRef, {
      ...templateData,
      analytics: {
        timesUsed: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        popularItems: [],
        lastUsed: now
      },
      createdAt: now,
      updatedAt: now
    });
    
    console.log('Menu template created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating menu template:', error);
    throw error;
  }
};

export const updateMenuTemplate = async (tenantId: string, templateId: string, updates: Partial<MenuTemplate>): Promise<void> => {
  try {
    const templateRef = doc(db, `tenants/${tenantId}/menuTemplates`, templateId);
    await updateDoc(templateRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    console.log('Menu template updated:', templateId);
  } catch (error) {
    console.error('Error updating menu template:', error);
    throw error;
  }
};

export const activateMenuTemplate = async (tenantId: string, templateId: string): Promise<void> => {
  try {
    const templateRef = doc(db, `tenants/${tenantId}/menuTemplates`, templateId);
    const templateDoc = await getDoc(templateRef);
    
    if (!templateDoc.exists()) {
      throw new Error('Template not found');
    }
    
    const template = templateDoc.data() as MenuTemplate;
    
    // Update template usage analytics
    await updateDoc(templateRef, {
      'config.isActive': true,
      'analytics.timesUsed': (template.analytics?.timesUsed || 0) + 1,
      'analytics.lastUsed': Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Apply template items to active menu
    for (const categoryGroup of template.items) {
      for (const menuItemId of categoryGroup.menuItemIds) {
        const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, menuItemId);
        const menuItemDoc = await getDoc(menuItemRef);
        
        if (menuItemDoc.exists()) {
          await updateDoc(menuItemRef, {
            'templateInfo.templateId': templateId,
            'templateInfo.templateName': template.name,
            'templateInfo.isTemplateItem': true,
            'templateInfo.templatePriority': categoryGroup.displayOrder,
            status: 'active',
            updatedAt: Timestamp.now()
          });
          
          // Apply special pricing if defined
          if (categoryGroup.specialPricing) {
            const currentPrice = menuItemDoc.data().price;
            const specialPrice = categoryGroup.specialPricing.specialPrice || 
              (currentPrice * (1 - categoryGroup.specialPricing.discountPercentage / 100));
            
            await updateDoc(menuItemRef, {
              price: specialPrice,
              'pricing.originalPrice': currentPrice,
              'pricing.isSpecialPricing': true,
              'pricing.specialReason': `Template: ${template.name}`
            });
          }
        }
      }
    }
    
    console.log('Menu template activated:', templateId);
  } catch (error) {
    console.error('Error activating menu template:', error);
    throw error;
  }
};

export const deactivateMenuTemplate = async (tenantId: string, templateId: string): Promise<void> => {
  try {
    const templateRef = doc(db, `tenants/${tenantId}/menuTemplates`, templateId);
    await updateDoc(templateRef, {
      'config.isActive': false,
      updatedAt: Timestamp.now()
    });
    
    // Remove template association from menu items
    const menuItemsRef = collection(db, `tenants/${tenantId}/menuItems`);
    const menuItemsQuery = query(menuItemsRef, where('templateInfo.templateId', '==', templateId));
    const menuItemsSnapshot = await getDocs(menuItemsQuery);
    
    for (const menuItemDoc of menuItemsSnapshot.docs) {
      await updateDoc(menuItemDoc.ref, {
        'templateInfo.templateId': null,
        'templateInfo.templateName': null,
        'templateInfo.isTemplateItem': false,
        'templateInfo.templatePriority': 0,
        updatedAt: Timestamp.now()
      });
      
      // Restore original pricing if it was special pricing
      const menuItem = menuItemDoc.data();
      if (menuItem.pricing?.isSpecialPricing && menuItem.pricing?.originalPrice) {
        await updateDoc(menuItemDoc.ref, {
          price: menuItem.pricing.originalPrice,
          'pricing.originalPrice': null,
          'pricing.isSpecialPricing': false,
          'pricing.specialReason': null
        });
      }
    }
    
    console.log('Menu template deactivated:', templateId);
  } catch (error) {
    console.error('Error deactivating menu template:', error);
    throw error;
  }
};

// 📊 NUTRITION DATABASE OPERATIONS
export const getNutritionDatabase = async (tenantId: string): Promise<NutritionData[]> => {
  try {
    const nutritionRef = collection(db, `tenants/${tenantId}/nutritionDatabase`);
    const snapshot = await getDocs(nutritionRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NutritionData[];
  } catch (error) {
    console.error('Error fetching nutrition database:', error);
    return []; // Return empty array if no nutrition data
  }
};

export const createNutritionEntry = async (tenantId: string, nutritionData: Omit<NutritionData, 'id' | 'lastUpdated'>): Promise<string> => {
  try {
    const nutritionRef = collection(db, `tenants/${tenantId}/nutritionDatabase`);
    const docRef = await addDoc(nutritionRef, {
      ...nutritionData,
      lastUpdated: Timestamp.now()
    });
    
    console.log('Nutrition entry created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating nutrition entry:', error);
    throw error;
  }
};

// 💰 ENHANCED PRICING OPERATIONS
export const updateMenuItemPricing = async (tenantId: string, menuItemId: string, pricingUpdates: Partial<MenuItem['pricing']>): Promise<void> => {
  try {
    const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, menuItemId);
    await updateDoc(menuItemRef, {
      pricing: pricingUpdates,
      updatedAt: Timestamp.now()
    });
    
    console.log('Menu item pricing updated:', menuItemId);
  } catch (error) {
    console.error('Error updating menu item pricing:', error);
    throw error;
  }
};

export const calculateLocationSpecificPricing = async (tenantId: string, menuItemId: string, locationId: string, adjustmentFactors: { rentFactor: number; competitionFactor: number; demandFactor: number }): Promise<void> => {
  try {
    const menuItemRef = doc(db, `tenants/${tenantId}/menuItems`, menuItemId);
    const menuItemDoc = await getDoc(menuItemRef);
    
    if (!menuItemDoc.exists()) {
      throw new Error('Menu item not found');
    }
    
    const menuItem = menuItemDoc.data() as MenuItem;
    const basePrice = menuItem.price;
    const baseCost = menuItem.pricing?.baseCost || menuItem.cost;
    
    // Calculate location-specific pricing
    const locationMultiplier = adjustmentFactors.rentFactor * adjustmentFactors.competitionFactor * adjustmentFactors.demandFactor;
    const locationPrice = basePrice * locationMultiplier;
    const locationCost = baseCost * adjustmentFactors.rentFactor; // Only rent affects cost
    const locationMargin = ((locationPrice - locationCost) / locationPrice) * 100;
    
    const locationPricing = {
      [locationId]: {
        price: Math.round(locationPrice * 100) / 100,
        cost: Math.round(locationCost * 100) / 100,
        margin: Math.round(locationMargin * 100) / 100,
        reason: `Adjusted for location factors: rent(${adjustmentFactors.rentFactor}x), competition(${adjustmentFactors.competitionFactor}x), demand(${adjustmentFactors.demandFactor}x)`
      }
    };
    
    await updateDoc(menuItemRef, {
      [`pricing.locationPricing.${locationId}`]: locationPricing[locationId],
      updatedAt: Timestamp.now()
    });
    
    console.log('Location-specific pricing calculated for:', menuItemId, 'at location:', locationId);
  } catch (error) {
    console.error('Error calculating location-specific pricing:', error);
    throw error;
  }
};

// 🏷️ ENHANCED CATEGORY OPERATIONS
export const createHierarchicalCategory = async (tenantId: string, categoryData: Omit<MenuCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const categoriesRef = collection(db, `tenants/${tenantId}/menuCategories`);
    const now = Timestamp.now();
    
    const docRef = await addDoc(categoriesRef, {
      ...categoryData,
      createdAt: now,
      updatedAt: now
    });
    
    // Update parent category if this is a subcategory
    if (categoryData.hierarchy?.parentId) {
      const parentRef = doc(db, `tenants/${tenantId}/menuCategories`, categoryData.hierarchy.parentId);
      const parentDoc = await getDoc(parentRef);
      
      if (parentDoc.exists()) {
        const parentData = parentDoc.data();
        const childCategories = parentData.hierarchy?.childCategories || [];
        childCategories.push(docRef.id);
        
        await updateDoc(parentRef, {
          'hierarchy.childCategories': childCategories,
          updatedAt: now
        });
      }
    }
    
    console.log('Hierarchical category created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating hierarchical category:', error);
    throw error;
  }
};

export const getCategoryHierarchy = async (tenantId: string): Promise<MenuCategory[]> => {
  try {
    const categories = await getMenuCategories(tenantId);
    
    // Sort by hierarchy level and display order
    return categories.sort((a, b) => {
      const levelA = a.hierarchy?.level || 1;
      const levelB = b.hierarchy?.level || 1;
      
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      
      return a.displayOrder - b.displayOrder;
    });
  } catch (error) {
    console.error('Error getting category hierarchy:', error);
    throw error;
  }
};

export const calculateDietaryLabels = (ingredients: MenuIngredient[], nutritionDb: NutritionData[]): MenuItem['dietaryLabels'] => {
  const labels = {
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isKeto: true,
    isPaleo: true,
    isDairyFree: true,
    isNutFree: true,
    isLowCarb: true,
    isLowSodium: true,
    isOrganic: true,
    isHalal: true,
    isKosher: true
  };
  
  ingredients.forEach(ingredient => {
    const nutritionData = nutritionDb.find(n => n.name.toLowerCase() === ingredient.inventoryItemName.toLowerCase());
    if (nutritionData) {
      Object.keys(labels).forEach(label => {
        if (labels[label as keyof typeof labels] && !nutritionData.dietary[label as keyof typeof nutritionData.dietary]) {
          labels[label as keyof typeof labels] = false;
        }
      });
    }
  });
  
  return labels;
};

// 💰 PHASE 2: PRICING CALCULATION HELPERS
export const calculateAdvancedPricing = (menuItem: CreateMenuItem, marketData?: any): MenuItem['pricing'] => {
  const baseCost = calculateMenuItemCost(menuItem.ingredients);
  const laborCost = menuItem.preparationTime * 0.33; // ₱20 per hour = ₱0.33 per minute
  const overheadCost = baseCost * 0.15; // 15% overhead
  const totalCost = baseCost + laborCost + overheadCost;
  const targetMargin = 65; // 65% target margin
  const suggestedPrice = totalCost / (1 - targetMargin / 100);
  
  const pricing: any = {
    baseCost: Math.round(baseCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    overheadCost: Math.round(overheadCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    targetMargin,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    dynamicPricing: {
      enabled: false,
      peakHours: {
        start: "18:00",
        end: "21:00",
        multiplier: 1.15
      },
      offPeakDiscount: {
        start: "14:00",
        end: "17:00",
        multiplier: 0.9
      },
      demandBased: {
        enabled: false,
        highDemandMultiplier: 1.2,
        lowDemandMultiplier: 0.85
      }
    }
  }
  
  // Only add competitorPrice if it exists
  if (marketData?.competitorPrice) {
    pricing.competitorPrice = marketData.competitorPrice
  }
  
  return pricing;
};

export const calculateProfitAnalysis = (menuItem: MenuItem, salesData: any[]): MenuItem['profitAnalysis'] => {
  const dailyVolume = salesData.length > 0 ? salesData.reduce((sum, sale) => sum + sale.quantity, 0) / salesData.length : 0;
  const profitPerItem = menuItem.price - (menuItem.pricing?.totalCost || menuItem.cost);
  const weeklyRevenue = dailyVolume * 7 * menuItem.price;
  const monthlyRevenue = weeklyRevenue * 4.33;
  
  return {
    dailyVolume: Math.round(dailyVolume * 100) / 100,
    weeklyRevenue: Math.round(weeklyRevenue * 100) / 100,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    profitPerItem: Math.round(profitPerItem * 100) / 100,
    contribution: 0, // Will be calculated at restaurant level
    lastUpdated: Timestamp.now()
  };
};

// 🏷️ PHASE 3: CATEGORY & TEMPLATE HELPERS
export const createCategoryHierarchy = (mainCategory: string, subCategory?: string, subSubCategory?: string, tags: string[] = []): MenuItem['categoryHierarchy'] => {
  return {
    mainCategory,
    subCategory,
    subSubCategory,
    tags
  };
};

export const createDefaultSchedule = (isAlwaysAvailable = true) => {
  const defaultTime = isAlwaysAvailable ? { start: "00:00", end: "23:59", available: true } : { start: "09:00", end: "21:00", available: true };
  
  return {
    monday: defaultTime,
    tuesday: defaultTime,
    wednesday: defaultTime,
    thursday: defaultTime,
    friday: defaultTime,
    saturday: defaultTime,
    sunday: defaultTime
  };
};

// Menu Items CRUD operations (with ENHANCED branch isolation)
export const getMenuItems = async (tenantId: string, locationId?: string): Promise<MenuItem[]> => {
  try {
    console.log(`🔍 getMenuItems called with tenantId: ${tenantId}, locationId: ${locationId}`);
    
    const itemsRef = getMenuItemsCollection(tenantId);
    
    // FORCE BRANCH FILTERING ALWAYS
    if (locationId) {
      console.log(`🔒 FORCING locationId filter: ${locationId}`);
      const queryRef = query(itemsRef, where('locationId', '==', locationId));
      const snapshot = await getDocs(queryRef);
      console.log(`📊 Query with locationId filter returned ${snapshot.size} items`);
      
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📋 Item: ${data.name}, locationId: ${data.locationId}, tenantId: ${data.tenantId}`);
        return {
          id: doc.id,
          ...data
        } as MenuItem;
      });
      
      // Sort and return
      const sortedItems = items.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log(`✅ Final result: ${sortedItems.length} items for ${locationId}`);
      return sortedItems;
    } else {
      console.warn('⚠️ NO LOCATION ID PROVIDED - RETURNING EMPTY ARRAY');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
    throw new Error('Failed to fetch menu items');
  }
};

export const subscribeToMenuItems = (
  tenantId: string, 
  callback: (items: MenuItem[]) => void
) => {
  const itemsRef = getMenuItemsCollection(tenantId);
  // Get all items without orderBy to avoid composite index issues
  
  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuItem[];
    
    // Sort in memory by displayOrder, then by name
    const sortedItems = items.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
    
    callback(sortedItems);
  }, (error) => {
    console.error('Error in menu items subscription:', error);
  });
};

export const addMenuItem = async (item: CreateMenuItem, nutritionDb?: NutritionData[]): Promise<string> => {
  try {
    console.log('🔧 addMenuItem: Starting with enhanced branch isolation:', {
      name: item.name,
      category: item.category,
      price: item.price,
      tenantId: item.tenantId,
      locationId: item.locationId || 'MISSING'
    });

    // 🚨 CRITICAL: Validate locationId before proceeding
    if (!item.locationId) {
      throw new Error('locationId is required for branch isolation');
    }

    // 🔥 USE NEW BRANCH ISOLATION SYSTEM
    
    // 🛡️ CRITICAL: Clean undefined values before processing
    const cleanItem = Object.keys(item).reduce((cleaned: any, key) => {
      if (item[key as keyof CreateMenuItem] !== undefined) {
        cleaned[key] = item[key as keyof CreateMenuItem];
      }
      return cleaned;
    }, {} as CreateMenuItem);
    
    // Prepare enhanced menu item data
    const enhancedItem = {
      ...cleanItem,
      cost: calculateMenuItemCost(item.ingredients),
      status: 'active' as const,
      displayOrder: item.displayOrder || 999,
      allergens: item.allergens || []
    };

    // Add nutrition information if database provided
    if (nutritionDb && nutritionDb.length > 0) {
      enhancedItem.nutrition = calculateNutritionFromIngredients(item.ingredients, nutritionDb);
      enhancedItem.allergenInfo = calculateAllergenInfo(item.ingredients, nutritionDb);
      enhancedItem.dietaryLabels = calculateDietaryLabels(item.ingredients, nutritionDb);
    }

    // Add advanced pricing if ingredients available
    if (item.ingredients && item.ingredients.length > 0) {
      enhancedItem.pricing = calculateAdvancedPricing(item);
    }

    // 🛡️ FINAL CLEANUP: Remove any undefined values that might have been added
    const finalCleanedItem = Object.keys(enhancedItem).reduce((cleaned: any, key) => {
      if (enhancedItem[key as keyof typeof enhancedItem] !== undefined) {
        cleaned[key] = enhancedItem[key as keyof typeof enhancedItem];
      }
      return cleaned;
    }, {});

    console.log('🔧 Final cleaned item keys:', Object.keys(finalCleanedItem));

    // Create with branch isolation
    const docId = await createBranchMenuItem(item.tenantId, item.locationId, finalCleanedItem);
    
    console.log(`✅ BRANCH-ISOLATED MENU ITEM CREATED: ${docId} for location ${item.locationId}`);
    
    // 🔄 CRITICAL: Sync to POS with branch isolation
    try {
      const menuItem = { id: docId, ...enhancedItem } as MenuItem;
      await syncMenuItemToPOS(menuItem);
      console.log('✅ Menu item synced to POS with branch isolation');
    } catch (syncError) {
      console.error('❌ Failed to sync to POS:', syncError);
      // Don't throw - menu item was created successfully
    }

    return docId;
  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    throw new Error('Failed to create menu item');
  }
};

export const updateMenuItem = async (
  tenantId: string,
  itemId: string,
  updates: Partial<Omit<MenuItem, 'id' | 'tenantId' | 'createdAt'>> & { profitAmount?: number; profitMargin?: number }
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/menuItems`, itemId);
    const now = Timestamp.now();
    
    // Recalculate cost and profit metrics if ingredients or price were updated
    if (updates.ingredients) {
      updates.cost = calculateMenuItemCost(updates.ingredients);
    }
    
    // Recalculate profit metrics if cost or price changed
    if (updates.cost !== undefined || updates.price !== undefined) {
      // Get current item to get the price if not being updated
      const currentItemDoc = await getDoc(itemRef);
      const currentItem = currentItemDoc.data();
      
      const finalPrice = updates.price !== undefined ? updates.price : (currentItem?.price || 0);
      const finalCost = updates.cost !== undefined ? updates.cost : (currentItem?.cost || 0);
      
      updates.profitAmount = finalPrice - finalCost;
      updates.profitMargin = finalPrice > 0 ? (updates.profitAmount / finalPrice) * 100 : 0;
    }
    
    // Create update data, filtering out undefined values
    const updateData: any = {
      updatedAt: now
    };
    
    // Add defined fields only
    (Object.keys(updates) as Array<keyof typeof updates>).forEach(key => {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    });
    
    await updateDoc(itemRef, updateData);
    
    // 🔥 PERMANENT FIX: Use new sync system for updates
    try {
      const updatedItemDoc = await getDoc(itemRef);
      if (updatedItemDoc.exists()) {
        const menuItem = { id: itemId, ...updatedItemDoc.data() } as MenuItem;
        console.log('🔄 Syncing updated menu item to POS using new sync system...');
        const { syncMenuItemToPOS } = await import('./menuPOSSync');
        await syncMenuItemToPOS(menuItem);
        console.log('✅ Updated menu item synced to POS successfully!');
      }
    } catch (syncError) {
      console.error('❌ Failed to sync updated menu item to POS:', syncError);
      // Don't throw - menu item was updated successfully
    }
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw new Error('Failed to update menu item');
  }
};

export const updateMenuItemStatus = async (
  tenantId: string,
  itemId: string,
  status: MenuItem['status']
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/menuItems`, itemId);
    const now = Timestamp.now();
    
    await updateDoc(itemRef, {
      status,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating menu item status:', error);
    throw new Error('Failed to update menu item status');
  }
};

export const deleteMenuItem = async (
  tenantId: string,
  itemId: string
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/menuItems`, itemId);
    await deleteDoc(itemRef);
    
    // 🔥 PERMANENT FIX: Auto-sync deletion to POS
    try {
      const { removePOSItemForDeletedMenu } = await import('./menuPOSSync');
      await removePOSItemForDeletedMenu(tenantId, itemId);
      console.log('✅ Menu item deleted and synced to POS');
    } catch (syncError) {
      console.error('❌ Failed to sync deletion to POS:', syncError);
      // Don't throw - menu item was deleted successfully
    }
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw new Error('Failed to delete menu item');
  }
};

// Menu Categories CRUD operations (with PROPER server-side location filtering)
export const getMenuCategories = async (tenantId: string, locationId?: string): Promise<MenuCategory[]> => {
  try {
    const categoriesRef = getMenuCategoriesCollection(tenantId);
    
    let snapshot;
    
    if (locationId) {
      // 🔥 CRITICAL FIX: Use server-side filtering for categories too
      console.log(`🎯 SERVER-SIDE FILTERING: Querying only categories for locationId: ${locationId}`);
      const locationQuery = query(categoriesRef, where('locationId', '==', locationId));
      snapshot = await getDocs(locationQuery);
      
      console.log(`✅ Firebase query returned ${snapshot.size} categories for location ${locationId}`);
    } else {
      // Only fetch all categories if no location specified
      console.log(`📂 Fetching ALL menu categories (no location filter specified)`);
      snapshot = await getDocs(categoriesRef);
    }

    let categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuCategory[];

    // Debug: Log what Firebase actually returned
    console.log(`� Firebase returned ${categories.length} categories:`, categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      locationId: (cat as any).locationId,
      isActive: cat.isActive
    })));

    // Additional client-side safety filter (double-check)
    if (locationId) {
      const beforeFilter = categories.length;
      categories = categories.filter(cat => {
        const categoryLocationId = (cat as any).locationId;
        return categoryLocationId === locationId;
      });
      const afterFilter = categories.length;
      
      if (beforeFilter !== afterFilter) {
        console.warn(`� CATEGORY LEAKAGE DETECTED: ${beforeFilter - afterFilter} categories filtered out client-side after server query`);
      } else {
        console.log(`✅ Clean server-side category filtering: All ${afterFilter} categories match expected location`);
      }
    }

    // Filter only active categories
    categories = categories.filter(cat => cat.isActive !== false);

    // Sort in memory by displayOrder, then by name
    const sortedCategories = categories.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`📂 Menu Categories: Loaded ${sortedCategories.length} categories${locationId ? ` for location ${locationId}` : ''}`);
    return sortedCategories;
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    throw new Error('Failed to fetch menu categories');
  }
};

export const addMenuCategory = async (category: CreateMenuCategory): Promise<string> => {
  try {
    const categoriesRef = getMenuCategoriesCollection(category.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(categoriesRef, {
      ...category,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding menu category:', error);
    throw new Error('Failed to add menu category');
  }
};

// 🎯 Initialize Default Menu Categories
export const initializeDefaultMenuCategories = async (tenantId: string, locationId?: string): Promise<void> => {
  try {
    const existingCategories = await getMenuCategories(tenantId, locationId);
    
    // Only initialize if no categories exist for this location
    if (existingCategories.length > 0) {
      console.log('🏷️ Menu categories already exist for this location, skipping initialization');
      return;
    }
    
    const defaultMenuCategories = [
      { name: 'Appetizers', description: 'Starters and small plates', displayOrder: 1 },
      { name: 'Main Course', description: 'Main dishes and entrees', displayOrder: 2 },
      { name: 'Beverages', description: 'Drinks and refreshments', displayOrder: 3 },
      { name: 'Desserts', description: 'Sweet treats and desserts', displayOrder: 4 },
      { name: 'Snacks', description: 'Light snacks and finger foods', displayOrder: 5 },
      { name: 'Salads', description: 'Fresh salads and healthy options', displayOrder: 6 },
      { name: 'Burgers', description: 'Burgers and sandwiches', displayOrder: 7 },
      { name: 'Pizza', description: 'Pizza and Italian favorites', displayOrder: 8 },
      { name: 'Pasta', description: 'Pasta dishes', displayOrder: 9 },
      { name: 'Coffee & Tea', description: 'Hot beverages', displayOrder: 10 }
    ];
    
    for (const defaultCat of defaultMenuCategories) {
      await addMenuCategory({
        ...defaultCat,
        tenantId,
        locationId // Include locationId for branch-specific categories
      });
    }
    
    console.log(`✅ Default menu categories initialized successfully${locationId ? ` for location ${locationId}` : ''}`);
  } catch (error) {
    console.error('Error initializing default menu categories:', error);
    throw new Error('Failed to initialize default menu categories');
  }
};

// 🎯 Initialize Default Add-on Categories
export const initializeDefaultAddonCategories = async (tenantId: string): Promise<void> => {
  try {
    const existingCategories = await getMenuCategories(tenantId);
    
    const defaultAddOnCategories = [
      { name: '📏 Size Options', description: 'Size modifications for menu items (Small, Medium, Large)' },
      { name: '➕ Extra Ingredients', description: 'Additional ingredients and toppings' },
      { name: '🔧 Modifications', description: 'Menu item modifications and customizations' },
      { name: '⭐ Special Requests', description: 'Special requests and premium options' }
    ];

    let displayOrder = Math.max(...existingCategories.map(cat => cat.displayOrder), 0) + 1;

    for (const defaultCat of defaultAddOnCategories) {
      const exists = existingCategories.find(cat => cat.name === defaultCat.name);
      if (!exists) {
        await addMenuCategory({
          name: defaultCat.name,
          description: defaultCat.description,
          displayOrder: displayOrder++,
          tenantId
        });
      }
    }
  } catch (error) {
    console.error('Error initializing default add-on categories:', error);
  }
};

export const updateMenuCategory = async (
  tenantId: string,
  categoryId: string,
  updates: Partial<Omit<MenuCategory, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const categoryRef = doc(db, `tenants/${tenantId}/menuCategories`, categoryId);
    const now = Timestamp.now();
    
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating menu category:', error);
    throw new Error('Failed to update menu category');
  }
};

export const deleteMenuCategory = async (
  tenantId: string,
  categoryId: string
): Promise<void> => {
  try {
    const categoryRef = doc(db, `tenants/${tenantId}/menuCategories`, categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting menu category:', error);
    throw new Error('Failed to delete menu category');
  }
};

// Recipes CRUD operations
export const getRecipes = async (tenantId: string): Promise<Recipe[]> => {
  try {
    const recipesRef = getRecipesCollection(tenantId);
    // Get all recipes without orderBy to avoid composite index issues
    const snapshot = await getDocs(recipesRef);
    
    const recipes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
    
    // Sort in memory by name
    return recipes.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw new Error('Failed to fetch recipes');
  }
};

export const getRecipesByMenuItem = async (
  tenantId: string,
  menuItemId: string
): Promise<Recipe[]> => {
  try {
    const recipesRef = getRecipesCollection(tenantId);
    const q = query(recipesRef, where('menuItemId', '==', menuItemId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error fetching recipes by menu item:', error);
    throw new Error('Failed to fetch recipes by menu item');
  }
};

export const addRecipe = async (recipe: CreateRecipe): Promise<string> => {
  try {
    const recipesRef = getRecipesCollection(recipe.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(recipesRef, {
      ...recipe,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding recipe:', error);
    throw new Error('Failed to add recipe');
  }
};

export const updateRecipe = async (
  tenantId: string,
  recipeId: string,
  updates: Partial<Omit<Recipe, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const recipeRef = doc(db, `tenants/${tenantId}/recipes`, recipeId);
    const now = Timestamp.now();
    
    await updateDoc(recipeRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw new Error('Failed to update recipe');
  }
};

export const deleteRecipe = async (
  tenantId: string,
  recipeId: string
): Promise<void> => {
  try {
    const recipeRef = doc(db, `tenants/${tenantId}/recipes`, recipeId);
    await deleteDoc(recipeRef);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw new Error('Failed to delete recipe');
  }
};

// Analytics functions
export const getMenuStats = async (tenantId: string) => {
  try {
    const menuItems = await getMenuItems(tenantId);
    const categories = await getMenuCategories(tenantId);
    
    const totalItems = menuItems.length;
    const activeItems = menuItems.filter(item => item.status === 'active').length;
    const popularItems = menuItems.filter(item => item.isPopular).length;
    
    const avgPrice = totalItems > 0 ? 
      menuItems.reduce((sum, item) => sum + item.price, 0) / totalItems : 0;
    
    const avgCost = totalItems > 0 ? 
      menuItems.reduce((sum, item) => sum + item.cost, 0) / totalItems : 0;
    
    const avgMargin = totalItems > 0 ? 
      menuItems.reduce((sum, item) => {
        const margin = ((item.price - item.cost) / item.price) * 100;
        return sum + (isNaN(margin) ? 0 : margin);
      }, 0) / totalItems : 0;
    
    const avgPrepTime = totalItems > 0 ? 
      menuItems.reduce((sum, item) => sum + item.preparationTime, 0) / totalItems : 0;
    
    return {
      totalItems,
      activeItems,
      popularItems,
      totalCategories: categories.length,
      avgPrice,
      avgCost,
      avgMargin,
      avgPrepTime
    };
  } catch (error) {
    console.error('Error getting menu stats:', error);
    throw new Error('Failed to get menu statistics');
  }
};
