console.log('Checking for focus lock issues...'); 
// Try to close any stuck modals
document.querySelectorAll('[role="dialog"]').forEach(modal => { 
  console.log('Found modal:', modal); 
  modal.style.display = 'none'; 
}); 
// Remove any focus traps
document.querySelectorAll('[data-focus-lock]').forEach(trap => { 
  console.log('Found focus trap:', trap); 
  trap.removeAttribute('data-focus-lock'); 
});
// Check for help modal specifically
if (window.helpContext) { 
  console.log('Closing help context...'); 
  window.helpContext.hideHelp(); 
}
