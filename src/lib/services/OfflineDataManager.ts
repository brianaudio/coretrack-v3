'use client';

import { 
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
  timestamp: Date;
  userId: string;
  tenantId: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt: Date | null;
  error?: string;
}

export interface OfflineDataEntry {
  id: string;
  collection: string;
  data: any;
  lastModified: Date;
  isStale: boolean;
  version: number;
}

/**
 * Offline-First Data Manager
 * 
 * Provides robust offline functionality with automatic sync
 * when connection is restored.
 */
export class OfflineDataManager {
  private static instance: OfflineDataManager;
  private offlineQueue: OfflineOperation[] = [];
  private localCache: Map<string, OfflineDataEntry> = new Map();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): OfflineDataManager {
    if (!this.instance) {
      this.instance = new OfflineDataManager();
    }
    return this.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Load offline data from localStorage
      this.loadOfflineData();
      
      // Set up network status listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Set up periodic sync
      setInterval(() => {
        if (this.isOnline && !this.syncInProgress) {
          this.syncOfflineOperations();
        }
      }, 30000); // Sync every 30 seconds when online
    }
  }

  /**
   * Add a listener for online/offline status changes
   */
  addNetworkListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
    
    // Enable Firebase network
    enableNetwork(db).catch(console.error);
    
    // Start syncing offline operations
    this.syncOfflineOperations();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
    
    // Disable Firebase network to enable offline persistence
    disableNetwork(db).catch(console.error);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.isOnline));
  }

  private loadOfflineData(): void {
    try {
      // Load offline queue
      const queueData = localStorage.getItem('coretrack_offline_queue');
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
          lastAttempt: op.lastAttempt ? new Date(op.lastAttempt) : null
        }));
      }

      // Load cached data
      const cacheData = localStorage.getItem('coretrack_offline_cache');
      if (cacheData) {
        const parsedCache = JSON.parse(cacheData);
        Object.entries(parsedCache).forEach(([key, entry]: [string, any]) => {
          this.localCache.set(key, {
            ...entry,
            lastModified: new Date(entry.lastModified)
          });
        });
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  private saveOfflineData(): void {
    try {
      // Save offline queue
      localStorage.setItem('coretrack_offline_queue', JSON.stringify(this.offlineQueue));

      // Save cached data
      const cacheObject: Record<string, any> = {};
      this.localCache.forEach((entry, key) => {
        cacheObject[key] = entry;
      });
      localStorage.setItem('coretrack_offline_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }

  /**
   * Create a document (works offline)
   */
  async createDocument(
    collectionPath: string,
    documentId: string,
    data: any,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const operation: OfflineOperation = {
      id: `create_${documentId}_${Date.now()}`,
      type: 'create',
      collection: collectionPath,
      documentId,
      data: {
        ...data,
        createdAt: new Date(),
        lastUpdated: new Date(),
        createdBy: userId,
        tenantId
      },
      timestamp: new Date(),
      userId,
      tenantId,
      attempts: 0,
      maxAttempts: 5,
      lastAttempt: null
    };

    // Add to local cache immediately
    const cacheKey = `${collectionPath}/${documentId}`;
    this.localCache.set(cacheKey, {
      id: documentId,
      collection: collectionPath,
      data: operation.data,
      lastModified: new Date(),
      isStale: false,
      version: 1
    });

    if (this.isOnline) {
      try {
        // Try immediate execution
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to create document online, queuing for later:', error);
        this.addToOfflineQueue(operation);
      }
    } else {
      // Queue for later execution
      this.addToOfflineQueue(operation);
    }

    this.saveOfflineData();
  }

  /**
   * Update a document (works offline)
   */
  async updateDocument(
    collectionPath: string,
    documentId: string,
    data: Partial<any>,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const operation: OfflineOperation = {
      id: `update_${documentId}_${Date.now()}`,
      type: 'update',
      collection: collectionPath,
      documentId,
      data: {
        ...data,
        lastUpdated: new Date(),
        lastUpdatedBy: userId
      },
      timestamp: new Date(),
      userId,
      tenantId,
      attempts: 0,
      maxAttempts: 5,
      lastAttempt: null
    };

    // Update local cache
    const cacheKey = `${collectionPath}/${documentId}`;
    const existingEntry = this.localCache.get(cacheKey);
    if (existingEntry) {
      this.localCache.set(cacheKey, {
        ...existingEntry,
        data: { ...existingEntry.data, ...operation.data },
        lastModified: new Date(),
        isStale: false,
        version: existingEntry.version + 1
      });
    }

    if (this.isOnline) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to update document online, queuing for later:', error);
        this.addToOfflineQueue(operation);
      }
    } else {
      this.addToOfflineQueue(operation);
    }

    this.saveOfflineData();
  }

  /**
   * Delete a document (works offline)
   */
  async deleteDocument(
    collectionPath: string,
    documentId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const operation: OfflineOperation = {
      id: `delete_${documentId}_${Date.now()}`,
      type: 'delete',
      collection: collectionPath,
      documentId,
      timestamp: new Date(),
      userId,
      tenantId,
      attempts: 0,
      maxAttempts: 5,
      lastAttempt: null
    };

    // Remove from local cache
    const cacheKey = `${collectionPath}/${documentId}`;
    this.localCache.delete(cacheKey);

    if (this.isOnline) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to delete document online, queuing for later:', error);
        this.addToOfflineQueue(operation);
      }
    } else {
      this.addToOfflineQueue(operation);
    }

    this.saveOfflineData();
  }

  /**
   * Get a document (from cache when offline)
   */
  async getDocument(collectionPath: string, documentId: string): Promise<any | null> {
    const cacheKey = `${collectionPath}/${documentId}`;
    
    if (this.isOnline) {
      try {
        const docRef = doc(db, collectionPath, documentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Update cache
          this.localCache.set(cacheKey, {
            id: documentId,
            collection: collectionPath,
            data,
            lastModified: new Date(),
            isStale: false,
            version: (this.localCache.get(cacheKey)?.version || 0) + 1
          });
          
          this.saveOfflineData();
          return data;
        }
        
        return null;
      } catch (error) {
        console.error('Failed to get document online, falling back to cache:', error);
      }
    }

    // Fallback to cache
    const cachedEntry = this.localCache.get(cacheKey);
    return cachedEntry ? cachedEntry.data : null;
  }

  /**
   * Get multiple documents from a collection
   */
  async getCollection(
    collectionPath: string,
    queryConstraints: any[] = []
  ): Promise<any[]> {
    if (this.isOnline) {
      try {
        const collectionRef = collection(db, collectionPath);
        const q = queryConstraints.length > 0 
          ? query(collectionRef, ...queryConstraints)
          : collectionRef;
        
        const querySnapshot = await getDocs(q);
        const documents: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          documents.push(data);
          
          // Update cache
          const cacheKey = `${collectionPath}/${doc.id}`;
          this.localCache.set(cacheKey, {
            id: doc.id,
            collection: collectionPath,
            data,
            lastModified: new Date(),
            isStale: false,
            version: (this.localCache.get(cacheKey)?.version || 0) + 1
          });
        });
        
        this.saveOfflineData();
        return documents;
      } catch (error) {
        console.error('Failed to get collection online, falling back to cache:', error);
      }
    }

    // Fallback to cache
    const cachedDocuments: any[] = [];
    this.localCache.forEach((entry) => {
      if (entry.collection === collectionPath) {
        cachedDocuments.push({ id: entry.id, ...entry.data });
      }
    });
    
    return cachedDocuments;
  }

  /**
   * Set up real-time listener with offline support
   */
  setupRealtimeListener(
    collectionPath: string,
    documentId: string,
    callback: (data: any) => void,
    queryConstraints: any[] = []
  ): () => void {
    const cacheKey = `${collectionPath}/${documentId}`;
    
    // Return cached data immediately if offline
    if (!this.isOnline) {
      const cachedEntry = this.localCache.get(cacheKey);
      if (cachedEntry) {
        callback(cachedEntry.data);
      }
      
      // Return no-op unsubscribe function
      return () => {};
    }

    // Set up Firebase listener
    const docRef = doc(db, collectionPath, documentId);
    
    return onSnapshot(
      docRef,
      {
        includeMetadataChanges: true
      },
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Update cache
          this.localCache.set(cacheKey, {
            id: documentId,
            collection: collectionPath,
            data,
            lastModified: new Date(),
            isStale: false,
            version: (this.localCache.get(cacheKey)?.version || 0) + 1
          });
          
          callback(data);
          this.saveOfflineData();
        }
      },
      (error) => {
        console.error('Real-time listener error:', error);
        
        // Fallback to cached data
        const cachedEntry = this.localCache.get(cacheKey);
        if (cachedEntry) {
          callback(cachedEntry.data);
        }
      }
    );
  }

  private addToOfflineQueue(operation: OfflineOperation): void {
    this.offlineQueue.push(operation);
    this.saveOfflineData();
  }

  private async executeOperation(operation: OfflineOperation): Promise<void> {
    const docRef = doc(db, operation.collection, operation.documentId);
    
    switch (operation.type) {
      case 'create':
        await setDoc(docRef, {
          ...operation.data,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
        break;
        
      case 'update':
        await updateDoc(docRef, {
          ...operation.data,
          lastUpdated: serverTimestamp()
        });
        break;
        
      case 'delete':
        await deleteDoc(docRef);
        break;
    }
  }

  private async syncOfflineOperations(): Promise<void> {
    if (this.syncInProgress || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`Syncing ${this.offlineQueue.length} offline operations...`);

    const operations = [...this.offlineQueue];
    const successful: string[] = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        successful.push(operation.id);
        console.log(`Successfully synced operation: ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Update operation with error info
        operation.attempts++;
        operation.lastAttempt = new Date();
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Schedule retry if under max attempts
        if (operation.attempts < operation.maxAttempts) {
          const retryDelay = Math.min(1000 * Math.pow(2, operation.attempts), 30000); // Exponential backoff, max 30s
          
          const timeoutId = setTimeout(() => {
            this.syncOfflineOperations();
            this.retryTimeouts.delete(operation.id);
          }, retryDelay);
          
          this.retryTimeouts.set(operation.id, timeoutId);
        }
      }
    }

    // Remove successful operations from queue
    this.offlineQueue = this.offlineQueue.filter(op => !successful.includes(op.id));
    
    this.saveOfflineData();
    this.syncInProgress = false;
    
    console.log(`Sync complete. ${successful.length} operations synced, ${this.offlineQueue.length} remaining.`);
  }

  /**
   * Get offline status and statistics
   */
  getOfflineStatus(): {
    isOnline: boolean;
    queuedOperations: number;
    cachedDocuments: number;
    lastSyncAttempt: Date | null;
  } {
    const lastSyncAttempt = this.offlineQueue.length > 0
      ? Math.max(...this.offlineQueue.map(op => op.lastAttempt?.getTime() || 0))
      : null;

    return {
      isOnline: this.isOnline,
      queuedOperations: this.offlineQueue.length,
      cachedDocuments: this.localCache.size,
      lastSyncAttempt: lastSyncAttempt ? new Date(lastSyncAttempt) : null
    };
  }

  /**
   * Force sync all offline operations
   */
  async forceSyncAll(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.syncOfflineOperations();
  }

  /**
   * Clear all offline data (cache and queue)
   */
  clearOfflineData(): void {
    this.offlineQueue = [];
    this.localCache.clear();
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Clear localStorage
    localStorage.removeItem('coretrack_offline_queue');
    localStorage.removeItem('coretrack_offline_cache');
  }

  /**
   * Get failed operations for manual review
   */
  getFailedOperations(): OfflineOperation[] {
    return this.offlineQueue.filter(op => op.attempts >= op.maxAttempts);
  }
}

// Export singleton instance
export const offlineDataManager = OfflineDataManager.getInstance();
