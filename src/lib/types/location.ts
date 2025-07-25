import { Timestamp } from 'firebase/firestore';

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  type: 'main' | 'branch' | 'warehouse' | 'kiosk';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  settings: {
    timezone: string;
    currency: string;
    businessHours: {
      [key: string]: { // day of week
        open: string;
        close: string;
        closed?: boolean;
      };
    };
    features: {
      inventory: boolean;
      pos: boolean;
      expenses: boolean;
    };
  };
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LocationUsage {
  locationId: string;
  productsCount: number;
  ordersThisMonth: number;
  salesThisMonth: number;
  activeUsers: number;
  lastActivity: Timestamp;
}

// Location-specific inventory
export interface LocationInventory {
  locationId: string;
  productId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  lastRestocked?: Timestamp;
  costPerUnit: number;
  supplierIds: string[];
}

// Location-specific analytics
export interface LocationAnalytics {
  locationId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: Timestamp;
  metrics: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: {
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }[];
    hourlyBreakdown: {
      hour: number;
      sales: number;
      orders: number;
    }[];
  };
}
