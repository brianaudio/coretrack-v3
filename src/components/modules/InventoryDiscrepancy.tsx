'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { getCurrentBranch } from '../../lib/utils/branchUtils';
import { useToast } from '../ui/Toast';
import { InventoryCountModal } from './AuditModals';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getInventoryItems } from '../../lib/firebase/inventory';
import { getPOSItems } from '../../lib/firebase/pos';

interface ShiftAudit {
  id: string;
  date: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight';
  startTime: string;
  endTime: string;
  staffOnDuty: string[];
  status: 'pending' | 'in-progress' | 'completed';
  createdBy: string;
  completedBy?: string;
}

interface InventoryCount {
  itemId: string;
  itemName: string;
  category: string;
  openingCount: number;
  expectedUsage: number; // From POS sales
  actualClosingCount: number;
  expectedClosingCount: number; // Opening - Expected Usage
  discrepancy: number; // Expected - Actual
  discrepancyPercentage: number;
  unit: string;
  costPerUnit: number;
  totalDiscrepancyCost: number;
}

interface AuditReport {
  auditId: string;
  shiftInfo: ShiftAudit;
  inventoryCounts: InventoryCount[];
  totalItems: number;
  itemsWithDiscrepancy: number;
  totalDiscrepancyCost: number;
  overallVariancePercentage: number;
  flaggedForReview: boolean;
  notes: string;
  status?: 'in-progress' | 'completed';
  completedAt?: string | null;
  reviewedBy?: string;
  reviewDate?: string;
}

export default function InventoryDiscrepancy() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  
  const [currentShift, setCurrentShift] = useState<ShiftAudit | null>(null);
  const [activeAudit, setActiveAudit] = useState<AuditReport | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAudit, setSelectedAudit] = useState<AuditReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (profile?.tenantId) {
      loadAuditHistory();
      loadCurrentShift();
    }
  }, [profile?.tenantId]);

  const loadAuditHistory = async () => {
    if (!profile?.tenantId) return;
    
    try {
      const auditsRef = collection(db, `tenants/${profile.tenantId}/auditReports`);
      const q = query(auditsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const audits = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          auditId: data.auditId,
          shiftInfo: data.shiftInfo,
          inventoryCounts: data.inventoryCounts,
          totalItems: data.totalItems,
          itemsWithDiscrepancy: data.itemsWithDiscrepancy || 0,
          totalDiscrepancyCost: data.totalDiscrepancyCost || 0,
          overallVariancePercentage: data.overallVariancePercentage || 0,
          flaggedForReview: data.flaggedForReview || false,
          status: data.status,
          notes: data.notes || '',
          completedAt: data.completedAt,
          reviewedBy: data.reviewedBy,
          reviewDate: data.reviewDate
        } as AuditReport;
      });
      
      setAuditHistory(audits);
    } catch (error) {
      console.error('Error loading audit history:', error);
      addToast('Failed to load audit history', 'error');
    }
  };

  const loadCurrentShift = async () => {
    if (!profile?.tenantId) return;
    
    try {
      const shiftsRef = collection(db, `tenants/${profile.tenantId}/shifts`);
      const q = query(shiftsRef, where('status', '==', 'in-progress'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const shiftDoc = snapshot.docs[0];
        setCurrentShift({ id: shiftDoc.id, ...shiftDoc.data() } as ShiftAudit);
      }
    } catch (error) {
      console.error('Error loading current shift:', error);
    }
  };

  const saveAuditHistory = async (audit: AuditReport) => {
    if (!profile?.tenantId) return;
    
    try {
      const auditsRef = collection(db, `tenants/${profile.tenantId}/auditReports`);
      await addDoc(auditsRef, {
        ...audit,
        createdAt: Timestamp.now(),
        tenantId: profile.tenantId
      });
      
      // Reload history
      await loadAuditHistory();
    } catch (error) {
      console.error('Error saving audit:', error);
      addToast('Failed to save audit report', 'error');
    }
  };

  const saveCurrentShift = async (shift: ShiftAudit | null) => {
    if (!profile?.tenantId) return;
    
    try {
      if (shift) {
        const shiftsRef = collection(db, `tenants/${profile.tenantId}/shifts`);
        const docRef = await addDoc(shiftsRef, {
          ...shift,
          createdAt: Timestamp.now(),
          tenantId: profile.tenantId
        });
        setCurrentShift({ ...shift, id: docRef.id });
      } else {
        // Complete current shift
        if (currentShift?.id) {
          const shiftRef = doc(db, `tenants/${profile.tenantId}/shifts`, currentShift.id);
          await updateDoc(shiftRef, {
            status: 'completed',
            completedAt: Timestamp.now()
          });
        }
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Error saving shift:', error);
      addToast('Failed to save shift', 'error');
    }
  };

  // Get inventory items from Firebase
  const getInventoryItemsFromFirebase = async () => {
    if (!profile?.tenantId) return [];
    
    try {
      const currentBranch = getCurrentBranch()
      const locationId = `location_${currentBranch.toLowerCase()}`
      const inventoryItems = await getInventoryItems(profile.tenantId, locationId);
      return inventoryItems;
    } catch (error) {
      console.error('Error loading inventory items:', error);
      addToast('Failed to load inventory items', 'error');
      return [];
    }
  };

  const startAudit = async () => {
    if (!currentShift) {
      addToast('No active shift found. Please ensure staff login has initialized a shift.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const inventoryItems = await getInventoryItemsFromFirebase();
      if (inventoryItems.length === 0) {
        addToast('No inventory items found. Please add items to inventory first.', 'warning');
        setLoading(false);
        return;
      }

      const newAudit: AuditReport = {
        auditId: `audit_${Date.now()}`,
        shiftInfo: currentShift,
        inventoryCounts: inventoryItems.map((item) => ({
          itemId: item.id,
          itemName: item.name,
          category: item.category || 'General',
          openingCount: 0,
          expectedUsage: 0,
          actualClosingCount: 0,
          expectedClosingCount: 0,
          discrepancy: 0,
          discrepancyPercentage: 0,
          unit: item.unit || 'pcs',
          costPerUnit: item.costPerUnit || 0,
          totalDiscrepancyCost: 0
        })),
        totalItems: inventoryItems.length,
        itemsWithDiscrepancy: 0,
        totalDiscrepancyCost: 0,
        overallVariancePercentage: 0,
        flaggedForReview: false,
        status: 'in-progress',
        notes: '',
        completedAt: null
      };

      setActiveAudit(newAudit);
      setShowAuditModal(true);
    } catch (error) {
      console.error('Error starting audit:', error);
      addToast('Failed to start audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeAudit = async (completedAudit: AuditReport) => {
    const calculatedAudit = calculateDiscrepancies(completedAudit);
    
    // Complete the shift
    if (currentShift) {
      const completedShift = {
        ...currentShift,
        status: 'completed' as const,
        completedBy: user?.uid || 'current-user'
      };
      await saveCurrentShift(null); // Clear current shift
    }

    // Update the audit with completion timestamp
    const finalAudit = {
      ...calculatedAudit,
      status: 'completed' as const,
      completedAt: new Date().toISOString()
    };

    // Save to history
    await saveAuditHistory(finalAudit);
    
    setActiveAudit(null);
    setShowAuditModal(false);
    
    addToast(
      `Audit completed! ${calculatedAudit.itemsWithDiscrepancy} discrepancies found, ₱${calculatedAudit.totalDiscrepancyCost.toFixed(2)} total loss.`,
      calculatedAudit.flaggedForReview ? 'warning' : 'success'
    );
  };

  const viewAuditDetails = (audit: AuditReport) => {
    setSelectedAudit(audit);
    setShowDetailModal(true);
  };

  const calculateDiscrepancies = (audit: AuditReport): AuditReport => {
    const updatedCounts = audit.inventoryCounts.map(item => {
      const expectedClosing = item.openingCount - item.expectedUsage;
      const discrepancy = expectedClosing - item.actualClosingCount;
      const discrepancyPercentage = item.openingCount > 0 ? (discrepancy / item.openingCount) * 100 : 0;
      const totalDiscrepancyCost = Math.abs(discrepancy) * item.costPerUnit;

      return {
        ...item,
        expectedClosingCount: expectedClosing,
        discrepancy,
        discrepancyPercentage,
        totalDiscrepancyCost
      };
    });

    const itemsWithDiscrepancy = updatedCounts.filter(item => Math.abs(item.discrepancy) > 0.1).length;
    const totalDiscrepancyCost = updatedCounts.reduce((sum, item) => sum + item.totalDiscrepancyCost, 0);
    const overallVariancePercentage = updatedCounts.length > 0 
      ? updatedCounts.reduce((sum, item) => sum + Math.abs(item.discrepancyPercentage), 0) / updatedCounts.length 
      : 0;

    return {
      ...audit,
      inventoryCounts: updatedCounts,
      itemsWithDiscrepancy,
      totalDiscrepancyCost,
      overallVariancePercentage,
      flaggedForReview: overallVariancePercentage > 5 || totalDiscrepancyCost > 500 // Flag if >5% variance or >₱500 loss
    };
  };

  // Calculate today's statistics
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAudits = auditHistory.filter(audit => audit.shiftInfo.date === today);
    
    const totalAudits = todayAudits.length;
    const totalDiscrepancies = todayAudits.reduce((sum, audit) => sum + audit.itemsWithDiscrepancy, 0);
    const totalLoss = todayAudits.reduce((sum, audit) => sum + audit.totalDiscrepancyCost, 0);
    const averageAccuracy = todayAudits.length > 0 
      ? todayAudits.reduce((sum, audit) => sum + (100 - audit.overallVariancePercentage), 0) / todayAudits.length 
      : 100;

    return {
      totalAudits,
      totalDiscrepancies,
      totalLoss,
      averageAccuracy
    };
  };

  const todayStats = getTodayStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Discrepancy & Audit</h1>
          <p className="text-gray-600">Daily theft prevention and inventory verification system</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={startAudit}
            disabled={!currentShift}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Start Audit
          </button>
        </div>
      </div>

      {/* Shift Management Section */}
      {!currentShift ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Shift Management</h3>
              <p className="text-blue-700">Shifts are automatically started when staff members log in. Inventory auditing and discrepancy monitoring are available for active shifts.</p>
              <p className="text-blue-600 text-sm mt-1">Staff login automatically initiates shift tracking and audit capabilities.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Current Shift Active</h3>
              <p className="text-blue-700 text-sm">
                {currentShift.shiftType.charAt(0).toUpperCase() + currentShift.shiftType.slice(1)} Shift 
                ({currentShift.startTime} - {currentShift.endTime})
              </p>
              <p className="text-blue-600 text-sm">Staff: {currentShift.staffOnDuty.join(', ')}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                currentShift.status === 'in-progress' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentShift.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today&apos;s Audits</p>
              <p className="text-2xl font-semibold text-gray-900">{todayStats.totalAudits}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Items with Discrepancy</p>
              <p className="text-2xl font-semibold text-gray-900">{todayStats.totalDiscrepancies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Loss Today</p>
              <p className="text-2xl font-semibold text-gray-900">₱{todayStats.totalLoss.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{todayStats.averageAccuracy.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Audits Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Audit Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Audited</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancies</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                      </svg>
                      <p className="text-lg font-medium">No audit reports yet</p>
                      <p className="text-sm">Start your first shift to begin tracking inventory discrepancies</p>
                    </div>
                  </td>
                </tr>
              ) : (
                auditHistory.slice(0, 10).map((audit) => (
                  <tr key={audit.auditId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(audit.shiftInfo.date).toLocaleDateString()} - {audit.shiftInfo.shiftType.charAt(0).toUpperCase() + audit.shiftInfo.shiftType.slice(1)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {audit.shiftInfo.startTime} - {audit.shiftInfo.endTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.shiftInfo.staffOnDuty.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {audit.totalItems} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        audit.itemsWithDiscrepancy > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {audit.itemsWithDiscrepancy} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{audit.totalDiscrepancyCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        audit.flaggedForReview 
                          ? 'bg-red-100 text-red-800' 
                          : audit.itemsWithDiscrepancy > 0 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {audit.flaggedForReview 
                          ? 'Needs Review' 
                          : audit.itemsWithDiscrepancy > 0 
                            ? 'Minor Issues'
                            : 'Clean'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => viewAuditDetails(audit)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {activeAudit && (
        <InventoryCountModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          auditData={activeAudit}
          onSaveAudit={completeAudit}
        />
      )}

      {selectedAudit && (
        <AuditDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          audit={selectedAudit}
        />
      )}
    </div>
  );
}

// Audit Detail Modal Component
interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditReport;
}

const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ isOpen, onClose, audit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Audit Report - {audit.shiftInfo.shiftType.charAt(0).toUpperCase() + audit.shiftInfo.shiftType.slice(1)} Shift
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Audit Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Total Items</h3>
              <p className="text-2xl font-bold text-gray-900">{audit.totalItems}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-600">Discrepancies</h3>
              <p className="text-2xl font-bold text-red-900">{audit.itemsWithDiscrepancy}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-600">Total Loss</h3>
              <p className="text-2xl font-bold text-yellow-900">₱{audit.totalDiscrepancyCost.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Accuracy</h3>
              <p className="text-2xl font-bold text-blue-900">{(100 - audit.overallVariancePercentage).toFixed(1)}%</p>
            </div>
          </div>

          {/* Detailed Item List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Item-by-Item Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Impact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audit.inventoryCounts.map((item) => (
                    <tr key={item.itemId} className={Math.abs(item.discrepancy) > 0.1 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          <div className="text-xs text-gray-500">{item.category}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.openingCount} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.expectedUsage} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.expectedClosingCount} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.actualClosingCount} {item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${
                          Math.abs(item.discrepancy) > 0.1 
                            ? item.discrepancy > 0 ? 'text-orange-600' : 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {item.discrepancy > 0 ? '+' : ''}{item.discrepancy.toFixed(2)} {item.unit}
                          <br />
                          <span className="text-xs">({item.discrepancyPercentage.toFixed(1)}%)</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">₱{item.totalDiscrepancyCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {audit.notes && (
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{audit.notes}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
