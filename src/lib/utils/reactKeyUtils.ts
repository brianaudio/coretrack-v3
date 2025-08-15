/**
 * React Key Uniqueness Utilities
 * Ensures unique React keys that are compatible with React Strict Mode
 */

let keyCounter = 0;
const keyMap = new Map<string, number>();

/**
 * Generate a unique React key that's safe for React Strict Mode
 * This prevents duplicate key errors during double-rendering in development
 */
export function generateUniqueReactKey(prefix: string = 'key'): string {
  const timestamp = Date.now();
  const highResTime = Math.floor(performance.now() * 1000); // Avoid decimal points
  const randomId = Math.random().toString(36).substr(2, 9);
  const incrementalId = ++keyCounter;
  
  // Add crypto randomness if available
  const cryptoRandom = typeof crypto !== 'undefined' && crypto.getRandomValues 
    ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
    : Math.floor(Math.random() * 999999).toString(36);
  
  return `${prefix}-${timestamp}-${highResTime}-${randomId}-${cryptoRandom}-${incrementalId}`;
}

/**
 * Generate a unique key for array items with fallback
 * Useful for map functions where items might not have stable IDs
 */
export function generateArrayItemKey(item: any, index: number, prefix: string = 'item'): string {
  // Try to use item.id if available
  if (item && typeof item === 'object' && item.id) {
    return `${prefix}-${item.id}`;
  }
  
  // Fall back to unique key generation with index
  return `${prefix}-${index}-${generateUniqueReactKey()}`;
}

/**
 * Ensure unique keys for duplicate values in arrays
 * Prevents React key collisions when rendering similar data
 */
export function ensureUniqueArrayKeys<T>(
  array: T[], 
  getKey: (item: T, index: number) => string,
  prefix: string = 'unique'
): Array<T & { _reactKey: string }> {
  const usedKeys = new Set<string>();
  
  return array.map((item, index) => {
    let baseKey = getKey(item, index);
    let finalKey = baseKey;
    let counter = 1;
    
    // If key already exists, append counter
    while (usedKeys.has(finalKey)) {
      finalKey = `${baseKey}-${counter}`;
      counter++;
    }
    
    usedKeys.add(finalKey);
    
    return {
      ...item,
      _reactKey: finalKey
    };
  });
}

/**
 * React Strict Mode safe key generation for shift-related components
 * This specifically addresses the "shift_daily-reset" duplicate key issue
 */
export function generateShiftKey(shiftId?: string, suffix?: string): string {
  const baseKey = shiftId || generateUniqueReactKey('shift');
  const safeSuffix = suffix || 'default';
  
  // Ensure we never generate the same key twice, even in Strict Mode
  const mapKey = `${baseKey}-${safeSuffix}`;
  const existingCount = keyMap.get(mapKey) || 0;
  const newCount = existingCount + 1;
  keyMap.set(mapKey, newCount);
  
  if (newCount === 1) {
    return `${baseKey}-${safeSuffix}`;
  } else {
    return `${baseKey}-${safeSuffix}-${newCount}`;
  }
}

/**
 * Clear the key map (useful for testing or when unmounting large components)
 */
export function clearKeyMap(): void {
  keyMap.clear();
  keyCounter = 0;
}

/**
 * Debug function to check for potential key collisions
 */
export function debugKeyUsage(): { totalKeys: number; duplicateRisk: string[] } {
  const duplicateRisk: string[] = [];
  let totalKeys = 0;
  
  keyMap.forEach((count, key) => {
    totalKeys += count;
    if (count > 1) {
      duplicateRisk.push(`${key} (used ${count} times)`);
    }
  });
  
  return {
    totalKeys,
    duplicateRisk
  };
}
