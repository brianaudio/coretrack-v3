'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useRealtimeSync } from '@/lib/context/RealtimeSyncContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';

interface OptimisticUpdateOptions {
  /**
   * Whether to show loading state during server operation
   */
  showLoading?: boolean;
  
  /**
   * Timeout in milliseconds before reverting optimistic update
   */
  timeout?: number;
  
  /**
   * Whether to retry on failure
   */
  retry?: boolean;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Custom error handler
   */
  onError?: (error: Error) => void;
  
  /**
   * Success callback
   */
  onSuccess?: () => void;
  
  /**
   * Validation function for optimistic value
   */
  validate?: (value: any) => boolean | string;
}

interface OptimisticUpdateState {
  isLoading: boolean;
  error: Error | null;
  isOptimistic: boolean;
  originalValue: any;
  optimisticValue: any;
}

/**
 * Hook for managing optimistic updates with automatic fallback
 * 
 * Provides immediate UI feedback while ensuring data consistency
 */
export function useOptimisticUpdate<T = any>(
  documentPath: string,
  fieldPath?: string,
  options: OptimisticUpdateOptions = {}
) {
  const { performOptimisticUpdate, revertOptimisticUpdate, addRetryOperation } = useRealtimeSync();
  const { user } = useAuth();
  const [state, setState] = useState<OptimisticUpdateState>({
    isLoading: false,
    error: null,
    isOptimistic: false,
    originalValue: null,
    optimisticValue: null
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  
  const {
    showLoading = true,
    timeout = 30000, // 30 seconds
    retry = true,
    maxRetries = 3,
    onError,
    onSuccess,
    validate
  } = options;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updateField = useCallback(async (
    newValue: T,
    customDocumentPath?: string
  ): Promise<void> => {
    const docPath = customDocumentPath || documentPath;
    const updateId = `${docPath}_${fieldPath || 'document'}_${Date.now()}`;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Validation
    if (validate) {
      const validationResult = validate(newValue);
      if (validationResult !== true) {
        const errorMessage = typeof validationResult === 'string' 
          ? validationResult 
          : 'Validation failed';
        const error = new Error(errorMessage);
        setState(prev => ({ ...prev, error }));
        onError?.(error);
        return;
      }
    }
    
    // Prepare update data
    const updateData = fieldPath 
      ? { [fieldPath]: newValue, lastUpdated: serverTimestamp() }
      : { ...newValue as any, lastUpdated: serverTimestamp() };

    // Set loading state
    if (showLoading) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isOptimistic: true,
        originalValue: prev.optimisticValue || prev.originalValue,
        optimisticValue: newValue
      }));
    }

    // Create server operation
    const serverOperation = async () => {
      const docRef = doc(db, docPath);
      await updateDoc(docRef, updateData);
    };

    try {
      // Perform optimistic update
      await performOptimisticUpdate(
        updateId,
        state.originalValue,
        newValue,
        serverOperation
      );
      
      // Success
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        isOptimistic: false
      }));
      
      onSuccess?.();
      retryCountRef.current = 0;
      
    } catch (error) {
      console.error('Optimistic update failed:', error);
      
      const updateError = error instanceof Error ? error : new Error('Update failed');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: updateError,
        isOptimistic: false
      }));
      
      // Revert optimistic update
      revertOptimisticUpdate(updateId);
      
      // Retry logic
      if (retry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        
        addRetryOperation(
          `retry_${updateId}_${retryCountRef.current}`,
          () => updateField(newValue, customDocumentPath),
          maxRetries
        );
      } else {
        onError?.(updateError);
      }
    }
    
    // Set timeout for automatic revert
    timeoutRef.current = setTimeout(() => {
      if (state.isOptimistic) {
        console.warn('Optimistic update timeout, reverting changes');
        revertOptimisticUpdate(updateId);
        setState(prev => ({
          ...prev,
          isOptimistic: false,
          error: new Error('Update timeout')
        }));
      }
    }, timeout);
  }, [
    documentPath,
    fieldPath,
    performOptimisticUpdate,
    revertOptimisticUpdate,
    addRetryOperation,
    state.originalValue,
    state.isOptimistic,
    showLoading,
    timeout,
    retry,
    maxRetries,
    validate,
    onError,
    onSuccess
  ]);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const forceRevert = useCallback(() => {
    const updateId = `${documentPath}_${fieldPath || 'document'}`;
    revertOptimisticUpdate(updateId);
    setState(prev => ({
      ...prev,
      isOptimistic: false,
      error: null
    }));
  }, [documentPath, fieldPath, revertOptimisticUpdate]);

  return {
    updateField,
    resetError,
    forceRevert,
    isLoading: state.isLoading,
    error: state.error,
    isOptimistic: state.isOptimistic,
    hasChanges: state.isOptimistic,
    retryCount: retryCountRef.current
  };
}

/**
 * Hook for batch optimistic updates
 * 
 * Allows multiple field updates with coordinated optimistic behavior
 */
export function useBatchOptimisticUpdate(
  documentPath: string,
  options: OptimisticUpdateOptions = {}
) {
  const { performOptimisticUpdate, revertOptimisticUpdate } = useRealtimeSync();
  const [state, setState] = useState<OptimisticUpdateState & {
    pendingUpdates: Map<string, any>;
  }>({
    isLoading: false,
    error: null,
    isOptimistic: false,
    originalValue: null,
    optimisticValue: null,
    pendingUpdates: new Map()
  });
  
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    timeout = 5000, // 5 seconds for batch
    onError,
    onSuccess
  } = options;

  const addUpdate = useCallback((fieldPath: string, value: any) => {
    setState(prev => {
      const newPendingUpdates = new Map(prev.pendingUpdates);
      newPendingUpdates.set(fieldPath, value);
      
      return {
        ...prev,
        pendingUpdates: newPendingUpdates,
        isOptimistic: true
      };
    });
    
    // Reset batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(() => {
      commitBatch();
    }, timeout);
  }, [timeout]);

  const commitBatch = useCallback(async () => {
    if (state.pendingUpdates.size === 0) return;
    
    const updateId = `batch_${documentPath}_${Date.now()}`;
    const updates = Object.fromEntries(state.pendingUpdates);
    const updateData = {
      ...updates,
      lastUpdated: serverTimestamp()
    };
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    const serverOperation = async () => {
      const docRef = doc(db, documentPath);
      await updateDoc(docRef, updateData);
    };
    
    try {
      await performOptimisticUpdate(
        updateId,
        state.originalValue,
        updates,
        serverOperation
      );
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        isOptimistic: false,
        pendingUpdates: new Map()
      }));
      
      onSuccess?.();
      
    } catch (error) {
      const updateError = error instanceof Error ? error : new Error('Batch update failed');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: updateError,
        isOptimistic: false,
        pendingUpdates: new Map()
      }));
      
      revertOptimisticUpdate(updateId);
      onError?.(updateError);
    }
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
  }, [state.pendingUpdates, state.originalValue, documentPath, performOptimisticUpdate, revertOptimisticUpdate, onSuccess, onError]);

  const cancelBatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingUpdates: new Map(),
      isOptimistic: false
    }));
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    addUpdate,
    commitBatch,
    cancelBatch,
    isLoading: state.isLoading,
    error: state.error,
    hasPendingUpdates: state.pendingUpdates.size > 0,
    pendingUpdateCount: state.pendingUpdates.size,
    pendingUpdates: Object.fromEntries(state.pendingUpdates)
  };
}

/**
 * Hook for real-time field synchronization with optimistic updates
 */
export function useOptimisticField<T = any>(
  documentPath: string,
  fieldPath: string,
  initialValue: T,
  options: OptimisticUpdateOptions = {}
) {
  const [value, setValue] = useState<T>(initialValue);
  const { updateField, isLoading, error, isOptimistic } = useOptimisticUpdate<T>(
    documentPath,
    fieldPath,
    options
  );
  
  const { addListener, removeListener } = useRealtimeSync();
  
  // Set up real-time listener
  useEffect(() => {
    const listenerId = `field_${documentPath}_${fieldPath}`;
    
    addListener(listenerId, documentPath, (data) => {
      if (data && typeof data === 'object' && fieldPath in data) {
        setValue(data[fieldPath]);
      }
    });
    
    return () => {
      removeListener(listenerId);
    };
  }, [documentPath, fieldPath, addListener, removeListener]);
  
  const updateValue = useCallback(async (newValue: T) => {
    // Immediate optimistic update to local state
    setValue(newValue);
    
    // Perform server update
    try {
      await updateField(newValue);
    } catch (error) {
      // Revert local state on error
      setValue(initialValue);
      throw error;
    }
  }, [updateField, initialValue]);
  
  return {
    value,
    updateValue,
    isLoading,
    error,
    isOptimistic
  };
}
