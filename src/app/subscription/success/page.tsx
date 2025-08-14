'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/context/AuthContext';

const PayPalSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      const subscriptionId = searchParams.get('subscription_id');
      const token = searchParams.get('token');
      
      if (!subscriptionId || !token) {
        setError('Invalid payment confirmation parameters');
        setIsProcessing(false);
        return;
      }

      try {
        // Here you would typically call your backend to activate the subscription
        // For now, we'll just redirect to the dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (error: any) {
        console.error('Payment processing error:', error);
        setError(error.message || 'Failed to process payment');
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [searchParams, router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full"></div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Processing Your Payment</h1>
          <p className="text-gray-600">
            We're confirming your PayPal subscription. This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/subscription')}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your CoreTrack subscription has been activated. You'll be redirected to your dashboard shortly.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors duration-200"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default function PayPalSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <PayPalSuccessContent />
    </Suspense>
  );
}
