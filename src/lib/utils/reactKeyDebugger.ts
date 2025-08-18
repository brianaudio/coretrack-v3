/**
 * Development-only React key debugging utility
 * Helps identify and prevent duplicate React keys in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const usedKeys = new Set<string>();
const duplicateKeyWarnings = new Set<string>();

/**
 * Check if a React key is potentially duplicated
 * Only active in development mode
 */
export function checkReactKey(key: string, componentName?: string): void {
  if (!isDevelopment) return;
  
  if (usedKeys.has(key)) {
    const warningKey = `${key}-${componentName || 'unknown'}`;
    if (!duplicateKeyWarnings.has(warningKey)) {
      console.warn(`🔑 Potential duplicate React key detected: "${key}" in component: ${componentName || 'unknown'}`);
      console.warn('This could cause React rendering issues. Consider using generateUniqueReactKey() or ensureUniqueArrayKeys()');
      duplicateKeyWarnings.add(warningKey);
    }
  } else {
    usedKeys.add(key);
  }
}

/**
 * Clear all tracked keys (useful when navigating between pages)
 */
export function clearTrackedKeys(): void {
  if (!isDevelopment) return;
  usedKeys.clear();
  duplicateKeyWarnings.clear();
}

/**
 * Log summary of key usage for debugging
 */
export function logKeyUsageSummary(): void {
  if (!isDevelopment) return;
  
  console.log(`🔍 React Key Usage Summary:`);
  console.log(`   Total unique keys: ${usedKeys.size}`);
  console.log(`   Duplicate warnings: ${duplicateKeyWarnings.size}`);
  
  if (duplicateKeyWarnings.size > 0) {
    console.warn(`⚠️  Found ${duplicateKeyWarnings.size} potential duplicate key issues`);
  }
}

/**
 * Enhanced map function that automatically checks for duplicate keys
 */
export function safeMap<T, R>(
  array: T[], 
  renderFn: (item: T, index: number) => R, 
  getKey: (item: T, index: number) => string,
  componentName?: string
): R[] {
  return array.map((item, index) => {
    const key = getKey(item, index);
    checkReactKey(key, componentName);
    return renderFn(item, index);
  });
}

// Auto-clear keys when page changes (Next.js route change)
if (typeof window !== 'undefined' && isDevelopment) {
  let currentPath = window.location.pathname;
  
  const checkForRouteChange = () => {
    if (window.location.pathname !== currentPath) {
      clearTrackedKeys();
      currentPath = window.location.pathname;
    }
  };
  
  // Check for route changes every 500ms
  setInterval(checkForRouteChange, 500);
}
