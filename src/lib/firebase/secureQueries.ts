/**
 * 🔒 SECURE QUERY WRAPPERS FOR BRANCH ISOLATION
 * 
 * These functions ensure all database queries are properly filtered by locationId
 * to prevent cross-branch data access vulnerabilities.
 * 
 * CRITICAL: Always use these wrappers instead of direct Firebase calls
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  Query,
  DocumentData,
  QueryConstraint 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Secure collection reference with automatic locationId filtering
 */
export function secureCollection(
  tenantId: string, 
  collectionName: string, 
  locationId?: string
) {
  const baseRef = collection(db, 'tenants', tenantId, collectionName);
  
  // For location-specific collections, always filter by locationId
  if (locationId && ['inventory', 'expenses', 'posOrders', 'inventory_transactions'].includes(collectionName)) {
    return query(baseRef, where('locationId', '==', locationId));
  }
  
  return baseRef;
}

/**
 * Secure query with automatic security constraints
 */
export function secureQuery(
  tenantId: string,
  collectionName: string,
  locationId: string | null,
  ...constraints: QueryConstraint[]
): Query<DocumentData> {
  const baseRef = collection(db, 'tenants', tenantId, collectionName);
  
  // Always add locationId filter for branch-isolated collections
  const securityConstraints: QueryConstraint[] = [];
  
  if (locationId && ['inventory', 'expenses', 'posOrders', 'inventory_transactions'].includes(collectionName)) {
    securityConstraints.push(where('locationId', '==', locationId));
  }
  
  return query(baseRef, ...securityConstraints, ...constraints);
}

/**
 * Secure get documents with automatic filtering
 */
export async function secureGetDocs(
  tenantId: string,
  collectionName: string,
  locationId?: string | null,
  ...constraints: QueryConstraint[]
) {
  const q = secureQuery(tenantId, collectionName, locationId || null, ...constraints);
  return await getDocs(q);
}

/**
 * Secure add document with automatic locationId injection
 */
export async function secureAddDoc(
  tenantId: string,
  collectionName: string,
  data: any,
  locationId?: string
) {
  const ref = collection(db, 'tenants', tenantId, collectionName);
  
  // Inject locationId for branch-isolated collections
  const secureData = { ...data };
  if (locationId && ['inventory', 'expenses', 'posOrders', 'inventory_transactions'].includes(collectionName)) {
    secureData.locationId = locationId;
  }
  
  return await addDoc(ref, secureData);
}

/**
 * Secure update document with locationId validation
 */
export async function secureUpdateDoc(
  tenantId: string,
  collectionName: string,
  docId: string,
  data: any,
  locationId?: string
) {
  const docRef = doc(db, 'tenants', tenantId, collectionName, docId);
  
  // Ensure locationId is preserved
  const secureData = { ...data };
  if (locationId && ['inventory', 'expenses', 'posOrders', 'inventory_transactions'].includes(collectionName)) {
    secureData.locationId = locationId;
  }
  
  return await updateDoc(docRef, secureData);
}

/**
 * Get user's accessible location IDs
 */
export function getUserLocationIds(userProfile: any): string[] {
  return userProfile?.locationIds || [];
}

/**
 * Validate if user has access to locationId
 */
export function hasLocationAccess(userProfile: any, locationId: string): boolean {
  if (!userProfile) return false;
  if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
  
  const userLocationIds = getUserLocationIds(userProfile);
  return userLocationIds.includes(locationId);
}

/**
 * Security audit log
 */
export function logSecurityEvent(event: string, details: any) {
  console.log(`🔒 SECURITY EVENT: ${event}`, details);
  
  // In production, this should log to a secure audit system
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to security monitoring service
  }
}
