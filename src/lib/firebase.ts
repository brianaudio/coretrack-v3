// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  enableIndexedDbPersistence,
  enableNetwork,
  disableNetwork,
  onSnapshotsInSync
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Track offline persistence status and network connectivity
let offlinePersistenceEnabled = false;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let networkStatusListenersSetup = false;

// Enable offline persistence for PWA functionality with enhanced configuration
const enableOfflinePersistence = async () => {
  if (typeof window !== 'undefined' && !offlinePersistenceEnabled) {
    try {
      await enableIndexedDbPersistence(db, {
        forceOwnership: false
      });
      offlinePersistenceEnabled = true;
      console.log('✅ Firebase offline persistence enabled successfully');
      
      // Set up network status monitoring
      setupNetworkStatusMonitoring();
      
      // Set up sync status monitoring
      setupSyncStatusMonitoring();
      
      // Dispatch a custom event to notify the app that offline persistence is ready
      window.dispatchEvent(new CustomEvent('firebase-offline-ready', { 
        detail: { offlineEnabled: true, isOnline } 
      }));
      
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('⚠️ Firebase persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.');
        offlinePersistenceEnabled = true; // Consider it "enabled" for this tab
        setupNetworkStatusMonitoring(); // Still set up monitoring
        window.dispatchEvent(new CustomEvent('firebase-offline-ready', { 
          detail: { offlineEnabled: true, isOnline, multiTab: true } 
        }));
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support all of the features required to enable persistence
        console.warn('⚠️ Firebase persistence failed: The current browser doesn\'t support all features required.');
        setupNetworkStatusMonitoring(); // Still monitor network
        window.dispatchEvent(new CustomEvent('firebase-offline-ready', { 
          detail: { offlineEnabled: false, isOnline, browserSupport: false } 
        }));
      } else {
        console.error('❌ Firebase persistence error:', err);
        setupNetworkStatusMonitoring(); // Still monitor network
        window.dispatchEvent(new CustomEvent('firebase-offline-ready', { 
          detail: { offlineEnabled: false, isOnline, error: err.code } 
        }));
      }
    }
  }
};

// Enhanced network status monitoring
const setupNetworkStatusMonitoring = () => {
  if (typeof window === 'undefined' || networkStatusListenersSetup) return;
  
  const updateOnlineStatus = (online: boolean) => {
    const wasOnline = isOnline;
    isOnline = online;
    
    if (wasOnline !== online) {
      console.log(online ? '🌐 Network connection restored' : '📱 Operating in offline mode');
      
      // Dispatch network status change event
      window.dispatchEvent(new CustomEvent('firebase-network-status', { 
        detail: { isOnline: online, changed: true } 
      }));
      
      // Attempt to re-enable network connection when online
      if (online && offlinePersistenceEnabled) {
        enableNetwork(db).catch((err) => {
          console.warn('⚠️ Could not re-enable Firebase network:', err.message);
        });
      }
    }
  };
  
  // Listen for network status changes
  window.addEventListener('online', () => updateOnlineStatus(true));
  window.addEventListener('offline', () => updateOnlineStatus(false));
  
  // Check initial network status
  updateOnlineStatus(navigator.onLine);
  networkStatusListenersSetup = true;
};

// Set up sync status monitoring to track when data is synchronized
const setupSyncStatusMonitoring = () => {
  if (typeof window === 'undefined') return;
  
  let lastSyncEvent = 0;
  
  // Monitor when snapshots are in sync, but throttle events to prevent spam
  onSnapshotsInSync(db, () => {
    const now = Date.now();
    
    // Only dispatch sync event if it's been at least 5 seconds since the last one
    // or if we just came back online
    if (now - lastSyncEvent > 5000 || !isOnline) {
      window.dispatchEvent(new CustomEvent('firebase-sync-complete', { 
        detail: { timestamp: now, isOnline } 
      }));
      lastSyncEvent = now;
    }
  });
};

// Initialize offline persistence
enableOfflinePersistence();

// Export helper functions
export const isOfflinePersistenceEnabled = () => offlinePersistenceEnabled;
export const isNetworkOnline = () => isOnline;

// Export helper function to wait for offline persistence to be ready
export const waitForOfflinePersistence = (timeoutMs: number = 3000) => {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      // Server-side rendering, resolve immediately
      resolve();
      return;
    }
    
    if (offlinePersistenceEnabled) {
      resolve();
      return;
    }
    
    // Check if we're offline - if so, don't wait for persistence setup
    if (!navigator.onLine) {
      console.log('📱 Device is offline, proceeding without waiting for persistence setup');
      resolve();
      return;
    }
    
    const handleOfflineReady = () => {
      window.removeEventListener('firebase-offline-ready', handleOfflineReady);
      resolve();
    };
    
    window.addEventListener('firebase-offline-ready', handleOfflineReady);
    
    // Fallback timeout - don't block operations indefinitely
    const timeoutId = setTimeout(() => {
      window.removeEventListener('firebase-offline-ready', handleOfflineReady);
      console.log('⏰ Firebase offline persistence timeout, proceeding anyway');
      resolve();
    }, timeoutMs);
    
    // Clear timeout if event fires first
    const originalHandler = handleOfflineReady;
    const wrappedHandler = () => {
      clearTimeout(timeoutId);
      originalHandler();
    };
    
    window.removeEventListener('firebase-offline-ready', handleOfflineReady);
    window.addEventListener('firebase-offline-ready', wrappedHandler);
  });
};

// Export helper to listen for network status changes
export const onNetworkStatusChange = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: CustomEvent) => {
    callback(event.detail.isOnline);
  };
  
  window.addEventListener('firebase-network-status', handler as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('firebase-network-status', handler as EventListener);
  };
};

// Export helper to listen for sync status changes
export const onSyncStatusChange = (callback: (syncInfo: { timestamp: number; isOnline: boolean }) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };
  
  window.addEventListener('firebase-sync-complete', handler as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('firebase-sync-complete', handler as EventListener);
  };
};

export default app;
