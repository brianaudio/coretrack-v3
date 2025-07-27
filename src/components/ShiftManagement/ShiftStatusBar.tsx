'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useUser } from '../../lib/rbac/UserContext';

interface ShiftData {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed';
  staffOnDuty: string[];
  startedBy: string;
}

export default function ShiftStatusBar() {
  const { currentUser } = useUser();
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'staff') {
      checkActiveShift();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const checkActiveShift = async () => {
    if (!currentUser?.email) return;

    try {
      const tenantId = currentUser.email.split('@')[0] || 'demo-tenant';
      const today = new Date().toISOString().split('T')[0];
      
      const shiftsRef = collection(db, `tenants/${tenantId}/shifts`);
      const q = query(
        shiftsRef,
        where('date', '==', today),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const shiftDoc = snapshot.docs[0];
        setActiveShift({ id: shiftDoc.id, ...shiftDoc.data() } as ShiftData);
      }
    } catch (error) {
      console.error('Error checking active shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const endShift = async () => {
    if (!activeShift || !currentUser?.email) return;

    try {
      const tenantId = currentUser.email.split('@')[0] || 'demo-tenant';
      const shiftRef = doc(db, `tenants/${tenantId}/shifts`, activeShift.id);
      
      await updateDoc(shiftRef, {
        endTime: new Date().toISOString(),
        status: 'completed',
        updatedAt: new Date().toISOString()
      });

      setActiveShift(null);
      console.log('✅ Shift ended successfully');
    } catch (error) {
      console.error('Error ending shift:', error);
    }
  };

  // Only show for staff members
  if (currentUser?.role !== 'staff' || loading) {
    return null;
  }

  // Show active shift status
  if (activeShift) {
    const startTime = new Date(activeShift.startTime);
    const duration = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60)); // minutes

    return (
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse"></div>
              <span className="font-medium">Shift Active</span>
            </div>
            <div className="text-green-100">
              Started: {startTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-green-100">
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
            </div>
          </div>
          <button
            onClick={endShift}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            End Shift
          </button>
        </div>
      </div>
    );
  }

  // No active shift
  return null;
}
