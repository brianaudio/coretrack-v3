'use client';

import React from 'react';
import { useSubscription } from '../lib/context/SubscriptionContext';
import { getTrialStatus, getTrialWarningMessage, getTrialCTAText, getTrialNotificationStyle, shouldShowTrialNotification } from '../lib/utils/trialUtils';

interface TrialStatusBannerProps {
  className?: string;
}

export default function TrialStatusBanner({ className = '' }: TrialStatusBannerProps) {
  const { subscription, isTrial, trialDaysRemaining, isActive } = useSubscription();

  if (!subscription || !isTrial) return null;

  const trialEndDate = subscription.trialEndDate?.toDate() || null;
  const trialStatus = getTrialStatus(trialEndDate, subscription.status);

  if (!shouldShowTrialNotification(trialStatus)) return null;

  const message = getTrialWarningMessage(trialStatus);
  const ctaText = getTrialCTAText(trialStatus);
  const styles = getTrialNotificationStyle(trialStatus);

  const handleUpgradeClick = () => {
    window.location.href = '/subscription';
  };

  return (
    <div className={`${styles.bgColor} ${styles.borderColor} border-b px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {trialStatus.warningLevel === 'expired' || trialStatus.warningLevel === 'critical' ? (
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className={`text-sm font-medium ${styles.textColor}`}>
              {message}
            </p>
            
            {/* Additional info for expired trials */}
            {trialStatus.warningLevel === 'expired' && (
              <p className={`text-xs mt-1 ${styles.textColor} opacity-75`}>
                After trial expiration: View-only access • No new orders • Data export available for 30 days
              </p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={handleUpgradeClick}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              trialStatus.warningLevel === 'expired' || trialStatus.warningLevel === 'critical'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : trialStatus.warningLevel === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
