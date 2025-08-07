// Quick browser console debug - paste this in browser dev tools at localhost:3002
// This will help us see what's happening with branch switching

console.log('🔧 Branch Switching Debug - Quick Check');

// Check if BranchContext is loaded
if (window.React) {
  console.log('✅ React is loaded');
} else {
  console.log('❌ React not found');
}

// Check current branch data
setTimeout(() => {
  const branchDropdown = document.querySelector('[data-testid="branch-selector"]') || 
                        document.querySelector('.branch-selector') ||
                        document.querySelector('button[class*="branch"]');
  
  if (branchDropdown) {
    console.log('✅ Found branch selector element');
    console.log('Element:', branchDropdown);
  } else {
    console.log('❌ Branch selector element not found');
  }

  // Try to find dropdown options
  const dropdownOptions = document.querySelectorAll('button[class*="branch"], [role="option"]');
  console.log(`Found ${dropdownOptions.length} potential branch options`);
  
  dropdownOptions.forEach((option, index) => {
    console.log(`Option ${index + 1}:`, option.textContent?.trim());
  });

}, 2000);

console.log('💡 Steps to test:');
console.log('1. Click the branch selector dropdown');
console.log('2. Look for options in the dropdown');
console.log('3. Try clicking on any branch option');
console.log('4. Watch this console for any error messages');
