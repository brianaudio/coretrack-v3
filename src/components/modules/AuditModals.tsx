'use client';

import React, { useState } from 'react';

interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartShift: (shiftData: {
    shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight';
    startTime: string;
    endTime: string;
    staffOnDuty: string[];
  }) => void;
}

export const StartShiftModal: React.FC<StartShiftModalProps> = ({
  isOpen,
  onClose,
  onStartShift
}) => {
  const [shiftType, setShiftType] = useState<'morning' | 'afternoon' | 'evening' | 'overnight'>('morning');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [staffMembers, setStaffMembers] = useState<string[]>(['']);

  const shiftTimes = {
    morning: { start: '06:00', end: '14:00' },
    afternoon: { start: '14:00', end: '22:00' },
    evening: { start: '22:00', end: '06:00' },
    overnight: { start: '22:00', end: '06:00' }
  };

  const handleShiftTypeChange = (type: typeof shiftType) => {
    setShiftType(type);
    setStartTime(shiftTimes[type].start);
    setEndTime(shiftTimes[type].end);
  };

  const addStaffMember = () => {
    setStaffMembers([...staffMembers, '']);
  };

  const updateStaffMember = (index: number, name: string) => {
    const updated = [...staffMembers];
    updated[index] = name;
    setStaffMembers(updated);
  };

  const removeStaffMember = (index: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const validStaff = staffMembers.filter(name => name.trim() !== '');
    if (validStaff.length === 0) {
      alert('Please add at least one staff member');
      return;
    }

    onStartShift({
      shiftType,
      startTime,
      endTime,
      staffOnDuty: validStaff
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Start New Shift</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(shiftTimes).map((type) => (
                <button
                  key={type}
                  onClick={() => handleShiftTypeChange(type as typeof shiftType)}
                  className={`p-2 text-sm rounded-lg border ${
                    shiftType === type
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Staff on Duty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff on Duty</label>
            <div className="space-y-2">
              {staffMembers.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updateStaffMember(index, e.target.value)}
                    placeholder="Staff member name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {staffMembers.length > 1 && (
                    <button
                      onClick={() => removeStaffMember(index)}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addStaffMember}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Staff Member
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Shift
          </button>
        </div>
      </div>
    </div>
  );
};

interface InventoryCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditData: any; // Will be properly typed
  onSaveAudit: (auditData: any) => void;
}

export const InventoryCountModal: React.FC<InventoryCountModalProps> = ({
  isOpen,
  onClose,
  auditData,
  onSaveAudit
}) => {
  const [currentStep, setCurrentStep] = useState<'opening' | 'closing'>('opening');
  const [counts, setCounts] = useState<{[itemId: string]: {opening: number, closing: number}}>({});
  const [theftAlerts, setTheftAlerts] = useState<{[itemId: string]: string[]}>({});

  if (!isOpen || !auditData) return null;

  const updateCount = (itemId: string, type: 'opening' | 'closing', value: number) => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: value
      }
    }));

    // 🚨 REAL-TIME THEFT PREVENTION ANALYSIS
    if (type === 'closing') {
      const item = auditData.inventoryCounts.find((i: any) => i.itemId === itemId);
      if (item) {
        const opening = counts[itemId]?.opening || 0;
        const expectedClosing = opening - (item.expectedUsage || 0);
        const discrepancy = expectedClosing - value;
        const discrepancyPercentage = opening > 0 ? (Math.abs(discrepancy) / opening) * 100 : 0;
        
        const alerts: string[] = [];
        
        // Large shortage alert
        if (discrepancy > 5 && discrepancyPercentage > 20) {
          alerts.push('🚨 EXCESSIVE SHORTAGE - Potential theft detected');
        }
        
        // Premium item alert
        if (item.costPerUnit > 50 && discrepancy > 2) {
          alerts.push('💰 HIGH-VALUE ITEM SHORTAGE');
        }
        
        // Suspicious patterns
        if (discrepancy > 10) {
          alerts.push('⚠️ INVESTIGATE IMMEDIATELY - Large discrepancy');
        }
        
        setTheftAlerts(prev => ({
          ...prev,
          [itemId]: alerts
        }));
      }
    }
  };

  // Calculate real-time theft risk score
  const calculateShiftRiskScore = () => {
    let totalRiskScore = 0;
    let highRiskItems = 0;
    
    auditData.inventoryCounts.forEach((item: any) => {
      const opening = counts[item.itemId]?.opening || 0;
      const closing = counts[item.itemId]?.closing || 0;
      const expectedClosing = opening - (item.expectedUsage || 0);
      const discrepancy = expectedClosing - closing;
      const discrepancyPercentage = opening > 0 ? (Math.abs(discrepancy) / opening) * 100 : 0;
      
      if (discrepancy > 5 && discrepancyPercentage > 15) {
        totalRiskScore += 30;
        highRiskItems++;
      }
    });
    
    return { totalRiskScore, highRiskItems };
  };

  const riskAssessment = calculateShiftRiskScore();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Inventory Count - {currentStep === 'opening' ? 'Opening' : 'Closing'} Count
            </h3>
            {currentStep === 'closing' && riskAssessment.totalRiskScore > 50 && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  🚨 HIGH RISK SHIFT - {riskAssessment.highRiskItems} items flagged for investigation
                </p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-6">
          <div className={`flex items-center ${currentStep === 'opening' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'opening' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {currentStep === 'opening' ? '1' : '✓'}
            </div>
            <span className="ml-2 font-medium">Opening Count</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${currentStep === 'closing' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'closing' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Closing Count & Theft Detection</span>
          </div>
        </div>

        {/* 🚨 THEFT PREVENTION INSTRUCTIONS */}
        {currentStep === 'closing' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔍 Theft Prevention Protocol</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• Count carefully - discrepancies {'>'}5 items trigger investigation</p>
              <p>• Photo evidence required for all flagged items</p>
              <p>• Manager notification sent for high-risk items automatically</p>
            </div>
          </div>
        )}

        {/* Inventory Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {currentStep === 'opening' ? 'Opening Count' : 'Closing Count'}
                </th>
                {currentStep === 'closing' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discrepancy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">🚨 Alerts</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditData.inventoryCounts.map((item: any, index: number) => {
                const opening = counts[item.itemId]?.opening || 0;
                const closing = counts[item.itemId]?.closing || 0;
                const expected = opening - (item.expectedUsage || 0);
                const discrepancy = expected - closing;
                const hasTheftAlert = theftAlerts[item.itemId]?.length > 0;
                
                return (
                  <tr key={item.itemId} className={`${
                    hasTheftAlert ? 'bg-red-50 border-l-4 border-red-400' : 
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={counts[item.itemId]?.[currentStep] || 0}
                        onChange={(e) => updateCount(item.itemId, currentStep, parseFloat(e.target.value) || 0)}
                        className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 ${
                          hasTheftAlert ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                    </td>
                    {currentStep === 'closing' && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.expectedUsage || 0} {item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            Math.abs(discrepancy) > 0.1 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {discrepancy > 0 ? '+' : ''}{discrepancy.toFixed(1)} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {theftAlerts[item.itemId]?.map((alert, idx) => (
                            <div key={idx} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded mb-1">
                              {alert}
                            </div>
                          ))}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {currentStep === 'closing' && (
              <button
                onClick={() => setCurrentStep('opening')}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Back to Opening Count
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep === 'opening') {
                  setCurrentStep('closing');
                } else {
                  onSaveAudit({ ...auditData, counts });
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {currentStep === 'opening' ? 'Continue to Closing Count' : 'Complete Audit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
