'use client';

import React, { useState, useCallback } from 'react';
import { useRealtimeSync, ConflictData } from '@/lib/context/RealtimeSyncContext';
import { AlertTriangle, Check, X, GitMerge, Clock, User } from 'lucide-react';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConflictResolutionModal({ isOpen, onClose }: ConflictResolutionModalProps) {
  const { state, resolveConflict } = useRealtimeSync();
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const pendingConflicts = state.conflicts.filter(c => c.action === 'pending');

  const handleResolveConflict = useCallback(async (
    conflictId: string, 
    action: ConflictData['action']
  ) => {
    setIsResolving(true);
    try {
      await resolveConflict(conflictId, action);
      setSelectedConflict(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  }, [resolveConflict]);

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (!isOpen || pendingConflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Data Conflicts Detected</h2>
                <p className="text-orange-100 text-sm">
                  {pendingConflicts.length} conflict{pendingConflicts.length !== 1 ? 's' : ''} require{pendingConflicts.length === 1 ? 's' : ''} resolution
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Conflict List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Conflicts</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingConflicts.map((conflict) => (
                <button
                  key={conflict.id}
                  onClick={() => setSelectedConflict(conflict)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedConflict?.id === conflict.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {conflict.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(conflict.localTimestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    Field: <span className="font-medium">{conflict.field}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <User className="w-3 h-3 mr-1" />
                    {conflict.userName}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConflict ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Conflict Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">
                        {selectedConflict.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Field:</span>
                      <span className="ml-2 font-medium">{selectedConflict.field}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Document ID:</span>
                      <span className="ml-2 font-mono text-xs">{selectedConflict.documentId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">User:</span>
                      <span className="ml-2 font-medium">{selectedConflict.userName}</span>
                    </div>
                  </div>
                </div>

                {/* Value Comparison */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Local Changes */}
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-900">Your Changes</span>
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">
                          {formatTimestamp(selectedConflict.localTimestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto">
                        {formatValue(selectedConflict.localValue)}
                      </pre>
                    </div>
                  </div>

                  {/* Server Changes */}
                  <div className="border border-green-200 rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-900">Server Version</span>
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          {formatTimestamp(selectedConflict.serverTimestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto">
                        {formatValue(selectedConflict.serverValue)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Resolution Actions */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Choose Resolution</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleResolveConflict(selectedConflict.id, 'accept_local')}
                      disabled={isResolving}
                      className="flex flex-col items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-8 h-8 text-blue-600 mb-2" />
                      <span className="font-medium text-blue-900">Keep Your Changes</span>
                      <span className="text-sm text-blue-600 text-center mt-1">
                        Override server version with your local changes
                      </span>
                    </button>

                    <button
                      onClick={() => handleResolveConflict(selectedConflict.id, 'accept_server')}
                      disabled={isResolving}
                      className="flex flex-col items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-8 h-8 text-green-600 mb-2" />
                      <span className="font-medium text-green-900">Accept Server Version</span>
                      <span className="text-sm text-green-600 text-center mt-1">
                        Discard your changes and use server version
                      </span>
                    </button>

                    <button
                      onClick={() => handleResolveConflict(selectedConflict.id, 'merge')}
                      disabled={isResolving}
                      className="flex flex-col items-center p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <GitMerge className="w-8 h-8 text-purple-600 mb-2" />
                      <span className="font-medium text-purple-900">Merge Changes</span>
                      <span className="text-sm text-purple-600 text-center mt-1">
                        Attempt to combine both versions intelligently
                      </span>
                    </button>
                  </div>
                </div>

                {isResolving && (
                  <div className="mt-4 flex items-center justify-center text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    Resolving conflict...
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Select a conflict from the list to view details and resolve it.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConflictNotificationBadge() {
  const { hasConflicts, state } = useRealtimeSync();
  const [showModal, setShowModal] = useState(false);

  const conflictCount = state.conflicts.filter(c => c.action === 'pending').length;

  if (!hasConflicts) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed top-20 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 hover:bg-red-600 transition-colors z-40 animate-pulse"
      >
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">
          {conflictCount} Conflict{conflictCount !== 1 ? 's' : ''}
        </span>
      </button>

      <ConflictResolutionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
