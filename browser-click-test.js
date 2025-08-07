// Simple branch selector click test
// Add this to browser console to test if clicks are being captured

console.log('🔧 BRANCH SELECTOR CLICK TEST');
console.log('============================================================');

// Find the branch selector button
const branchButton = document.querySelector('button[class*="flex items-center space-x-3 bg-white border"]');

if (branchButton) {
  console.log('✅ Found branch selector button');
  
  // Add click listener to test
  branchButton.addEventListener('click', function(e) {
    console.log('🎯 Branch selector clicked!', e);
  });
  
  // Try clicking programmatically
  console.log('🔄 Trying programmatic click...');
  branchButton.click();
  
} else {
  console.log('❌ Branch selector button not found');
  console.log('Available buttons:', document.querySelectorAll('button'));
}

// Check if dropdown menu appears
setTimeout(() => {
  const dropdown = document.querySelector('div[class*="absolute top-full left-0 mt-2"]');
  if (dropdown) {
    console.log('✅ Dropdown menu found and visible');
  } else {
    console.log('❌ Dropdown menu not found');
  }
}, 500);
