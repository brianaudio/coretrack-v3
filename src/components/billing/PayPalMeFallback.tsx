import React, { useState } from 'react';
import paypalConfig from '@/lib/paypal/config';

interface PayPalMeFallbackProps {
  planId: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  onSuccess?: () => void;
}

const PayPalMeFallback: React.FC<PayPalMeFallbackProps> = ({
  planId,
  billingCycle,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const plan = paypalConfig.subscriptionPlans[planId];
  const basePrice = plan.price;
  const finalPrice = billingCycle === 'annual' 
    ? Math.floor(basePrice * 12 * (1 - paypalConfig.annualDiscount))
    : basePrice;

  const generatePayPalMeUrl = () => {
    const amount = finalPrice;
    const currency = 'PHP';
    const note = encodeURIComponent(
      `CoreTrack ${plan.name} Plan - ${billingCycle} billing - Please include your email in the message`
    );
    
    return `https://paypal.me/${paypalConfig.paypalMe.username}/${amount}${currency}?note=${note}`;
  };

  const handlePayPalMeClick = () => {
    setIsLoading(true);
    const paypalMeUrl = generatePayPalMeUrl();
    
    // Open PayPal.me in new tab
    window.open(paypalMeUrl, '_blank', 'noopener,noreferrer');
    
    // Show manual verification instructions
    setShowInstructions(true);
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  if (!paypalConfig.paypalMe.enabled) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* PayPal.me Button */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          💸 Alternative Payment Method
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Having trouble with the PayPal button above? Use our direct PayPal.me link
        </p>
        
        <button
          onClick={handlePayPalMeClick}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Opening PayPal.me...</span>
            </>
          ) : (
            <>
              <span>💳</span>
              <span>Pay {formatPrice(finalPrice)} via PayPal.me</span>
            </>
          )}
        </button>
      </div>

      {/* Manual Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Instructions
              </h3>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 mb-1">Amount to Pay:</p>
                <p className="text-xl font-bold text-blue-600">{formatPrice(finalPrice)}</p>
              </div>

              <div className="space-y-2">
                <p><strong>1.</strong> Complete your payment on the PayPal page that opened</p>
                <p><strong>2.</strong> Include your email address in the payment message</p>
                <p><strong>3.</strong> We'll activate your account within 24 hours</p>
                <p><strong>4.</strong> You'll receive a confirmation email once activated</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-yellow-800 text-xs">
                  <strong>Important:</strong> Make sure to include your registered email in the payment message 
                  so we can match your payment to your account.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowInstructions(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowInstructions(false);
                  onSuccess?.();
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Payment Sent ✓
              </button>
            </div>

            {/* WhatsApp Support */}
            <div className="mt-4 pt-3 border-t text-center">
              <p className="text-xs text-gray-500 mb-2">Need help?</p>
              <a
                href="https://wa.me/639123456789?text=Hi!%20I%20need%20help%20with%20my%20CoreTrack%20payment"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                <span>💬</span>
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalMeFallback;
