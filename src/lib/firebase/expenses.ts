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

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  description: string;
  vendor?: string;
  receiptNumber?: string;
  paymentMethod: 'cash' | 'card' | 'check' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  date: Timestamp;
  approvedBy?: string;
  createdBy: string;
  locationId?: string;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  budget?: number;
  isActive: boolean;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateExpense {
  title: string;
  category: string;
  amount: number;
  description: string;
  vendor?: string;
  receiptNumber?: string;
  paymentMethod: 'cash' | 'card' | 'check' | 'bank_transfer';
  date: Date;
  createdBy: string;
  tenantId: string;
  locationId?: string;
}

export interface CreateExpenseCategory {
  name: string;
  description: string;
  budget?: number;
  tenantId: string;
}

// Get expenses collection reference
const getExpensesCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/expenses`);
};

// Get expense categories collection reference
const getExpenseCategoriesCollection = (tenantId: string) => {
  return collection(db, `tenants/${tenantId}/expenseCategories`);
};

// Expenses CRUD operations
export const getExpenses = async (tenantId: string, locationId?: string): Promise<Expense[]> => {
  try {
    const expensesRef = getExpensesCollection(tenantId);
    const q = query(expensesRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    const allExpenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];

    // Filter by locationId if provided, using client-side filtering
    if (locationId) {
      return allExpenses.filter(expense => expense.locationId === locationId);
    }
    
    return allExpenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw new Error('Failed to fetch expenses');
  }
};

export const subscribeToExpenses = (
  tenantId: string, 
  callback: (expenses: Expense[]) => void
) => {
  const expensesRef = getExpensesCollection(tenantId);
  const q = query(expensesRef, orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
    
    callback(expenses);
  }, (error) => {
    console.error('Error in expenses subscription:', error);
  });
};

export const addExpense = async (expense: CreateExpense): Promise<string> => {
  try {
    const expensesRef = getExpensesCollection(expense.tenantId);
    const now = Timestamp.now();
    
    const docRef = await addDoc(expensesRef, {
      ...expense,
      date: Timestamp.fromDate(expense.date),
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw new Error('Failed to add expense');
  }
};

export const updateExpense = async (
  tenantId: string,
  expenseId: string,
  updates: Partial<Omit<Expense, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const expenseRef = doc(db, `tenants/${tenantId}/expenses`, expenseId);
    const now = Timestamp.now();
    
    await updateDoc(expenseRef, {
      ...updates,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    throw new Error('Failed to update expense');
  }
};

export const updateExpenseStatus = async (
  tenantId: string,
  expenseId: string,
  status: Expense['status'],
  approvedBy?: string
): Promise<void> => {
  try {
    const expenseRef = doc(db, `tenants/${tenantId}/expenses`, expenseId);
    const now = Timestamp.now();
    
    const updateData: any = {
      status,
      updatedAt: now
    };
    
    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
    }
    
    await updateDoc(expenseRef, updateData);
  } catch (error) {
    console.error('Error updating expense status:', error);
    throw new Error('Failed to update expense status');
  }
};

export const deleteExpense = async (
  tenantId: string,
  expenseId: string
): Promise<void> => {
  try {
    const expenseRef = doc(db, `tenants/${tenantId}/expenses`, expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw new Error('Failed to delete expense');
  }
};

// Expense Categories CRUD operations
export const getExpenseCategories = async (tenantId: string): Promise<ExpenseCategory[]> => {
  try {
    const categoriesRef = getExpenseCategoriesCollection(tenantId);
    const q = query(categoriesRef, orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExpenseCategory[];
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    throw new Error('Failed to fetch expense categories');
  }
};

export const addExpenseCategory = async (category: CreateExpenseCategory): Promise<string> => {
  try {
    const categoriesRef = getExpenseCategoriesCollection(category.tenantId);
    const now = Timestamp.now();
    
    // Create the category data object, only including budget if it's defined and > 0
    const categoryData: any = {
      name: category.name,
      description: category.description,
      tenantId: category.tenantId,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    
    // Only add budget field if it has a valid value
    if (category.budget !== undefined && category.budget > 0) {
      categoryData.budget = category.budget;
    }
    
    const docRef = await addDoc(categoriesRef, categoryData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense category:', error);
    throw new Error('Failed to add expense category');
  }
};

// Analytics functions
export const getExpenseStats = async (tenantId: string) => {
  try {
    const expenses = await getExpenses(tenantId);
    
    const totalExpenses = expenses.length;
    const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // This month's expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const thisMonthExpenses = expenses.filter(e => 
      e.date.toDate() >= startOfMonth
    );
    
    const thisMonthAmount = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Category breakdown
    const categoryBreakdown = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalExpenses,
      pendingExpenses,
      totalAmount,
      thisMonthAmount,
      thisMonthExpenses: thisMonthExpenses.length,
      categoryBreakdown
    };
  } catch (error) {
    console.error('Error getting expense stats:', error);
    throw new Error('Failed to get expense statistics');
  }
};

// Get expenses by date range
export const getExpensesByDateRange = async (
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<Expense[]> => {
  try {
    const expensesRef = getExpensesCollection(tenantId);
    const q = query(
      expensesRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
  } catch (error) {
    console.error('Error fetching expenses by date range:', error);
    throw new Error('Failed to fetch expenses by date range');
  }
};

// Get expenses by category
export const getExpensesByCategory = async (
  tenantId: string,
  category: string
): Promise<Expense[]> => {
  try {
    const expensesRef = getExpensesCollection(tenantId);
    const q = query(
      expensesRef,
      where('category', '==', category),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    throw new Error('Failed to fetch expenses by category');
  }
};
