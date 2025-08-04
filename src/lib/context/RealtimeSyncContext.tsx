'use client';

import { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect, 
  useRef,
  ReactNode 
} from 'react';
import { 
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';

export interface ConflictData {
  id: string;
  type: 'menu_item' | 'inventory' | 'pos_item' | 'order';
  documentId: string;
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: Date;
  serverTimestamp: Date;
  userId: string;
  userName: string;
  action: 'accept_local' | 'accept_server' | 'merge' | 'pending';
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: Map<string, any>;
  conflicts: ConflictData[];
  listeners: Map<string, () => void>;
  retryQueue: Array<{
    id: string;
    operation: () => Promise<any>;
    attempts: number;
    maxAttempts: number;
    lastAttempt: Date;
  }>;
  optimisticUpdates: Map<string, {
    originalValue: any;
    optimisticValue: any;
    timestamp: Date;
    confirmed: boolean;
  }>;
}

type SyncAction = 
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'UPDATE_LAST_SYNC'; payload: Date }
  | { type: 'ADD_PENDING_CHANGE'; payload: { id: string; change: any } }
  | { type: 'REMOVE_PENDING_CHANGE'; payload: string }
  | { type: 'ADD_CONFLICT'; payload: ConflictData }
  | { type: 'RESOLVE_CONFLICT'; payload: { id: string; action: ConflictData['action'] } }
  | { type: 'ADD_LISTENER'; payload: { id: string; unsubscribe: () => void } }
  | { type: 'REMOVE_LISTENER'; payload: string }
  | { type: 'ADD_RETRY_OPERATION'; payload: SyncState['retryQueue'][0] }
  | { type: 'REMOVE_RETRY_OPERATION'; payload: string }
  | { type: 'UPDATE_RETRY_ATTEMPTS'; payload: { id: string; attempts: number; lastAttempt: Date } }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: { id: string; update: SyncState['optimisticUpdates'] extends Map<string, infer U> ? U : never } }
  | { type: 'CONFIRM_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'REVERT_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'CLEANUP_EXPIRED_UPDATES' };

const initialState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: null,
  pendingChanges: new Map(),
  conflicts: [],
  listeners: new Map(),
  retryQueue: [],
  optimisticUpdates: new Map()
};

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
      
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
      
    case 'UPDATE_LAST_SYNC':
      return { ...state, lastSyncTime: action.payload };
      
    case 'ADD_PENDING_CHANGE':
      const newPendingChanges = new Map(state.pendingChanges);
      newPendingChanges.set(action.payload.id, action.payload.change);
      return { ...state, pendingChanges: newPendingChanges };
      
    case 'REMOVE_PENDING_CHANGE':
      const updatedPendingChanges = new Map(state.pendingChanges);
      updatedPendingChanges.delete(action.payload);
      return { ...state, pendingChanges: updatedPendingChanges };
      
    case 'ADD_CONFLICT':
      return { 
        ...state, 
        conflicts: [...state.conflicts, action.payload] 
      };
      
    case 'RESOLVE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.map(conflict =>
          conflict.id === action.payload.id
            ? { ...conflict, action: action.payload.action }
            : conflict
        )
      };
      
    case 'ADD_LISTENER':
      const newListeners = new Map(state.listeners);
      newListeners.set(action.payload.id, action.payload.unsubscribe);
      return { ...state, listeners: newListeners };
      
    case 'REMOVE_LISTENER':
      const updatedListeners = new Map(state.listeners);
      const unsubscribe = updatedListeners.get(action.payload);
      if (unsubscribe) {
        unsubscribe();
        updatedListeners.delete(action.payload);
      }
      return { ...state, listeners: updatedListeners };
      
    case 'ADD_RETRY_OPERATION':
      return {
        ...state,
        retryQueue: [...state.retryQueue, action.payload]
      };
      
    case 'REMOVE_RETRY_OPERATION':
      return {
        ...state,
        retryQueue: state.retryQueue.filter(op => op.id !== action.payload)
      };
      
    case 'UPDATE_RETRY_ATTEMPTS':
      return {
        ...state,
        retryQueue: state.retryQueue.map(op =>
          op.id === action.payload.id
            ? { ...op, attempts: action.payload.attempts, lastAttempt: action.payload.lastAttempt }
            : op
        )
      };
      
    case 'ADD_OPTIMISTIC_UPDATE':
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(action.payload.id, action.payload.update);
      return { ...state, optimisticUpdates: newOptimisticUpdates };
      
    case 'CONFIRM_OPTIMISTIC_UPDATE':
      const confirmedUpdates = new Map(state.optimisticUpdates);
      const updateToConfirm = confirmedUpdates.get(action.payload);
      if (updateToConfirm) {
        confirmedUpdates.set(action.payload, { ...updateToConfirm, confirmed: true });
      }
      return { ...state, optimisticUpdates: confirmedUpdates };
      
    case 'REVERT_OPTIMISTIC_UPDATE':
      const revertedUpdates = new Map(state.optimisticUpdates);
      revertedUpdates.delete(action.payload);
      return { ...state, optimisticUpdates: revertedUpdates };
      
    case 'CLEANUP_EXPIRED_UPDATES':
      const cleanedUpdates = new Map();
      const now = new Date();
      const expireTime = 30000; // 30 seconds
      
      state.optimisticUpdates.forEach((update, id) => {
        if (update.confirmed || (now.getTime() - update.timestamp.getTime()) < expireTime) {
          cleanedUpdates.set(id, update);
        }
      });
      
      return { ...state, optimisticUpdates: cleanedUpdates };
      
    default:
      return state;
  }
}

interface RealtimeSyncContextType {
  state: SyncState;
  // Connection management
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  
  // Listener management
  addListener: (id: string, docPath: string, callback: (data: any) => void) => void;
  removeListener: (id: string) => void;
  removeAllListeners: () => void;
  
  // Optimistic updates
  performOptimisticUpdate: (id: string, originalValue: any, optimisticValue: any, serverOperation: () => Promise<any>) => Promise<void>;
  revertOptimisticUpdate: (id: string) => void;
  
  // Conflict resolution
  resolveConflict: (conflictId: string, action: ConflictData['action']) => Promise<void>;
  hasConflicts: boolean;
  
  // Retry mechanism
  addRetryOperation: (id: string, operation: () => Promise<any>, maxAttempts?: number) => void;
  retryFailedOperations: () => Promise<void>;
  
  // Sync operations
  forceSyncDocument: (docPath: string) => Promise<void>;
  syncPendingChanges: () => Promise<void>;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | null>(null);

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);
  const { user } = useAuth();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get tenantId from user data
  const tenantId = user?.uid || '';

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      // Retry failed operations when coming back online
      retryFailedOperations();
    };
    
    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Cleanup expired optimistic updates
  useEffect(() => {
    cleanupTimeoutRef.current = setInterval(() => {
      dispatch({ type: 'CLEANUP_EXPIRED_UPDATES' });
    }, 10000); // Clean every 10 seconds
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      state.listeners.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const addListener = useCallback((id: string, docPath: string, callback: (data: any) => void) => {
    // Remove existing listener if any
    removeListener(id);
    
    const docRef = doc(db, docPath);
    
    const unsubscribe = onSnapshot(
      docRef,
      {
        includeMetadataChanges: true
      },
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const metadata = snapshot.metadata;
          
          // Check for conflicts
          if (metadata.hasPendingWrites && state.pendingChanges.has(id)) {
            const pendingChange = state.pendingChanges.get(id);
            const serverData = data;
            
            // Simple conflict detection - check if server data differs from pending change
            const hasConflict = Object.keys(pendingChange).some(key => {
              return JSON.stringify(pendingChange[key]) !== JSON.stringify(serverData[key]);
            });
            
            if (hasConflict && user) {
              const conflict: ConflictData = {
                id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: id.includes('menu') ? 'menu_item' : id.includes('inventory') ? 'inventory' : 'pos_item',
                documentId: id,
                field: Object.keys(pendingChange)[0] || 'unknown',
                localValue: pendingChange,
                serverValue: serverData,
                localTimestamp: new Date(),
                serverTimestamp: (data.lastUpdated as Timestamp)?.toDate() || new Date(),
                userId: user.uid,
                userName: user.email || 'Unknown User',
                action: 'pending'
              };
              
              dispatch({ type: 'ADD_CONFLICT', payload: conflict });
            }
          }
          
          callback(data);
          
          if (!metadata.hasPendingWrites) {
            dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date() });
          }
        }
      },
      (error) => {
        console.error(`Real-time listener error for ${id}:`, error);
        // Add to retry queue
        addRetryOperation(`listener_${id}`, () => 
          new Promise((resolve) => {
            addListener(id, docPath, callback);
            resolve(true);
          })
        );
      }
    );
    
    dispatch({ type: 'ADD_LISTENER', payload: { id, unsubscribe } });
  }, [state.pendingChanges, user]);

  const removeListener = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_LISTENER', payload: id });
  }, []);

  const removeAllListeners = useCallback(() => {
    state.listeners.forEach((_, id) => {
      removeListener(id);
    });
  }, [state.listeners, removeListener]);

  const performOptimisticUpdate = useCallback(async (
    id: string,
    originalValue: any,
    optimisticValue: any,
    serverOperation: () => Promise<any>
  ) => {
    // Apply optimistic update immediately
    dispatch({
      type: 'ADD_OPTIMISTIC_UPDATE',
      payload: {
        id,
        update: {
          originalValue,
          optimisticValue,
          timestamp: new Date(),
          confirmed: false
        }
      }
    });

    try {
      // Perform server operation
      await serverOperation();
      
      // Confirm optimistic update
      dispatch({ type: 'CONFIRM_OPTIMISTIC_UPDATE', payload: id });
      
      // Remove from pending changes
      dispatch({ type: 'REMOVE_PENDING_CHANGE', payload: id });
      
    } catch (error) {
      console.error('Optimistic update failed:', error);
      
      // Revert optimistic update
      dispatch({ type: 'REVERT_OPTIMISTIC_UPDATE', payload: id });
      
      // Add to retry queue
      addRetryOperation(`optimistic_${id}`, serverOperation);
      
      throw error;
    }
  }, []);

  const revertOptimisticUpdate = useCallback((id: string) => {
    dispatch({ type: 'REVERT_OPTIMISTIC_UPDATE', payload: id });
  }, []);

  const resolveConflict = useCallback(async (conflictId: string, action: ConflictData['action']) => {
    const conflict = state.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    dispatch({ type: 'RESOLVE_CONFLICT', payload: { id: conflictId, action } });

    try {
      const docRef = doc(db, `tenants/${tenantId}/${conflict.type}s`, conflict.documentId);
      
      if (action === 'accept_local') {
        await updateDoc(docRef, {
          ...conflict.localValue,
          lastUpdated: serverTimestamp()
        });
      } else if (action === 'accept_server') {
        // Server value is already applied, just remove conflict
      } else if (action === 'merge') {
        // Implement merge logic based on conflict type
        const mergedValue = { ...conflict.serverValue, ...conflict.localValue };
        await updateDoc(docRef, {
          ...mergedValue,
          lastUpdated: serverTimestamp()
        });
      }
      
      // Remove resolved conflict
      dispatch({ type: 'RESOLVE_CONFLICT', payload: { id: conflictId, action: 'accept_server' } });
      
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      throw error;
    }
  }, [state.conflicts, tenantId]);

  const addRetryOperation = useCallback((id: string, operation: () => Promise<any>, maxAttempts = 3) => {
    dispatch({
      type: 'ADD_RETRY_OPERATION',
      payload: {
        id,
        operation,
        attempts: 0,
        maxAttempts,
        lastAttempt: new Date()
      }
    });
  }, []);

  const retryFailedOperations = useCallback(async () => {
    if (!state.isOnline || state.retryQueue.length === 0) return;

    dispatch({ type: 'SET_SYNCING', payload: true });

    for (const retryOp of state.retryQueue) {
      if (retryOp.attempts >= retryOp.maxAttempts) {
        dispatch({ type: 'REMOVE_RETRY_OPERATION', payload: retryOp.id });
        continue;
      }

      try {
        await retryOp.operation();
        dispatch({ type: 'REMOVE_RETRY_OPERATION', payload: retryOp.id });
      } catch (error) {
        console.error(`Retry operation failed for ${retryOp.id}:`, error);
        dispatch({
          type: 'UPDATE_RETRY_ATTEMPTS',
          payload: {
            id: retryOp.id,
            attempts: retryOp.attempts + 1,
            lastAttempt: new Date()
          }
        });
      }
    }

    dispatch({ type: 'SET_SYNCING', payload: false });
  }, [state.isOnline, state.retryQueue]);

  const forceSyncDocument = useCallback(async (docPath: string) => {
    // Force refresh a specific document
    const docRef = doc(db, docPath);
    try {
      // This will trigger the listener with fresh server data
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (docSnap.exists()) {
          // Touch the document to force sync
          transaction.update(docRef, { lastSyncCheck: serverTimestamp() });
        }
      });
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  }, []);

  const syncPendingChanges = useCallback(async () => {
    if (state.pendingChanges.size === 0) return;

    dispatch({ type: 'SET_SYNCING', payload: true });

    try {
      const changeEntries = Array.from(state.pendingChanges.entries());
      for (const [id, change] of changeEntries) {
        const docRef = doc(db, id);
        await updateDoc(docRef, {
          ...change,
          lastUpdated: serverTimestamp()
        });
        dispatch({ type: 'REMOVE_PENDING_CHANGE', payload: id });
      }
    } catch (error) {
      console.error('Sync pending changes failed:', error);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [state.pendingChanges]);

  // Auto-retry failed operations
  useEffect(() => {
    if (state.retryQueue.length > 0 && state.isOnline) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        retryFailedOperations();
      }, 5000); // Retry after 5 seconds
    }
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [state.retryQueue.length, state.isOnline, retryFailedOperations]);

  const contextValue: RealtimeSyncContextType = {
    state,
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    lastSyncTime: state.lastSyncTime,
    addListener,
    removeListener,
    removeAllListeners,
    performOptimisticUpdate,
    revertOptimisticUpdate,
    resolveConflict,
    hasConflicts: state.conflicts.some(c => c.action === 'pending'),
    addRetryOperation,
    retryFailedOperations,
    forceSyncDocument,
    syncPendingChanges
  };

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}

export function useRealtimeSync() {
  const context = useContext(RealtimeSyncContext);
  if (!context) {
    throw new Error('useRealtimeSync must be used within a RealtimeSyncProvider');
  }
  return context;
}
