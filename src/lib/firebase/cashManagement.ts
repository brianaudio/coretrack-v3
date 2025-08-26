import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface CashDrawer {
  id: string;
  name: string;
  cashOnHand: number;
  expectedCash: number;
  difference: number; // cashOnHand - expectedCash
  lastCounted: Timestamp;
  countedBy?: string;
  status: 'balanced' | 'over' | 'short' | 'uncounted';
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'digital';
  name: string; // e.g., "Cash", "Credit Card", "GCash", "PayMaya"
  isActive: boolean;
  balance?: number; // for digital wallets
  accountInfo?: string; // account details
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentTransaction {
  id: string;
  orderId?: string;
  paymentMethodId: string;
  paymentMethod: PaymentMethod['type'];
  paymentMethodName: string;
  amount: number;
  transactionType: 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'adjustment';
  reference?: string; // transaction reference number
  description?: string;
  processedBy?: string;
  timestamp: Timestamp;
  tenantId: string;
}

export interface CashCount {
  id: string;
  drawerId: string;
  countedAmount: number;
  expectedAmount: number;
  difference: number;
  amount: number; // alias for countedAmount for easier access
  denominations: {
    [key: string]: number; // denomination -> count
  };
  countedBy: string;
  notes?: string;
  timestamp: Timestamp;
  tenantId: string;
}

export interface CreateCashDrawer {
  name: string;
  cashOnHand: number;
  tenantId: string;
}

export interface CreatePaymentMethod {
  type: PaymentMethod['type'];
  name: string;
  isActive?: boolean;
  balance?: number;
  accountInfo?: string;
  tenantId: string;
}

export interface CreatePaymentTransaction {
  orderId?: string;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod['type'];
  paymentMethodName?: string;
  amount: number;
  transactionType?: PaymentTransaction['transactionType'];
  cashReceived?: number;
  changeGiven?: number;
  reference?: string;
  description?: string;
  processedBy?: string;
  tenantId: string;
}

export interface CreateCashCount {
  drawerId: string;
  countedAmount: number;
  expectedAmount: number;
  denominations: { [key: string]: number };
  countedBy: string;
  notes?: string;
  tenantId: string;
}

// Collection references
const getCashDrawersCollection = (tenantId: string) => 
  collection(db, `tenants/${tenantId}/cashDrawers`);

const getPaymentMethodsCollection = (tenantId: string) => 
  collection(db, `tenants/${tenantId}/paymentMethods`);

const getPaymentTransactionsCollection = (tenantId: string) => 
  collection(db, `tenants/${tenantId}/paymentTransactions`);

const getCashCountsCollection = (tenantId: string) => 
  collection(db, `tenants/${tenantId}/cashCounts`);

// Cash Drawer Management
export const getCashDrawers = async (tenantId: string): Promise<CashDrawer[]> => {
  try {
    const drawersRef = getCashDrawersCollection(tenantId);
    const q = query(drawersRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CashDrawer[];
  } catch (error) {
    console.error('Error fetching cash drawers:', error);
    throw new Error('Failed to fetch cash drawers');
  }
};

export const addCashDrawer = async (drawer: CreateCashDrawer): Promise<string> => {
  try {
    const drawersRef = getCashDrawersCollection(drawer.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(drawersRef, {
      ...drawer,
      expectedCash: drawer.cashOnHand,
      difference: 0,
      lastCounted: now,
      status: 'balanced' as const,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding cash drawer:', error);
    throw new Error('Failed to add cash drawer');
  }
};

export const updateCashDrawer = async (
  tenantId: string,
  drawerId: string,
  updates: Partial<Omit<CashDrawer, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const drawerRef = doc(db, `tenants/${tenantId}/cashDrawers`, drawerId);
    
    // Calculate status based on difference
    if (updates.cashOnHand !== undefined || updates.expectedCash !== undefined) {
      const currentDoc = await getDoc(drawerRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        const newCashOnHand = updates.cashOnHand ?? currentData.cashOnHand;
        const newExpectedCash = updates.expectedCash ?? currentData.expectedCash;
        const difference = newCashOnHand - newExpectedCash;
        
        updates.difference = difference;
        updates.status = difference === 0 ? 'balanced' : difference > 0 ? 'over' : 'short';
      }
    }
    
    await updateDoc(drawerRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating cash drawer:', error);
    throw new Error('Failed to update cash drawer');
  }
};

// Payment Methods Management
export const getPaymentMethods = async (tenantId: string): Promise<PaymentMethod[]> => {
  try {
    const methodsRef = getPaymentMethodsCollection(tenantId);
    const q = query(methodsRef, orderBy('name')); // Single orderBy to avoid composite index requirement
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentMethod[];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw new Error('Failed to fetch payment methods');
  }
};

export const addPaymentMethod = async (method: CreatePaymentMethod): Promise<string> => {
  try {
    const methodsRef = getPaymentMethodsCollection(method.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(methodsRef, {
      ...method,
      isActive: method.isActive ?? true,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw new Error('Failed to add payment method');
  }
};

// Update payment method
export const updatePaymentMethod = async (
  tenantId: string,
  methodId: string,
  updates: Partial<Omit<PaymentMethod, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const methodRef = doc(db, `tenants/${tenantId}/paymentMethods`, methodId);
    await updateDoc(methodRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw new Error('Failed to update payment method');
  }
};

// Delete payment method
export const deletePaymentMethod = async (
  tenantId: string,
  methodId: string
): Promise<void> => {
  try {
    const methodRef = doc(db, `tenants/${tenantId}/paymentMethods`, methodId);
    await deleteDoc(methodRef);
  } catch (error) {
    console.error('Error deleting payment method:', error);
    throw new Error('Failed to delete payment method');
  }
};

// Payment Transactions
export const addPaymentTransaction = async (transaction: CreatePaymentTransaction): Promise<string> => {
  try {
    const transactionsRef = getPaymentTransactionsCollection(transaction.tenantId);
    
    // Get payment method details
    const methodRef = doc(db, `tenants/${transaction.tenantId}/paymentMethods`, transaction.paymentMethodId);
    const methodDoc = await getDoc(methodRef);
    
    if (!methodDoc.exists()) {
      throw new Error('Payment method not found');
    }
    
    const methodData = methodDoc.data() as PaymentMethod;
    
    const docRef = await addDoc(transactionsRef, {
      ...transaction,
      transactionType: transaction.transactionType || 'sale',
      paymentMethod: methodData.type,
      paymentMethodName: methodData.name,
      timestamp: Timestamp.now()
    });
    
    // Update cash drawer if it's a cash transaction
    if (methodData.type === 'cash') {
      await updateCashDrawerFromTransaction(
        transaction.tenantId,
        transaction.amount,
        transaction.transactionType || 'sale'
      );
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding payment transaction:', error);
    throw new Error('Failed to add payment transaction');
  }
};

export const getPaymentTransactions = async (
  tenantId: string,
  limit: number = 100,
  paymentMethodId?: string
): Promise<PaymentTransaction[]> => {
  try {
    const transactionsRef = getPaymentTransactionsCollection(tenantId);
    let q;
    
    if (paymentMethodId) {
      q = query(
        transactionsRef,
        where('paymentMethodId', '==', paymentMethodId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(transactionsRef, orderBy('timestamp', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentTransaction[];
    
    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    throw new Error('Failed to fetch payment transactions');
  }
};

// Cash Count Management
export const performCashCount = async (cashCount: CreateCashCount): Promise<string> => {
  try {
    const countsRef = getCashCountsCollection(cashCount.tenantId);
    const now = Timestamp.now();
    
    const difference = cashCount.countedAmount - cashCount.expectedAmount;
    
    const docRef = await addDoc(countsRef, {
      ...cashCount,
      difference,
      timestamp: now
    });
    
    // Update the cash drawer
    await updateCashDrawer(cashCount.tenantId, cashCount.drawerId, {
      cashOnHand: cashCount.countedAmount,
      expectedCash: cashCount.expectedAmount,
      lastCounted: now,
      countedBy: cashCount.countedBy
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error performing cash count:', error);
    throw new Error('Failed to perform cash count');
  }
};

export const getCashCounts = async (
  tenantId: string,
  drawerId?: string,
  limit: number = 50
): Promise<CashCount[]> => {
  try {
    const countsRef = getCashCountsCollection(tenantId);
    let q;
    
    if (drawerId) {
      q = query(
        countsRef,
        where('drawerId', '==', drawerId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(countsRef, orderBy('timestamp', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const counts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        amount: data.countedAmount // Add alias for easier access
      };
    }) as CashCount[];
    
    return counts.slice(0, limit);
  } catch (error) {
    console.error('Error fetching cash counts:', error);
    throw new Error('Failed to fetch cash counts');
  }
};

// Helper function to update cash drawer from transactions
const updateCashDrawerFromTransaction = async (
  tenantId: string,
  amount: number,
  transactionType: PaymentTransaction['transactionType']
) => {
  try {
    // Get the first (or main) cash drawer
    const drawers = await getCashDrawers(tenantId);
    if (drawers.length === 0) return;
    
    const mainDrawer = drawers[0];
    let expectedCashChange = 0;
    
    switch (transactionType) {
      case 'sale':
        expectedCashChange = amount;
        break;
      case 'refund':
        expectedCashChange = -amount;
        break;
      case 'deposit':
        expectedCashChange = amount;
        break;
      case 'withdrawal':
        expectedCashChange = -amount;
        break;
      default:
        return; // No change for adjustments
    }
    
    await updateCashDrawer(tenantId, mainDrawer.id, {
      expectedCash: mainDrawer.expectedCash + expectedCashChange
    });
  } catch (error) {
    console.error('Error updating cash drawer from transaction:', error);
  }
};

// Dashboard analytics
export const getCashManagementSummary = async (tenantId: string) => {
  try {
    const [drawers, methods, recentTransactions] = await Promise.all([
      getCashDrawers(tenantId),
      getPaymentMethods(tenantId),
      getPaymentTransactions(tenantId, 50)
    ]);
    
    // Calculate totals by payment method
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaysTransactions = recentTransactions.filter(t => 
      t.timestamp.toDate() >= todayStart
    );
    
    const paymentSummary = methods.map(method => {
      const methodTransactions = todaysTransactions.filter(t => 
        t.paymentMethodId === method.id && t.transactionType === 'sale'
      );
      
      const totalAmount = methodTransactions.reduce((sum, t) => sum + t.amount, 0);
      const transactionCount = methodTransactions.length;
      
      return {
        method,
        totalAmount,
        transactionCount
      };
    });
    
    const totalCashOnHand = drawers.reduce((sum, drawer) => sum + drawer.cashOnHand, 0);
    const totalExpectedCash = drawers.reduce((sum, drawer) => sum + drawer.expectedCash, 0);
    const totalCashDifference = totalCashOnHand - totalExpectedCash;
    
    return {
      drawers,
      paymentSummary,
      totalCashOnHand,
      totalExpectedCash,
      totalCashDifference,
      todaysTransactionCount: todaysTransactions.length,
      todaysTotalSales: todaysTransactions
        .filter(t => t.transactionType === 'sale')
        .reduce((sum, t) => sum + t.amount, 0)
    };
  } catch (error) {
    console.error('Error getting cash management summary:', error);
    throw new Error('Failed to get cash management summary');
  }
};

// Real-time subscriptions
export const subscribeToCashDrawers = (
  tenantId: string,
  callback: (drawers: CashDrawer[]) => void
) => {
  const drawersRef = getCashDrawersCollection(tenantId);
  const q = query(drawersRef, orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    const drawers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CashDrawer[];
    
    callback(drawers);
  }, (error) => {
    console.error('Error in cash drawers subscription:', error);
  });
};

export const subscribeToPaymentTransactions = (
  tenantId: string,
  callback: (transactions: PaymentTransaction[]) => void,
  limit: number = 50
) => {
  const transactionsRef = getPaymentTransactionsCollection(tenantId);
  const q = query(transactionsRef, orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentTransaction[];
    
    callback(transactions.slice(0, limit));
  }, (error) => {
    console.error('Error in payment transactions subscription:', error);
  });
};

// Additional types for PaymentMonitoring
export interface PaymentMethodSummary {
  cashTotal: number;
  cardTotal: number;
  digitalTotal: number;
  totalTransactions: number;
}

export interface DailyCashSummary {
  openingBalance: number;
  netCashFlow: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  date: Date;
}

// Additional functions for PaymentMonitoring
export const getCashDrawerBalance = async (tenantId: string): Promise<number> => {
  try {
    const drawers = await getCashDrawers(tenantId);
    return drawers.reduce((total, drawer) => total + drawer.cashOnHand, 0);
  } catch (error) {
    console.error('Error getting cash drawer balance:', error);
    return 0;
  }
};

export const getPaymentMethodSummary = async (tenantId: string, locationId?: string): Promise<PaymentMethodSummary> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // BRANCH ISOLATION FIX: Get payment data from POS orders instead of payment transactions
    // since orders have locationId but payment transactions don't
    if (locationId) {
      // Import Firebase functions for querying orders
      const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const startTimestamp = Timestamp.fromDate(todayStart);
      const ordersCollection = collection(db, `tenants/${tenantId}/posOrders`);
      const ordersQuery = query(
        ordersCollection,
        where('locationId', '==', locationId),
        where('createdAt', '>=', startTimestamp)
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      console.log(`💳 [PaymentMethodSummary] BRANCH FILTERED: ${orders.length} orders for location "${locationId}"`);
      
      const summary = {
        cashTotal: 0,
        cardTotal: 0,
        digitalTotal: 0,
        totalTransactions: orders.length
      };
      
      // Process orders to calculate payment method totals
      orders.forEach(order => {
        const orderTotal = order.total || 0;
        
        // Check payment methods in order
        if (order.paymentMethods && Array.isArray(order.paymentMethods)) {
          // Handle split payments
          order.paymentMethods.forEach((payment: any) => {
            const method = payment.method?.toLowerCase();
            const amount = payment.amount || 0;
            
            if (method === 'cash') {
              summary.cashTotal += amount;
            } else if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
              summary.cardTotal += amount;
            } else if (method === 'digital' || method === 'gcash' || method === 'maya' || method === 'paymaya') {
              summary.digitalTotal += amount;
            }
          });
        } else if (order.paymentMethod) {
          // Handle single payment method
          const method = order.paymentMethod.toLowerCase();
          
          if (method === 'cash') {
            summary.cashTotal += orderTotal;
          } else if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
            summary.cardTotal += orderTotal;
          } else if (method === 'digital' || method === 'gcash' || method === 'maya' || method === 'paymaya') {
            summary.digitalTotal += orderTotal;
          }
        } else {
          // Default to cash if no payment method specified
          summary.cashTotal += orderTotal;
        }
      });
      
      return summary;
    }
    
    // Fallback to transaction-based method for backward compatibility (when no locationId)
    const transactions = await getPaymentTransactions(tenantId, 1000);
    const todaysTransactions = transactions.filter(t => 
      t.timestamp.toDate() >= todayStart && t.transactionType === 'sale'
    );
    
    const summary = {
      cashTotal: 0,
      cardTotal: 0,
      digitalTotal: 0,
      totalTransactions: todaysTransactions.length
    };
    
    todaysTransactions.forEach(transaction => {
      switch (transaction.paymentMethod) {
        case 'cash':
          summary.cashTotal += transaction.amount;
          break;
        case 'card':
          summary.cardTotal += transaction.amount;
          break;
        case 'digital':
          summary.digitalTotal += transaction.amount;
          break;
      }
    });
    
    return summary;
  } catch (error) {
    console.error('Error getting payment method summary:', error);
    return { cashTotal: 0, cardTotal: 0, digitalTotal: 0, totalTransactions: 0 };
  }
};

export const getDailyCashSummary = async (tenantId: string): Promise<DailyCashSummary> => {
  try {
    const drawers = await getCashDrawers(tenantId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const transactions = await getPaymentTransactions(tenantId, 1000);
    const todaysCashTransactions = transactions.filter(t => 
      t.timestamp.toDate() >= todayStart && t.paymentMethod === 'cash'
    );
    
    const netCashFlow = todaysCashTransactions.reduce((total, t) => {
      switch (t.transactionType) {
        case 'sale':
        case 'deposit':
          return total + t.amount;
        case 'refund':
        case 'withdrawal':
          return total - t.amount;
        default:
          return total;
      }
    }, 0);
    
    const actualBalance = drawers.reduce((total, drawer) => total + drawer.cashOnHand, 0);
    const expectedBalance = drawers.reduce((total, drawer) => total + drawer.expectedCash, 0);
    const openingBalance = expectedBalance - netCashFlow;
    
    return {
      openingBalance,
      netCashFlow,
      expectedBalance,
      actualBalance,
      difference: actualBalance - expectedBalance,
      date: new Date()
    };
  } catch (error) {
    console.error('Error getting daily cash summary:', error);
    return {
      openingBalance: 0,
      netCashFlow: 0,
      expectedBalance: 0,
      actualBalance: 0,
      difference: 0,
      date: new Date()
    };
  }
};

export const addCashCount = async (
  tenantId: string,
  data: {
    amount: number;
    notes?: string;
    countedBy: string;
  }
): Promise<string> => {
  try {
    // Get the first cash drawer (or create one if none exists)
    let drawers = await getCashDrawers(tenantId);
    let drawerId: string;
    
    if (drawers.length === 0) {
      // Create a default cash drawer
      drawerId = await addCashDrawer({
        name: 'Main Cash Drawer',
        cashOnHand: data.amount,
        tenantId
      });
    } else {
      drawerId = drawers[0].id;
    }
    
    // Perform the cash count
    return await performCashCount({
      drawerId,
      countedAmount: data.amount,
      expectedAmount: drawers.length > 0 ? drawers[0].expectedCash : data.amount,
      denominations: {}, // Could be enhanced to track actual denominations
      countedBy: data.countedBy,
      notes: data.notes,
      tenantId
    });
  } catch (error) {
    console.error('Error adding cash count:', error);
    throw new Error('Failed to add cash count');
  }
};

// Initialize default cash drawer when none exists
export const initializeDefaultCashDrawer = async (tenantId: string): Promise<void> => {
  try {
    const existingDrawers = await getCashDrawers(tenantId);
    
    // If no cash drawers exist, create a default one
    if (existingDrawers.length === 0) {
      await addCashDrawer({
        name: 'Main Cash Drawer',
        cashOnHand: 0,
        tenantId: tenantId
      });
      console.log('✅ Default cash drawer created');
    }
  } catch (error) {
    console.error('Error initializing default cash drawer:', error);
    throw new Error('Failed to initialize default cash drawer');
  }
};

export const initializeDefaultPaymentMethods = async (tenantId: string): Promise<void> => {
  try {
    const existingMethods = await getPaymentMethods(tenantId);
    
    // Only create defaults if no payment methods exist
    if (existingMethods.length === 0) {
      const defaultMethods: CreatePaymentMethod[] = [
        { type: 'cash', name: 'Cash', tenantId },
        { type: 'card', name: 'Credit Card', tenantId },
        { type: 'card', name: 'Debit Card', tenantId },
        { type: 'digital', name: 'GCash', tenantId },
        { type: 'digital', name: 'Maya (PayMaya)', tenantId },
        { type: 'digital', name: 'GrabPay', tenantId }
      ];

      // Create all default methods
      await Promise.all(defaultMethods.map(method => addPaymentMethod(method)));
    }
  } catch (error) {
    console.error('Error initializing default payment methods:', error);
  }
};
