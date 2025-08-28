#!/bin/bash
# Script to revert getActiveShift to use the optimized query once index is ready

echo "🚀 Reverting getActiveShift to use optimized Firebase query..."

# Create the optimized version
cat > temp_optimized_shift.ts << 'EOF'
export async function getActiveShift(tenantId: string, locationId: string): Promise<ShiftData | null> {
  try {
    await waitForOfflinePersistence()
    const shiftsRef = collection(db, 'tenants', tenantId, 'shifts')
    const q = query(
      shiftsRef,
      where('locationId', '==', locationId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data()
    } as ShiftData
  } catch (error) {
    console.error('Error getting active shift:', error)
    throw error
  }
}
EOF

echo "📝 Optimized query code saved to temp_optimized_shift.ts"
echo "🔄 Once your Firebase index is ready (status shows 'Enabled'), you can:"
echo "   1. Replace the getActiveShift function in src/lib/firebase/shifts.ts"
echo "   2. Use the code from temp_optimized_shift.ts"
echo ""
echo "🎯 This will give you optimal performance with server-side filtering!"

# Clean up
rm temp_optimized_shift.ts
