'use client';

/**
 * Background Sync Service for CoreTrack
 * Handles automatic synchronization of offline data when connection returns
 */

export interface BackgroundSyncItem {
  id: string;
  type: 'pos-order' | 'inventory-update' | 'audit-report' | 'expense-record';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncQueue: BackgroundSyncItem[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;
  private listeners: Set<(item: BackgroundSyncItem) => void> = new Set();

  static getInstance(): BackgroundSyncService {
    if (!this.instance) {
      this.instance = new BackgroundSyncService();
    }
    return this.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Load existing queue from localStorage
      this.loadQueue();
      
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Periodic sync attempt when online
      setInterval(() => {
        if (this.isOnline && !this.syncInProgress && this.syncQueue.length > 0) {
          this.processQueue();
        }
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Add item to background sync queue
   */
  addToQueue(item: Omit<BackgroundSyncItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const syncItem: BackgroundSyncItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(syncItem);
    this.saveQueue();

    console.log(`📦 Added ${item.type} to background sync queue:`, syncItem.id);

    // Try immediate sync if online
    if (this.isOnline && !this.syncInProgress) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Processing background sync queue (${this.syncQueue.length} items)...`);

    const itemsToProcess = [...this.syncQueue];
    const successful: string[] = [];
    const failed: BackgroundSyncItem[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        successful.push(item.id);
        console.log(`✅ Successfully synced: ${item.id}`);
        
        // Notify listeners
        this.notifyListeners(item);
      } catch (error) {
        console.error(`❌ Failed to sync ${item.id}:`, error);
        
        item.retryCount++;
        item.lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (item.retryCount < item.maxRetries) {
          failed.push(item);
          console.log(`🔄 Will retry ${item.id} (attempt ${item.retryCount}/${item.maxRetries})`);
        } else {
          console.error(`💀 Max retries exceeded for ${item.id}, removing from queue`);
        }
      }
    }

    // Update queue with failed items that still have retries left
    this.syncQueue = failed;
    this.saveQueue();
    this.syncInProgress = false;

    console.log(`🎯 Background sync complete: ${successful.length} successful, ${failed.length} failed`);
  }

  /**
   * Sync individual item based on type
   */
  private async syncItem(item: BackgroundSyncItem): Promise<void> {
    switch (item.type) {
      case 'pos-order':
        await this.syncPOSOrder(item.data);
        break;
      case 'inventory-update':
        await this.syncInventoryUpdate(item.data);
        break;
      case 'audit-report':
        await this.syncAuditReport(item.data);
        break;
      case 'expense-record':
        await this.syncExpenseRecord(item.data);
        break;
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  /**
   * Sync POS order to Firebase
   */
  private async syncPOSOrder(orderData: any): Promise<void> {
    const { createPOSOrder } = await import('@/lib/firebase/pos');
    await createPOSOrder(orderData);
  }

  /**
   * Sync inventory update to Firebase
   */
  private async syncInventoryUpdate(updateData: any): Promise<void> {
    const { updateStockQuantity } = await import('@/lib/firebase/inventory');
    await updateStockQuantity(
      updateData.tenantId,
      updateData.itemId,
      updateData.quantity,
      updateData.operation,
      updateData.reason,
      updateData.userId,
      updateData.userEmail
    );
  }

  /**
   * Sync audit report to Firebase
   */
  private async syncAuditReport(auditData: any): Promise<void> {
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    await addDoc(collection(db, `tenants/${auditData.tenantId}/audits`), auditData.data);
  }

  /**
   * Sync expense record to Firebase
   */
  private async syncExpenseRecord(expenseData: any): Promise<void> {
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    await addDoc(collection(db, `tenants/${expenseData.tenantId}/expenses`), expenseData.data);
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 Device came online, starting background sync...');
    this.isOnline = true;
    
    if (this.syncQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📴 Device went offline, queuing operations for later sync...');
    this.isOnline = false;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem('coretrack_background_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`📋 Loaded ${this.syncQueue.length} items from background sync queue`);
      }
    } catch (error) {
      console.error('Failed to load background sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem('coretrack_background_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save background sync queue:', error);
    }
  }

  /**
   * Add listener for sync events
   */
  addSyncListener(callback: (item: BackgroundSyncItem) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of successful sync
   */
  private notifyListeners(item: BackgroundSyncItem): void {
    this.listeners.forEach(callback => {
      try {
        callback(item);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    totalItems: number;
    pendingItems: number;
    failedItems: number;
    isOnline: boolean;
    isSyncing: boolean;
  } {
    const failedItems = this.syncQueue.filter(item => item.retryCount >= item.maxRetries).length;
    
    return {
      totalItems: this.syncQueue.length,
      pendingItems: this.syncQueue.length - failedItems,
      failedItems,
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress
    };
  }

  /**
   * Force sync all pending items
   */
  async forceSyncAll(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.processQueue();
  }

  /**
   * Clear all items from queue
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
    console.log('🗑️ Background sync queue cleared');
  }

  /**
   * Remove specific item from queue
   */
  removeFromQueue(itemId: string): void {
    const initialLength = this.syncQueue.length;
    this.syncQueue = this.syncQueue.filter(item => item.id !== itemId);
    
    if (this.syncQueue.length < initialLength) {
      this.saveQueue();
      console.log(`🗑️ Removed ${itemId} from background sync queue`);
    }
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
