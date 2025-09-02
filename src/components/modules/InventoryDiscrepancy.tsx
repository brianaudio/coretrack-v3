'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useBranch } from '../../lib/context/BranchContext';
import { useToast } from '../ui/Toast';
import { 
  collection, 
  getDocs, 
  addDoc,
  query, 
  orderBy,
  where,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getInventoryItems } from '../../lib/firebase/inventory';

// Simplified interfaces
interface InventoryCount {
  itemId: string;
  itemName: string;
  category: string;
  expectedCount: number;
  actualCount: number;
  discrepancy: number;
  costPerUnit: number;
  totalCost: number;
}

interface AuditReport {
  id: string;
  date: string;
  totalItems: number;
  itemsWithIssues: number;
  totalCostImpact: number;
  status: 'completed' | 'needs-review' | 'applied-to-inventory';
  createdBy: string;
  inventoryCounts: InventoryCount[];
  auditType?: string; // Add this optional field
  branchId?: string;
  branchName?: string;
  locationId?: string;
  appliedAt?: string; // When it was applied to inventory
  appliedBy?: string; // Who applied it to inventory
}

export default function InventoryDiscrepancy() {
  const { user, profile } = useAuth();
  const { selectedBranch } = useBranch();
  const { addToast } = useToast();
  
  // Simplified state
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckItems, setQuickCheckItems] = useState<{
    id: string;
    name: string;
    expectedCount: number;
    actualCount?: number;
    costPerUnit: number;
    selected: boolean;
  }[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<{
    id: string;
    name: string;
    expectedCount: number;
    costPerUnit: number;
    selected: boolean;
  }[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditReport | null>(null);
  const [showFullAudit, setShowFullAudit] = useState(false);
  const [fullAuditItems, setFullAuditItems] = useState<{
    id: string;
    name: string;
    expectedCount: number;
    actualCount?: number;
    costPerUnit: number;
    category: string;
  }[]>([]);

  // Load audit history
  useEffect(() => {
    loadAuditHistory();
  }, [profile?.tenantId, selectedBranch]);

  const loadAuditHistory = async () => {
    if (!profile?.tenantId || !selectedBranch) return;
    
    try {
      setLoading(true);
      const auditsRef = collection(db, `tenants/${profile.tenantId}/audits`);
      // Filter audits by branch location
      const locationId = `location_${selectedBranch.id}`;
      
      // Try branch-specific query first
      try {
        const q = query(
          auditsRef, 
          where('locationId', '==', locationId),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        
        const audits = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuditReport));
        
        console.log('🔍 Branch-specific audits loaded:', {
          branchId: selectedBranch.id,
          branchName: selectedBranch.name,
          locationId: locationId,
          auditCount: audits.length
        });
        
        setAuditHistory(audits);
      } catch (indexError: any) {
        // Fallback: If index not ready, get all audits and filter client-side
        console.warn('📋 Index building, using fallback query:', indexError.message);
        const fallbackQuery = query(auditsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(fallbackQuery);
        
        const allAudits = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuditReport));
        
        // Filter by branch client-side
        const branchAudits = allAudits.filter(audit => 
          (audit as any).locationId === locationId || 
          (audit as any).branchId === selectedBranch.id
        );
        
        console.log('🔍 Client-side filtered audits:', {
          total: allAudits.length,
          filtered: branchAudits.length,
          locationId
        });
        
        setAuditHistory(branchAudits);
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
      addToast('Failed to load audit history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start quick check
  const startQuickCheck = async () => {
    if (!profile?.tenantId || !selectedBranch) {
      addToast('Please select a branch first', 'warning');
      return;
    }

    try {
      setLoading(true);
      // Fix location ID format to match inventory data
      const locationId = `location_${selectedBranch.id}`;
      
      console.log('🔍 Quick Check Debug Info:', {
        tenantId: profile.tenantId,
        selectedBranch: selectedBranch,
        branchId: selectedBranch.id,
        correctedLocationId: locationId
      });
      
      // First try to get inventory items for this specific location
      let inventoryItems = await getInventoryItems(profile.tenantId, locationId);
      
      // If no items found for this location, try to get all items for this tenant
      if (inventoryItems.length === 0) {
        console.log('� No items for location, trying all locations...');
        try {
          // Get all inventory items without location filter
          const inventoryRef = collection(db, `tenants/${profile.tenantId}/inventory`);
          const q = query(inventoryRef, orderBy('name'));
          const snapshot = await getDocs(q);
          
          const allItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          
          console.log('📦 All Inventory Items Found:', {
            count: allItems.length,
            items: allItems.slice(0, 3),
            locationIds: allItems.map(item => item.locationId).filter((id, index, arr) => arr.indexOf(id) === index)
          });
          
          // Use items from any location if available
          if (allItems.length > 0) {
            inventoryItems = allItems as any;
          }
        } catch (fallbackError) {
          console.error('Error in fallback inventory fetch:', fallbackError);
        }
      }
      
      console.log('📦 Final Inventory Items:', {
        count: inventoryItems.length,
        items: inventoryItems.slice(0, 3)
      });
      
      if (inventoryItems.length === 0) {
        addToast('No inventory items found. Please add inventory items first.', 'warning');
        return;
      }

      console.log('🔍 Analyzing inventory for Quick Check:', {
        totalItems: inventoryItems.length,
        sampleItem: inventoryItems[0],
        costPerUnitValues: inventoryItems.map(item => ({ 
          name: item.name, 
          costPerUnit: item.costPerUnit,
          currentStock: item.currentStock 
        })).slice(0, 3)
      });

      // Prepare all inventory items for selection
      const allItems = inventoryItems
        .filter(item => (item.currentStock || 0) >= 0) // Include all items, even zero stock
        .sort((a, b) => {
          // Sort by total value (cost * stock), then by name
          const aValue = ((a.costPerUnit || 1) * (a.currentStock || 0));
          const bValue = ((b.costPerUnit || 1) * (b.currentStock || 0));
          if (bValue !== aValue) return bValue - aValue;
          return a.name.localeCompare(b.name);
        })
        .map(item => ({
          id: item.id,
          name: item.name,
          expectedCount: item.currentStock || 0,
          costPerUnit: item.costPerUnit || 1,
          selected: false // Default to unselected
        }));

      console.log('📋 All items prepared for selection:', allItems.slice(0, 3));

      if (allItems.length === 0) {
        addToast('No inventory items found', 'warning');
        return;
      }

      setAllInventoryItems(allItems);
      setQuickCheckItems([]); // Reset selected items
      setShowQuickCheck(true);
      addToast('Quick check started! Count the displayed items.', 'success');
    } catch (error) {
      console.error('Error starting quick check:', error);
      addToast('Failed to start quick check', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Complete quick check
  const completeQuickCheck = async () => {
    const incompleteCounts = quickCheckItems.filter(item => item.actualCount === undefined);
    if (incompleteCounts.length > 0) {
      addToast('Please count all items before completing', 'warning');
      return;
    }

    try {
      setLoading(true);

      // Calculate discrepancies
      const inventoryCounts: InventoryCount[] = quickCheckItems.map(item => {
        const discrepancy = (item.actualCount || 0) - item.expectedCount;
        return {
          itemId: item.id,
          itemName: item.name,
          category: 'quick-check',
          expectedCount: item.expectedCount,
          actualCount: item.actualCount || 0,
          discrepancy,
          costPerUnit: item.costPerUnit,
          totalCost: Math.abs(discrepancy) * item.costPerUnit
        };
      });

      const itemsWithIssues = inventoryCounts.filter(item => Math.abs(item.discrepancy) > 0).length;
      const totalCostImpact = inventoryCounts.reduce((sum, item) => sum + item.totalCost, 0);

      // Save to Firebase with branch information
      const auditData = {
        date: new Date().toISOString().split('T')[0],
        branchId: selectedBranch!.id,
        branchName: selectedBranch!.name,
        locationId: `location_${selectedBranch!.id}`,
        totalItems: quickCheckItems.length,
        itemsWithIssues,
        totalCostImpact,
        status: itemsWithIssues > 0 ? 'needs-review' : 'completed',
        createdBy: user?.email || 'unknown',
        inventoryCounts,
        auditType: 'quick-check',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${profile!.tenantId}/audits`), auditData);
      
      setShowQuickCheck(false);
      setQuickCheckItems([]);
      await loadAuditHistory();

      const message = itemsWithIssues > 0 
        ? `Quick check completed! Found ${itemsWithIssues} items with discrepancies.`
        : 'Quick check completed! All items match expected counts.';
      
      addToast(message, itemsWithIssues > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Error completing quick check:', error);
      addToast('Failed to save quick check results', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Apply audit results to inventory
  const applyToInventory = async (audit: AuditReport) => {
    if (!profile?.tenantId || !selectedBranch) {
      addToast('Missing tenant or branch information', 'error');
      return;
    }

    const itemsWithDiscrepancies = audit.inventoryCounts.filter(item => Math.abs(item.discrepancy) > 0);
    
    if (itemsWithDiscrepancies.length === 0) {
      addToast('No discrepancies to apply - all counts match current inventory', 'info');
      return;
    }

    const confirmed = confirm(
      `This will update ${itemsWithDiscrepancies.length} items in your inventory to match the actual counts from the audit.\n\n` +
      `Items to be updated:\n${itemsWithDiscrepancies.map(item => 
        `• ${item.itemName}: ${item.expectedCount} → ${item.actualCount} (${item.discrepancy > 0 ? '+' : ''}${item.discrepancy})`
      ).join('\n')}\n\nAre you sure you want to apply these changes?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      
      // Import the inventory update function
      const { updateStockQuantity } = await import('../../lib/firebase/inventory');
      
      const updatePromises = itemsWithDiscrepancies.map(async (item) => {
        try {
          await updateStockQuantity(
            profile.tenantId,
            item.itemId,
            item.actualCount,
            'set', // Set to the actual count
            `Inventory audit adjustment - ${audit.date} (${audit.auditType || 'audit'})`,
            user?.uid,
            user?.displayName || user?.email || 'Unknown User'
          );
          return { success: true, itemName: item.itemName };
        } catch (error) {
          console.error(`Failed to update ${item.itemName}:`, error);
          return { success: false, itemName: item.itemName, error };
        }
      });

      const results = await Promise.all(updatePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Update the audit status to show it's been applied
      if (successful.length > 0) {
        try {
          const auditRef = doc(db, `tenants/${profile.tenantId}/audits`, audit.id);
          await updateDoc(auditRef, {
            status: 'applied-to-inventory',
            appliedAt: new Date().toISOString(),
            appliedBy: user?.displayName || user?.email || 'Unknown User'
          });
        } catch (error) {
          console.error('Failed to update audit status:', error);
        }
      }

      if (successful.length > 0) {
        addToast(`✅ Successfully updated ${successful.length} items to match audit counts! Your inventory is now synchronized.`, 'success');
      }
      
      if (failed.length > 0) {
        addToast(`❌ Failed to update ${failed.length} items: ${failed.map(f => f.itemName).join(', ')}`, 'error');
      }

      // Close the modal and reload data
      setShowReportModal(false);
      setSelectedAudit(null);
      await loadAuditHistory();

    } catch (error) {
      console.error('Error applying audit to inventory:', error);
      addToast('Failed to apply audit results to inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update quick check count
  const updateQuickCheckCount = (itemId: string, count: number) => {
    setQuickCheckItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, actualCount: count } : item
      )
    );
  };

  // Toggle item selection for quick check
  const toggleItemSelection = (itemId: string) => {
    setAllInventoryItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Start counting selected items
  const startCounting = () => {
    const selectedItems = allInventoryItems
      .filter(item => item.selected)
      .map(item => ({
        id: item.id,
        name: item.name,
        expectedCount: item.expectedCount,
        costPerUnit: item.costPerUnit,
        selected: true,
        actualCount: undefined
      }));

    if (selectedItems.length === 0) {
      addToast('Please select at least one item to count', 'warning');
      return;
    }

    setQuickCheckItems(selectedItems);
    addToast(`Started counting ${selectedItems.length} selected items`, 'success');
  };

  // Start full audit
  const startFullAudit = async () => {
    if (!profile?.tenantId || !selectedBranch) {
      addToast('Please select a branch first', 'warning');
      return;
    }

    try {
      setLoading(true);
      const locationId = `location_${selectedBranch.id}`;
      
      console.log('🔍 Full Audit Debug Info:', {
        tenantId: profile.tenantId,
        selectedBranch: selectedBranch,
        branchId: selectedBranch.id,
        correctedLocationId: locationId
      });
      
      // Get all inventory items for this location
      let inventoryItems = await getInventoryItems(profile.tenantId, locationId);
      
      // Fallback to all items if location-specific items not found
      if (inventoryItems.length === 0) {
        console.log('🔍 No items for location, trying all locations...');
        try {
          const inventoryRef = collection(db, `tenants/${profile.tenantId}/inventory`);
          const q = query(inventoryRef, orderBy('name'));
          const snapshot = await getDocs(q);
          
          const allItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          
          if (allItems.length > 0) {
            inventoryItems = allItems as any;
          }
        } catch (fallbackError) {
          console.error('Error in fallback inventory fetch:', fallbackError);
        }
      }
      
      if (inventoryItems.length === 0) {
        addToast('No inventory items found. Please add inventory items first.', 'warning');
        return;
      }

      // Prepare all items for full audit (no selection needed)
      const auditItems = inventoryItems
        .filter(item => (item.currentStock || 0) >= 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => ({
          id: item.id,
          name: item.name,
          expectedCount: item.currentStock || 0,
          costPerUnit: item.costPerUnit || 1,
          category: item.category || 'Uncategorized',
          actualCount: undefined
        }));

      console.log('📋 Full Audit Items Prepared:', auditItems.length);

      setFullAuditItems(auditItems);
      setShowFullAudit(true);
      addToast(`Full audit started! Count all ${auditItems.length} items.`, 'success');
    } catch (error) {
      console.error('Error starting full audit:', error);
      addToast('Failed to start full audit', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Complete full audit
  const completeFullAudit = async () => {
    const incompleteCounts = fullAuditItems.filter(item => item.actualCount === undefined);
    if (incompleteCounts.length > 0) {
      addToast(`Please count all items before completing. ${incompleteCounts.length} items remaining.`, 'warning');
      return;
    }

    try {
      setLoading(true);

      // Calculate discrepancies for full audit
      const inventoryCounts: InventoryCount[] = fullAuditItems.map(item => {
        const discrepancy = (item.actualCount || 0) - item.expectedCount;
        return {
          itemId: item.id,
          itemName: item.name,
          category: 'full-audit',
          expectedCount: item.expectedCount,
          actualCount: item.actualCount || 0,
          discrepancy,
          costPerUnit: item.costPerUnit,
          totalCost: Math.abs(discrepancy) * item.costPerUnit
        };
      });

      const itemsWithIssues = inventoryCounts.filter(item => Math.abs(item.discrepancy) > 0).length;
      const totalCostImpact = inventoryCounts.reduce((sum, item) => sum + item.totalCost, 0);

      // Save full audit to Firebase with branch information
      const auditData = {
        date: new Date().toISOString().split('T')[0],
        branchId: selectedBranch!.id,
        branchName: selectedBranch!.name,
        locationId: `location_${selectedBranch!.id}`,
        totalItems: fullAuditItems.length,
        itemsWithIssues,
        totalCostImpact,
        status: itemsWithIssues > 0 ? 'needs-review' : 'completed',
        createdBy: user?.email || 'unknown',
        inventoryCounts,
        auditType: 'full-audit',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${profile!.tenantId}/audits`), auditData);
      
      setShowFullAudit(false);
      setFullAuditItems([]);
      await loadAuditHistory();

      const message = itemsWithIssues > 0 
        ? `Full audit completed! Found ${itemsWithIssues} items with discrepancies out of ${fullAuditItems.length} total items.`
        : `Full audit completed! All ${fullAuditItems.length} items match expected counts.`;
      
      addToast(message, itemsWithIssues > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Error completing full audit:', error);
      addToast('Failed to save full audit results', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update full audit count
  const updateFullAuditCount = (itemId: string, count: number) => {
    setFullAuditItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, actualCount: count } : item
      )
    );
  };

  // View detailed report
  const viewReport = (audit: AuditReport) => {
    setSelectedAudit(audit);
    setShowReportModal(true);
  };

  // Export report as HTML PDF
  const exportToPDF = (audit: AuditReport) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory Discrepancy Report - ${selectedBranch?.name || 'Branch'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: white;
            padding: 40px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #3182ce;
            padding-bottom: 20px;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3182ce;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 24px;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 8px;
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #718096;
            margin-bottom: 5px;
        }
        
        .report-date {
            font-size: 14px;
            color: #a0aec0;
        }
        
        .summary-section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .summary-card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3182ce;
            text-align: center;
        }
        
        .summary-card.warning {
            border-left-color: #f6ad55;
            background: #fffbf0;
        }
        
        .summary-card.danger {
            border-left-color: #fc8181;
            background: #fef5e7;
        }
        
        .summary-card.success {
            border-left-color: #68d391;
            background: #f0fff4;
        }
        
        .summary-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .summary-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #718096;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-needs-review {
            background: #fed7d7;
            color: #c53030;
        }
        
        .status-completed {
            background: #c6f6d5;
            color: #2f855a;
        }
        
        .status-applied {
            background: #e9d8fd;
            color: #6b46c1;
        }
        
        .details-section {
            margin-bottom: 40px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .items-table th {
            background: #4299e1;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        
        .items-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .items-table tr.discrepancy-row {
            background: #fed7d7;
        }
        
        .items-table tr.match-row {
            background: #c6f6d5;
        }
        
        .discrepancy-positive {
            color: #c53030;
            font-weight: 600;
        }
        
        .discrepancy-negative {
            color: #c53030;
            font-weight: 600;
        }
        
        .discrepancy-zero {
            color: #2f855a;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #718096;
        }
        
        .footer-info {
            margin-bottom: 10px;
        }
        
        .footer-branding {
            font-weight: 600;
            color: #3182ce;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .summary-grid {
                grid-template-columns: repeat(4, 1fr);
            }
            
            .items-table {
                font-size: 12px;
            }
            
            .items-table th,
            .items-table td {
                padding: 8px;
            }
        }
        
        .meta-info {
            background: #edf2f7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .meta-item {
            font-size: 14px;
        }
        
        .meta-label {
            font-weight: 600;
            color: #4a5568;
        }
        
        .meta-value {
            color: #2d3748;
        }
        
        .applied-info {
            background: #e9d8fd;
            border: 1px solid #b794f6;
            padding: 12px;
            border-radius: 6px;
            margin-top: 10px;
            font-size: 13px;
            color: #553c9a;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">📊 CoreTrack</div>
        <h1 class="report-title">Inventory Discrepancy Report</h1>
        <p class="report-subtitle">${selectedBranch?.name || 'Branch Location'}</p>
        <p class="report-date">Report Date: ${audit.date} | Generated: ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="summary-section">
        <h2 class="section-title">Executive Summary</h2>
        
        <div class="meta-info">
            <div class="meta-item">
                <span class="meta-label">Audit Type:</span>
                <span class="meta-value">${audit.auditType === 'full-audit' ? 'Full Inventory Audit' : 'Quick Check Audit'}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Conducted By:</span>
                <span class="meta-value">${audit.createdBy}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Status:</span>
                <span class="status-badge ${
                  audit.status === 'needs-review' ? 'status-needs-review' : 
                  audit.status === 'applied-to-inventory' ? 'status-applied' : 'status-completed'
                }">
                  ${audit.status === 'needs-review' ? 'Needs Review' : 
                    audit.status === 'applied-to-inventory' ? 'Applied to Inventory' : 'Completed'}
                </span>
            </div>
            ${audit.status === 'applied-to-inventory' && audit.appliedAt ? `
            <div class="meta-item">
                <span class="meta-label">Applied On:</span>
                <span class="meta-value">${new Date(audit.appliedAt).toLocaleDateString()}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-value">${audit.totalItems}</div>
                <div class="summary-label">Total Items Checked</div>
            </div>
            
            <div class="summary-card ${audit.itemsWithIssues > 0 ? 'warning' : 'success'}">
                <div class="summary-value">${audit.itemsWithIssues}</div>
                <div class="summary-label">Items with Discrepancies</div>
            </div>
            
            <div class="summary-card ${audit.totalCostImpact > 0 ? 'danger' : 'success'}">
                <div class="summary-value">₱${audit.totalCostImpact.toFixed(2)}</div>
                <div class="summary-label">Total Cost Impact</div>
            </div>
            
            <div class="summary-card success">
                <div class="summary-value">${((audit.totalItems - audit.itemsWithIssues) / audit.totalItems * 100).toFixed(1)}%</div>
                <div class="summary-label">Accuracy Rate</div>
            </div>
        </div>
        
        ${audit.status === 'applied-to-inventory' ? `
        <div class="applied-info">
            <strong>✅ Applied to Inventory:</strong> This audit has been applied to your inventory system on ${new Date(audit.appliedAt || '').toLocaleDateString()} by ${audit.appliedBy || 'Unknown User'}. All discrepancies have been synchronized.
        </div>
        ` : ''}
    </div>

    <div class="details-section">
        <h2 class="section-title">Detailed Findings</h2>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Expected Count</th>
                    <th>Actual Count</th>
                    <th>Discrepancy</th>
                    <th>Unit Cost</th>
                    <th>Cost Impact</th>
                </tr>
            </thead>
            <tbody>
                ${audit.inventoryCounts.map(item => `
                <tr class="${Math.abs(item.discrepancy) > 0 ? 'discrepancy-row' : 'match-row'}">
                    <td><strong>${item.itemName}</strong></td>
                    <td>${item.expectedCount}</td>
                    <td>${item.actualCount}</td>
                    <td>
                        <span class="${item.discrepancy > 0 ? 'discrepancy-positive' : item.discrepancy < 0 ? 'discrepancy-negative' : 'discrepancy-zero'}">
                            ${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}
                        </span>
                    </td>
                    <td>₱${item.costPerUnit.toFixed(2)}</td>
                    <td>
                        <strong ${item.totalCost > 0 ? 'style="color: #c53030;"' : 'style="color: #2f855a;"'}>
                            ₱${item.totalCost.toFixed(2)}
                        </strong>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <div class="footer-info">
            <strong>Report ID:</strong> ${audit.id} | 
            <strong>Generated:</strong> ${new Date().toLocaleString()} | 
            <strong>Branch:</strong> ${selectedBranch?.name || 'N/A'}
        </div>
        <div class="footer-branding">CoreTrack Business Inventory Management System</div>
    </div>
</body>
</html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-discrepancy-report-${audit.date}-${selectedBranch?.name?.replace(/\s+/g, '-') || 'branch'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addToast('📊 Professional HTML report downloaded successfully!', 'success');
  };

  // Get today's status
  const getTodayStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAudits = auditHistory.filter(audit => audit.date === today);
    const hasIssues = todayAudits.some(audit => audit.status === 'needs-review');
    
    if (hasIssues) {
      return { status: 'warning', text: 'Attention Needed', desc: 'Issues found in today\'s checks' };
    } else if (todayAudits.length > 0) {
      return { status: 'success', text: 'All Good', desc: 'No issues detected today' };
    } else {
      return { status: 'neutral', text: 'No Checks Today', desc: 'Run a quick check to get started' };
    }
  };

  const todayStatus = getTodayStatus();
  const todayChecks = auditHistory.filter(audit => 
    audit.date === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-6">
      {/* Modern Ultra-Clean Header - Capital Intelligence Style */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-pink-700 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Discrepancy Monitoring</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Track inventory levels and catch discrepancies early with intelligent monitoring and comprehensive audit trails.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500 font-light">System Status</div>
              <div className="text-2xl font-light tracking-tight text-red-900">
                🔍 Monitoring Active
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Modern Status Card */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <h2 className="text-xl font-light text-gray-900 tracking-wide">Today&apos;s Status</h2>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full shadow-sm ${
                  todayStatus.status === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' :
                  todayStatus.status === 'warning' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-gray-400'
                }`}></div>
                <div className="space-y-1">
                  <span className={`font-medium text-base ${
                    todayStatus.status === 'success' ? 'text-emerald-700' :
                    todayStatus.status === 'warning' ? 'text-amber-700' : 'text-gray-600'
                  }`}>
                    {todayStatus.text}
                  </span>
                  <p className="text-sm text-gray-500 leading-relaxed">{todayStatus.desc}</p>
                </div>
              </div>
              
              {/* New Feature Callout */}
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">🚀 Enhanced Features</p>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      • <strong>Apply to Inventory:</strong> Automatically sync audit results to your inventory system<br/>
                      • <strong>Professional Reports:</strong> Download beautiful HTML reports with detailed findings
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="text-3xl font-light text-gray-900">{todayChecks}</div>
              <div className="text-sm text-gray-500 font-light">Checks today</div>
            </div>
          </div>
        </div>

        {/* Modern Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enhanced Quick Check Card */}
          <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-gray-900">Quick Check</h3>
                <p className="text-gray-500 leading-relaxed">5-minute spot check of high-value items</p>
              </div>
            </div>
            <button
              onClick={startQuickCheck}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-2xl hover:from-orange-600 hover:to-orange-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-orange-500/25"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              ) : (
                'Start Quick Check'
              )}
            </button>
          </div>

          {/* Enhanced Full Audit Card */}
          <div className="group bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-gray-900">Full Audit</h3>
                <p className="text-gray-500 leading-relaxed">Complete inventory verification</p>
              </div>
            </div>
            <button
              onClick={startFullAudit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-300 transition-all duration-300 font-medium group-hover:shadow-lg group-hover:shadow-blue-500/25"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </div>
              ) : (
                'Start Full Audit'
              )}
            </button>
          </div>
        </div>

        {/* Modern Recent Activity */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-light text-gray-900 tracking-wide">Recent Activity</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>No inventory checks yet</p>
                <p className="text-sm">Start with a quick check to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditHistory.slice(0, 5).map((audit, index) => (
                  <div key={audit.id || index} className="group flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${
                        audit.status === 'needs-review' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'
                      }`}></div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {(audit as any).auditType === 'full-audit' ? 'Full Audit' : 'Quick Check'}
                          </p>
                            {audit.status === 'applied-to-inventory' && (
                              <span className="text-xs bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium border border-purple-200 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Applied to Inventory
                              </span>
                            )}
                            {audit.status === 'needs-review' && (
                              <span className="text-xs bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium border border-amber-200">
                                Needs Review
                              </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{audit.date}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{audit.totalItems} items checked</span>
                          {audit.itemsWithIssues > 0 && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="text-red-600 font-medium">
                                ₱{audit.totalCostImpact.toFixed(2)} impact
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        <div className={`text-sm font-medium ${
                          audit.status === 'needs-review' ? 'text-amber-700' : 
                          audit.status === 'applied-to-inventory' ? 'text-purple-700' :
                          'text-emerald-700'
                        }`}>
                          {audit.status === 'needs-review' ? 'Needs Review' : 
                           audit.status === 'applied-to-inventory' ? '✅ Applied to Inventory' :
                           'All Good'}
                        </div>
                        {audit.itemsWithIssues > 0 && (
                          <div className="text-xs text-gray-500">
                            {audit.itemsWithIssues} items flagged
                          </div>
                        )}
                      </div>
                      {(audit.status === 'needs-review' || audit.status === 'applied-to-inventory' || audit.status === 'completed') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewReport(audit)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            View Report
                          </button>
                          <button
                            onClick={() => exportToPDF(audit)}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
                            title="Download professional HTML report"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </button>
                          {audit.itemsWithIssues > 0 && audit.status === 'needs-review' && (
                            <button
                              onClick={() => applyToInventory(audit)}
                              disabled={loading}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              title="Apply actual counts to inventory system"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {loading ? 'Applying...' : 'Apply to Inventory'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {auditHistory.length > 5 && (
                  <div className="text-center pt-6 border-t border-gray-200">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-50 transition-all duration-300">
                      View All History ({auditHistory.length} total)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Check Modal */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                ⚡ Quick Check {quickCheckItems.length > 0 ? '- Counting Phase' : '- Select Items'}
              </h2>
              <button 
                onClick={() => {
                  setShowQuickCheck(false);
                  setQuickCheckItems([]);
                  setAllInventoryItems([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {quickCheckItems.length === 0 ? (
              // Selection Phase
              <div>
                <div className="mb-4">
                  <p className="text-gray-600">Select the inventory items you want to count:</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {allInventoryItems.filter(item => item.selected).length} of {allInventoryItems.length} selected
                    </span>
                    <button
                      onClick={() => setAllInventoryItems(prev => prev.map(item => ({ ...item, selected: true })))}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setAllInventoryItems(prev => prev.map(item => ({ ...item, selected: false })))}
                      className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                  {allInventoryItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        item.selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <div 
                          className="cursor-pointer flex-1"
                          onClick={() => toggleItemSelection(item.id)}
                        >
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">
                            Stock: {item.expectedCount} • ₱{item.costPerUnit.toFixed(2)} each
                            {item.expectedCount > 0 && (
                              <span className="ml-2 text-green-600 font-medium">
                                (₱{(item.expectedCount * item.costPerUnit).toFixed(2)} total value)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowQuickCheck(false);
                      setAllInventoryItems([]);
                    }}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startCounting}
                    disabled={allInventoryItems.filter(item => item.selected).length === 0}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    Start Counting ({allInventoryItems.filter(item => item.selected).length} items)
                  </button>
                </div>
              </div>
            ) : (
              // Counting Phase
              <div>
                <div className="mb-4">
                  <p className="text-gray-600">Count each item and enter the actual quantity:</p>
                </div>

                <div className="space-y-4 mb-6">
                  {quickCheckItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">
                          Expected: <span className="font-medium">{item.expectedCount}</span> • ₱{item.costPerUnit.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Actual Count:</label>
                        <input
                          type="number"
                          min="0"
                          value={item.actualCount || ''}
                          onChange={(e) => updateQuickCheckCount(item.id, parseInt(e.target.value) || 0)}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setQuickCheckItems([]);
                      // Go back to selection phase
                    }}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Selection
                  </button>
                  <button
                    onClick={completeQuickCheck}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {loading ? 'Saving...' : 'Complete Check'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Audit Modal */}
      {showFullAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  🔍 Full Inventory Audit
                </h2>
                <p className="text-gray-600 mt-1">
                  Count all {fullAuditItems.length} items • {fullAuditItems.filter(item => item.actualCount !== undefined).length} completed
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowFullAudit(false);
                  setFullAuditItems([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">
                  {fullAuditItems.filter(item => item.actualCount !== undefined).length} / {fullAuditItems.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(fullAuditItems.filter(item => item.actualCount !== undefined).length / fullAuditItems.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
              {fullAuditItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    item.actualCount !== undefined 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.actualCount !== undefined && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Expected: <span className="font-medium">{item.expectedCount}</span> • 
                        ₱{item.costPerUnit.toFixed(2)} each • 
                        {item.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <label className="text-sm font-medium text-gray-700">Count:</label>
                      <input
                        type="number"
                        min="0"
                        value={item.actualCount || ''}
                        onChange={(e) => updateFullAuditCount(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {fullAuditItems.length}
                </div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {fullAuditItems.filter(item => item.actualCount !== undefined).length}
                </div>
                <div className="text-sm text-green-700">Counted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-900">
                  {fullAuditItems.filter(item => item.actualCount === undefined).length}
                </div>
                <div className="text-sm text-orange-700">Remaining</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowFullAudit(false);
                  setFullAuditItems([]);
                }}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel Audit
              </button>
              <button
                onClick={completeFullAudit}
                disabled={loading || fullAuditItems.filter(item => item.actualCount === undefined).length > 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? 'Saving...' : 'Complete Full Audit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report Modal */}
      {showReportModal && selectedAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  📊 Inventory Discrepancy Report
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedBranch?.name || 'Branch'} • {selectedAudit.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportToPDF(selectedAudit)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors text-sm flex items-center gap-2"
                  title="Download professional HTML report"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  📊 Download HTML Report
                </button>
                <button 
                  onClick={() => {
                    setShowReportModal(false);
                    setSelectedAudit(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Report Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{selectedAudit.totalItems}</div>
                <div className="text-sm text-blue-700">Items Checked</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{selectedAudit.itemsWithIssues}</div>
                <div className="text-sm text-yellow-700">Items with Issues</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-900">₱{selectedAudit.totalCostImpact.toFixed(2)}</div>
                <div className="text-sm text-red-700">Cost Impact</div>
              </div>
              <div className={`p-4 rounded-lg ${
                selectedAudit.status === 'needs-review' ? 'bg-yellow-50' : 
                selectedAudit.status === 'applied-to-inventory' ? 'bg-purple-50' :
                'bg-green-50'
              }`}>
                <div className={`text-2xl font-bold ${
                  selectedAudit.status === 'needs-review' ? 'text-yellow-900' : 
                  selectedAudit.status === 'applied-to-inventory' ? 'text-purple-900' :
                  'text-green-900'
                }`}>
                  {selectedAudit.status === 'needs-review' ? '⚠️' : 
                   selectedAudit.status === 'applied-to-inventory' ? '🔄' : '✅'}
                </div>
                <div className={`text-sm ${
                  selectedAudit.status === 'needs-review' ? 'text-yellow-700' : 
                  selectedAudit.status === 'applied-to-inventory' ? 'text-purple-700' :
                  'text-green-700'
                }`}>
                  {selectedAudit.status === 'needs-review' ? 'Needs Review' : 
                   selectedAudit.status === 'applied-to-inventory' ? 'Applied to Inventory' : 
                   'All Good'}
                </div>
                {selectedAudit.status === 'applied-to-inventory' && selectedAudit.appliedAt && (
                  <div className="text-xs text-purple-600 mt-1">
                    Applied {new Date(selectedAudit.appliedAt).toLocaleDateString()} by {selectedAudit.appliedBy || 'Unknown'}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Findings</h3>
              <div className="space-y-3">
                {selectedAudit.inventoryCounts.map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    Math.abs(item.discrepancy) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          Expected: <span className="font-medium">{item.expectedCount}</span> • 
                          Actual: <span className="font-medium">{item.actualCount}</span> • 
                          Unit Cost: ₱{item.costPerUnit.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          item.discrepancy > 0 ? 'text-green-700' : 
                          item.discrepancy < 0 ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                        </div>
                        <div className="text-sm text-gray-600">
                          ₱{item.totalCost.toFixed(2)} impact
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Footer */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500">
                Report generated by: {selectedAudit.createdBy} • 
                Check performed on: {selectedAudit.date} • 
                CoreTrack Inventory Management System
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-6">
              {selectedAudit.itemsWithIssues > 0 && selectedAudit.status === 'needs-review' && (
                <button
                  onClick={() => applyToInventory(selectedAudit)}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Apply actual counts to your inventory system"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Applying Changes...' : 'Apply to Inventory'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedAudit(null);
                }}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
