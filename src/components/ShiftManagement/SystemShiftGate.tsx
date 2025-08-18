'use client';

import React, { useState, useEffect } from 'react';
import { useShift } from '@/lib/context/ShiftContext';
import { useBranch } from '@/lib/context/BranchContext';
import { useAuth } from '@/lib/context/AuthContext';

interface SystemShiftGateProps {
  children: React.ReactNode;
}

const SystemShiftGate: React.FC<SystemShiftGateProps> = ({ children }) => {
  const { startNewShift, isShiftActive, loading: shiftLoading } = useShift();
  const { selectedBranch, loading: branchLoading } = useBranch();
  const { user } = useAuth();
  const [startingCash, setStartingCash] = useState<string>('');
  const [isStartingShift, setIsStartingShift] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Wait for both contexts to be ready
  useEffect(() => {
    // Wait for both contexts to finish loading and have necessary data
    if (!branchLoading && !shiftLoading && selectedBranch) {
      setIsInitialized(true);
    }
  }, [branchLoading, shiftLoading, selectedBranch]);

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^\d.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
      parts.splice(2);
    }
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    return parts.join('.');
  };

  const handleStartShift = async () => {
    setIsStartingShift(true);
    try {
      const cashAmount = parseFloat(startingCash) || 0;
      await startNewShift('Daily Shift', cashAmount);
    } catch (error) {
      console.error('Failed to start shift:', error);
    } finally {
      setIsStartingShift(false);
    }
  };

  // Show loading state until everything is initialized
  if (!isInitialized) {
    return (
      <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            {branchLoading ? 'Loading branches...' : shiftLoading ? 'Loading shift status...' : 'Initializing system...'}
          </p>
        </div>
      </div>
    );
  }

  // If shift is active, show the app
  if (isShiftActive) {
    return <>{children}</>;
  }

  // If no shift, show the system-wide lock screen
  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Light Gradient Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 rounded-full blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-violet-50 via-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="h-full w-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6B7280 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-200 rounded-full animate-ping opacity-40" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-purple-200 rounded-full animate-ping opacity-40" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Main Enterprise Card */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Light Glass Card */}
        <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.1)] border border-gray-200/50 overflow-hidden">
          {/* Subtle Card Accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 rounded-3xl"></div>
          
          {/* Content */}
          <div className="relative p-8 text-center">
            {/* Elegant Lock Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Icon Background - Subtle */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl opacity-50"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm border border-gray-200/50">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Clean Branding */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                CoreTrack
              </h1>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2 font-medium tracking-wider uppercase">Enterprise Edition</p>
            </div>

            {/* Status Message */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Business Operations Locked
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Start your shift to access all CoreTrack business management features
              </p>
            </div>

            {/* Clean Cash Input */}
            <div className="mb-8">
              <div className="text-left mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Cash Float
                </label>
                <p className="text-xs text-gray-500">Enter your starting cash amount for this shift</p>
              </div>
              
              <div className="relative">
                <div className="absolute left-0 flex items-center justify-center w-10 h-full">
                  <span className="text-lg font-semibold text-gray-500">₱</span>
                </div>
                
                <input
                  type="text"
                  value={startingCash}
                  onChange={(e) => setStartingCash(formatCurrency(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 text-lg font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 focus:bg-white transition-all duration-200"
                  placeholder="Enter starting cash amount"
                  required
                />
              </div>
            </div>

            {/* Minimalist Modern Button */}
            <div className="mb-6">
              <button
                onClick={handleStartShift}
                disabled={isStartingShift}
                className="relative w-full group"
              >
                <div className="bg-gray-900 hover:bg-gray-800 text-white py-3 px-6 rounded-xl font-medium shadow-sm transform transition-all duration-200 group-hover:shadow-md group-active:scale-[0.99] disabled:opacity-50 disabled:transform-none border border-gray-800">
                  {isStartingShift ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-sm">Initializing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">Start Business Operations</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemShiftGate;
