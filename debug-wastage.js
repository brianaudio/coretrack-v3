// Debug what's happening in the current session
// This will be integrated into the WastageTracker to show debugging info

const debugInfo = {
  location: "WastageTracker component",
  timestamp: new Date().toISOString(),
  checks: [
    "1. Check if inventoryItems prop is being received",
    "2. Check if items have currentStock > 0", 
    "3. Check if dropdown is properly populated",
    "4. Check location ID format"
  ]
};

console.log("🐛 WASTAGE TRACKER DEBUG:", debugInfo);

// To be added to WastageTracker component:
/*
  useEffect(() => {
    console.log("🐛 WastageTracker Debug:", {
      propInventoryItems: propInventoryItems?.length || 0,
      localInventoryItems: inventoryItems?.length || 0,
      selectedBranch: selectedBranch,
      profile: profile?.tenantId,
      itemsWithStock: inventoryItems?.filter(item => (item.currentStock || 0) > 0)?.length || 0
    });
  }, [propInventoryItems, inventoryItems, selectedBranch, profile]);
*/
