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
    monthlyPrice: 89,
    yearlyPrice: 890, // 2 months free
    features: {
      // Core Features - Starter basics
      inventory: true,
      pos: true,
      purchaseOrders: false, // Professional+
      expenses: false, // Professional+
      
      // Analytics & Reports - None for Starter
      basicAnalytics: false, // Professional+
      advancedAnalytics: false, // Professional+
      customReports: false, // Enterprise only
      exportData: false, // Professional+
      
      // Multi-user & Permissions - None for Starter
      multiUser: false, // Professional+
      roleBasedAccess: false, // Professional+
      teamManagement: false, // Professional+
      
      // Integrations - None for Starter
      paymentIntegrations: false, // Professional+
      accountingIntegrations: false, // Enterprise only
      ecommerceIntegrations: false, // Enterprise only
      apiAccess: false, // Enterprise only
      
      // Advanced Features
      menuBuilder: true, // Starter gets this
      recipeManagement: false, // Professional+
      vendorManagement: false, // Professional+
      barcodeScanning: false, // Professional+
      lowStockAlerts: false, // Professional+
      automaticReordering: false, // Enterprise only
      
      // Support
      emailSupport: true,
      prioritySupport: false, // Professional+
      phoneSupport: false, // Enterprise only
      dedicatedManager: false, // Enterprise only
    },
    limits: {
      maxUsers: 1, // Single user only
      maxLocations: 1,
      maxProducts: 20, // Very limited - as requested
      maxOrders: 50, // Very limited - inventory only
      maxSuppliers: 3, // Limited
      storageLimit: 1, // 1GB
      apiCallsPerMonth: 0,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    monthlyPrice: 199,
    yearlyPrice: 1990, // 2 months free
    features: {
      // Core Features - Professional gets everything from Starter plus more
      inventory: true,
      pos: true,
      purchaseOrders: true, // Professional feature
      expenses: true, // Professional+
      
      // Analytics & Reports - Professional gets analytics
      basicAnalytics: true, // Professional feature
      advancedAnalytics: true, // Professional feature
      customReports: false, // Enterprise only
      exportData: true, // Professional+
      
      // Multi-user & Permissions - Professional gets team features
      multiUser: true, // Professional feature
      roleBasedAccess: true, // Professional feature
      teamManagement: true, // Professional feature
      
      // Integrations - Basic integrations
      paymentIntegrations: true, // Professional feature
      accountingIntegrations: false, // Enterprise only
      ecommerceIntegrations: false, // Enterprise only
      apiAccess: false, // Enterprise only
      
      // Advanced Features
      menuBuilder: true, // Professional gets this
      recipeManagement: true, // Professional feature
      vendorManagement: false, // Removed - not mentioned in requirements
      barcodeScanning: true, // Professional feature
      lowStockAlerts: true, // Professional feature
      automaticReordering: false, // Enterprise only
      
      // Support
      emailSupport: true,
      prioritySupport: true, // Professional feature
      phoneSupport: false, // Enterprise only
      dedicatedManager: false, // Enterprise only
    },
    limits: {
      maxUsers: 6, // As requested
      maxLocations: 2, // As requested
      maxProducts: 2500, // As requested
      maxOrders: -1, // Unlimited inventory - as requested
      maxSuppliers: 50, // Reasonable limit
      storageLimit: 25, // 25GB
      apiCallsPerMonth: 0, // No API
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 349,
    yearlyPrice: 2999, // 5+ months free
    popular: true, // Make Enterprise the popular choice
    features: {
      // Core Features - Enterprise gets everything
      inventory: true,
      pos: true,
      purchaseOrders: true,
      expenses: true,
      
      // Analytics & Reports - All features
      basicAnalytics: true,
      advancedAnalytics: true,
      customReports: true, // Enterprise exclusive
      exportData: true,
      
      // Multi-user & Permissions - All features
      multiUser: true,
      roleBasedAccess: true,
      teamManagement: true,
      
      // Integrations - All integrations
      paymentIntegrations: true,
      accountingIntegrations: true, // Enterprise exclusive
      ecommerceIntegrations: true, // Enterprise exclusive
      apiAccess: true, // Enterprise exclusive
      
      // Advanced Features - All features
      menuBuilder: true,
      recipeManagement: true,
      vendorManagement: true, // Enterprise gets this
      barcodeScanning: true,
      lowStockAlerts: true,
      automaticReordering: true, // Enterprise exclusive
      
      // Support - Premium support
      emailSupport: true,
      prioritySupport: true,
      phoneSupport: true, // Enterprise exclusive
      dedicatedManager: true, // Enterprise exclusive
    },
    limits: {
      maxUsers: -1, // Unlimited
      maxLocations: -1, // Unlimited
      maxProducts: -1, // Unlimited
      maxOrders: -1, // Unlimited
      maxSuppliers: -1, // Unlimited
      storageLimit: -1, // Unlimited
      apiCallsPerMonth: -1, // Unlimited
    },
  },
];
