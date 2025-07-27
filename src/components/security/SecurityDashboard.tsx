import React, { useState, useEffect } from 'react';
import { securityManager } from '../../lib/auth/securityManager';
import { useUser } from '../../lib/rbac/UserContext';

const SecurityDashboard: React.FC = () => {
  const { currentRole } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Only show to owners and managers
  const canViewSecurity = currentRole === 'owner' || currentRole === 'manager';

  useEffect(() => {
    if (canViewSecurity && isVisible) {
      const interval = setInterval(() => {
        const data = securityManager.getSecurityDashboard();
        setDashboardData(data);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canViewSecurity, isVisible]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const clearSecurityData = () => {
    if (confirm('Are you sure you want to clear all security data? This action cannot be undone.')) {
      securityManager.clearSecurityData();
      const data = securityManager.getSecurityDashboard();
      setDashboardData(data);
    }
  };

  if (!canViewSecurity) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg"
        title="Security Dashboard (Owner/Manager Only)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </button>

      {isVisible && (
        <div className="absolute top-14 right-0 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-[400px] max-w-[500px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              🔒 Security Dashboard
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                {currentRole.toUpperCase()}
              </span>
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {dashboardData && (
            <div className="space-y-3 text-xs">
              {/* Security Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 p-3 rounded text-center">
                  <p className="font-bold text-blue-800 text-lg">{dashboardData.totalAttempts}</p>
                  <p className="text-blue-600">Total Logins</p>
                </div>
                <div className="bg-red-50 p-3 rounded text-center">
                  <p className="font-bold text-red-800 text-lg">{dashboardData.failedAttempts}</p>
                  <p className="text-red-600">Failed Attempts</p>
                </div>
                <div className="bg-orange-50 p-3 rounded text-center">
                  <p className="font-bold text-orange-800 text-lg">{dashboardData.lockedAccounts}</p>
                  <p className="text-orange-600">Locked Accounts</p>
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-semibold text-gray-700 mb-2">Recent Login Events</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {dashboardData.recentEvents.length > 0 ? (
                    dashboardData.recentEvents.map((event: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded text-xs ${
                          event.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <span className="font-medium">{event.email}</span>
                        <span className="flex items-center space-x-2">
                          <span>{formatTime(event.timestamp)}</span>
                          <span>{event.success ? '✅' : '❌'}</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-2">No recent events</p>
                  )}
                </div>
              </div>

              {/* Security Features */}
              <div className="bg-green-50 p-3 rounded">
                <h4 className="font-semibold text-gray-700 mb-2">Active Security Features</h4>
                <div className="grid grid-cols-2 gap-1">
                  <span className="flex items-center text-green-700">✅ Login Attempt Tracking</span>
                  <span className="flex items-center text-green-700">✅ Account Lockout Protection</span>
                  <span className="flex items-center text-green-700">✅ Session Management</span>
                  <span className="flex items-center text-green-700">✅ Role-Based Access Control</span>
                  <span className="flex items-center text-green-700">✅ Security Event Logging</span>
                  <span className="flex items-center text-green-700">✅ Credential Validation</span>
                </div>
              </div>

              {/* Admin Controls */}
              {currentRole === 'owner' && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <h4 className="font-semibold text-yellow-800 mb-2">👑 Owner Controls</h4>
                  <button
                    onClick={clearSecurityData}
                    className="w-full bg-yellow-600 text-white py-1 px-3 rounded text-xs hover:bg-yellow-700 transition-colors"
                  >
                    Clear All Security Data
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
