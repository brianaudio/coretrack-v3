import React, { useState, useEffect } from 'react';
import { useUser } from '../../lib/rbac/UserContext';
import { sessionManager } from '../../lib/auth/sessionManager';

const SecurityAudit: React.FC = () => {
  const { currentUser, currentRole } = useUser();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const activeSession = sessionManager.getActiveSession();
      if (activeSession) {
        setSessionInfo(activeSession);
        const timeInfo = sessionManager.getRemainingTime(activeSession.sessionId);
        setRemainingTime(timeInfo);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getSecurityLevel = (role: string): { level: string; color: string; icon: string } => {
    switch (role) {
      case 'owner':
        return { level: 'Maximum', color: 'text-red-600', icon: '🔴' };
      case 'manager':
        return { level: 'High', color: 'text-orange-600', icon: '🟡' };
      case 'staff':
        return { level: 'Standard', color: 'text-green-600', icon: '🟢' };
      default:
        return { level: 'Unknown', color: 'text-gray-600', icon: '⚪' };
    }
  };

  if (!sessionInfo) return null;

  const security = getSecurityLevel(currentRole || 'staff');

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
        title="Security Audit"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </button>

      {isVisible && (
        <div className="absolute bottom-14 left-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[400px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              🛡️ Security Audit
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* User Info */}
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold text-gray-700 mb-2">Current Session</h4>
              <div className="space-y-1">
                <p><span className="font-medium">User:</span> {currentUser?.email}</p>
                <p className="flex items-center">
                  <span className="font-medium">Role:</span> 
                  <span className={`ml-1 capitalize ${security.color}`}>
                    {security.icon} {currentRole} ({security.level})
                  </span>
                </p>
                <p><span className="font-medium">Session ID:</span> {sessionInfo.sessionId.slice(-8)}</p>
              </div>
            </div>

            {/* Time Info */}
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-semibold text-gray-700 mb-2">Session Timing</h4>
              <div className="space-y-1">
                <p><span className="font-medium">Login Time:</span> {formatTimestamp(sessionInfo.loginTime)}</p>
                <p><span className="font-medium">Last Activity:</span> {formatTimestamp(sessionInfo.lastActivity)}</p>
                {remainingTime && (
                  <>
                    <p><span className="font-medium">Session Expires:</span> {formatTime(remainingTime.sessionTime)}</p>
                    <p><span className="font-medium">Activity Timeout:</span> {formatTime(remainingTime.activityTime)}</p>
                  </>
                )}
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-semibold text-gray-700 mb-2">Security Features</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="flex items-center">✅ Role-based Access</span>
                <span className="flex items-center">✅ Session Timeout</span>
                <span className="flex items-center">✅ Activity Monitoring</span>
                <span className="flex items-center">✅ Secure Logout</span>
              </div>
            </div>

            {/* Warning if session expiring soon */}
            {remainingTime && remainingTime.activityTime < 5 * 60 * 1000 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-yellow-800 font-medium">⚠️ Session expiring soon!</p>
                <p className="text-yellow-700">Activity timeout in {formatTime(remainingTime.activityTime)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAudit;
