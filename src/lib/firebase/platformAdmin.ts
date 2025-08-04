import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

// Support Tickets Interfaces
export interface SupportTicket {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  customerEmail: string;
  assignedTo: string | null;
  tags?: string[];
  attachments?: string[];
  responses?: SupportTicketResponse[];
}

export interface SupportTicketResponse {
  id: string;
  ticketId: string;
  message: string;
  author: string;
  authorType: 'customer' | 'support' | 'system';
  createdAt: Date;
  attachments?: string[];
}

// System Monitoring Interfaces
export interface SystemMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    totalTenants: number;
    lastUpdated: Date;
  };
  serverMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  databaseMetrics: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Billing Management Interfaces
export interface TenantBilling {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  monthlyRevenue: number;
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'cancelled';
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: Date;
  totalRevenue: number;
  lastPayment: Date;
  paymentMethod: string;
  billingHistory: BillingTransaction[];
}

export interface BillingTransaction {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'usage' | 'addon' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  processedAt?: Date;
  description: string;
  invoiceUrl?: string;
}

// Analytics Interfaces
export interface PlatformAnalytics {
  overview: {
    totalTenants: number;
    activeTenantsToday: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    growthRate: number;
  };
  tenantGrowth: TenantGrowthData[];
  revenueAnalytics: RevenueAnalytics[];
  usageMetrics: UsageMetrics;
  featureAdoption: FeatureAdoptionData[];
}

export interface TenantGrowthData {
  date: string;
  newSignups: number;
  totalActive: number;
  churned: number;
}

export interface RevenueAnalytics {
  date: string;
  revenue: number;
  subscriptions: number;
  upgrades: number;
  downgrades: number;
}

export interface UsageMetrics {
  totalOrders: number;
  totalInventoryItems: number;
  totalMenuItems: number;
  averageOrdersPerTenant: number;
  mostActiveFeatures: string[];
}

export interface FeatureAdoptionData {
  feature: string;
  adoptionRate: number;
  activeUsers: number;
  totalEligible: number;
}

// Audit Logging Interfaces
export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'data' | 'system' | 'billing' | 'security';
}

// =============================================================================
// SUPPORT TICKETS FUNCTIONS
// =============================================================================

export const createSupportTicket = async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const docRef = await addDoc(ticketsRef, {
      ...ticket,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Log audit trail
    await logAuditEvent({
      tenantId: ticket.tenantId,
      userId: 'system',
      userEmail: ticket.customerEmail,
      action: 'create_support_ticket',
      resource: 'support_ticket',
      resourceId: docRef.id,
      details: { subject: ticket.subject, priority: ticket.priority },
      category: 'system',
      severity: 'medium'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw new Error('Failed to create support ticket');
  }
};

export const getSupportTickets = async (filters?: {
  tenantId?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  limit?: number;
}): Promise<SupportTicket[]> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    let q = query(ticketsRef, orderBy('createdAt', 'desc'));
    
    if (filters?.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.priority) {
      q = query(q, where('priority', '==', filters.priority));
    }
    if (filters?.assignedTo) {
      q = query(q, where('assignedTo', '==', filters.assignedTo));
    }
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    throw new Error('Failed to fetch support tickets');
  }
};

export const updateSupportTicketStatus = async (
  ticketId: string, 
  status: SupportTicket['status'],
  assignedTo?: string
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now()
    };
    
    if (assignedTo) {
      updateData.assignedTo = assignedTo;
    }
    
    await updateDoc(ticketRef, updateData);
    
    // Log audit trail
    const ticketDoc = await getDoc(ticketRef);
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      await logAuditEvent({
        tenantId: ticketData.tenantId,
        userId: assignedTo || 'system',
        userEmail: 'support@coretrack.com',
        action: 'update_support_ticket_status',
        resource: 'support_ticket',
        resourceId: ticketId,
        details: { newStatus: status, previousStatus: ticketData.status },
        category: 'system',
        severity: 'low'
      });
    }
  } catch (error) {
    console.error('Error updating support ticket:', error);
    throw new Error('Failed to update support ticket');
  }
};

// =============================================================================
// SYSTEM MONITORING FUNCTIONS
// =============================================================================

export const updateSystemMetrics = async (metrics: Partial<SystemMetrics>): Promise<void> => {
  try {
    const metricsRef = doc(db, 'systemMetrics', 'current');
    await updateDoc(metricsRef, {
      ...metrics,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating system metrics:', error);
    throw new Error('Failed to update system metrics');
  }
};

export const getSystemMetrics = async (): Promise<SystemMetrics | null> => {
  try {
    const metricsRef = doc(db, 'systemMetrics', 'current');
    const metricsDoc = await getDoc(metricsRef);
    
    if (metricsDoc.exists()) {
      const data = metricsDoc.data();
      
      // Calculate real active users from actual tenants
      const tenantsRef = collection(db, 'tenants');
      const tenantsSnapshot = await getDocs(tenantsRef);
      const actualTenantCount = tenantsSnapshot.size;
      
      // Estimate active users based on actual tenants (assuming average of 3 users per tenant)
      const estimatedActiveUsers = actualTenantCount * 3;
      
      return {
        ...data,
        systemHealth: {
          ...data.systemHealth,
          activeUsers: estimatedActiveUsers > 0 ? estimatedActiveUsers : 1, // At least 1 (you)
          totalTenants: actualTenantCount,
          lastUpdated: data.systemHealth.lastUpdated.toDate()
        },
        alerts: data.alerts?.map((alert: any) => ({
          ...alert,
          timestamp: alert.timestamp.toDate()
        })) || []
      } as SystemMetrics;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    throw new Error('Failed to fetch system metrics');
  }
};

export const createSystemAlert = async (alert: Omit<SystemAlert, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const alertsRef = collection(db, 'systemAlerts');
    await addDoc(alertsRef, {
      ...alert,
      timestamp: Timestamp.now()
    });
    
    // Also add to current metrics alerts array
    const metricsRef = doc(db, 'systemMetrics', 'current');
    const metricsDoc = await getDoc(metricsRef);
    
    if (metricsDoc.exists()) {
      const currentAlerts = metricsDoc.data().alerts || [];
      const newAlert = {
        ...alert,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      
      // Keep only last 10 alerts
      const updatedAlerts = [newAlert, ...currentAlerts].slice(0, 10);
      
      await updateDoc(metricsRef, {
        alerts: updatedAlerts
      });
    }
  } catch (error) {
    console.error('Error creating system alert:', error);
    throw new Error('Failed to create system alert');
  }
};

// =============================================================================
// BILLING MANAGEMENT FUNCTIONS
// =============================================================================

export const getTenantBilling = async (tenantId?: string): Promise<TenantBilling[]> => {
  try {
    const billingRef = collection(db, 'tenantBilling');
    let q = query(billingRef, orderBy('totalRevenue', 'desc'));
    
    if (tenantId) {
      q = query(billingRef, where('tenantId', '==', tenantId));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      nextBillingDate: doc.data().nextBillingDate.toDate(),
      lastPayment: doc.data().lastPayment.toDate(),
      billingHistory: doc.data().billingHistory?.map((transaction: any) => ({
        ...transaction,
        createdAt: transaction.createdAt.toDate(),
        processedAt: transaction.processedAt?.toDate()
      })) || []
    })) as TenantBilling[];
  } catch (error) {
    console.error('Error fetching tenant billing:', error);
    throw new Error('Failed to fetch tenant billing');
  }
};

export const updateTenantBilling = async (
  tenantId: string, 
  updates: Partial<TenantBilling>
): Promise<void> => {
  try {
    const billingRef = doc(db, 'tenantBilling', tenantId);
    await updateDoc(billingRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    // Log audit trail
    await logAuditEvent({
      tenantId,
      userId: 'system',
      userEmail: 'billing@coretrack.com',
      action: 'update_tenant_billing',
      resource: 'tenant_billing',
      resourceId: tenantId,
      details: updates,
      category: 'billing',
      severity: 'medium'
    });
  } catch (error) {
    console.error('Error updating tenant billing:', error);
    throw new Error('Failed to update tenant billing');
  }
};

export const createBillingTransaction = async (
  transaction: Omit<BillingTransaction, 'id' | 'createdAt'>
): Promise<void> => {
  try {
    const transactionsRef = collection(db, 'billingTransactions');
    await addDoc(transactionsRef, {
      ...transaction,
      createdAt: Timestamp.now()
    });
    
    // Update tenant billing totals
    const billingRef = doc(db, 'tenantBilling', transaction.tenantId);
    const billingDoc = await getDoc(billingRef);
    
    if (billingDoc.exists() && transaction.type === 'subscription' && transaction.status === 'completed') {
      const currentData = billingDoc.data();
      await updateDoc(billingRef, {
        totalRevenue: (currentData.totalRevenue || 0) + transaction.amount,
        lastPayment: Timestamp.now()
      });
    }
    
    // Log audit trail
    await logAuditEvent({
      tenantId: transaction.tenantId,
      userId: 'system',
      userEmail: 'billing@coretrack.com',
      action: 'create_billing_transaction',
      resource: 'billing_transaction',
      details: { amount: transaction.amount, type: transaction.type },
      category: 'billing',
      severity: 'low'
    });
  } catch (error) {
    console.error('Error creating billing transaction:', error);
    throw new Error('Failed to create billing transaction');
  }
};

// =============================================================================
// PLATFORM ANALYTICS FUNCTIONS
// =============================================================================

export const getPlatformAnalytics = async (days: number = 30): Promise<PlatformAnalytics> => {
  try {
    // Get all tenants
    const tenantsRef = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsRef);
    const totalTenants = tenantsSnapshot.size;
    
    // Get active tenants (those with recent activity)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // This would require more complex queries in a real implementation
    // For now, we'll calculate basic metrics
    
    const billingData = await getTenantBilling();
    const totalRevenue = billingData.reduce((sum, tenant) => sum + tenant.totalRevenue, 0);
    const activeSubscriptions = billingData.filter(t => t.subscriptionStatus === 'active').length;
    const monthlyRecurringRevenue = billingData
      .filter(t => t.subscriptionStatus === 'active' && t.billingCycle === 'monthly')
      .reduce((sum, tenant) => sum + tenant.monthlyRevenue, 0);
    
    // Calculate growth rate (simplified)
    const growthRate = totalTenants > 0 ? (activeSubscriptions / totalTenants) * 100 : 0;
    const churnRate = totalTenants > 0 ? ((totalTenants - activeSubscriptions) / totalTenants) * 100 : 0;
    
    return {
      overview: {
        totalTenants,
        activeTenantsToday: Math.floor(totalTenants * 0.7), // Approximate
        totalRevenue,
        monthlyRecurringRevenue,
        averageRevenuePerUser: activeSubscriptions > 0 ? monthlyRecurringRevenue / activeSubscriptions : 0,
        churnRate,
        growthRate
      },
      tenantGrowth: [], // Would calculate from historical data
      revenueAnalytics: [], // Would calculate from billing transactions
      usageMetrics: {
        totalOrders: 0, // Would sum from all tenants
        totalInventoryItems: 0, // Would sum from all tenants
        totalMenuItems: 0, // Would sum from all tenants
        averageOrdersPerTenant: 0,
        mostActiveFeatures: ['POS', 'Inventory', 'Analytics', 'Menu Builder', 'Reports']
      },
      featureAdoption: [
        { feature: 'POS System', adoptionRate: 95, activeUsers: Math.floor(totalTenants * 0.95), totalEligible: totalTenants },
        { feature: 'Inventory Management', adoptionRate: 88, activeUsers: Math.floor(totalTenants * 0.88), totalEligible: totalTenants },
        { feature: 'Menu Builder', adoptionRate: 82, activeUsers: Math.floor(totalTenants * 0.82), totalEligible: totalTenants },
        { feature: 'Analytics Dashboard', adoptionRate: 75, activeUsers: Math.floor(totalTenants * 0.75), totalEligible: totalTenants }
      ]
    };
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    throw new Error('Failed to fetch platform analytics');
  }
};

// =============================================================================
// AUDIT LOGGING FUNCTIONS
// =============================================================================

export const logAuditEvent = async (event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const auditRef = collection(db, 'auditLogs');
    await addDoc(auditRef, {
      ...event,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw error for audit logging failures
  }
};

export const getAuditLogs = async (filters?: {
  tenantId?: string;
  userId?: string;
  action?: string;
  category?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLog[]> => {
  try {
    const auditRef = collection(db, 'auditLogs');
    let q = query(auditRef, orderBy('timestamp', 'desc'));
    
    if (filters?.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters?.action) {
      q = query(q, where('action', '==', filters.action));
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.severity) {
      q = query(q, where('severity', '==', filters.severity));
    }
    if (filters?.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as AuditLog[];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
};

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

export const subscribeSupportTickets = (
  callback: (tickets: SupportTicket[]) => void,
  filters?: { tenantId?: string; status?: string }
) => {
  const ticketsRef = collection(db, 'supportTickets');
  let q = query(ticketsRef, orderBy('createdAt', 'desc'), limit(50));
  
  if (filters?.tenantId) {
    q = query(q, where('tenantId', '==', filters.tenantId));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  return onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as SupportTicket[];
    callback(tickets);
  });
};

export const subscribeSystemMetrics = (callback: (metrics: SystemMetrics | null) => void) => {
  const metricsRef = doc(db, 'systemMetrics', 'current');
  
  return onSnapshot(metricsRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const metrics = {
        ...data,
        systemHealth: {
          ...data.systemHealth,
          lastUpdated: data.systemHealth.lastUpdated.toDate()
        },
        alerts: data.alerts?.map((alert: any) => ({
          ...alert,
          timestamp: alert.timestamp.toDate()
        })) || []
      } as SystemMetrics;
      callback(metrics);
    } else {
      callback(null);
    }
  });
};
