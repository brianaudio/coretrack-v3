// Enhanced POS service ONLY for Data Explorer - completely isolated from core system
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface EnhancedPOSOrder {
  id: string;
  orderNumber?: string;
  items?: Array<{
    itemId?: string;
    name?: string;
    price?: number;
    quantity?: number;
    total?: number;
  }>;
  subtotal?: number;
  total?: number;
  status?: string;
  customerName?: string;
  orderType?: string;
  paymentMethod?: string;
  tenantId?: string;
  locationId?: string;
  location?: string;
  branchId?: string;
  storeId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: any; // Allow for flexible field names
}

// Get collection reference for orders
const getOrdersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/orders`);
};

// Get collection reference for posOrders
const getPosOrdersCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/posOrders`);
};

// Enhanced POS orders function that checks BOTH collections - ONLY for Data Explorer
export const getEnhancedPOSOrdersForDataExplorer = async (
  tenantId: string, 
  locationId?: string
): Promise<EnhancedPOSOrder[]> => {
  try {
    console.log('🔍 ENHANCED DATA EXPLORER: Starting dual collection search...');
    
    // Check both possible collections where orders might be stored
    const ordersRef = getOrdersCollection(tenantId);
    const posOrdersRef = getPosOrdersCollection(tenantId);
    
    const [ordersSnapshot, posOrdersSnapshot] = await Promise.all([
      getDocs(query(ordersRef, orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] })),
      getDocs(query(posOrdersRef, orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] }))
    ]);
    
    // Combine orders from both collections
    let allOrders: EnhancedPOSOrder[] = [];
    
    // Add orders from main collection
    ordersSnapshot.docs.forEach(doc => {
      allOrders.push({
        id: doc.id,
        ...doc.data() as any
      });
    });
    
    // Add orders from posOrders collection
    posOrdersSnapshot.docs.forEach(doc => {
      allOrders.push({
        id: doc.id,
        ...doc.data() as any
      });
    });
    
    console.log(`📊 ENHANCED DATA EXPLORER: Found ${ordersSnapshot.docs.length} orders in /orders`);
    console.log(`📊 ENHANCED DATA EXPLORER: Found ${posOrdersSnapshot.docs.length} orders in /posOrders`);
    
    // Enhanced location filtering - check multiple possible location fields
    if (locationId) {
      const originalCount = allOrders.length;
      allOrders = allOrders.filter(order => {
        // Check multiple possible location field names and handle location_ prefix
        return (
          order.locationId === locationId ||
          order.location === locationId ||
          order.branchId === locationId ||
          order.storeId === locationId ||
          // Handle location IDs that might have the "location_" prefix
          order.locationId === `location_${locationId}` ||
          order.location === `location_${locationId}`
        );
      });
      
      console.log(`🎯 ENHANCED DATA EXPLORER: Filtered from ${originalCount} to ${allOrders.length} orders for location ${locationId}`);
    }

    console.log(`✅ ENHANCED DATA EXPLORER: Returning ${allOrders.length} total orders`);
    return allOrders;
    
  } catch (error) {
    console.error('❌ ENHANCED DATA EXPLORER: Error fetching orders:', error);
    throw new Error('Failed to fetch enhanced POS orders for Data Explorer');
  }
};

// Smart location matching helper
export const matchesLocation = (order: EnhancedPOSOrder, targetLocationId: string): boolean => {
  return (
    order.locationId === targetLocationId ||
    order.location === targetLocationId ||
    order.branchId === targetLocationId ||
    order.storeId === targetLocationId ||
    order.locationId === `location_${targetLocationId}` ||
    order.location === `location_${targetLocationId}`
  );
};
