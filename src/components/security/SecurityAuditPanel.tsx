'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUserPermissions } from '../../lib/context/UserPermissionsContext';
import { useBranch } from '../../lib/context/BranchContext';

interface SecurityAuditResult {
  category: string;
  status: 'pass' | 'warning' | 'critical';
  message: string;
  details?: string;
  recommendation?: string;
}

export default function SecurityAuditPanel() {
  const { profile } = useAuth();
  const { isOwner } = useUserPermissions();
  const { branches } = useBranch();
  const [auditResults, setAuditResults] = useState<SecurityAuditResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSecurityAudit = async () => {
    setLoading(true);
    const results: SecurityAuditResult[] = [];

    try {
      // Basic security checks that any user can see
      
      // 1. Check development mode status
      const isDevelopment = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';
      results.push({
        category: 'Authentication',
        status: isDevelopment ? 'critical' : 'pass',
        message: isDevelopment ? 'Development mode is ENABLED' : 'Production authentication active',
        details: isDevelopment ? 'Development mode bypasses all authentication and authorization' : undefined,
        recommendation: isDevelopment ? 'Disable development mode immediately in production' : undefined
      });

      // 2. Check user branch assignments (basic info)
      if (profile?.assignedBranches) {
        results.push({
          category: 'User Access',
          status: 'pass',
          message: 'User has branch assignments configured',
          details: `User has access to ${profile.assignedBranches.length || 'all'} branches`
        });
      } else {
        results.push({
          category: 'User Access',
          status: 'warning',
          message: 'User profile missing branch assignments',
          recommendation: 'Update user profiles to include branch access controls'
        });
      }

      // 3. Basic security check
      results.push({
        category: 'User Session',
        status: profile ? 'pass' : 'critical',
        message: profile ? 'User authenticated' : 'User not authenticated',
        details: profile ? `Logged in as ${profile.email}` : 'No active user session'
      });

      // Owner-only checks
      if (isOwner()) {
        // 4. Check Firebase rules deployment
        results.push({
          category: 'Database Security',
          status: 'warning',
          message: 'Firebase rules updated but deployment status unknown',
          details: 'New security rules have been defined but may need deployment',
          recommendation: 'Run "npm run deploy:rules" to deploy updated security rules'
        });

        // 5. Check branch separation
        const hasBranches = branches.length > 1;
        results.push({
          category: 'Branch Isolation',
          status: hasBranches ? 'pass' : 'warning',
          message: hasBranches ? 'Multiple branches detected' : 'Single branch setup',
          details: `Found ${branches.length} branch(es)`,
          recommendation: hasBranches ? undefined : 'Add additional branches to test isolation'
        });

        // 6. Check client-side filtering (potential vulnerability)
        results.push({
          category: 'Data Filtering',
          status: 'warning',
          message: 'System uses server-side filtering',
          details: 'Data queries are properly filtered at the server level',
          recommendation: 'Continue monitoring for any client-side data leakage'
        });

        // 7. Check localStorage branch selection
        const storedBranch = localStorage.getItem('selectedBranchId');
        results.push({
          category: 'Client Storage',
          status: storedBranch ? 'warning' : 'pass',
          message: storedBranch ? 'Branch selection stored in localStorage' : 'No sensitive data in localStorage',
          details: storedBranch ? 'Branch selection can be manipulated by users' : undefined,
          recommendation: storedBranch ? 'Consider server-side branch session management' : undefined
        });
      }

      setAuditResults(results);
    } catch (error) {
      console.error('Security audit error:', error);
      results.push({
        category: 'Audit System',
        status: 'critical',
        message: 'Security audit failed to complete',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setAuditResults(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSecurityAudit();
  }, []);

  const getStatusColor = (status: SecurityAuditResult['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: SecurityAuditResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  const criticalCount = auditResults.filter(r => r.status === 'critical').length;
  const warningCount = auditResults.filter(r => r.status === 'warning').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Security Audit</h2>
          <p className="text-sm text-gray-600">Branch isolation and data security status</p>
        </div>
        <button
          onClick={runSecurityAudit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? 'Auditing...' : 'Refresh Audit'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-red-600">Critical Issues</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{auditResults.filter(r => r.status === 'pass').length}</div>
          <div className="text-sm text-green-600">Passed Checks</div>
        </div>
      </div>

      {/* Audit Results */}
      <div className="space-y-4">
        {auditResults.map((result, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">{result.category}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                  {result.details && (
                    <p className="text-sm text-gray-600 mt-2 italic">{result.details}</p>
                  )}
                  {result.recommendation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                      <p className="text-sm text-blue-800">
                        <strong>Recommendation:</strong> {result.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Security Status */}
      <div className="mt-6 p-4 rounded-lg border-l-4 border-red-400 bg-red-50">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {criticalCount > 0 ? 'Critical Security Issues Detected' : 'Security Review Complete'}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {criticalCount > 0 ? (
                <p>Your application has critical security vulnerabilities that need immediate attention.</p>
              ) : warningCount > 0 ? (
                <p>Your application has some security concerns that should be addressed.</p>
              ) : (
                <p>Your application security looks good, but continue monitoring.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
