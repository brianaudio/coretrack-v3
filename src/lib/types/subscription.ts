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
    monthlyPrice: 69,
    yearlyPrice: 690, // 2 months free
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
      maxProducts: 100, // Very limited as per decoy pricing strategy
      maxOrders: 500,
      maxSuppliers: 5,
      storageLimit: 1,
      apiCallsPerMonth: 0,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    monthlyPrice: 179,
    yearlyPrice: 1790, // 2 months free
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
      accountingIntegrations: true,
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
      maxUsers: -1, // unlimited as promised
      maxLocations: 5, // up to 5 as promised
      maxProducts: -1, // unlimited as promised
      maxOrders: -1, // unlimited as promised
      maxSuppliers: -1, // unlimited as promised
      storageLimit: 50,
      apiCallsPerMonth: 50000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 399,
    yearlyPrice: 3990, // 2 months free
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
