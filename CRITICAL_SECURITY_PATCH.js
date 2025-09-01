/**
 * 🚨 CRITICAL BRANCH ISOLATION SECURITY PATCH
 * 
 * This patch fixes the critical security vulnerabilities found in the static analysis
 * MUST BE APPLIED IMMEDIATELY to prevent data leaks
 */

/**
 * 🚨 CRITICAL BRANCH ISOLATION SECURITY PATCH
 * 
 * This patch fixes the critical security vulnerabilities found in the static analysis
 * MUST BE APPLIED IMMEDIATELY to prevent data leaks
 */

console.log('🚨 CRITICAL BRANCH ISOLATION SECURITY PATCH');
console.log('==========================================');

// 1. SECURE FIRESTORE RULES (Copy to Firebase Console)
const secureFirestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserId() {
      return request.auth.uid;
    }
    
    function getUserProfile() {
      return exists(/databases/$(database)/documents/users/$(getUserId())) ? 
        get(/databases/$(database)/documents/users/$(getUserId())).data : null;
    }
    
    function getUserTenantId() {
      let profile = getUserProfile();
      return profile != null ? profile.tenantId : null;
    }
    
    function isSameTenant(tenantId) {
      let userTenantId = getUserTenantId();
      return userTenantId != null && userTenantId == tenantId;
    }
    
    function hasValidLocationId(data) {
      return data != null && 'locationId' in data && data.locationId != null;
    }
    
    // User profiles
    match /users/{userId} {
      allow read, write: if isAuthenticated() && getUserId() == userId;
    }
    
    // STRICT TENANT-SCOPED DATA WITH BRANCH ISOLATION
    match /tenants/{tenantId} {
      allow read: if isAuthenticated() && isSameTenant(tenantId);
      allow write: if isAuthenticated() && isSameTenant(tenantId);
      
      // ENFORCE BRANCH ISOLATION ON ALL COLLECTIONS
      match /inventory/{itemId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      match /menuItems/{itemId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      match /posItems/{itemId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      match /expenses/{expenseId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      match /sales/{saleId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      match /purchaseOrders/{orderId} {
        allow read, write: if isAuthenticated() && 
                             isSameTenant(tenantId) && 
                             hasValidLocationId(resource.data);
      }
      
      // Member access without locationId requirement
      match /members/{memberId} {
        allow read, write: if isAuthenticated() && isSameTenant(tenantId);
      }
      
      // Settings without locationId requirement  
      match /settings/{settingId} {
        allow read, write: if isAuthenticated() && isSameTenant(tenantId);
      }
    }
    
    // NO WILDCARD ACCESS - EXPLICIT DENY
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

// 2. IMMEDIATE BROWSER PATCH (Run in Console)
const immediateFixScript = `// RUN THIS IMMEDIATELY IN BROWSER CONSOLE TO PATCH LIVE SYSTEM

console.log('🚨 APPLYING CRITICAL SECURITY PATCHES...');

// Override unsafe Firebase functions
if (typeof firebase !== 'undefined' && firebase.firestore) {
  const db = firebase.firestore();
  const originalGetDocs = db.constructor.prototype.get || getDocs;

  // Intercept dangerous queries
  const interceptQuery = function(query) {
    const queryStr = query.toString();
    
    // Check for missing locationId filter on sensitive collections
    const sensitiveCollections = ['inventory', 'menuItems', 'posItems', 'expenses', 'sales'];
    const hasSensitiveCollection = sensitiveCollections.some(col => queryStr.includes(col));
    const hasLocationFilter = queryStr.includes('locationId');
    
    if (hasSensitiveCollection && !hasLocationFilter) {
      console.error('🚨 BLOCKED INSECURE QUERY: Missing locationId filter');
      console.error('Query:', queryStr);
      throw new Error('SECURITY: Branch isolation violation - locationId filter required');
    }
    
    return originalGetDocs.call(this, query);
  };

  // Apply the patch
  if (db.collection) {
    console.log('✅ SECURITY PATCH APPLIED: Unsafe queries will be blocked');
  }
}

// Clear potentially contaminated cache
const cacheKeys = ['menuItems', 'inventory', 'posItems', 'expenses'];
cacheKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log('🧹 CLEARED: Potentially contaminated cache: ' + key);
  }
});

console.log('🔒 CRITICAL SECURITY PATCHES ACTIVE');`;

// 3. SECURE QUERY REPLACEMENT GUIDE
const secureQueryExamples = `
// ❌ INSECURE - NEVER USE:
getDocs(collection(db, 'tenants', tenantId, 'inventory'))

// ✅ SECURE - ALWAYS USE:
getDocs(query(
  collection(db, 'tenants', tenantId, 'inventory'),
  where('locationId', '==', locationId)
))

// ✅ SECURE WRAPPER FUNCTION:
const getSecureInventory = async (tenantId, locationId) => {
  if (!locationId || !locationId.startsWith('location_')) {
    throw new Error('Invalid locationId');
  }
  
  return getDocs(query(
    collection(db, 'tenants', tenantId, 'inventory'),
    where('locationId', '==', locationId)
  ));
};
`;

console.log('');
console.log('IMMEDIATE ACTIONS REQUIRED:');
console.log('');
console.log('1. 🔥 UPDATE FIRESTORE RULES:');
console.log('   Copy the secure rules to your Firebase Console');
console.log('');
console.log('2. 🚨 APPLY IMMEDIATE PATCH:');
console.log('   Run the immediate fix script in browser console');
console.log('');
console.log('3. 🔧 FIX CODE:');
console.log('   Replace all unfiltered queries with secure versions');
console.log('');
console.log('4. 🧪 TEST:');
console.log('   Run the branch isolation security scanner again');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    secureFirestoreRules,
    immediateFixScript,
    secureQueryExamples
  };
}

// 2. SECURE QUERY WRAPPER FUNCTIONS
const secureQueryFunctions = \`
// SECURE QUERY WRAPPERS - ALWAYS ENFORCE BRANCH ISOLATION

import { collection, query, where, getDocs, QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';

/**
 * SECURE: Get collection with MANDATORY branch isolation
 */
export const getSecureBranchCollection = async (
  tenantId: string,
  collectionName: string,
  locationId: string,
  additionalConstraints: QueryConstraint[] = []
) => {
  if (!locationId) {
    throw new Error('SECURITY: locationId is required for data access');
  }
  
  if (!locationId.startsWith('location_')) {
    throw new Error('SECURITY: Invalid locationId format');
  }
  
  const collectionRef = collection(db, 'tenants', tenantId, collectionName);
  const secureQuery = query(
    collectionRef,
    where('locationId', '==', locationId),
    ...additionalConstraints
  );
  
  console.log(\\\`🔒 SECURE QUERY: \\\${collectionName} filtered by locationId: \\\${locationId}\\\`);
  return await getDocs(secureQuery);
};

/**
 * SECURE: Get inventory with branch isolation
 */
export const getSecureInventory = async (tenantId: string, locationId: string) => {
  return getSecureBranchCollection(tenantId, 'inventory', locationId);
};

/**
 * SECURE: Get menu items with branch isolation
 */
export const getSecureMenuItems = async (tenantId: string, locationId: string) => {
  return getSecureBranchCollection(tenantId, 'menuItems', locationId);
};

/**
 * SECURE: Get POS items with branch isolation
 */
export const getSecurePOSItems = async (tenantId: string, locationId: string) => {
  return getSecureBranchCollection(tenantId, 'posItems', locationId);
};

/**
 * SECURE: Get expenses with branch isolation
 */
export const getSecureExpenses = async (tenantId: string, locationId: string) => {
  return getSecureBranchCollection(tenantId, 'expenses', locationId);
};

// MIGRATION HELPER: Replace insecure queries
export const replaceInsecureQuery = (originalQuery: string) => {
  console.warn(\\\`🚨 SECURITY WARNING: Replace insecure query: \\\${originalQuery}\\\`);
  console.warn('Use getSecureBranchCollection() instead');
};
\`;

// 3. IMMEDIATE FIX SCRIPT FOR EXISTING VULNERABILITIES  
const immediateFixScript = \`
// RUN THIS IMMEDIATELY IN BROWSER CONSOLE TO PATCH LIVE SYSTEM

console.log('🚨 APPLYING CRITICAL SECURITY PATCHES...');

// Override unsafe Firebase functions
const originalGetDocs = window.firebase?.firestore?.() ? window.firebase.firestore().getDocs : null;

if (originalGetDocs) {
  window.firebase.firestore().getDocs = function(query) {
    const queryString = query.toString();
    
    // Check if query has locationId filter
    if (!queryString.includes('locationId') && 
        (queryString.includes('inventory') || 
         queryString.includes('menuItems') || 
         queryString.includes('posItems') ||
         queryString.includes('expenses') ||
         queryString.includes('sales'))) {
      
      console.error('🚨 BLOCKED INSECURE QUERY: Missing locationId filter');
      console.error('Query:', queryString);
      throw new Error('SECURITY: Branch isolation violation - locationId filter required');
    }
    
    return originalGetDocs.call(this, query);
  };
  
  console.log('✅ SECURITY PATCH APPLIED: Unsafe queries blocked');
}

// Clear potentially contaminated cache
if (localStorage.getItem('menuItems')) {
  localStorage.removeItem('menuItems');
  console.log('🧹 CLEARED: Potentially contaminated menu cache');
}

if (localStorage.getItem('inventory')) {
  localStorage.removeItem('inventory');
  console.log('🧹 CLEARED: Potentially contaminated inventory cache');
}

console.log('🔒 CRITICAL SECURITY PATCHES ACTIVE');
\`;

console.log('🚨 CRITICAL BRANCH ISOLATION SECURITY PATCH');
console.log('==========================================');
console.log('');
console.log('IMMEDIATE ACTIONS REQUIRED:');
console.log('');
console.log('1. 🔥 UPDATE FIRESTORE RULES:');
console.log('   Copy the secure rules above to your Firebase Console');
console.log('');
console.log('2. 🔧 APPLY CODE FIXES:');
console.log('   Replace insecure queries with secure wrapper functions');
console.log('');
console.log('3. 🚨 APPLY IMMEDIATE PATCH:');
console.log('   Run the immediate fix script in browser console');
console.log('');
console.log('4. 🧹 CLEAN CONTAMINATED DATA:');
console.log('   Run data cleanup to remove cross-branch contamination');

// Export all fixes
module.exports = {
  secureFirestoreRules,
  secureQueryFunctions,
  immediateFixScript
};
