// UX Enhancement Components for CoreTrack
// Touch-optimized tooltips, guided tours, and contextual help for iPad/Android web app

// Core tooltip component with touch support
export { Tooltip } from './Tooltip'

// Guided tour system for feature walkthroughs
export { GuidedTour, useTour } from './GuidedTour'
export type { TourStep } from './GuidedTour'

// Help system integration
export { HelpSystem, inventoryTourSteps, posTourSteps } from './HelpSystem'

// Help menu dropdown for page headers
export { HelpMenu, FloatingHelpButton } from './HelpMenu'

// Contextual hints for first-time users
export { ContextualHints } from './ContextualHints'

// Usage examples and integration guide:

/*
=== TOOLTIP USAGE ===
<Tooltip content="This button saves your changes" position="top" trigger="touch">
  <button>Save</button>
</Tooltip>

=== GUIDED TOUR USAGE ===
// In your page component:
import { HelpSystem } from '@/components/ui/ux-enhancements'

<div className="page-header">
  <h1>Inventory Center</h1>
  <HelpSystem tourId="inventory" autoStart={true} />
</div>

=== HELP MENU USAGE ===
// In your page header:
<HelpMenu 
  tourId="inventory" 
  helpLinks={[
    {
      title: 'Inventory Guide',
      description: 'Learn inventory management best practices',
      action: () => openInventoryGuide()
    }
  ]} 
/>

=== CONTEXTUAL HINTS USAGE ===
// Add to your page layout:
<ContextualHints page="inventory" />

=== DATA ATTRIBUTES FOR TOURS ===
Add these data attributes to your components for tour targeting:

// Inventory
<button data-tour="add-inventory-btn">Add Item</button>
<input data-tour="search-bar" placeholder="Search inventory..." />
<select data-tour="category-filter">...</select>
<button data-tour="low-stock-toggle">Show Low Stock</button>
<div data-tour="inventory-table">...</div>

// POS
<div data-tour="menu-items">...</div>
<div data-tour="order-summary">...</div>
<button data-tour="checkout-btn">Checkout</button>

*/
