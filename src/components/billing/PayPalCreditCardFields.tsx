'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadScript } from '@paypal/paypal-js';
import paypalConfig from '@/lib/paypal/config';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/types/subscription';

interface PayPalCreditCardFieldsProps {
  planId: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
}

export default function PayPalCreditCardFields({
  planId,
  onSuccess,
  onError,
  onCancel
}: PayPalCreditCardFieldsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const paypalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
  const paypalPlanId = paypalConfig.subscriptionPlans[planId as keyof typeof paypalConfig.subscriptionPlans];

  useEffect(() => {
    let isMounted = true;

    const initializePayPal = async () => {
      try {
        setIsLoading(true);
        
        const paypal = await loadScript({
          clientId: paypalConfig.clientId,
          currency: 'PHP',
          intent: 'subscription',
          vault: true,
          components: 'buttons'
        });
        
        if (!paypal || !paypal.Buttons) {
          throw new Error('PayPal SDK failed to load');
        }

        if (!isMounted) return;

        // Initialize PayPal Buttons with subscription support
        const buttonsComponent = paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'subscribe',
            height: 50
          },
          
          createSubscription: async (data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: paypalPlanId,
              application_context: {
                brand_name: 'CoreTrack',
                locale: 'en-PH',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                return_url: `${window.location.origin}/dashboard/settings?tab=billing&success=true`,
                cancel_url: `${window.location.origin}/dashboard/settings?tab=billing&cancelled=true`
              }
            });
          },

          onApprove: async (data: any, actions: any) => {
            try {
              setIsProcessing(true);
              
              // Complete the subscription approval
              const response = await fetch('/api/paypal/complete-subscription', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  subscriptionId: data.subscriptionID,
                  orderID: data.orderID
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to complete subscription');
              }

              const result = await response.json();
              onSuccess(result.subscriptionId);
              
            } catch (err: any) {
              console.error('Subscription completion error:', err);
              onError(err);
            } finally {
              setIsProcessing(false);
            }
          },

          onError: (err: any) => {
            console.error('PayPal error:', err);
            onError(err);
            setIsProcessing(false);
          },

          onCancel: (data: any) => {
            console.log('PayPal subscription cancelled:', data);
            onCancel?.();
            setIsProcessing(false);
          }
        });

        // Render the PayPal button
        if (containerRef.current) {
          await buttonsComponent.render('#paypal-button-container');
          paypalRef.current = buttonsComponent;
          setIsLoading(false);
        } else {
          throw new Error('Container not available');
        }

      } catch (err: any) {
        console.error('PayPal initialization error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize payment form');
          setIsLoading(false);
        }
      }
    };

    initializePayPal();

    return () => {
      isMounted = false;
      if (paypalRef.current) {
        try {
          paypalRef.current.close?.();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [planId, paypalPlanId, onSuccess, onError, onCancel]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs">!</span>
          </div>
          <div>
            <h3 className="text-red-800 font-medium">Payment Error</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Plan Summary */}
      {selectedPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 font-semibold text-lg">{selectedPlan.name}</h3>
          <p className="text-blue-700 text-2xl font-bold">
            ₱{selectedPlan.monthlyPrice.toLocaleString()}/month
          </p>
          <div className="text-blue-600 text-sm mt-1">
            <div className="flex items-center space-x-2">
              <span>✓ {selectedPlan.limits.maxLocations} Location{selectedPlan.limits.maxLocations > 1 ? 's' : ''}</span>
              <span>✓ {selectedPlan.limits.maxUsers} User{selectedPlan.limits.maxUsers > 1 ? 's' : ''}</span>
              <span>✓ {selectedPlan.limits.maxOrders.toLocaleString()} Orders/Month</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      )}

      {/* PayPal Payment Options */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {/* Payment Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-900 font-medium text-sm">Secure Payment Options</h3>
            <p className="text-blue-700 text-sm mt-1">
              Pay with your PayPal account or any major credit/debit card (Visa, Mastercard, JCB). 
              All payments are processed securely by PayPal.
            </p>
          </div>

          {/* PayPal Button Container */}
          <div id="paypal-button-container" className="min-h-[60px]"></div>

          {/* Processing State Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-900 font-medium">Processing your subscription...</span>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 text-sm font-medium">Secure Payment</p>
                <p className="text-green-600 text-xs mt-1">
                  Your payment information is processed securely by PayPal. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Accepted Cards */}
          <div className="flex items-center justify-center space-x-4 pt-2">
            <span className="text-xs text-gray-500">We accept:</span>
            <div className="flex items-center space-x-2">
              <div className="text-xs bg-blue-600 text-white px-2 py-1 rounded">VISA</div>
              <div className="text-xs bg-red-600 text-white px-2 py-1 rounded">MASTERCARD</div>
              <div className="text-xs bg-green-600 text-white px-2 py-1 rounded">JCB</div>
              <div className="text-xs bg-blue-800 text-white px-2 py-1 rounded">PAYPAL</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
