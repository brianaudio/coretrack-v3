// Quick test to verify branch selector functionality
console.log('🔧 Testing branch selector functionality...');

// Test in browser console:
// 1. Open browser dev tools
// 2. Go to localhost:3000 
// 3. Check if BranchContext is properly using switchBranch instead of setSelectedBranch
// 4. Look for debug messages when clicking branch selector dropdown

console.log('Manual testing steps:');
console.log('1. Open browser at localhost:3000');
console.log('2. Open dev tools console');
console.log('3. Click on branch selector dropdown');
console.log('4. Select a different branch');
console.log('5. Check console for "Manually selecting branch" debug messages');
console.log('6. Verify branch switching is working properly');

// The fix:
// - Changed BranchSelector to use switchBranch() instead of setSelectedBranch()
// - switchBranch() has proper state management, cache clearing, and audit logging
// - setSelectedBranch() was just a simple state setter without the full logic
