'use client';

import React from 'react';
import { useAuth } from '../../../lib/context/AuthContext';
import { useSubscription } from '../../../lib/context/SubscriptionContext';
import { SUBSCRIPTION_PLANS } from '../../../lib/types/subscription';

export default function CanceledSubscriptionPage() {
  const { user, tenant } = useAuth();
  const { subscription } = useSubscription();

  const handleReactivateSubscription = () => {
    window.location.href = '/subscription';
  };

  const handleExportData = () => {
    // In real app, this would trigger a data export
    alert('Data export feature would be implemented here. You can export your data within 30 days of cancellation.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Subscription Canceled
            </h2>
            <p className="text-gray-600 mb-8">
              Your CoreTrack subscription has been canceled. You have limited access to your data.
            </p>
          </div>

          {/* Current Status */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Limited Access Mode
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>View-only access to existing data</li>
                    <li>No new orders or inventory updates</li>
                    <li>Export data available for 30 days</li>
                    <li>Reactivate anytime to restore full access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Available Actions */}
          <div className="space-y-4">
            {/* Reactivate Subscription */}
            <button
              onClick={handleReactivateSubscription}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reactivate Subscription
            </button>

            {/* Export Data */}
            <button
              onClick={handleExportData}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Export My Data
            </button>

            {/* Contact Support */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need help?{' '}
                <a 
                  href="mailto:support@coretrack.com" 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {/* Data Retention Notice */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Data Retention Policy</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Your data will be retained for 90 days after cancellation. 
                After this period, all data will be permanently deleted unless you reactivate your subscription.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Changed your mind?{' '}
          <button
            onClick={handleReactivateSubscription}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Reactivate your subscription
          </button>
          {' '}and restore full access immediately.
        </p>
      </div>
    </div>
  );
}
