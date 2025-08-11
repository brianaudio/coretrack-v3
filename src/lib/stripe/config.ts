/**
 * Stripe Configuration for CoreTrack
 * Handles payment processing for small businesses
 */

import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key (safe to expose in frontend)
// TODO: Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Stripe configuration
export const STRIPE_CONFIG = {
  // Philippine peso currency
  currency: 'php',
  
  // Minimum charge amount (₱50.00)
  minimumAmount: 5000, // in centavos
  
  // Payment method types supported
  paymentMethods: ['card', 'gcash', 'grabpay'], // GCash and GrabPay when available
  
  // Appearance customization
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3B82F6', // CoreTrack blue
      colorBackground: '#ffffff',
      colorText: '#1F2937',
      colorDanger: '#EF4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
};

// Helper function to format amount for Stripe (convert to centavos)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper function to format amount for display (convert from centavos)
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
};

// Helper function to format currency for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

// Payment method configuration for Philippines
export const PAYMENT_METHODS = {
  card: {
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    fee: 0.029, // 2.9%
    fixedFee: 15, // ₱15
    icon: '💳',
  },
  gcash: {
    name: 'GCash',
    description: 'Digital wallet payment',
    fee: 0.025, // 2.5% (when available)
    fixedFee: 5, // ₱5
    icon: '📱',
  },
  grabpay: {
    name: 'GrabPay',
    description: 'Grab digital wallet',
    fee: 0.025, // 2.5%
    fixedFee: 5, // ₱5
    icon: '🚗',
  },
};

// Calculate transaction fee
export const calculateTransactionFee = (
  amount: number, 
  paymentMethod: keyof typeof PAYMENT_METHODS = 'card'
): { fee: number; total: number; net: number } => {
  const method = PAYMENT_METHODS[paymentMethod];
  const percentageFee = amount * method.fee;
  const totalFee = percentageFee + method.fixedFee;
  
  return {
    fee: Math.round(totalFee * 100) / 100, // Round to 2 decimal places
    total: amount + totalFee,
    net: amount - totalFee,
  };
};
