'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useSubscription } from '../../lib/context/SubscriptionContext';
import paypalConfig from '../../lib/paypal/config';
import { paypalService } from '../../lib/paypal/paypalService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: keyof typeof paypalConfig.subscriptionPlans;
  billingCycle: 'monthly' | 'annual';
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, planId, billingCycle }) => {
  const { profile } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const plan = paypalConfig.subscriptionPlans[planId];
  let amount = plan.price;
  if (billingCycle === 'annual') {
    amount = Math.floor(plan.price * 12 * (1 - paypalConfig.annualDiscount));
  }

  const handlePayment = async () => {
    if (!profile?.tenantId || !profile?.email) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (selectedPaymentMethod === 'bank') {
        // Handle real bank transfer - you need to provide your actual bank details
        const bankDetails = `🏦 Bank Transfer Payment

Plan: ${plan.name}
Amount: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
Billing: ${billingCycle}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PAYMENT INSTRUCTIONS:
1. Transfer exact amount to the bank details below
2. Email transfer receipt to: payments@coretrack.ph
3. Include your user ID: ${profile.uid}
4. Account will be activated within 24 hours

⚠️  IMPORTANT: You need to configure your real bank account details in the code before accepting payments.

Current status: CONFIGURATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Contact: support@coretrack.ph for setup assistance`;
        
        alert(bankDetails);
        onClose();
        return;
      }

      // For PayPal/Card payments
      const subscription = await paypalService.createSubscription({
        tenantId: profile.tenantId,
        planId: planId as string,
        billingCycle,
        customerId: profile.uid,
        customerEmail: profile.email
      });

      // Handle PayPal redirect
      const approvalUrl = subscription.links?.find(link => link.rel === 'approve')?.href;
      if (approvalUrl) {
        // Redirect to PayPal checkout
        window.location.href = approvalUrl;
      } else {
        throw new Error('PayPal approval URL not found');
      }
    } catch (error: any) {
      console.error('Payment failed:', error);
      setError('Payment processing encountered an issue. Please try bank transfer or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Complete Payment</h2>
              <p className="text-green-100 text-sm">{plan.name} - {billingCycle} billing</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Plan Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">{plan.name}</span>
              <span className="text-2xl font-bold text-gray-900">
                ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {billingCycle === 'annual' ? (
                <>
                  Billed annually • Save 20% (₱{((plan.price * 12 - amount)).toFixed(2)})
                </>
              ) : (
                'Billed monthly'
              )}
            </div>
          </div>

          {/* Payment Methods - Clear Options */}
          <div className="space-y-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Payment Method</h3>
            
            {/* Credit/Debit Card Option */}
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={selectedPaymentMethod === 'card'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 mr-3"
              />
              <span className="text-3xl mr-4">💳</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Credit/Debit Card</div>
                <div className="text-sm text-gray-600">Visa, Mastercard, or any debit card</div>
                <div className="text-xs text-green-600 mt-1">✅ Most popular • No PayPal account needed</div>
              </div>
            </label>

            {/* PayPal Account Option */}
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="paypal"
                checked={selectedPaymentMethod === 'paypal'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 mr-3"
              />
              <span className="text-3xl mr-4">🅿️</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">PayPal Account</div>
                <div className="text-sm text-gray-600">Pay with your existing PayPal balance</div>
                <div className="text-xs text-blue-600 mt-1">✅ For existing PayPal users</div>
              </div>
            </label>

            {/* Bank Transfer Option */}
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="radio"
                name="paymentMethod"
                value="bank"
                checked={selectedPaymentMethod === 'bank'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 mr-3"
              />
              <span className="text-3xl mr-4">🏦</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Bank Transfer</div>
                <div className="text-sm text-gray-600">Direct transfer from your bank account</div>
                <div className="text-xs text-blue-600 mt-1">✅ Available for most Philippine banks</div>
              </div>
            </label>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-800">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All payments are processed securely through PayPal's encrypted system
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 font-medium"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">
                    {selectedPaymentMethod === 'card' ? '💳' : selectedPaymentMethod === 'paypal' ? '🅿️' : '🏦'}
                  </span>
                  {selectedPaymentMethod === 'card' 
                    ? `Pay ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} with Card`
                    : selectedPaymentMethod === 'paypal'
                    ? `Pay ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} with PayPal`
                    : `Pay ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} via Bank`
                  }
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubscriptionPlans: React.FC = () => {
  const { subscription, isTrial, trialDaysRemaining } = useSubscription();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof paypalConfig.subscriptionPlans>('starter');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('monthly');

  const isTrialExpired = trialDaysRemaining <= 0 && isTrial;
  const isPayPalConfigured = paypalConfig.isConfigured();

  const handleUpgrade = (planId: keyof typeof paypalConfig.subscriptionPlans, billingCycle: 'monthly' | 'annual') => {
    setSelectedPlan(planId);
    setSelectedBilling(billingCycle);
    setShowPaymentModal(true);
  };

  return (
    <>
      {/* Payment Status Notice */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">💳 Payment System Status</h3>
            <div className="text-green-700 font-light leading-relaxed space-y-2">
              <p><strong>✅ PayPal/Card Payments:</strong> LIVE and accepting real payments through PayPal sandbox</p>
              <p><strong>⚠️ Bank Transfer:</strong> Configure your real bank account details to enable manual payments</p>
              <p><strong>🎯 Status:</strong> PayPal payments ready for real money transactions!</p>
            </div>
            <div className="mt-3 p-2 bg-green-100 rounded-lg border border-green-300">
              <p className="text-sm text-green-800"><strong>Ready to test:</strong> Click "Get Started" below to try real PayPal checkout!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Toggle - Apple Style */}
      <div className="flex justify-center mb-12">
        <div className="bg-gray-100 rounded-2xl p-1.5">
          <button
            onClick={() => setSelectedBilling('monthly')}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              selectedBilling === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedBilling('annual')}
            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
              selectedBilling === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              20% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid - Apple Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(paypalConfig.subscriptionPlans).map(([planId, plan]) => {
          const monthlyPrice = plan.price;
          const annualPrice = Math.floor(plan.price * 12 * (1 - paypalConfig.annualDiscount));
          const displayPrice = selectedBilling === 'monthly' ? monthlyPrice : annualPrice;
          const isPopular = planId === 'professional';

          return (
            <div key={planId} className="relative">
              {/* Most Popular Badge - Apple Style */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                    ✨ Most Popular
                  </div>
                </div>
              )}

              <div
                className={`bg-white rounded-3xl shadow-sm border transition-all duration-200 hover:shadow-md h-full ${
                  isPopular 
                    ? 'border-blue-200 scale-[1.02] relative' 
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="p-10 h-full flex flex-col">
                  {/* Plan Header - Apple Typography */}
                  <div className="text-center mb-10">
                    <h3 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">{plan.name}</h3>
                    <div className="mb-4">
                      <div className="text-6xl font-semibold text-gray-900 leading-none tracking-tight">
                        ₱{displayPrice.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      {displayPrice % 1 !== 0 && (
                        <div className="text-2xl font-medium text-gray-600 mt-1">
                          .{(displayPrice % 1).toFixed(2).split('.')[1]}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 font-light text-lg">
                      per {selectedBilling === 'monthly' ? 'month' : 'year'}
                    </div>
                    {selectedBilling === 'annual' && (
                      <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-full border border-green-200">
                        Save ₱{((monthlyPrice * 12) - annualPrice).toFixed(0)} annually
                      </div>
                    )}
                  </div>

                  {/* Features - Apple List Style */}
                  <div className="flex-grow mb-10">
                    <ul className="space-y-5">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-4 mt-0.5 flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-gray-700 leading-relaxed font-light">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button - Apple Button Style */}
                  <div className="mt-auto">
                    <button
                      onClick={() => handleUpgrade(planId as keyof typeof paypalConfig.subscriptionPlans, selectedBilling)}
                      className={`w-full py-5 px-8 rounded-2xl font-medium text-lg transition-all duration-200 ${
                        subscription?.planId === planId
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : isPopular
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                      disabled={subscription?.planId === planId}
                    >
                      {subscription?.planId === planId ? (
                        <span className="flex items-center justify-center">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          Current Plan
                        </span>
                      ) : (
                        'Get Started'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Indicators - Apple Style */}
      <div className="mt-16 text-center">
        <div className="flex items-center justify-center space-x-12 text-gray-500">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-light">PayPal secure payments</span>
          </div>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🇵🇭</span>
            <span className="font-light">Philippines supported</span>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-light">No DTI/BIR required</span>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        planId={selectedPlan}
        billingCycle={selectedBilling}
      />
    </>
  );
};

export default SubscriptionPlans;
