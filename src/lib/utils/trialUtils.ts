/**
 * Trial Expiration Utilities
 * Handles trial expiration logic and notifications
 */

export interface TrialStatus {
  isExpired: boolean;
  isExpiringSoon: boolean; // 7 days or less
  isCritical: boolean; // 3 days or less
  daysRemaining: number;
  expirationDate: Date | null;
  warningLevel: 'none' | 'notice' | 'warning' | 'critical' | 'expired';
}

export const getTrialStatus = (
  trialEndDate: Date | null, 
  status: string
): TrialStatus => {
  if (!trialEndDate || status !== 'trial') {
    return {
      isExpired: false,
      isExpiringSoon: false,
      isCritical: false,
      daysRemaining: 0,
      expirationDate: null,
      warningLevel: 'none'
    };
  }

  const now = new Date();
  const timeDiff = trialEndDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isCritical = daysRemaining <= 3 && daysRemaining > 0;

  let warningLevel: TrialStatus['warningLevel'] = 'none';
  
  if (isExpired) {
    warningLevel = 'expired';
  } else if (isCritical) {
    warningLevel = 'critical';
  } else if (daysRemaining <= 5) {
    warningLevel = 'warning';
  } else if (isExpiringSoon) {
    warningLevel = 'notice';
  }

  return {
    isExpired,
    isExpiringSoon,
    isCritical,
    daysRemaining: Math.max(0, daysRemaining),
    expirationDate: trialEndDate,
    warningLevel
  };
};

export const getTrialWarningMessage = (trialStatus: TrialStatus): string => {
  const { daysRemaining, warningLevel } = trialStatus;
  
  switch (warningLevel) {
    case 'expired':
      return 'Your trial has expired. Upgrade now to continue using CoreTrack.';
    case 'critical':
      return `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}! Upgrade now to avoid interruption.`;
    case 'warning':
      return `Your trial expires in ${daysRemaining} days. Upgrade to continue with all features.`;
    case 'notice':
      return `Your trial expires in ${daysRemaining} days. Consider upgrading to unlock all features.`;
    default:
      return '';
  }
};

export const shouldShowTrialNotification = (trialStatus: TrialStatus): boolean => {
  return trialStatus.warningLevel !== 'none';
};

export const getTrialCTAText = (trialStatus: TrialStatus): string => {
  switch (trialStatus.warningLevel) {
    case 'expired':
      return 'Upgrade Now';
    case 'critical':
      return 'Upgrade Now';
    case 'warning':
      return 'View Plans';
    case 'notice':
      return 'Explore Plans';
    default:
      return 'Upgrade';
  }
};

export const getTrialNotificationStyle = (trialStatus: TrialStatus): {
  bgColor: string;
  textColor: string;
  borderColor: string;
} => {
  switch (trialStatus.warningLevel) {
    case 'expired':
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      };
    case 'critical':
      return {
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      };
    case 'warning':
      return {
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      };
    case 'notice':
      return {
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      };
    default:
      return {
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200'
      };
  }
};

// Trial Extension Options (for customer success)
export interface TrialExtensionOption {
  id: string;
  name: string;
  days: number;
  requiresApproval: boolean;
  oneTimeOnly: boolean;
  reason: string;
}

export const getTrialExtensionOptions = (): TrialExtensionOption[] => [
  {
    id: 'grace_period',
    name: '7-Day Grace Period',
    days: 7,
    requiresApproval: false,
    oneTimeOnly: true,
    reason: 'One-time extension to complete setup'
  },
  {
    id: 'setup_assistance',
    name: '14-Day Setup Extension',
    days: 14,
    requiresApproval: true,
    oneTimeOnly: true,
    reason: 'Additional time for onboarding assistance'
  },
  {
    id: 'migration_help',
    name: '21-Day Migration Extension',
    days: 21,
    requiresApproval: true,
    oneTimeOnly: true,
    reason: 'Data migration from previous system'
  }
];

// Analytics Events for Trial Management
export const trackTrialEvent = (event: string, data?: any) => {
  // In a real app, this would integrate with analytics
  console.log(`Trial Event: ${event}`, data);
  
  // Example events:
  // - trial_warning_shown
  // - trial_expired
  // - trial_extended
  // - upgrade_clicked_from_trial
  // - subscription_activated_from_trial
};
