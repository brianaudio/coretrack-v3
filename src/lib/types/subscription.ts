import { Timestamp } from 'firebase/firestore';

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trial' | 'incomplete';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  yearlyPrice: number;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  popular?: boolean;
}

export interface SubscriptionFeatures {
  // Core Features
  inventory: boolean;
  pos: boolean;
  purchaseOrders: boolean;
  expenses: boolean;
  
  // Analytics & Reports
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  exportData: boolean;
  
  // Multi-user & Permissions
  multiUser: boolean;
  roleBasedAccess: boolean;
  teamManagement: boolean;
  
  // Integrations
  paymentIntegrations: boolean;
  accountingIntegrations: boolean;
  ecommerceIntegrations: boolean;
  apiAccess: boolean;
  
  // Advanced Features
  menuBuilder: boolean;
  recipeManagement: boolean;
  vendorManagement: boolean;
  barcodeScanning: boolean;
  lowStockAlerts: boolean;
  automaticReordering: boolean;
  
  // Support
  emailSupport: boolean;
  prioritySupport: boolean;
  phoneSupport: boolean;
  dedicatedManager: boolean;
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxLocations: number;
  maxProducts: number;
  maxOrders: number; // per month
  maxSuppliers: number;
  storageLimit: number; // in GB
  apiCallsPerMonth: number;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  
  // Dates
  startDate: Timestamp;
  endDate: Timestamp;
  trialEndDate?: Timestamp;
  canceledAt?: Timestamp;
  
  // Payment
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  lastPaymentDate?: Timestamp;
  nextPaymentDate?: Timestamp;
  
  // Usage tracking
  currentUsage: SubscriptionUsage;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubscriptionUsage {
  users: number;
  locations: number;
  products: number;
  ordersThisMonth: number;
  suppliers: number;
  storageUsed: number; // in GB
  apiCallsThisMonth: number;
}

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 29,
    yearlyPrice: 290, // 2 months free
    features: {
      inventory: true,
      pos: true,
      purchaseOrders: false,
      expenses: true,
      basicAnalytics: true,
      advancedAnalytics: false,
      customReports: false,
      exportData: false,
      multiUser: false,
      roleBasedAccess: false,
      teamManagement: false,
      paymentIntegrations: false,
      accountingIntegrations: false,
      ecommerceIntegrations: false,
      apiAccess: false,
      menuBuilder: true,
      recipeManagement: false,
      vendorManagement: false,
      barcodeScanning: false,
      lowStockAlerts: true,
      automaticReordering: false,
      emailSupport: true,
      prioritySupport: false,
      phoneSupport: false,
      dedicatedManager: false,
    },
    limits: {
      maxUsers: 1,
      maxLocations: 1,
      maxProducts: 500,
      maxOrders: 1000,
      maxSuppliers: 10,
      storageLimit: 2,
      apiCallsPerMonth: 0,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    monthlyPrice: 79,
    yearlyPrice: 790, // 2 months free
    popular: true,
    features: {
      inventory: true,
      pos: true,
      purchaseOrders: true,
      expenses: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customReports: true,
      exportData: true,
      multiUser: true,
      roleBasedAccess: true,
      teamManagement: true,
      paymentIntegrations: true,
      accountingIntegrations: false,
      ecommerceIntegrations: false,
      apiAccess: false,
      menuBuilder: true,
      recipeManagement: true,
      vendorManagement: true,
      barcodeScanning: true,
      lowStockAlerts: true,
      automaticReordering: true,
      emailSupport: true,
      prioritySupport: true,
      phoneSupport: false,
      dedicatedManager: false,
    },
    limits: {
      maxUsers: 10,
      maxLocations: 3,
      maxProducts: 5000,
      maxOrders: 10000,
      maxSuppliers: 100,
      storageLimit: 20,
      apiCallsPerMonth: 10000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 199,
    yearlyPrice: 1990, // 2 months free
    features: {
      inventory: true,
      pos: true,
      purchaseOrders: true,
      expenses: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customReports: true,
      exportData: true,
      multiUser: true,
      roleBasedAccess: true,
      teamManagement: true,
      paymentIntegrations: true,
      accountingIntegrations: true,
      ecommerceIntegrations: true,
      apiAccess: true,
      menuBuilder: true,
      recipeManagement: true,
      vendorManagement: true,
      barcodeScanning: true,
      lowStockAlerts: true,
      automaticReordering: true,
      emailSupport: true,
      prioritySupport: true,
      phoneSupport: true,
      dedicatedManager: true,
    },
    limits: {
      maxUsers: -1, // unlimited
      maxLocations: -1, // unlimited
      maxProducts: -1, // unlimited
      maxOrders: -1, // unlimited
      maxSuppliers: -1, // unlimited
      storageLimit: -1, // unlimited
      apiCallsPerMonth: -1, // unlimited
    },
  },
];
