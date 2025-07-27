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
  status: 'active' | 'inactive' | 'out_of_stock';
  isPopular: boolean;
  displayOrder: number;
  tenantId: string;
  locationId?: string; // Added for branch-specific menu items
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
  isPopular?: boolean;
  displayOrder?: number;
  tenantId: string;
  locationId?: string; // Added for branch-specific menu items
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
    
    // Filter client-side by locationId if specified
    if (locationId) {
      items = items.filter(item => item.locationId === locationId);
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
    const itemsRef = getMenuItemsCollection(item.tenantId);
    const now = Timestamp.now();
    
    const cost = calculateMenuItemCost(item.ingredients);
    
    const docRef = await addDoc(itemsRef, {
      ...item,
      cost,
      status: 'active' as const,
      isPopular: item.isPopular || false,
      displayOrder: item.displayOrder || 999,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding menu item:', error);
    throw new Error('Failed to add menu item');
  }
};

export const updateMenuItem = async (
  tenantId: string,
  itemId: string,
  updates: Partial<Omit<MenuItem, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const itemRef = doc(db, `tenants/${tenantId}/menuItems`, itemId);
    const now = Timestamp.now();
    
    // Recalculate cost if ingredients were updated
    if (updates.ingredients) {
      updates.cost = calculateMenuItemCost(updates.ingredients);
    }
    
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: now
    });
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
      displayOrder: category.displayOrder || 999,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding menu category:', error);
    throw new Error('Failed to add menu category');
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
