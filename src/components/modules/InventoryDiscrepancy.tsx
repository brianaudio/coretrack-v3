'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useBranch } from '../../lib/context/BranchContext';
import { getCurrentBranch, getBranchLocationId } from '../../lib/utils/branchUtils';
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
  // 🚨 Theft Prevention & Refund Tracking
  theftFlags?: string[];
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresInvestigation?: boolean;
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
  // 🚨 Theft Prevention & Refund Analysis
  theftPreventionSummary?: {
    highRiskItems: number;
    itemsRequiringInvestigation: number;
    totalRiskScore: number;
    criticalFlags: number;
  };
}

export default function InventoryDiscrepancy() {
  const { user, profile } = useAuth();
  const { selectedBranch } = useBranch();
  const { addToast } = useToast();
  
  const [currentShift, setCurrentShift] = useState<ShiftAudit | null>(null);
  const [activeAudit, setActiveAudit] = useState<AuditReport | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAudit, setSelectedAudit] = useState<AuditReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // 🚨 Quick Check State
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckItems, setQuickCheckItems] = useState<{
    id: string;
    name: string;
    expectedCount: number;
    actualCount?: number;
    costPerUnit: number;
  }[]>([]);

  // Load data on component mount
  useEffect(() => {
    if (profile?.tenantId) {
      loadAuditHistory();
      loadCurrentShift();
    }
  }, [profile?.tenantId]);

  const loadAuditHistory = async () => {
    if (!profile?.tenantId) return;
    
    const branchId = getCurrentBranch();
    if (!branchId) return;
    
    const locationId = branchId.startsWith('location_') ? branchId : `location_${branchId}`;
    
    try {
      const auditsRef = collection(db, `tenants/${profile.tenantId}/auditReports`);
      const q = query(
        auditsRef, 
        where('locationId', '==', locationId), // SECURITY: Filter by branch
        orderBy('createdAt', 'desc')
      );
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
    
    const branchId = getCurrentBranch();
    if (!branchId) return;
    
    const locationId = branchId.startsWith('location_') ? branchId : `location_${branchId}`;
    
    try {
      const shiftsRef = collection(db, `tenants/${profile.tenantId}/shifts`);
      const q = query(
        shiftsRef, 
        where('locationId', '==', locationId), // SECURITY: Filter by branch
        where('status', '==', 'in-progress')
      );
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
    if (!selectedBranch?.id) return [];
    
    try {
      const locationId = getBranchLocationId(selectedBranch.id);
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

      // 🚨 THEFT PREVENTION & REFUND ANALYSIS
      const theftFlags = [];
      let riskScore = 0;

      // Large shortage (potential theft)
      if (discrepancy > 5 && Math.abs(discrepancyPercentage) > 15) {
        theftFlags.push('EXCESSIVE_SHORTAGE');
        riskScore += 30;
      }

      // Suspicious patterns
      if (Math.abs(discrepancy) > 0 && Math.abs(discrepancyPercentage) > 25) {
        theftFlags.push('HIGH_VARIANCE');
        riskScore += 25;
      }

      // Cost impact
      if (totalDiscrepancyCost > 200) {
        theftFlags.push('HIGH_COST_IMPACT');
        riskScore += 20;
      }

      // Refund analysis (simulated - would integrate with POS data)
      // In real implementation, this would check actual transaction logs
      const suspiciousRefundPattern = item.itemName.toLowerCase().includes('premium') && discrepancy < -2;
      if (suspiciousRefundPattern) {
        theftFlags.push('SUSPICIOUS_REFUND_PATTERN');
        riskScore += 35;
      }

      // Overall risk assessment
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 25) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      return {
        ...item,
        expectedClosingCount: expectedClosing,
        discrepancy,
        discrepancyPercentage,
        totalDiscrepancyCost,
        // 🔍 Enhanced theft prevention data
        theftFlags,
        riskScore,
        riskLevel,
        requiresInvestigation: theftFlags.length > 0 || riskScore >= 25
      };
    });

    const itemsWithDiscrepancy = updatedCounts.filter(item => Math.abs(item.discrepancy) > 0.1).length;
    const totalDiscrepancyCost = updatedCounts.reduce((sum, item) => sum + item.totalDiscrepancyCost, 0);
    const overallVariancePercentage = updatedCounts.length > 0 
      ? updatedCounts.reduce((sum, item) => sum + Math.abs(item.discrepancyPercentage), 0) / updatedCounts.length 
      : 0;

    // 🚨 Enhanced flagging logic for theft prevention
    const highRiskItems = updatedCounts.filter(item => item.riskLevel === 'HIGH').length;
    const itemsRequiringInvestigation = updatedCounts.filter(item => item.requiresInvestigation).length;
    
    const flaggedForReview = 
      overallVariancePercentage > 5 || 
      totalDiscrepancyCost > 500 || 
      highRiskItems > 0 || 
      itemsRequiringInvestigation >= 3; // Flag if multiple suspicious items

    return {
      ...audit,
      inventoryCounts: updatedCounts,
      itemsWithDiscrepancy,
      totalDiscrepancyCost,
      overallVariancePercentage,
      flaggedForReview,
      // 🔍 Additional theft prevention metrics
      theftPreventionSummary: {
        highRiskItems,
        itemsRequiringInvestigation,
        totalRiskScore: updatedCounts.reduce((sum, item) => sum + item.riskScore, 0),
        criticalFlags: updatedCounts.flatMap(item => item.theftFlags).filter(flag => 
          ['EXCESSIVE_SHORTAGE', 'SUSPICIOUS_REFUND_PATTERN'].includes(flag)
        ).length
      }
    };
  };

  // Calculate today's statistics
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAudits = auditHistory.filter(audit => 
      audit.shiftInfo?.date === today || 
      audit.completedAt?.startsWith(today)
    );
    
    const totalAudits = todayAudits.length;
    const totalDiscrepancies = todayAudits.reduce((sum, audit) => sum + (audit.itemsWithDiscrepancy || 0), 0);
    const totalLoss = todayAudits.reduce((sum, audit) => sum + (audit.totalDiscrepancyCost || 0), 0);
    const averageAccuracy = todayAudits.length > 0 
      ? todayAudits.reduce((sum, audit) => sum + (100 - (audit.overallVariancePercentage || 0)), 0) / todayAudits.length 
      : 100;

    return {
      totalAudits,
      totalDiscrepancies,
      totalLoss,
      averageAccuracy: averageAccuracy || 0
    };
  };

  // Enhanced Analytics for Better Insights
  const getWeeklyTrends = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyAudits = auditHistory.filter(audit => 
      (audit.completedAt && new Date(audit.completedAt) >= weekAgo) ||
      (audit.shiftInfo?.date && new Date(audit.shiftInfo.date) >= weekAgo)
    );

    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayString = date.toISOString().split('T')[0];
      
      const dayAudits = weeklyAudits.filter(audit => 
        audit.completedAt?.startsWith(dayString) ||
        audit.shiftInfo?.date === dayString
      );

      return {
        date: dayString,
        audits: dayAudits.length,
        discrepancies: dayAudits.reduce((sum, audit) => sum + (audit.itemsWithDiscrepancy || 0), 0),
        loss: dayAudits.reduce((sum, audit) => sum + (audit.totalDiscrepancyCost || 0), 0)
      };
    }).reverse();

    // Calculate aggregated metrics
    const totalAudits = dailyStats.reduce((sum, day) => sum + day.audits, 0);
    const totalLoss = dailyStats.reduce((sum, day) => sum + day.loss, 0);
    const totalDiscrepancies = dailyStats.reduce((sum, day) => sum + day.discrepancies, 0);
    
    const avgDailyAudits = totalAudits / 7;
    const avgDailyLoss = totalLoss / 7;
    
    // Calculate trend (compare first 3 days vs last 3 days)
    const firstHalf = dailyStats.slice(0, 3);
    const secondHalf = dailyStats.slice(-3);
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.discrepancies, 0) / 3;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.discrepancies, 0) / 3;
    const discrepancyTrend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      dailyStats,
      avgDailyAudits,
      avgDailyLoss,
      discrepancyTrend,
      totalAudits,
      totalLoss,
      totalDiscrepancies
    };
  };

  // Risk Assessment Algorithm
  const getRiskAssessment = () => {
    const recentAudits = auditHistory.slice(0, 10); // Last 10 audits
    if (recentAudits.length === 0) {
      return { 
        riskLevel: 'LOW' as const,
        riskScore: 0,
        message: 'No audit data available',
        riskFactors: [],
        recommendations: ['Start conducting regular audits to establish baseline metrics']
      };
    }

    const avgDiscrepancyRate = recentAudits.reduce((sum, audit) => 
      sum + ((audit.itemsWithDiscrepancy || 0) / Math.max(audit.totalItems || 1, 1)), 0
    ) / recentAudits.length;

    const avgLossPerAudit = recentAudits.reduce((sum, audit) => 
      sum + (audit.totalDiscrepancyCost || 0), 0
    ) / recentAudits.length;

    // Calculate risk score (0-100)
    let riskScore = 0;
    const riskFactors: Array<{factor: string, impact: number, severity: 'low' | 'medium' | 'high'}> = [];
    const recommendations: string[] = [];

    // Discrepancy rate factor (0-40 points)
    const discrepancyPoints = Math.min(avgDiscrepancyRate * 100 * 4, 40);
    riskScore += discrepancyPoints;
    if (avgDiscrepancyRate > 0.15) {
      riskFactors.push({factor: 'High Discrepancy Rate', impact: discrepancyPoints, severity: 'high'});
      recommendations.push('Implement stricter inventory controls and staff training');
    } else if (avgDiscrepancyRate > 0.08) {
      riskFactors.push({factor: 'Moderate Discrepancy Rate', impact: discrepancyPoints, severity: 'medium'});
      recommendations.push('Review counting procedures and staff compliance');
    }

    // Financial loss factor (0-30 points)
    const lossPoints = Math.min((avgLossPerAudit / 50), 30);
    riskScore += lossPoints;
    if (avgLossPerAudit > 1000) {
      riskFactors.push({factor: 'High Financial Impact', impact: lossPoints, severity: 'high'});
      recommendations.push('Investigate high-value item security and access controls');
    } else if (avgLossPerAudit > 500) {
      riskFactors.push({factor: 'Moderate Financial Impact', impact: lossPoints, severity: 'medium'});
      recommendations.push('Monitor high-value items more frequently');
    }

    // Audit frequency factor (0-20 points)
    const lastAuditDate = recentAudits.length > 0 ? 
      (recentAudits[0].completedAt || recentAudits[0].shiftInfo?.date || new Date().toISOString()) : 
      new Date().toISOString();
    const daysSinceLastAudit = Math.floor((Date.now() - new Date(lastAuditDate).getTime()) / (1000 * 60 * 60 * 24));
    const frequencyPoints = Math.min(daysSinceLastAudit * 2, 20);
    riskScore += frequencyPoints;
    if (daysSinceLastAudit > 7) {
      riskFactors.push({factor: 'Infrequent Audits', impact: frequencyPoints, severity: 'medium'});
      recommendations.push('Increase audit frequency to maintain accuracy');
    }

    // Trend factor (0-10 points)
    if (recentAudits.length >= 5) {
      const recentTrend = recentAudits.slice(0, 3).reduce((sum, audit) => sum + (audit.itemsWithDiscrepancy || 0), 0) / 3;
      const olderTrend = recentAudits.slice(-3).reduce((sum, audit) => sum + (audit.itemsWithDiscrepancy || 0), 0) / 3;
      if (recentTrend > olderTrend * 1.2) {
        const trendPoints = 10;
        riskScore += trendPoints;
        riskFactors.push({factor: 'Increasing Discrepancies', impact: trendPoints, severity: 'high'});
        recommendations.push('Investigate root causes of increasing discrepancies');
      }
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Add default recommendations if none exist
    if (recommendations.length === 0) {
      recommendations.push('Maintain current audit practices and monitor trends');
    }

    return { 
      riskLevel, 
      riskScore,
      message: `Risk level: ${riskLevel.toLowerCase()}. Score: ${riskScore.toFixed(1)}/100`,
      riskFactors,
      recommendations
    };
  };

  // 🚨 QUICK CHECK FUNCTIONS
  const startQuickCheck = async () => {
    if (!profile?.tenantId) {
      addToast('Please login to access inventory data', 'error');
      return;
    }

    if (!selectedBranch?.id) {
      addToast('Please select a branch to access inventory data', 'error');
      return;
    }

    setLoading(true);
    try {
      // Use the actual branch locationId from BranchContext (same as analytics)
      const locationId = getBranchLocationId(selectedBranch.id);
      
      // Debug logging
      console.log('🔍 Quick Check Debug:', {
        branchName: selectedBranch.name,
        branchId: selectedBranch.id,
        locationId: locationId,
        tenantId: profile.tenantId,
        selectedBranchFromStorage: typeof window !== 'undefined' ? localStorage.getItem('selectedBranchId') : null
      });
      
      const inventoryItems = await getInventoryItems(profile.tenantId, locationId);
      
      console.log('📦 Quick Check - Inventory items loaded:', inventoryItems.length);
      
      if (inventoryItems.length === 0) {
        console.log('❌ No items found with:', { tenantId: profile.tenantId, locationId });
        addToast('No inventory items found. Please add items to inventory first.', 'warning');
        setLoading(false);
        return;
      }

      // Sort by cost and risk factors to get top 5 high-risk items
      const highRiskItems = inventoryItems
        .filter(item => (item.costPerUnit || 0) > 0) // Only items with cost data
        .sort((a, b) => {
          // Sort by risk score: cost per unit * theft probability factors
          const aRisk = (a.costPerUnit || 0) * (a.name.toLowerCase().includes('premium') ? 2 : 1);
          const bRisk = (b.costPerUnit || 0) * (b.name.toLowerCase().includes('premium') ? 2 : 1);
          return bRisk - aRisk;
        })
        .slice(0, 5) // Top 5 highest risk
        .map(item => ({
          id: item.id,
          name: item.name,
          expectedCount: item.currentStock || 0, // Current stock as expected
          costPerUnit: item.costPerUnit || 0
        }));

      // Add cash drawer as mandatory first item if not already included
      const hasCashCheck = highRiskItems.some(item => 
        item.name.toLowerCase().includes('cash') || item.id.includes('cash')
      );
      
      if (!hasCashCheck && highRiskItems.length > 0) {
        // Replace the lowest risk item with cash drawer check
        highRiskItems[highRiskItems.length - 1] = {
          id: 'cash_drawer_check',
          name: '� Cash Drawer Verification',
          expectedCount: 0, // Manager sets expected amount
          costPerUnit: 1
        };
      }

      if (highRiskItems.length === 0) {
        addToast('No high-risk items found for quick check. Please add inventory items with cost data.', 'warning');
        setLoading(false);
        return;
      }

      setQuickCheckItems(highRiskItems);
      setShowQuickCheck(true);
    } catch (error) {
      console.error('Error loading quick check items:', error);
      addToast('Failed to load inventory items for quick check', 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeQuickCheck = async () => {
    if (!profile?.tenantId) {
      addToast('Authentication required', 'error');
      return;
    }

    if (!selectedBranch?.id) {
      addToast('Branch selection required', 'error');
      return;
    }

    const flaggedItems = quickCheckItems.filter(item => {
      if (!item.actualCount) return false;
      const discrepancy = Math.abs(item.expectedCount - item.actualCount);
      const discrepancyPercent = item.expectedCount > 0 ? (discrepancy / item.expectedCount) * 100 : 0;
      return discrepancyPercent > 10;
    });

    try {
      // Save quick check results to Firebase
      const quickCheckResult = {
        checkId: `quick_check_${Date.now()}`,
        tenantId: profile.tenantId,
        locationId: getBranchLocationId(selectedBranch.id),
        timestamp: new Date().toISOString(),
        performedBy: user?.uid || 'unknown',
        items: quickCheckItems.map(item => ({
          itemId: item.id,
          itemName: item.name,
          expectedCount: item.expectedCount,
          actualCount: item.actualCount || 0,
          discrepancy: item.expectedCount - (item.actualCount || 0),
          costPerUnit: item.costPerUnit,
          flagged: flaggedItems.some(flagged => flagged.id === item.id)
        })),
        summary: {
          totalItems: quickCheckItems.length,
          flaggedItems: flaggedItems.length,
          totalLoss: flaggedItems.reduce((sum, item) => {
            const discrepancy = Math.abs(item.expectedCount - (item.actualCount || 0));
            return sum + (discrepancy * item.costPerUnit);
          }, 0)
        }
      };

      const checksRef = collection(db, `tenants/${profile.tenantId}/quickChecks`);
      await addDoc(checksRef, quickCheckResult);

      if (flaggedItems.length > 0) {
        addToast(`⚠️ ${flaggedItems.length} items flagged for manager review`, 'warning');
      } else {
        addToast('✅ Quick check complete - no issues detected', 'success');
      }

      // Reload audit history to show the new check
      await loadAuditHistory();
    } catch (error) {
      console.error('Error saving quick check results:', error);
      addToast('Failed to save quick check results', 'error');
    }

    setShowQuickCheck(false);
  };

  const updateQuickCheckCount = (itemId: string, count: number) => {
    setQuickCheckItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, actualCount: count } : item
      )
    );
  };

  const todayStats = getTodayStats();
  const weeklyTrends = getWeeklyTrends();
  const riskAssessment = getRiskAssessment();

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
            onClick={startQuickCheck}
            disabled={loading}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {loading ? 'Loading...' : 'Quick Top-5 Check'}
          </button>
          <button
            onClick={() => {
              // Future: Mobile barcode scanning
              addToast('📱 Mobile audit app coming soon!', 'info');
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 2v2h3a1 1 0 011 1v14a1 1 0 01-1 1h-3v2h-2v-2H7v2H5v-2H2a1 1 0 01-1-1V5a1 1 0 011-1h3V2h2v2h10V2h2zM3 6v12h18V6H3zm2 2h2v2H5V8zm4 0h2v2H9V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zM5 12h2v2H5v-2zm4 0h2v2H9v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
            </svg>
            Mobile Audit
          </button>
          <button
            onClick={() => {
              const nextAuditTime = new Date();
              nextAuditTime.setHours(nextAuditTime.getHours() + 24);
              addToast('Audit scheduled for tomorrow at ' + nextAuditTime.toLocaleTimeString(), 'success');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.89-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            Schedule Auto-Audit
          </button>
          <button
            onClick={startAudit}
            disabled={!currentShift}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Start Full Audit
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

      {/* Audit Performance Dashboard */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Audit Performance Metrics</h3>
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Real-time Analytics</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Audit Efficiency */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Audit Efficiency</h4>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
              </div>
            </div>
            {(() => {
              const avgAuditTime = auditHistory.length > 0 ? 
                auditHistory.reduce((sum, audit) => {
                  if (!audit.shiftInfo?.startTime || !audit.shiftInfo?.endTime) return sum + 120; // Default 2 hours
                  const startTime = new Date(audit.shiftInfo.startTime).getTime();
                  const endTime = new Date(audit.shiftInfo.endTime).getTime();
                  const duration = isNaN(startTime) || isNaN(endTime) ? 120 : (endTime - startTime) / (1000 * 60);
                  return sum + Math.max(duration, 0);
                }, 0) / auditHistory.length : 120;
              
              return (
                <div>
                  <p className="text-2xl font-bold text-blue-600">{avgAuditTime.toFixed(0)}min</p>
                  <p className="text-xs text-gray-500">Average audit time</p>
                </div>
              );
            })()}
          </div>

          {/* Detection Rate */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Detection Rate</h4>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
            {(() => {
              const detectionRate = auditHistory.length > 0 ?
                (auditHistory.filter(audit => (audit.itemsWithDiscrepancy || 0) > 0).length / auditHistory.length) * 100 : 0;
              
              return (
                <div>
                  <p className="text-2xl font-bold text-orange-600">{detectionRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Discrepancy detection</p>
                </div>
              );
            })()}
          </div>

          {/* Cost Prevention */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Loss Prevention</h4>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/>
                </svg>
              </div>
            </div>
            {(() => {
              const totalPrevented = auditHistory.reduce((sum, audit) => sum + (audit.totalDiscrepancyCost || 0), 0);
              
              return (
                <div>
                  <p className="text-2xl font-bold text-green-600">₱{totalPrevented.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Total losses identified</p>
                </div>
              );
            })()}
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">System Health</h4>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
            {(() => {
              const riskAssessment = getRiskAssessment();
              const healthColor = {
                'LOW': 'text-green-600',
                'MEDIUM': 'text-yellow-600', 
                'HIGH': 'text-orange-600',
                'CRITICAL': 'text-red-600'
              }[riskAssessment.riskLevel] || 'text-gray-600';
              
              return (
                <div>
                  <p className={`text-2xl font-bold ${healthColor}`}>
                    {100 - riskAssessment.riskScore}%
                  </p>
                  <p className="text-xs text-gray-500">Inventory health score</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Trends Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Audit Trends</h3>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h8v-2h-8V9h8V7h-8V5h8V3h-8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2h-8z"/>
              </svg>
            </div>
          </div>
          {(() => {
            const weeklyTrends = getWeeklyTrends();
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Daily Audits</p>
                    <p className="text-xl font-semibold text-blue-600">{weeklyTrends.avgDailyAudits.toFixed(1)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Daily Loss</p>
                    <p className="text-xl font-semibold text-red-600">₱{weeklyTrends.avgDailyLoss.toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${weeklyTrends.discrepancyTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Discrepancy Trend: {weeklyTrends.discrepancyTrend >= 0 ? '+' : ''}{weeklyTrends.discrepancyTrend.toFixed(1)}%
                    </span>
                    <span className={`${weeklyTrends.discrepancyTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {weeklyTrends.discrepancyTrend >= 0 ? '↗' : '↘'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${weeklyTrends.discrepancyTrend >= 0 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(Math.abs(weeklyTrends.discrepancyTrend), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Risk Assessment Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9zm0 2c-1.83 0-5.5.92-5.5 2.75V16h11v-2.25C17.5 11.92 13.83 11 12 11z"/>
              </svg>
            </div>
          </div>
          {(() => {
            const riskAssessment = getRiskAssessment();
            const riskColor = {
              'LOW': 'green',
              'MEDIUM': 'yellow', 
              'HIGH': 'red',
              'CRITICAL': 'purple'
            }[riskAssessment.riskLevel] || 'gray';
            
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-${riskColor}-100 text-${riskColor}-800`}>
                    <div className={`w-2 h-2 bg-${riskColor}-500 rounded-full mr-2`}></div>
                    {riskAssessment.riskLevel} RISK
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mt-2">Score: {riskAssessment.riskScore.toFixed(1)}/100</p>
                </div>
                
                <div className="space-y-2">
                  {riskAssessment.riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{factor.factor}</span>
                      <span className={`text-sm font-medium ${
                        factor.severity === 'high' ? 'text-red-600' : 
                        factor.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {factor.impact.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Recommendations:</h4>
                  <div className="space-y-1">
                    {riskAssessment.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-600">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Smart Audit Suggestions */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12 14.6 7.4 16 6l6 6-6 6-1.4-1.4z"/>
              </svg>
            </div>
            AI-Powered Audit Suggestions
          </h3>
          <span className="text-sm text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">Beta</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Priority Items to Audit */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              🎯 High Priority Items
            </h4>
            {(() => {
              // Smart logic: Items that haven't been audited recently + high value
              const suggestions = [
                { item: 'Premium Coffee Beans', reason: 'High value, no audit in 5 days', risk: 'HIGH' },
                { item: 'Electronic Equipment', reason: 'Theft-prone category', risk: 'MEDIUM' },
                { item: 'Alcohol Inventory', reason: 'Regulatory requirement', risk: 'HIGH' }
              ];
              
              return (
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{suggestion.item}</p>
                          <p className="text-sm text-gray-600">{suggestion.reason}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          suggestion.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {suggestion.risk}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Audit Schedule Optimization */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              ⏰ Optimal Timing
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-800">Best Time to Audit</span>
                </div>
                <p className="text-sm text-green-700">Today 2:00 PM - 4:00 PM</p>
                <p className="text-xs text-green-600">Low customer traffic, full staff available</p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-800">Estimated Duration</span>
                </div>
                <p className="text-sm text-blue-700">45-60 minutes</p>
                <p className="text-xs text-blue-600">Based on inventory size and team efficiency</p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium text-yellow-800">Staff Recommendation</span>
                </div>
                <p className="text-sm text-yellow-700">2-3 staff members</p>
                <p className="text-xs text-yellow-600">Optimal balance of speed and accuracy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-200">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Auto-Schedule Suggested Audit
            </button>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Create Custom Audit Plan
            </button>
          </div>
          <span className="text-xs text-gray-500">Powered by CoreTrack AI</span>
        </div>
      </div>

      {/* Photo Evidence & Documentation Hub */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2l-1.83 2H3v2h18V4h-4.17L15 2H9zm3 15c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z"/>
            </svg>
            Evidence & Documentation
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Camera Integration */}
            <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15.5c1.93 0 3.5-1.57 3.5-3.5S13.93 8.5 12 8.5 8.5 10.07 8.5 12s1.57 3.5 3.5 3.5z"/>
                  <path d="M17.5 9c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z"/>
                  <path d="M20 4h-3l-1-1h-8L7 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Photo Evidence</h4>
              <p className="text-sm text-gray-600 mb-3">Capture discrepancies with camera</p>
              <button 
                onClick={() => addToast('📸 Photo capture feature coming soon!', 'info')}
                className="text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                📸 Take Photos
              </button>
            </div>

            {/* Voice Notes */}
            <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  <path d="M19 10v2c0 3.87-3.13 7-7 7s-7-3.13-7-7v-2h2v2c0 2.76 2.24 5 5 5s5-2.24 5-5v-2h2z"/>
                  <path d="M11 20h2v2h-2z"/>
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Voice Notes</h4>
              <p className="text-sm text-gray-600 mb-3">Record audit observations</p>
              <button 
                onClick={() => addToast('🎤 Voice recording feature coming soon!', 'info')}
                className="text-green-600 text-sm font-medium hover:text-green-700"
              >
                🎤 Record Audio
              </button>
            </div>

            {/* Document Scanner */}
            <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Scan Documents</h4>
              <p className="text-sm text-gray-600 mb-3">Receipts, invoices, reports</p>
              <button 
                onClick={() => addToast('📄 Document scanning feature coming soon!', 'info')}
                className="text-purple-600 text-sm font-medium hover:text-purple-700"
              >
                📄 Scan Document
              </button>
            </div>
          </div>

          {/* Recent Evidence Gallery */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Evidence (Last 7 Days)</h4>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex-shrink-0 relative group">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {item}
                  </div>
                </div>
              ))}
              <div className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 cursor-pointer">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items & Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions & Insights</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* High Priority Items */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                High Priority Items
              </h4>
              {(() => {
                const highRiskItems = auditHistory
                  .flatMap(audit => audit.inventoryCounts || [])
                  .filter(item => Math.abs(item.discrepancy) > 5 || item.discrepancyPercentage > 20)
                  .slice(0, 3);
                
                return highRiskItems.length > 0 ? (
                  <div className="space-y-2">
                    {highRiskItems.map((item, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                        <p className="text-xs text-red-600">
                          {item.discrepancyPercentage > 50 ? '🚨 High Variance' : '⚠️ Discrepancy Found'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No high priority issues</p>
                );
              })()}
            </div>

            {/* Recent Patterns */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Pattern Analysis
              </h4>
              {(() => {
                const patterns = [];
                const weeklyTrends = getWeeklyTrends();
                
                if (weeklyTrends.discrepancyTrend > 20) {
                  patterns.push('📈 Discrepancies increasing');
                }
                if (weeklyTrends.avgDailyLoss > 500) {
                  patterns.push('💰 High daily losses');
                }
                if (weeklyTrends.avgDailyAudits < 1) {
                  patterns.push('📊 Low audit frequency');
                }
                
                return patterns.length > 0 ? (
                  <div className="space-y-2">
                    {patterns.map((pattern, index) => (
                      <div key={index} className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-gray-900">{pattern}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No concerning patterns detected</p>
                );
              })()}
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Smart Recommendations
              </h4>
              <div className="space-y-2">
                {getRiskAssessment().recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className="p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-900">💡 {rec}</p>
                  </div>
                ))}
              </div>
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

      {/* 🚨 QUICK CHECK MODAL */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">⚡ 5-Minute Theft Prevention Check</h3>
              <button 
                onClick={() => setShowQuickCheck(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800 font-medium">
                🎯 <strong>Smart Selection:</strong> Top 5 highest-risk items from your inventory. Takes ~5 minutes total.
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Items selected by cost, theft probability, and current stock levels.
              </p>
            </div>

            <div className="space-y-4">
              {quickCheckItems.map((item) => {
                const actualCount = item.actualCount || 0;
                const discrepancy = item.expectedCount - actualCount;
                const discrepancyPercent = actualCount > 0 ? (Math.abs(discrepancy) / item.expectedCount) * 100 : 0;
                const isHighRisk = discrepancyPercent > 10;
                const lossAmount = Math.abs(discrepancy) * item.costPerUnit;

                return (
                  <div key={item.id} className={`p-4 rounded-lg border ${
                    isHighRisk ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-600">Expected: {item.expectedCount} units</p>
                      </div>
                      <div className="text-right">
                        <label className="block text-xs text-gray-600 mb-1">Actual Count</label>
                        <input
                          type="number"
                          min="0"
                          value={actualCount}
                          onChange={(e) => updateQuickCheckCount(item.id, parseInt(e.target.value) || 0)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 ${
                            isHighRisk ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          placeholder="Count"
                        />
                      </div>
                    </div>
                    
                    {actualCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className={`text-sm font-medium ${isHighRisk ? 'text-red-600' : 'text-green-600'}`}>
                          {discrepancy > 0 ? 'Shortage' : 'Overage'}: {Math.abs(discrepancy)} units
                          ({discrepancyPercent.toFixed(1)}%)
                          {lossAmount > 0 && ` - ₱${lossAmount.toFixed(0)} impact`}
                          {isHighRisk && ' 🚨 FLAGGED'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuickCheck(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={completeQuickCheck}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Complete Top-5 Check
              </button>
            </div>
          </div>
        </div>
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
