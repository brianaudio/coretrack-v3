'use client';

import React, { useEffect, useState } from 'react';
import { useSubscription } from '../lib/context/SubscriptionContext';
import { useAuth } from '../lib/context/AuthContext';
import { updateSubscriptionStatus } from '../lib/firebase/subscription';
import TrialStatusBanner from './TrialStatusBanner';
import { getTrialStatus } from '../lib/utils/trialUtils';

interface TrialExpirationHandlerProps {
  children: React.ReactNode;
}

export default function TrialExpirationHandler({ children }: TrialExpirationHandlerProps) {
  const { subscription, isActive, isTrial, trialDaysRemaining, refreshSubscription } = useSubscription();
  const { user, tenant } = useAuth();
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check trial status on mount and subscription changes
  useEffect(() => {
    if (subscription && isTrial) {
      // Show warning modal if trial is expiring soon (5 days or less)
      if (trialDaysRemaining <= 5 && trialDaysRemaining > 0) {
        setShowExpirationModal(true);
      }
      
      // Handle expired trial
      if (trialDaysRemaining <= 0) {
        handleTrialExpired();
      }
    }
  }, [subscription, isTrial, trialDaysRemaining]);

  const handleTrialExpired = async () => {
    if (!tenant?.id) return;
    
    try {
      // Update subscription status to expired
      await updateSubscriptionStatus(tenant.id, 'past_due');
      await refreshSubscription();
      setShowExpirationModal(true);
    } catch (error) {
      console.error('Error handling trial expiration:', error);
    }
  };

  const handleUpgradeClick = () => {
    // Redirect to subscription page
    window.location.href = '/subscription';
  };

  const handleContinueTrial = async () => {
    // For demo purposes - extend trial by 7 days
    if (!tenant?.id) return;
    
    try {
      setIsProcessing(true);
      // In real app, this would require admin approval or be a one-time offer
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 7);
      
      // Update subscription to extend trial
      await updateSubscriptionStatus(tenant.id, 'trial');
      await refreshSubscription();
      
      setShowExpirationModal(false);
      alert('Trial extended by 7 days!');
    } catch (error) {
      console.error('Error extending trial:', error);
      alert('Error extending trial. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!tenant?.id) return;
    
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to all features except basic viewing.')) {
      try {
        setIsProcessing(true);
        await updateSubscriptionStatus(tenant.id, 'canceled');
        await refreshSubscription();
        setShowExpirationModal(false);
        
        // Redirect to limited access page
        window.location.href = '/subscription/canceled';
      } catch (error) {
        console.error('Error canceling subscription:', error);
        alert('Error canceling subscription. Please contact support.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const getModalContent = () => {
    if (trialDaysRemaining <= 0) {
      // Trial expired
      return {
        title: 'Your Trial Has Expired',
        message: 'Your free trial has ended. Choose an option below to continue using CoreTrack.',
        urgency: 'high',
        showExtendOption: false
      };
    } else if (trialDaysRemaining <= 5) {
      // Trial expiring soon
      return {
        title: `Trial Expires in ${trialDaysRemaining} Day${trialDaysRemaining === 1 ? '' : 's'}`,
        message: 'Your free trial is ending soon. Upgrade now to continue enjoying all features without interruption.',
        urgency: 'medium',
        showExtendOption: true
      };
    }
    
    return null;
  };

  const modalContent = getModalContent();

  // Show warning notifications in the app
  const showTrialWarning = isTrial && trialDaysRemaining <= 7 && trialDaysRemaining > 0;

  if (!subscription || !modalContent) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Trial Status Banner */}
      <TrialStatusBanner />

      {/* Main Content */}
      {children}

      {/* Expiration Modal */}
      {showExpirationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                  modalContent.urgency === 'high' 
                    ? 'bg-red-100' 
                    : 'bg-yellow-100'
                }`}>
                  <svg 
                    className={`h-6 w-6 ${
                      modalContent.urgency === 'high' 
                        ? 'text-red-600' 
                        : 'text-yellow-600'
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {modalContent.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {modalContent.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
                {/* Primary Action - Upgrade */}
                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  View Plans & Upgrade
                </button>

                {/* Secondary Action - Extend Trial (if available) */}
                {modalContent.showExtendOption && (
                  <button
                    type="button"
                    onClick={handleContinueTrial}
                    disabled={isProcessing}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Extend Trial (+7 days)'}
                  </button>
                )}

                {/* Tertiary Action - Cancel */}
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Cancel Subscription'}
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Need help? Contact our support team at{' '}
                  <a href="mailto:support@coretrack.com" className="text-blue-600 hover:text-blue-500">
                    support@coretrack.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
