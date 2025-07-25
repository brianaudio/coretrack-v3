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
  limit,
  Timestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../firebase';

// Notification interfaces
export interface Notification {
  id: string;
  tenantId: string;
  type: 'low_stock' | 'out_of_stock' | 'expiration' | 'reorder_suggestion' | 'system' | 'critical';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'inventory' | 'sales' | 'system' | 'alert';
  isRead: boolean;
  isEmailSent: boolean;
  relatedItemId?: string;
  relatedItemName?: string;
  actionRequired: boolean;
  actionType?: 'reorder' | 'check_expiry' | 'update_stock' | 'review';
  data?: Record<string, any>; // Additional notification data
  createdAt: Timestamp;
  readAt?: Timestamp;
  expiresAt?: Timestamp;
}

export interface CreateNotification {
  tenantId: string;
  type: Notification['type'];
  title: string;
  message: string;
  priority: Notification['priority'];
  category: Notification['category'];
  actionRequired?: boolean;
  actionType?: Notification['actionType'];
  relatedItemId?: string;
  relatedItemName?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationSettings {
  id: string;
  tenantId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlerts: boolean;
  expirationAlerts: boolean;
  reorderSuggestions: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  criticalAlertsOnly: boolean;
  emailAddress?: string;
  alertThresholds: {
    lowStock: number; // days
    expiration: number; // days before expiry
    criticalStock: number; // percentage of min stock
  };
  reportSchedule: {
    dailyTime: string; // HH:MM format
    weeklyDay: number; // 0-6 (Sunday-Saturday)
    weeklyTime: string; // HH:MM format
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  type: 'stock_level' | 'expiration' | 'usage_pattern' | 'cost_threshold';
  condition: {
    field: string;
    operator: 'less_than' | 'greater_than' | 'equals' | 'contains';
    value: number | string;
  };
  action: {
    createNotification: boolean;
    sendEmail: boolean;
    priority: Notification['priority'];
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Create notification
export const createNotification = async (notificationData: CreateNotification): Promise<string> => {
  try {
    const notificationsRef = collection(db, `tenants/${notificationData.tenantId}/notifications`);
    
    const notification: Omit<Notification, 'id'> = {
      tenantId: notificationData.tenantId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority,
      category: notificationData.category,
      isRead: false,
      isEmailSent: false,
      actionRequired: notificationData.actionRequired || false,
      createdAt: Timestamp.now(),
      ...(notificationData.actionType && { actionType: notificationData.actionType }),
      ...(notificationData.relatedItemId && { relatedItemId: notificationData.relatedItemId }),
      ...(notificationData.relatedItemName && { relatedItemName: notificationData.relatedItemName }),
      ...(notificationData.data && { data: notificationData.data }),
      ...(notificationData.expiresAt && { expiresAt: Timestamp.fromDate(notificationData.expiresAt) })
    };

    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

// Get notifications for tenant
export const getNotifications = async (
  tenantId: string, 
  options: {
    limit?: number;
    unreadOnly?: boolean;
    category?: Notification['category'];
    priority?: Notification['priority'];
  } = {}
): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, `tenants/${tenantId}/notifications`);
    
    // Start with basic query ordered by createdAt
    let q = query(notificationsRef, orderBy('createdAt', 'desc'));
    
    // Apply limit first to reduce data fetching
    if (options.limit) {
      q = query(q, limit(options.limit * 2)); // Get more to filter client-side
    }
    
    const snapshot = await getDocs(q);
    let notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
    
    // Apply filters client-side to avoid composite index requirements
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }
    
    if (options.category) {
      notifications = notifications.filter(n => n.category === options.category);
    }
    
    if (options.priority) {
      notifications = notifications.filter(n => n.priority === options.priority);
    }
    
    // Apply final limit after filtering
    if (options.limit) {
      notifications = notifications.slice(0, options.limit);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

// Mark notification as read
export const markNotificationAsRead = async (tenantId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, `tenants/${tenantId}/notifications`, notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (tenantId: string): Promise<void> => {
  try {
    const unreadNotifications = await getNotifications(tenantId, { unreadOnly: true });
    
    const updatePromises = unreadNotifications.map(notification =>
      markNotificationAsRead(tenantId, notification.id)
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
};

// Delete notification
export const deleteNotification = async (tenantId: string, notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, `tenants/${tenantId}/notifications`, notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
};

// Get notification settings
export const getNotificationSettings = async (tenantId: string): Promise<NotificationSettings | null> => {
  try {
    const settingsRef = doc(db, `tenants/${tenantId}/settings/notifications`);
    const settingsSnapshot = await getDoc(settingsRef);
    
    if (settingsSnapshot.exists()) {
      return {
        id: settingsSnapshot.id,
        ...settingsSnapshot.data()
      } as NotificationSettings;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw new Error('Failed to fetch notification settings');
  }
};

// Update notification settings
export const updateNotificationSettings = async (
  tenantId: string, 
  settings: Partial<Omit<NotificationSettings, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> => {
  try {
    const settingsRef = doc(db, `tenants/${tenantId}/settings/notifications`);
    
    // Check if settings exist
    const existingSettings = await getNotificationSettings(tenantId);
    
    if (existingSettings) {
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now()
      });
    } else {
      // Create default settings with updates
      const defaultSettings: Omit<NotificationSettings, 'id'> = {
        tenantId,
        emailNotifications: true,
        pushNotifications: true,
        lowStockAlerts: true,
        expirationAlerts: true,
        reorderSuggestions: true,
        dailyReports: false,
        weeklyReports: true,
        criticalAlertsOnly: false,
        alertThresholds: {
          lowStock: 3,
          expiration: 7,
          criticalStock: 20
        },
        reportSchedule: {
          dailyTime: '09:00',
          weeklyDay: 1, // Monday
          weeklyTime: '09:00'
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...settings
      };
      
      await updateDoc(settingsRef, defaultSettings);
    }
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw new Error('Failed to update notification settings');
  }
};

// Real-time notifications listener
export const subscribeToNotifications = (
  tenantId: string, 
  callback: (notifications: Notification[]) => void,
  options: { unreadOnly?: boolean; limit?: number } = {}
): (() => void) => {
  const notificationsRef = collection(db, `tenants/${tenantId}/notifications`);
  
  // Use simple query to avoid composite index requirements
  let q = query(notificationsRef, orderBy('createdAt', 'desc'));
  
  // Apply limit to reduce data transfer
  if (options.limit && !options.unreadOnly) {
    q = query(q, limit(options.limit));
  } else if (options.limit) {
    // When filtering for unread only, get more data to filter client-side
    q = query(q, limit(options.limit * 3));
  }

  return onSnapshot(q, (snapshot) => {
    let notifications: Notification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    
    // Apply unread filter client-side to avoid composite index
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }
    
    // Apply final limit after filtering
    if (options.limit && options.unreadOnly) {
      notifications = notifications.slice(0, options.limit);
    }
    
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications listener:', error);
  });
};

// Clean up expired notifications
export const cleanupExpiredNotifications = async (tenantId: string): Promise<void> => {
  try {
    const notificationsRef = collection(db, `tenants/${tenantId}/notifications`);
    const now = Timestamp.now();
    
    const expiredQuery = query(
      notificationsRef,
      where('expiresAt', '<=', now)
    );
    
    const expiredSnapshot = await getDocs(expiredQuery);
    const deletePromises = expiredSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
  }
};
