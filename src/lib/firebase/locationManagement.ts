import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Location, LocationUsage, LocationInventory, LocationAnalytics } from '../types/location';

// Create new location
export const createLocation = async (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const locationRef = doc(collection(db, 'locations'));
  const locationId = locationRef.id;
  
  const location: Location = {
    ...locationData,
    id: locationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(locationRef, location);
  return locationId;
};

// Get all locations for a tenant
export const getLocations = async (tenantId: string): Promise<Location[]> => {
  const q = query(
    collection(db, 'locations'),
    where('tenantId', '==', tenantId)
  );

  const snapshot = await getDocs(q);
  const locations = snapshot.docs.map(doc => ({ ...doc.data() } as Location));
  
  // Sort by name in memory to avoid index requirement
  return locations.sort((a, b) => a.name.localeCompare(b.name));
};

// Get location by ID
export const getLocation = async (locationId: string): Promise<Location | null> => {
  const docRef = doc(db, 'locations', locationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return { ...docSnap.data() } as Location;
};

// Update location
export const updateLocation = async (
  locationId: string,
  updates: Partial<Location>
): Promise<void> => {
  await updateDoc(doc(db, 'locations', locationId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Delete location
export const deleteLocation = async (locationId: string): Promise<void> => {
  // Use writeBatch for atomic deletes
  const batch = writeBatch(db);
  
  // Delete the main location document
  const locationRef = doc(db, 'locations', locationId);
  batch.delete(locationRef);
  
  // Delete location usage data
  const usageRef = doc(db, 'locationUsage', locationId);
  batch.delete(usageRef);
  
  // Delete location inventory items
  const inventoryQuery = query(
    collection(db, 'locationInventory'),
    where('locationId', '==', locationId)
  );
  const inventorySnapshot = await getDocs(inventoryQuery);
  inventorySnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete location analytics
  const analyticsQuery = query(
    collection(db, 'locationAnalytics'),
    where('locationId', '==', locationId)
  );
  const analyticsSnapshot = await getDocs(analyticsQuery);
  analyticsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Commit all deletes atomically
  await batch.commit();
};

// Get location usage statistics
export const getLocationUsage = async (locationId: string): Promise<LocationUsage | null> => {
  const docRef = doc(db, 'locationUsage', locationId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return { ...docSnap.data() } as LocationUsage;
};

// Update location usage
export const updateLocationUsage = async (
  locationId: string,
  usage: Partial<LocationUsage>
): Promise<void> => {
  await updateDoc(doc(db, 'locationUsage', locationId), {
    ...usage,
    lastActivity: Timestamp.now(),
  });
};

// Get location-specific inventory
export const getLocationInventory = async (
  locationId: string,
  productId?: string
): Promise<LocationInventory[]> => {
  let q;
  
  if (productId) {
    q = query(
      collection(db, 'locationInventory'),
      where('locationId', '==', locationId),
      where('productId', '==', productId)
    );
  } else {
    q = query(
      collection(db, 'locationInventory'),
      where('locationId', '==', locationId)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data() } as LocationInventory));
};

// Update location inventory
export const updateLocationInventory = async (
  locationId: string,
  productId: string,
  inventory: Partial<LocationInventory>
): Promise<void> => {
  const inventoryId = `${locationId}_${productId}`;
  await setDoc(doc(db, 'locationInventory', inventoryId), {
    locationId,
    productId,
    ...inventory,
  }, { merge: true });
};

// Get location analytics
export const getLocationAnalytics = async (
  locationId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate?: Date,
  endDate?: Date
): Promise<LocationAnalytics[]> => {
  let q = query(
    collection(db, 'locationAnalytics'),
    where('locationId', '==', locationId),
    where('period', '==', period),
    orderBy('date', 'desc')
  );

  // Add date filters if provided
  if (startDate) {
    q = query(q, where('date', '>=', Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    q = query(q, where('date', '<=', Timestamp.fromDate(endDate)));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data() } as LocationAnalytics));
};

// Save location analytics
export const saveLocationAnalytics = async (
  analytics: Omit<LocationAnalytics, 'id'>
): Promise<void> => {
  const analyticsId = `${analytics.locationId}_${analytics.period}_${analytics.date.toMillis()}`;
  await setDoc(doc(db, 'locationAnalytics', analyticsId), analytics);
};

// Get locations accessible by user
export const getUserAccessibleLocations = async (
  tenantId: string,
  userLocationIds: string[]
): Promise<Location[]> => {
  if (userLocationIds.length === 0) return [];

  const q = query(
    collection(db, 'locations'),
    where('tenantId', '==', tenantId),
    where('id', 'in', userLocationIds)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data() } as Location));
};
