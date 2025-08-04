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
import { syncMenuItemToPOS } from './integration';

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
}

export interface CreateMenuCategory {
  name: string;
  description: string;
  displayOrder?: number;
  tenantId: string;
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

// Menu Items CRUD operations (with optional location filtering)
export const getMenuItems = async (tenantId: string, locationId?: string): Promise<MenuItem[]> => {
  try {
    const itemsRef = getMenuItemsCollection(tenantId);
    // Get all items without orderBy to avoid composite index issues
    const snapshot = await getDocs(itemsRef);
    
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuItem[];
    
    // Debug: Log all items before filtering
    console.log(`📋 ALL menu items from Firebase (no location filter): ${items.length}`);
    console.log('🔍 ALL items details:', items.map(item => ({
      id: item.id,
      name: item.name,
      locationId: item.locationId,
      category: item.category
    })));
    
    // Filter client-side by locationId if specified
    if (locationId) {
      console.log(`🎯 Filtering for locationId: ${locationId}`);
      items = items.filter(item => item.locationId === locationId);
      console.log(`📋 After filtering: ${items.length} items match location ${locationId}`);
    }
    
    // Sort in memory by displayOrder, then by name
    const sortedItems = items.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
    
    console.log(`📋 Menu: Loaded ${sortedItems.length} menu items${locationId ? ` for location ${locationId}` : ''}`);
    return sortedItems;
  } catch (error) {
    console.error('Error fetching menu items:', error);
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

export const addMenuItem = async (item: CreateMenuItem): Promise<string> => {
  try {
    console.log('🔧 addMenuItem: Starting with data:', {
      name: item.name,
      category: item.category,
      price: item.price,
      tenantId: item.tenantId,
      locationId: item.locationId,
      ingredientsCount: item.ingredients?.length || 0
    });
    
    const itemsRef = getMenuItemsCollection(item.tenantId);
    const now = Timestamp.now();
    
    console.log('🔧 addMenuItem: Calculating cost...');
    const cost = calculateMenuItemCost(item.ingredients);
    const profitAmount = item.price - cost;
    const profitMargin = item.price > 0 ? (profitAmount / item.price) * 100 : 0;
    
    console.log('🔧 addMenuItem: Cost calculations:', {
      cost,
      profitAmount,
      profitMargin: `${profitMargin.toFixed(1)}%`
    });
    
    // Create base document data with required fields
    const baseDocData = {
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      ingredients: item.ingredients,
      preparationTime: item.preparationTime,
      allergens: item.allergens,
      tenantId: item.tenantId,
      cost,
      profitAmount,
      profitMargin,
      status: 'active' as const,
      isPopular: item.isPopular || false,
      displayOrder: item.displayOrder || 999,
      createdAt: now,
      updatedAt: now
    };

    // Add optional fields only if they're defined to avoid Firestore undefined values
    const docData: any = { ...baseDocData };
    if (item.calories !== undefined) docData.calories = item.calories;
    if (item.image !== undefined) docData.image = item.image;
    if (item.emoji !== undefined) docData.emoji = item.emoji;
    if (item.locationId !== undefined) docData.locationId = item.locationId;
    if (item.isAddonOnly !== undefined) docData.isAddonOnly = item.isAddonOnly;
    if (item.addonType !== undefined) docData.addonType = item.addonType;
    if (item.applicableItems !== undefined) docData.applicableItems = item.applicableItems;
    if (item.isRequired !== undefined) docData.isRequired = item.isRequired;
    if (item.maxQuantity !== undefined) docData.maxQuantity = item.maxQuantity;
    if (item.priceType !== undefined) docData.priceType = item.priceType;
    
    console.log('🔧 addMenuItem: Prepared document data:', {
      hasName: !!docData.name,
      hasCategory: !!docData.category,
      hasPrice: !!docData.price,
      hasTenantId: !!docData.tenantId,
      hasLocationId: !!docData.locationId,
      status: docData.status,
      optionalFieldsIncluded: Object.keys(docData).filter(key => 
        ['calories', 'image', 'emoji', 'locationId', 'isAddonOnly', 'addonType', 'applicableItems', 'isRequired', 'maxQuantity', 'priceType']
        .includes(key)
      )
    });
    
    console.log('🔧 addMenuItem: Calling Firebase addDoc...');
    const docRef = await addDoc(itemsRef, docData);
    
    console.log('🔧 addMenuItem: Firebase addDoc successful, ID:', docRef.id);
    
    // 🔥 CRITICAL FIX: Sync menu item to POS with ingredients
    try {
      const menuItem = { id: docRef.id, ...docData } as MenuItem;
      console.log('🔄 Syncing menu item to POS with ingredients...');
      await syncMenuItemToPOS(menuItem);
      console.log('✅ Menu item synced to POS successfully!');
    } catch (syncError) {
      console.error('❌ Failed to sync menu item to POS:', syncError);
      // Don't throw - menu item was created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ addMenuItem: Firebase error:', error);
    console.error('❌ addMenuItem: Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      customData: (error as any)?.customData
    });
    throw new Error(`Failed to add menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // 🔥 CRITICAL FIX: Sync updated menu item to POS with ingredients
    try {
      const updatedItemDoc = await getDoc(itemRef);
      if (updatedItemDoc.exists()) {
        const menuItem = { id: itemId, ...updatedItemDoc.data() } as MenuItem;
        console.log('🔄 Syncing updated menu item to POS with ingredients...');
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
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw new Error('Failed to delete menu item');
  }
};

// Menu Categories CRUD operations
export const getMenuCategories = async (tenantId: string): Promise<MenuCategory[]> => {
  try {
    const categoriesRef = getMenuCategoriesCollection(tenantId);
    // Get all categories without orderBy to avoid composite index issues
    const snapshot = await getDocs(categoriesRef);
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuCategory[];
    
    // Sort in memory by displayOrder, then by name
    return categories.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
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
