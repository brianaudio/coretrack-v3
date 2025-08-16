'use client'

import { useShift } from '@/lib/context/ShiftContext'

export default function ShiftDebugger() {
  const shiftContext = useShift()
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <h3 className="font-bold mb-2">🔍 Shift Debug</h3>
      <div className="space-y-1">
        <div>Loading: {String(shiftContext.loading)}</div>
        <div>isShiftActive: {String(shiftContext.isShiftActive)}</div>
        <div>currentShift: {shiftContext.currentShift ? 'EXISTS' : 'NULL'}</div>
        <div>Shift Status: {shiftContext.currentShift?.status || 'N/A'}</div>
        <div>Shift Name: {shiftContext.currentShift?.name || 'N/A'}</div>
        <div>Shift ID: {shiftContext.currentShift?.id?.slice(0, 8) || 'N/A'}</div>
      </div>
    </div>
  )
}
