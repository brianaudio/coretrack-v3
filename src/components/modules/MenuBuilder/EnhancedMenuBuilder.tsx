'use client';

import React from 'react';
import { MenuBuilderProvider } from '../../../lib/context/MenuBuilderContext';
import MenuBuilderForm from './MenuBuilderForm';

/**
 * Enhanced Menu Builder with State Persistence
 * 
 * This component demonstrates the new state management features:
 * - Persistent form state across navigation
 * - Auto-save functionality
 * - Draft management
 * - Undo/redo capabilities
 * - Form validation with error persistence
 */

interface EnhancedMenuBuilderProps {
  onItemCreated?: () => void;
  onCancel?: () => void;
}

export function EnhancedMenuBuilder({ onItemCreated, onCancel }: EnhancedMenuBuilderProps) {
  return (
    <MenuBuilderProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-semibold text-gray-900">
                Enhanced Menu Builder
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Create and manage menu items with persistent state, auto-save, and advanced editing features.
              </p>
            </div>

            <div className="p-6">
              <MenuBuilderForm
                onSave={onItemCreated}
                onCancel={onCancel}
              />
            </div>
          </div>

          {/* Features showcase */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-medium text-blue-900 mb-4">
              🚀 New State Persistence Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Auto-Save</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Form data automatically saves every 30 seconds
                </p>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Draft Management</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Save multiple drafts and switch between them
                </p>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Undo/Redo</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Full history tracking with undo/redo support
                </p>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="font-medium text-gray-900">State Persistence</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Form state survives page refreshes and navigation
                </p>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Smart Validation</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Real-time validation with persistent error states
                </p>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="font-medium text-gray-900">Performance</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Optimized state updates and minimal re-renders
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Keyboard Shortcuts:</h3>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+Z</kbd> Undo</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+Y</kbd> Redo</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+S</kbd> Save Draft</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Esc</kbd> Cancel</span>
            </div>
          </div>
        </div>
      </div>
    </MenuBuilderProvider>
  );
}

export default EnhancedMenuBuilder;
