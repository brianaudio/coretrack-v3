import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
  // Legacy fields (optional for backward compatibility)
  inventoryItemId?: string;
  inventoryItemName?: string;
  inventoryQuantity?: number;
  cost: number;
  profit: number;
  margin: number;
  status: 'active' | 'inactive';
  tenantId: string;
  locationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Support for multiple ingredients
  ingredients?: Array<{
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
  }>;
}

export interface CreateAddon {
  name: string;
  description: string;
  price: number;
  // Legacy single inventory item fields (optional for backward compatibility)
  inventoryItemId?: string;
  inventoryItemName?: string;
  inventoryQuantity?: number;
  cost: number;
  status?: 'active' | 'inactive';
  // Support for multiple ingredients
  ingredients?: Array<{
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
  }>;
}

// Get all add-ons for a tenant and location
export const getAddons = async (tenantId: string, locationId: string): Promise<Addon[]> => {
  try {
    console.log('Loading add-ons for:', { tenantId, locationId });
    const addonsRef = collection(db, 'addons');
    const q = query(
      addonsRef,
      where('tenantId', '==', tenantId),
      where('locationId', '==', locationId),
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    const addons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Addon));
    
    console.log('Loaded add-ons:', addons.length, addons);
    return addons;
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    throw error;
  }
};

// Create a new add-on
export const createAddon = async (tenantId: string, locationId: string, addonData: CreateAddon): Promise<string> => {
  try {
    const addonsRef = collection(db, 'addons');
    const now = Timestamp.now();
    
    const profit = addonData.price - addonData.cost;
    const margin = addonData.price > 0 ? (profit / addonData.price) * 100 : 0;
    
    // Create document data with required fields only
    const docData: any = {
      name: addonData.name,
      description: addonData.description,
      price: addonData.price,
      cost: addonData.cost,
      profit,
      margin,
      status: addonData.status || 'active',
      tenantId,
      locationId,
      createdAt: now,
      updatedAt: now
    };

    // Add optional fields only if they're defined to avoid Firestore undefined values
    if (addonData.ingredients !== undefined) docData.ingredients = addonData.ingredients;
    if (addonData.inventoryItemId !== undefined) docData.inventoryItemId = addonData.inventoryItemId;
    if (addonData.inventoryItemName !== undefined) docData.inventoryItemName = addonData.inventoryItemName;
    if (addonData.inventoryQuantity !== undefined) docData.inventoryQuantity = addonData.inventoryQuantity;
    
    const docRef = await addDoc(addonsRef, docData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating add-on:', error);
    throw error;
  }
};

// Update an add-on
export const updateAddon = async (tenantId: string, addonId: string, updates: Partial<CreateAddon>): Promise<void> => {
  try {
    const addonRef = doc(db, 'addons', addonId);
    
    // Create update data, filtering out undefined values
    const updateData: any = {
      updatedAt: Timestamp.now()
    };
    
    // Add defined fields only
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.inventoryItemId !== undefined) updateData.inventoryItemId = updates.inventoryItemId;
    if (updates.inventoryItemName !== undefined) updateData.inventoryItemName = updates.inventoryItemName;
    if (updates.inventoryQuantity !== undefined) updateData.inventoryQuantity = updates.inventoryQuantity;
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.ingredients !== undefined) updateData.ingredients = updates.ingredients;
    
    // Recalculate profit and margin if price or cost changed
    if (updates.price !== undefined || updates.cost !== undefined) {
      const profit = (updates.price || 0) - (updates.cost || 0);
      const margin = (updates.price || 0) > 0 ? (profit / (updates.price || 0)) * 100 : 0;
      updateData.profit = profit;
      updateData.margin = margin;
    }
    
    await updateDoc(addonRef, updateData);
  } catch (error) {
    console.error('Error updating add-on:', error);
    throw error;
  }
};

// Delete an add-on
export const deleteAddon = async (tenantId: string, addonId: string): Promise<void> => {
  try {
    const addonRef = doc(db, 'addons', addonId);
    await deleteDoc(addonRef);
  } catch (error) {
    console.error('Error deleting add-on:', error);
    throw error;
  }
};

// Toggle add-on status
export const toggleAddonStatus = async (tenantId: string, addonId: string, currentStatus: 'active' | 'inactive'): Promise<void> => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateAddon(tenantId, addonId, { status: newStatus });
};
