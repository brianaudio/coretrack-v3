'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../lib/context/SubscriptionContext';
import { useRouter } from 'next/navigation';

interface TrialBannerProps {
  className?: string;
}

const TrialExpirationBanner: React.FC<TrialBannerProps> = ({ className = '' }) => {
  const { subscription, isTrial, trialDaysRemaining, isActive } = useSubscription();
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if not in trial, already active, or dismissed
  if (!isTrial || isActive || isDismissed) {
    return null;
  }

  const getUrgencyLevel = () => {
    if (trialDaysRemaining <= 0) return 'expired';
    if (trialDaysRemaining <= 1) return 'critical';
    if (trialDaysRemaining <= 3) return 'urgent';
    if (trialDaysRemaining <= 7) return 'warning';
    return 'info';
  };

  const urgencyLevel = getUrgencyLevel();

  const getBannerConfig = () => {
    switch (urgencyLevel) {
      case 'expired':
        return {
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          icon: '⚠️',
          title: 'Trial Expired',
          message: 'Your trial has ended. Upgrade now to continue using CoreTrack.',
          buttonText: 'Upgrade Now',
          buttonColor: 'bg-white text-red-600 hover:bg-red-50',
          pulsing: true
        };
      case 'critical':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: '🔥',
          title: 'Last Day!',
          message: `Your trial expires ${trialDaysRemaining === 0 ? 'today' : 'tomorrow'}. Don't lose your data!`,
          buttonText: 'Save My Business',
          buttonColor: 'bg-white text-red-500 hover:bg-red-50',
          pulsing: true
        };
      case 'urgent':
        return {
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          icon: '⏰',
          title: 'Only 3 Days Left!',
          message: `Your trial expires in ${trialDaysRemaining} days. Upgrade to keep your progress.`,
          buttonText: 'Upgrade & Save',
          buttonColor: 'bg-white text-orange-500 hover:bg-orange-50',
          pulsing: true
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          icon: '📅',
          title: 'Trial Ending Soon',
          message: `${trialDaysRemaining} days left in your free trial. Upgrade to unlock all features.`,
          buttonText: 'View Plans',
          buttonColor: 'bg-white text-yellow-600 hover:bg-yellow-50',
          pulsing: false
        };
      default:
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: '✨',
          title: 'Free Trial Active',
          message: `${trialDaysRemaining} days left to explore all features. See our plans when ready.`,
          buttonText: 'View Plans',
          buttonColor: 'bg-white text-blue-500 hover:bg-blue-50',
          pulsing: false
        };
    }
  };

  const config = getBannerConfig();

  const handleUpgradeClick = () => {
    router.push('/subscription');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className={`${config.bgColor} ${config.textColor} shadow-lg ${config.pulsing ? 'animate-pulse' : ''} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{config.icon}</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm sm:text-base">{config.title}</h3>
                <span className="hidden sm:inline text-sm opacity-90">•</span>
                <p className="text-sm opacity-90 hidden sm:block">{config.message}</p>
              </div>
              {/* Mobile message */}
              <p className="text-xs sm:hidden mt-1 opacity-90">{config.message}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleUpgradeClick}
              className={`${config.buttonColor} px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-200 whitespace-nowrap shadow-sm`}
            >
              {config.buttonText}
            </button>
            
            {urgencyLevel === 'info' && (
              <button
                onClick={handleDismiss}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors duration-200"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpirationBanner;
