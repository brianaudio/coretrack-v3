'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSubscription } from '../../lib/context/SubscriptionContext';

const PaymentSuccessContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'processing'>('processing');

  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');

    console.log('Payment callback received:', { status, paymentId });

    if (status === 'success') {
      setPaymentStatus('success');
      // Refresh subscription data to get updated status
      refreshSubscription();
    } else if (status === 'failed') {
      setPaymentStatus('failed');
    }

    setIsLoading(false);

    // Auto redirect after 5 seconds for successful payments
    if (status === 'success') {
      setTimeout(() => {
        router.push('/dashboard');
      }, 5000);
    }
  }, [searchParams, refreshSubscription, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful! 🎉</h1>
            <p className="text-gray-600 mb-8">
              Your subscription has been activated successfully. You now have full access to all CoreTrack features.
            </p>

            {/* Features Unlocked */}
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✨ Features Unlocked</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Full inventory management</li>
                <li>• Advanced POS system</li>
                <li>• Multi-location support</li>
                <li>• Detailed analytics</li>
                <li>• Premium support</li>
              </ul>
            </div>

            {/* Auto-redirect notice */}
            <div className="text-sm text-gray-500 mb-6">
              Redirecting to dashboard in 5 seconds...
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/settings/subscription')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                View Subscription Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Failed</h1>
            <p className="text-gray-600 mb-8">
              We couldn't process your payment. Please try again or contact our support team for assistance.
            </p>

            {/* Common Issues */}
            <div className="bg-yellow-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2">💡 Common Issues</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Insufficient balance in your account</li>
                <li>• Incorrect card details</li>
                <li>• Network connection issues</li>
                <li>• Bank security restrictions</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/support')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const PaymentSuccessPage: React.FC = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
};

export default PaymentSuccessPage;
