import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase';
import { BusinessSettings, DEFAULT_BUSINESS_SETTINGS } from '../types/business';

/**
 * Business Settings Management
 * Handles business configuration like restaurant vs retail mode
 */

export const getBusinessSettings = async (tenantId: string): Promise<BusinessSettings> => {
  try {
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'business');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return {
        ...DEFAULT_BUSINESS_SETTINGS,
        ...settingsSnap.data()
      } as BusinessSettings;
    } else {
      // Initialize with defaults for new tenants
      await setDoc(settingsRef, DEFAULT_BUSINESS_SETTINGS);
      return DEFAULT_BUSINESS_SETTINGS;
    }
  } catch (error) {
    console.error('Error getting business settings:', error);
    return DEFAULT_BUSINESS_SETTINGS;
  }
};

export const updateBusinessSettings = async (
  tenantId: string, 
  settings: Partial<BusinessSettings>
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'business');
    await updateDoc(settingsRef, settings);
    console.log('✅ Business settings updated');
  } catch (error) {
    console.error('Error updating business settings:', error);
    throw error;
  }
};

export const initializeBusinessSettings = async (
  tenantId: string,
  settings: BusinessSettings = DEFAULT_BUSINESS_SETTINGS
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'business');
    await setDoc(settingsRef, settings);
    console.log('✅ Business settings initialized');
  } catch (error) {
    console.error('Error initializing business settings:', error);
    throw error;
  }
};

export const subscribeToBusinessSettings = (
  tenantId: string,
  callback: (settings: BusinessSettings) => void
): Unsubscribe => {
  const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'business');
  
  return onSnapshot(settingsRef, (doc) => {
    if (doc.exists()) {
      callback({
        ...DEFAULT_BUSINESS_SETTINGS,
        ...doc.data()
      } as BusinessSettings);
    } else {
      callback(DEFAULT_BUSINESS_SETTINGS);
    }
  });
};
