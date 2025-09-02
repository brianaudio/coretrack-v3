'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { 
  getMenuItems, 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  getMenuCategories,
  type MenuItem,
  type MenuCategory,
  type CreateMenuItem,
  type MenuIngredient
} from '../../lib/firebase/menuBuilder'
import { 
  getInventoryItems,
  type InventoryItem
} from '../../lib/firebase/inventory'
import {
  getAddons,
  createAddon,
  updateAddon,
  deleteAddon,
  toggleAddonStatus,
  type Addon,
  type CreateAddon
} from '../../lib/firebase/addons'
import {
  syncMenuItemToPOS,
  handleMenuItemUpdate,
  handleMenuItemDeletion,
  getAffectedMenuItems
} from '../../lib/firebase/integration'
import { startRealTimeMenuCostSync, stopRealTimeMenuCostSync } from '../../lib/firebase/realTimeMenuCostSync'
import RealTimeSyncStatus from '../ui/RealTimeSyncStatus'

// Category to Icon mapping for seamless selection
const CATEGORY_ICON_MAP: Record<string, string[]> = {
  'Coffee': ['☕', '�', '🤎', '🍵', '�🥤', '🫖', '🧋', '☕', '�', '�', '�', '☕'],
  'Tea': ['🫖', '🍵', '🧋', '🍃', '🌿', '🟫', '☕', '🍯', '�', '🥛', '🌱', '🍶'],
  'Cold Drinks': ['🥤', '🧃', '🥛', '🍹', '🧊', '💧', '🫗', '🍻', '🥤', '🍸', '🥃', '🍺'],
  'Desserts': ['🧁', '🍰', '🎂', '🍪', '🍩', '🍮', '🍫', '🍬', '🍭', '🧁', '🍰', '🎂'],
  'Appetizers': ['🍟', '🥨', '🧀', '🥜', '🍿', '🥖', '🫓', '🥙', '🫒', '🥯', '🧅', '🥖'],
  'Main Course': ['🍔', '🍕', '🍝', '🍜', '🍛', '🥗', '🌮', '🥩', '🍖', '🍗', '🥘', '🍲'],
  'Breakfast': ['🍳', '🥞', '🧇', '🥓', '🥖', '🍞', '🥐', '☕', '🧈', '🥯', '🍯', '🥛'],
  'Salads': ['🥗', '🥬', '🍃', '🫒', '🥒', '🍅', '🫑', '🥕', '🥦', '🌶️', '🧄', '🧅'],
  'Sandwiches': ['🥪', '🍔', '🌭', '🥙', '🫓', '🥖', '🍞', '🧀', '🥯', '🌯', '🥪', '🍔'],
  'Pizza': ['🍕', '🫓', '🧀', '🍅', '🫒', '🌿', '🍄', '🥓', '🍕', '🌶️', '🧄', '🥩'],
  'Pasta': ['🍝', '🍜', '🧀', '🍅', '🌿', '🥄', '🫒', '🧄', '🍝', '🍲', '🥘', '🌶️'],
  'Burgers': ['🍔', '🍟', '🥓', '🧀', '🍅', '🥬', '🥒', '🧅', '🍔', '🌭', '🥪', '🥩'],
  'Sides': ['🍟', '🥨', '🧀', '🥖', '🍿', '🫓', '🥜', '🧅', '🥯', '🫒', '🌶️', '🥕'],
  'Beverages': ['🥤', '☕', '🧋', '🍹', '🧃', '🥛', '🫖', '💧', '🍶', '🍸', '🥃', '🍻'],
  'Alcohol': ['🍻', '🍷', '🥂', '🍸', '🍺', '🥃', '🍾', '🍹', '🍻', '🍷', '🥂', '🍸'],
  'Smoothies': ['🥤', '🍓', '🍌', '🥭', '🫐', '🍑', '🥝', '🧊', '🍇', '🍊', '🍍', '🥥'],
  'Bakery': ['🥐', '🥖', '🍞', '🧁', '🍪', '🥯', '🫓', '🍩', '🥧', '🧈', '🍯', '🥐'],
  'Soups': ['🍜', '🥣', '🫕', '🥄', '🧄', '🥕', '🧅', '🌿', '🍲', '🥘', '🍜', '🥣'],
  'Default': ['🍽️', '🥘', '🍴', '🥄', '🍶', '🫖', '🥪', '🍱', '🍽️', '🥘', '🍴', '🥄']
}

// Comprehensive food emoji collection for free icon selection
const ALL_FOOD_EMOJIS = [
  // Fruits
  '🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑',
  
  // Vegetables
  '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🍆', '🥔', '🧄', '🧅', '🍄', '🥜', '🌰', '🫘',
  
  // Grains & Bread
  '🍞', '🥖', '🥨', '🥯', '🥐', '🧈', '🫓', '🥪', '🌯', '🌮', '🥙',
  
  // Proteins & Meat
  '🥩', '🍖', '🍗', '🥓', '🍳', '🧀', '🥚',
  
  // Seafood
  '🍤', '🦐', '🦀', '🐟', '🐠', '🍣', '🍱', '🥟',
  
  // Prepared Foods
  '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥘', '🍲', '🥗', '🍝', '🍜', '🍛', '🍱', '🍘', '🍙', '🍚', '🥮',
  
  // Desserts & Sweets
  '🧁', '🍰', '🎂', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🥧', '🧊', '🍨', '🍧',
  
  // Beverages
  '☕', '🫖', '🍵', '🧋', '🥤', '🧃', '🥛', '🍼', '🫗', '🍺', '🍻', '🍷', '🥂', '🍸', '🍹', '🍾', '🥃', '🧉',
  
  // Utensils & Dining
  '🍽️', '🥄', '🥢', '🍴', '🔪', '🏺', '🍶', '🥣', '🥡', '🧂', '🍯'
]

// Helper function to get default icon (just return the first food emoji)
const getDefaultIcon = (): string => {
  return ALL_FOOD_EMOJIS[0] // Returns 🍎
}

// Seamless Icon Selector Component
interface CategoryIconSelectorProps {
  category: string
  selectedIcon: string
  onIconChange: (icon: string) => void
}

function CategoryIconSelector({ category, selectedIcon, onIconChange }: CategoryIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  
  // Auto-select default icon when no icon is selected
  useEffect(() => {
    if (!selectedIcon) {
      onIconChange(getDefaultIcon())
    }
  }, [selectedIcon, onIconChange])

  // Update button position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect())
    }
  }, [isOpen])

  // Close dropdown when pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    const handleScroll = (e: Event) => {
      if (isOpen) {
        // Only close if scrolling outside the dropdown
        const target = e.target as Element
        const dropdownElement = document.querySelector('[data-dropdown-content="true"]')
        
        // If scrolling inside the dropdown, don't close
        if (dropdownElement && (dropdownElement.contains(target) || dropdownElement === target)) {
          return
        }
        
        // Close if scrolling outside the dropdown
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      window.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('keydown', handleEscape)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen])

  const handleIconSelect = (icon: string) => {
    onIconChange(icon)
    setIsOpen(false)
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative">
        <div className="flex items-center gap-4 w-full">
          <div className="flex items-center bg-slate-50 rounded-xl p-3 min-w-[80px] justify-center">
            <div className="text-3xl select-none">{selectedIcon || getDefaultIcon()}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-700 mb-1">Menu Item Icon</div>
            <button
              ref={buttonRef}
              type="button"
              onClick={handleToggle}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-1 py-0.5"
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              Choose from {ALL_FOOD_EMOJIS.length} Food Emojis
              <svg 
                className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Portal-rendered dropdown to escape modal stacking context */}
      {isOpen && buttonRect && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 bg-transparent z-[9999]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel positioned absolutely relative to button */}
          <div 
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 p-4 sm:p-6 z-[10000] min-w-[320px] max-w-[90vw] sm:min-w-[500px] sm:max-w-[600px]"
            data-dropdown-content="true"
            style={{
              top: buttonRect.bottom + window.scrollY + 8,
              left: Math.max(16, Math.min(buttonRect.left + window.scrollX, window.innerWidth - 600))
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-600 font-medium">Choose any food emoji for your menu item:</div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close emoji selector"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div 
              className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-60 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
              data-dropdown-content="true"
            >
              {ALL_FOOD_EMOJIS.map((icon, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleIconSelect(icon)}
                  className={`p-2 text-xl sm:text-2xl rounded-lg transition-all hover:bg-blue-50 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    selectedIcon === icon 
                      ? 'bg-blue-100 ring-2 ring-blue-500 shadow-sm' 
                      : 'bg-slate-50 hover:bg-blue-50 hover:shadow-sm'
                  }`}
                  title={`Select ${icon}`}
                  aria-label={`Select ${icon} emoji`}
                >
                  {icon}
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Showing {ALL_FOOD_EMOJIS.length} food emojis • Click any emoji to select
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default function MenuBuilder() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [showCreateAddonModal, setShowCreateAddonModal] = useState(false);
  const [newAddon, setNewAddon] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    inventoryItemId: '', // Keep for backward compatibility
    inventoryItemName: '', // Keep for backward compatibility  
    inventoryQuantity: 1, // Keep for backward compatibility
    ingredients: [] as Array<{
      inventoryItemId: string;
      inventoryItemName: string;
      quantity: number;
      unit: string;
      cost: number;
    }>
  });
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addonSearchQuery, setAddonSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState<'menu-items' | 'addons'>('menu-items')

  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    emoji: '',
    ingredients: [] as MenuIngredient[]
  })

  // Auto-update emoji when category changes
  useEffect(() => {
    if (newItem.category && !newItem.emoji) {
      const defaultIcon = getDefaultIcon()
      setNewItem(prev => ({ ...prev, emoji: defaultIcon }))
    }
  }, [newItem.category])

  // Load menu items and categories
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch) return

    let handleMenuCostUpdate: (event: CustomEvent) => void

    const loadData = async () => {
      try {
        setLoading(true)
        const locationId = getBranchLocationId(selectedBranch.id)
        
        console.log(`🚨 DEEP DIVE: Loading data for branch "${selectedBranch.name}" (ID: ${selectedBranch.id})`)
        console.log(`🎯 Expected locationId: ${locationId}`)
        console.log(`🏢 TenantId: ${profile.tenantId}`)
        
        // Clear existing menu items first to prevent contamination
        setMenuItems([])
        console.log(`🧹 Cleared existing menu items`)
        
        const [itemsData, categoriesData, inventoryData, addonsData] = await Promise.all([
          getMenuItems(profile.tenantId, locationId),
          getMenuCategories(profile.tenantId, locationId), // FIX: Add locationId here too
          getInventoryItems(profile.tenantId, locationId),
          getAddons(profile.tenantId, locationId)
        ])
        
        console.log(`🔍 DEEP DIVE: Raw data received:`)
        console.log(`   Menu Items: ${itemsData.length}`)
        itemsData.forEach((item: any, index: number) => {
          console.log(`     ${index + 1}. "${item.name}" - locationId: ${item.locationId}`)
        })
        
        // SECURITY CHECK: Verify all items belong to current branch
        const wrongItems = itemsData.filter((item: any) => item.locationId !== locationId)
        if (wrongItems.length > 0) {
          console.error(`🚨 SECURITY BREACH: ${wrongItems.length} items don't belong to current branch!`)
          wrongItems.forEach((item: any) => {
            console.error(`   - "${item.name}" has locationId: ${item.locationId}, expected: ${locationId}`)
          })
        } else {
          console.log(`✅ SECURITY CHECK PASSED: All ${itemsData.length} items belong to current branch`)
        }
        console.log('📊 MenuBuilder: Raw data loaded:', {
          menuItems: itemsData.length,
          categories: categoriesData.length,
          inventory: inventoryData.length,
          addons: addonsData.length,
          addonsData
        })
        setMenuItems(itemsData)
        setCategories(categoriesData)
        setInventoryItems(inventoryData)
        setAddons(addonsData)
        console.log('📊 MenuBuilder: State updated, addons.length should be:', addonsData.length)

        // 🚀 START REAL-TIME MENU COST SYNCHRONIZATION
        console.log('🔄 Starting real-time menu cost synchronization...')
        startRealTimeMenuCostSync(profile.tenantId, locationId)

        // Listen for menu cost updates
        handleMenuCostUpdate = (event: CustomEvent) => {
          console.log('💰 Menu costs updated automatically:', event.detail)
          // Refresh menu items to show updated costs
          setTimeout(() => loadData(), 1000) // Small delay to ensure Firebase has processed updates
        }

        window.addEventListener('menuCostsUpdated', handleMenuCostUpdate as EventListener)

        // Cleanup function will be handled in useEffect cleanup
      } catch (error) {
        console.error('Error loading menu data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Cleanup function for real-time sync
    return () => {
      if (profile?.tenantId && selectedBranch) {
        const locationId = getBranchLocationId(selectedBranch.id)
        console.log('🛑 Stopping real-time menu cost sync for location:', locationId)
        stopRealTimeMenuCostSync(profile.tenantId, locationId)
        
        // Remove event listener
        if (handleMenuCostUpdate) {
          window.removeEventListener('menuCostsUpdated', handleMenuCostUpdate as EventListener)
        }
      }
    }
  }, [profile?.tenantId, selectedBranch?.id])

  // Debug addons state changes
  useEffect(() => {
    console.log('🔍 MenuBuilder: addons state changed, length =', addons.length, 'addons =', addons)
  }, [addons])

  const handleCreateMenuItem = async () => {
    if (!profile?.tenantId || !newItem.name || !newItem.category || !newItem.price || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const itemData: CreateMenuItem = {
        name: newItem.name,
        description: newItem.description,
        category: newItem.category,
        price: newItem.price,
        emoji: newItem.emoji,
        ingredients: newItem.ingredients,
        preparationTime: 0, // Default value
        calories: 0, // Default value  
        allergens: [], // Default empty array
        tenantId: profile.tenantId,
        locationId // Add branch-specific locationId
      }

      const newMenuItemId = await addMenuItem(itemData)
      
      // Refresh menu items to include the newly created item
      const updatedItems = await getMenuItems(profile.tenantId, locationId)
      const createdItem = updatedItems.find(item => item.id === newMenuItemId)
      
      if (createdItem) {
        // Sync to POS automatically (silent sync)
        try {
          await syncMenuItemToPOS(createdItem)
          console.log('✅ Menu item created and synced to POS:', createdItem.name)
        } catch (syncError) {
          console.error('❌ Error syncing to POS:', syncError)
          // Don't alert user about sync errors, just log them
        }
      }
      
      setMenuItems(updatedItems)
      
      // Reset form
      setNewItem({
        name: '',
        description: '',
        category: '',
        price: 0,
        cost: 0,
        emoji: '',
        ingredients: []
      })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating menu item:', error)
      alert('Error creating menu item. Please try again.')
    }
  }

  const handleUpdateMenuItem = async () => {
    if (!profile?.tenantId || !editingItem) return

    try {
      await updateMenuItem(profile.tenantId, editingItem.id!, {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        emoji: editingItem.emoji, // Include emoji in updates
        status: editingItem.status,
        ingredients: editingItem.ingredients
      })
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === editingItem.id ? editingItem : item
      ))
      
      // Sync changes to POS (silent sync)
      try {
        await handleMenuItemUpdate(editingItem)
        console.log('✅ Menu item updated and synced to POS:', editingItem.name)
      } catch (syncError) {
        console.error('❌ Error syncing update to POS:', syncError)
      }
      
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating menu item:', error)
      alert('Error updating menu item. Please try again.')
    }
  }

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this menu item?')) return

    try {
      await deleteMenuItem(profile.tenantId, itemId)
      
      // Remove from POS system (silent sync)
      try {
        await handleMenuItemDeletion(profile.tenantId, itemId)
        console.log('✅ Menu item deleted and removed from POS')
      } catch (syncError) {
        console.error('❌ Error removing from POS:', syncError)
      }
      
      setMenuItems(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Error deleting menu item. Please try again.')
    }
  }

  // Manual emoji sync function
  const handleManualEmojiSync = async () => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      console.log('🎨 Starting manual emoji sync...')
      
      let synced = 0
      
      for (const item of menuItems) {
        if (item.emoji) {
          try {
            // Import Firebase functions
            const { doc, setDoc } = await import('firebase/firestore')
            const { db } = await import('../../lib/firebase')
            const { serverTimestamp } = await import('firebase/firestore')
            
            // Sync to POS collection
            await setDoc(
              doc(db, 'pos', `${profile.tenantId}_${locationId}`, 'menuItems', item.id!),
              {
                ...item,
                emoji: item.emoji,
                lastUpdated: serverTimestamp()
              },
              { merge: true }
            )
            
            console.log(`✅ Synced "${item.name}" with emoji "${item.emoji}"`)
            synced++
          } catch (error) {
            console.error(`❌ Failed to sync "${item.name}":`, error)
          }
        }
      }
      
      console.log(`🎉 Manual emoji sync complete! Synced ${synced} items`)
      alert(`Emoji sync complete! Synced ${synced} items to POS.`)
      
    } catch (error) {
      console.error('❌ Manual emoji sync failed:', error)
      alert('Emoji sync failed. Please try again.')
    }
  }

  // Addon handlers
  const handleDeleteAddon = async (addonId: string) => {
    if (!profile?.tenantId || !confirm('Are you sure you want to delete this add-on?')) return

    try {
      await deleteAddon(profile.tenantId, addonId)
      setAddons(prev => prev.filter(addon => addon.id !== addonId))
    } catch (error) {
      console.error('Error deleting add-on:', error)
      alert('Error deleting add-on. Please try again.')
    }
  }

  const handleEditAddon = (addon: Addon) => {
    setEditingAddon(addon)
  }

  const handleUpdateAddon = async () => {
    if (!profile?.tenantId || !editingAddon) return

    try {
      const updateData: any = {
        name: editingAddon.name,
        description: editingAddon.description,
        price: editingAddon.price,
        cost: editingAddon.cost
      }

      // Handle ingredients if they exist
      if (editingAddon.ingredients && editingAddon.ingredients.length > 0) {
        updateData.ingredients = editingAddon.ingredients.map(ingredient => ({
          inventoryItemId: ingredient.inventoryItemId,
          inventoryItemName: ingredient.inventoryItemName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          costPerUnit: ingredient.costPerUnit
        }))
      } else {
        // Handle legacy single inventory item
        const inventoryItem = inventoryItems.find(item => item.id === editingAddon.inventoryItemId)
        if (inventoryItem) {
          updateData.inventoryItemId = editingAddon.inventoryItemId
          updateData.inventoryItemName = inventoryItem.name
          updateData.inventoryQuantity = editingAddon.inventoryQuantity
        }
      }

      await updateAddon(profile.tenantId, editingAddon.id, updateData)
      
      // Reload addons to get fresh data
      const locationId = getBranchLocationId(selectedBranch?.id || '')
      const updatedAddons = await getAddons(profile.tenantId, locationId)
      setAddons(updatedAddons)
      
      setEditingAddon(null)
    } catch (error) {
      console.error('Error updating add-on:', error)
      alert('Error updating add-on. Please try again.')
    }
  }

  const handleToggleAddon = async (addon: Addon) => {
    if (!profile?.tenantId) return

    try {
      const newStatus = addon.status === 'active' ? 'inactive' : 'active'
      await updateAddon(profile.tenantId, addon.id, { status: newStatus })
      setAddons(prev => prev.map(a => 
        a.id === addon.id ? { ...a, status: newStatus } : a
      ))
    } catch (error) {
      console.error('Error toggling add-on status:', error)
      alert('Error updating add-on status. Please try again.')
    }
  }

  const handleCreateAddon = async () => {
    if (!profile?.tenantId || !selectedBranch?.id || !newAddon.name) return
    
    // Validate that we have either ingredients or a single inventory item
    if (newAddon.ingredients.length === 0 && !newAddon.inventoryItemId) {
      alert('Please add at least one ingredient or select a single inventory item.')
      return
    }

    try {
      const addonData: any = {
        name: newAddon.name,
        description: newAddon.description,
        price: newAddon.price,
        cost: newAddon.cost,
        status: 'active' as const
      }

      // If using multiple ingredients, include them
      if (newAddon.ingredients.length > 0) {
        addonData.ingredients = newAddon.ingredients.map(ingredient => ({
          inventoryItemId: ingredient.inventoryItemId,
          inventoryItemName: ingredient.inventoryItemName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          costPerUnit: (inventoryItems.find(item => item.id === ingredient.inventoryItemId)?.costPerUnit || 0)
        }))
      } else {
        // Fallback to single inventory item for backward compatibility
        const inventoryItem = inventoryItems.find(item => item.id === newAddon.inventoryItemId)
        if (inventoryItem) {
          addonData.inventoryItemId = newAddon.inventoryItemId
          addonData.inventoryItemName = inventoryItem.name
          addonData.inventoryQuantity = newAddon.inventoryQuantity
        }
      }

      const locationId = getBranchLocationId(selectedBranch.id)
      await createAddon(profile.tenantId, locationId, addonData)
      
      // Reset form and close modal using the reset function
      resetAddonForm()
      
      // Reload addons
      const updatedAddons = await getAddons(profile.tenantId, locationId)
      setAddons(updatedAddons)
    } catch (error) {
      console.error('Error creating add-on:', error)
      alert('Error creating add-on. Please try again.')
    }
  }

  const handleDuplicateMenuItem = (item: MenuItem) => {
    // Copy all item details except the ID
    setNewItem({
      name: `${item.name} (Copy)`,
      description: item.description,
      category: item.category,
      price: item.price,
      cost: item.cost,
      emoji: item.emoji || '',
      ingredients: [...item.ingredients] // Deep copy the ingredients array
    })
    
    // Open the create modal
    setShowCreateModal(true)
  }

  // Bulk action functions
  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const filteredItems = getFilteredItems()
    setSelectedItems(new Set(filteredItems.map(item => item.id!)))
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Set())
  }

  const handleBulkStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    try {
      const updatePromises = Array.from(selectedItems).map(itemId =>
        updateMenuItem(profile.tenantId, itemId, { status: newStatus })
      )
      
      await Promise.all(updatePromises)
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        selectedItems.has(item.id!) ? { ...item, status: newStatus } : item
      ))
      
      // Clear selection
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error) {
      console.error('Error updating items status:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (!profile?.tenantId || selectedItems.size === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedItems.size} product(s)?`
    if (!confirm(confirmMessage)) return
    
    try {
      const deletePromises = Array.from(selectedItems).map(itemId =>
        deleteMenuItem(profile.tenantId, itemId)
      )
      
      await Promise.all(deletePromises)
      
      // Update local state
      setMenuItems(prev => prev.filter(item => !selectedItems.has(item.id!)))
      
      // Clear selection
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error) {
      console.error('Error deleting items:', error)
    }
  }

  // Sorting functions
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const getSortLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      name: 'Name',
      price: 'Price',
      cost: 'Cost',
      margin: 'Profit Margin',
      category: 'Category',
      status: 'Status'
    }
    return labels[field] || field
  }

  const toggleStatus = async (item: MenuItem) => {
    if (!profile?.tenantId) return

    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active'
      await updateMenuItem(profile.tenantId, item.id!, { status: newStatus })
      
      // Update local state
      setMenuItems(prev => prev.map(menuItem => 
        menuItem.id === item.id ? { ...menuItem, status: newStatus } : menuItem
      ))
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  // Helper functions for ingredient management
  const addIngredient = () => {
    setNewItem(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }]
    }))
  }

  const updateIngredient = (index: number, field: keyof MenuIngredient, value: any) => {
    setNewItem(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i !== index) return ingredient
        
        const updatedIngredient = { ...ingredient, [field]: value }
        
        // Auto-populate details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
          const inventoryItem = inventoryItems.find(item => item.id === value)
          if (inventoryItem) {
            updatedIngredient.inventoryItemName = inventoryItem.name
            updatedIngredient.unit = inventoryItem.unit
            updatedIngredient.cost = (inventoryItem.costPerUnit || 0) * updatedIngredient.quantity
          }
        }
        
        // Recalculate cost when quantity changes
        if (field === 'quantity') {
          const inventoryItem = inventoryItems.find(item => item.id === updatedIngredient.inventoryItemId)
          if (inventoryItem && inventoryItem.costPerUnit) {
            updatedIngredient.cost = inventoryItem.costPerUnit * value
          }
        }
        
        return updatedIngredient
      }),
      // Auto-calculate total cost
      cost: prev.ingredients.reduce((total, ing, i) => {
        if (i === index) {
          const inventoryItem = inventoryItems.find(item => item.id === (field === 'inventoryItemId' ? value : ing.inventoryItemId))
          if (inventoryItem && inventoryItem.costPerUnit) {
            return total + (inventoryItem.costPerUnit * (field === 'quantity' ? value : ing.quantity))
          }
        }
        return total + ing.cost
      }, 0)
    }))
  }

  const removeIngredient = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
      cost: prev.ingredients
        .filter((_, i) => i !== index)
        .reduce((total, ing) => total + ing.cost, 0)
    }))
  }

  // Helper functions for ingredient management in edit mode
  const addIngredientToEdit = () => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }]
    }) : null)
  }

  const updateIngredientInEdit = (index: number, field: keyof MenuIngredient, value: any) => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => {
        if (i !== index) return ingredient
        
        const updatedIngredient = { ...ingredient, [field]: value }
        
        // Auto-populate details when inventory item is selected
        if (field === 'inventoryItemId' && value) {
          const inventoryItem = inventoryItems.find(item => item.id === value)
          if (inventoryItem) {
            updatedIngredient.inventoryItemName = inventoryItem.name
            updatedIngredient.unit = inventoryItem.unit
            updatedIngredient.cost = (inventoryItem.costPerUnit || 0) * updatedIngredient.quantity
          }
        }
        
        // Recalculate cost when quantity changes
        if (field === 'quantity') {
          const inventoryItem = inventoryItems.find(item => item.id === updatedIngredient.inventoryItemId)
          if (inventoryItem && inventoryItem.costPerUnit) {
            updatedIngredient.cost = inventoryItem.costPerUnit * value
          }
        }
        
        return updatedIngredient
      })
    }) : null)
  }

  const removeIngredientFromEdit = (index: number) => {
    setEditingItem(prev => prev ? ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }) : null)
  }

  // Helper functions for addon ingredient management
  const addAddonIngredient = () => {
    setNewAddon(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        cost: 0
      }],
      cost: prev.ingredients.reduce((total, ing) => total + ing.cost, 0)
    }))
  }

  const updateAddonIngredient = (index: number, field: string, value: any) => {
    setNewAddon(prev => {
      const updatedIngredients = prev.ingredients.map((ingredient, i) => {
        if (i === index) {
          if (field === 'inventoryItemId') {
            const selectedItem = inventoryItems.find(item => item.id === value)
            if (selectedItem) {
              const cost = (selectedItem.costPerUnit || 0) * ingredient.quantity
              return {
                ...ingredient,
                inventoryItemId: value,
                inventoryItemName: selectedItem.name,
                unit: selectedItem.unit,
                cost: cost
              }
            }
          } else if (field === 'quantity') {
            const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventoryItemId)
            const cost = inventoryItem ? (inventoryItem.costPerUnit || 0) * value : 0
            return {
              ...ingredient,
              quantity: value,
              cost: cost
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
      
      return {
        ...prev,
        ingredients: updatedIngredients,
        cost: updatedIngredients.reduce((total, ing) => total + ing.cost, 0)
      }
    })
  }

  const removeAddonIngredient = (index: number) => {
    setNewAddon(prev => {
      const filteredIngredients = prev.ingredients.filter((_, i) => i !== index)
      return {
        ...prev,
        ingredients: filteredIngredients,
        cost: filteredIngredients.reduce((total, ing) => total + ing.cost, 0)
      }
    })
  }

  // Helper functions for addon ingredient management in edit mode
  const addAddonIngredientToEdit = () => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: [...(prev.ingredients || []), {
        inventoryItemId: '',
        inventoryItemName: '',
        quantity: 0,
        unit: '',
        costPerUnit: 0
      }]
    }) : null)
  }

  const updateAddonIngredientInEdit = (index: number, field: string, value: any) => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: (prev.ingredients || []).map((ingredient, i) => {
        if (i === index) {
          if (field === 'inventoryItemId') {
            const selectedItem = inventoryItems.find(item => item.id === value)
            if (selectedItem) {
              return {
                ...ingredient,
                inventoryItemId: value,
                inventoryItemName: selectedItem.name,
                unit: selectedItem.unit,
                costPerUnit: selectedItem.costPerUnit || 0
              }
            }
          }
          return { ...ingredient, [field]: value }
        }
        return ingredient
      })
    }) : null)
  }

  const removeAddonIngredientFromEdit = (index: number) => {
    setEditingAddon(prev => prev ? ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }) : null)
  }

  // Helper function to reset addon form
  const resetAddonForm = () => {
    setNewAddon({
      name: '',
      description: '',
      price: 0,
      cost: 0,
      inventoryItemId: '',
      inventoryItemName: '',
      inventoryQuantity: 1,
      ingredients: []
    })
    setShowCreateAddonModal(false)
  }

  // Inventory Integration Helper Functions
  const calculateMaxServings = (item: MenuItem) => {
    if (item.ingredients.length === 0) return Infinity
    
    let maxServings = Infinity
    
    for (const ingredient of item.ingredients) {
      const inventoryItem = inventoryItems.find(inv => inv.id === ingredient.inventoryItemId)
      if (inventoryItem) {
        const servingsFromThisIngredient = Math.floor(inventoryItem.currentStock / ingredient.quantity)
        maxServings = Math.min(maxServings, servingsFromThisIngredient)
      } else {
        // If ingredient not found in inventory, assume 0 servings possible
        maxServings = 0
      }
    }
    
    return maxServings === Infinity ? 0 : maxServings
  }

  const getStockStatus = (item: MenuItem) => {
    const maxServings = calculateMaxServings(item)
    
    if (maxServings === 0) return 'out_of_stock'
    if (maxServings <= 5) return 'low_stock'
    if (maxServings <= 10) return 'medium_stock'
    return 'in_stock'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      case 'low_stock': return 'bg-orange-100 text-orange-800'
      case 'medium_stock': return 'bg-yellow-100 text-yellow-800'
      case 'in_stock': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStockStatusText = (status: string, maxServings: number) => {
    switch (status) {
      case 'out_of_stock': return 'Out of Stock'
      case 'low_stock': return `Low Stock (${maxServings})`
      case 'medium_stock': return `Medium Stock (${maxServings})`
      case 'in_stock': return `In Stock (${maxServings > 50 ? '50+' : maxServings})`
      default: return 'Unknown'
    }
  }

  const getLowStockIngredients = (item: MenuItem) => {
    const lowStockIngredients = []
    
    for (const ingredient of item.ingredients) {
      const inventoryItem = inventoryItems.find(inv => inv.id === ingredient.inventoryItemId)
      if (inventoryItem) {
        const servingsFromThisIngredient = Math.floor(inventoryItem.currentStock / ingredient.quantity)
        if (servingsFromThisIngredient <= 5) {
          lowStockIngredients.push({
            name: ingredient.inventoryItemName,
            available: inventoryItem.currentStock,
            needed: ingredient.quantity,
            maxServings: servingsFromThisIngredient,
            unit: ingredient.unit
          })
        }
      }
    }
    
    return lowStockIngredients
  }

  const getFilteredItems = () => {
    let filtered = menuItems

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }

    // Filter by stock availability
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = getStockStatus(item)
        switch (stockFilter) {
          case 'in_stock':
            return stockStatus === 'in_stock' || stockStatus === 'medium_stock'
          case 'low_stock':
            return stockStatus === 'low_stock'
          case 'out_of_stock':
            return stockStatus === 'out_of_stock'
          default:
            return true
        }
      })
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let valueA: any, valueB: any

      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case 'price':
          valueA = a.price
          valueB = b.price
          break
        case 'cost':
          valueA = a.cost
          valueB = b.cost
          break
        case 'margin':
          valueA = calculateProfitMargin(a.price, a.cost)
          valueB = calculateProfitMargin(b.price, b.cost)
          break
        case 'category':
          valueA = a.category.toLowerCase()
          valueB = b.category.toLowerCase()
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const calculateProfitMargin = (price: number, cost: number) => {
    if (cost === 0) return 0
    return ((price - cost) / price) * 100
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredItems = getFilteredItems()

  // Filter add-ons based on search query
  const filteredAddons = addons.filter(addon => {
    const matchesSearch = addonSearchQuery === '' || 
      addon.name.toLowerCase().includes(addonSearchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(addonSearchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="h-10 bg-gradient-to-r from-surface-200 to-surface-300 rounded-2xl w-80"></div>
                <div className="h-4 bg-surface-200 rounded-lg w-96"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
                <div className="h-12 bg-surface-200 rounded-xl w-32"></div>
              </div>
            </div>
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-surface-100 rounded-xl"></div>
                  </div>
                  <div className="h-8 bg-surface-200 rounded-lg w-12 mb-2"></div>
                  <div className="h-4 bg-surface-200 rounded w-20"></div>
                </div>
              ))}
            </div>
            
            {/* Content Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50">
              <div className="h-8 bg-surface-200 rounded-lg w-48 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-surface-100 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-8">
      {/* Modern Ultra-Clean Header - Capital Intelligence Style */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-12 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Menu Builder</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Create and manage menu items with intelligent recipe costing and inventory integration.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500 font-light">Branch Location</div>
              <div className="text-2xl font-light tracking-tight text-blue-900">
                📍 {selectedBranch?.name || 'Main Branch'}
              </div>
              {/* Real-time Sync Status */}
              <RealTimeSyncStatus className="justify-end" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Modern Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-gray-900 tracking-wide">Content Management</h2>
              <p className="text-sm text-gray-500 leading-relaxed">Build your menu with precision and control</p>
            </div>
            
            {/* Enhanced Tab Navigation */}
            <div className="flex bg-white/90 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 shadow-sm">
              <button
                onClick={() => setActiveTab('menu-items')}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'menu-items'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Menu Items
              </button>
              <button
                onClick={() => setActiveTab('addons')}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === 'addons'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Add-ons
              </button>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards - Capital Intelligence Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Menu Items */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">{menuItems.length}</p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Menu Items</p>
              </div>
            </div>
          </div>

          {/* Active Items */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">
                  {menuItems.filter(item => item.status === 'active').length}
                </p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Active Items</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">{categories.length}</p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Categories</p>
              </div>
            </div>
          </div>

          {/* Add-ons */}
          <div className="group relative overflow-hidden bg-white/70 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-light text-gray-900 tracking-tight">{addons.length}</p>
                <p className="text-gray-500 text-sm font-light leading-relaxed">Available Add-ons</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Action Cards */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-gray-900 tracking-wide">Quick Actions</h2>
              <p className="text-sm text-gray-500 leading-relaxed">Manage menu items and add-ons efficiently</p>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {activeTab === 'menu-items' && !bulkMode && (
                <>
                  <button
                    onClick={() => setBulkMode(true)}
                    className="px-6 py-3 backdrop-blur-sm border rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium bg-white/80 text-gray-700 border-gray-200 hover:bg-white hover:shadow-gray-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Bulk Operations
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium shadow-blue-500/25"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Menu Item
                  </button>
                </>
              )}
              {activeTab === 'addons' && (
                <button
                  onClick={() => setShowCreateAddonModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium shadow-blue-500/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Add-on
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Mode Bar - Enhanced Design */}
        {activeTab === 'menu-items' && bulkMode && (
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Mode Indicator & Selection Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-light text-gray-900 tracking-tight">
                      Bulk Selection Mode
                    </div>
                    <div className="text-sm text-gray-500 font-light">
                      {selectedItems.size > 0 
                        ? `${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''} selected`
                        : 'Click items to select for bulk operations'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {selectedItems.size > 0 && (
                  <>
                    {/* Selection Controls */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200">
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-surface-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                      >
                        Deselect All
                      </button>
                    </div>
                    
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBulkStatusChange('active')}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 text-sm font-medium"
                      >
                        Activate Selected
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('inactive')}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 text-sm font-medium"
                      >
                        Deactivate Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
                
                {/* Exit Button */}
                <button
                  onClick={() => setBulkMode(false)}
                  className="px-3 py-1 text-xs text-gray-700 hover:bg-white border border-blue-200 rounded transition-colors font-medium"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section - Enhanced Design */}
        {activeTab === 'menu-items' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search menu items, categories, descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/80 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 placeholder-surface-500"
                  />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 bg-white/80 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 min-w-[140px]"
                >
                  <option value="all">All Categories</option>
                  {Array.from(new Set(menuItems.map(item => item.category)))
                    .filter(category => category.trim() !== '')
                    .sort()
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-white/80 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="px-4 py-3 bg-white/80 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 min-w-[120px]"
                >
                  <option value="all">All Stock</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {activeTab === 'menu-items' ? (
          <div className="space-y-8">
            {/* Menu Items Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-surface-200/50 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-surface-50 to-surface-100/50 border-b border-surface-200/50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-surface-600">
                    Showing {filteredItems.length} of {menuItems.length} items
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="px-3 py-2 bg-white/80 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 text-sm"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="price">Sort by Price</option>
                      <option value="cost">Sort by Cost</option>
                      <option value="category">Sort by Category</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 bg-white/80 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors text-sm font-medium"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu Items Grid with Empty State */}
              <div className="p-6">
                {menuItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 text-surface-300">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                        <path d="M17 8H7V10H17V8ZM17 11H7V13H17V11ZM17 14H7V16H17V14Z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-surface-900 mb-2">No Menu Available</h3>
                    <p className="text-surface-600 text-center mb-8 max-w-md">
                      You haven&apos;t created any menu items yet. Start building your menu by adding your first item.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Menu Item
                    </button>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 text-surface-300">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">No Items Found</h3>
                    <p className="text-surface-600 text-center mb-8 max-w-md">
                      No menu items match your current filters. Try adjusting your search or filter criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setCategoryFilter('all')
                        setStatusFilter('all')
                        setStockFilter('all')
                      }}
                      className="px-6 py-3 text-primary-600 border-2 border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 font-medium"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`relative bg-white/90 backdrop-blur-sm rounded-2xl border border-surface-200/50 overflow-hidden hover:shadow-xl hover:shadow-surface-200/25 transition-all duration-300 hover:-translate-y-1 ${
                          bulkMode ? 'cursor-pointer' : ''
                        } ${
                          bulkMode 
                            ? selectedItems.has(item.id!) 
                              ? 'border-primary-300 bg-primary-50/50 ring-2 ring-primary-200' 
                              : 'border-surface-200/50 hover:border-primary-300'
                            : 'border-surface-200/50 hover:border-surface-300'
                        }`}
                        onClick={bulkMode ? (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectItem(item.id!);
                        } : undefined}
                      >
                        {/* Bulk Mode Checkbox */}
                        {bulkMode && (
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id!)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectItem(item.id!);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 text-primary-600 bg-white/90 border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 transition-colors"
                            />
                          </div>
                        )}
                        
                        {/* Card Header */}
                        <div className="p-5 pb-3">
                          <div className="mb-3">
                            <h3 className="font-semibold text-surface-900 text-base truncate flex items-center gap-2">
                              {item.emoji && <span className="text-xl">{item.emoji}</span>}
                              {item.name}
                            </h3>
                          </div>
                          <p className="text-sm text-surface-600 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                          <div className="inline-flex items-center px-2.5 py-1 bg-surface-100 text-surface-700 rounded-lg text-xs font-medium">
                            {item.category}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="px-5 pb-5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold bg-gradient-to-r from-surface-900 to-surface-700 bg-clip-text text-transparent">
                              ₱{item.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-surface-500 bg-surface-50 px-2 py-1 rounded-lg">
                              Cost: ₱{item.cost.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                              Profit: ₱{(item.price - item.cost).toFixed(2)}
                            </span>
                            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getStockStatusColor(getStockStatus(item))}`}>
                              {getStockStatusText(getStockStatus(item), calculateMaxServings(item))}
                            </span>
                          </div>

                          {/* Card Actions */}
                          {!bulkMode && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="px-3 py-2.5 text-sm bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-all duration-200 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDuplicateMenuItem(item)}
                                className="px-3 py-2.5 text-sm bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all duration-200 font-medium"
                              >
                                Copy
                              </button>
                            </div>
                          )}
                          {!bulkMode && (
                            <button
                              onClick={() => handleDeleteMenuItem(item.id!)}
                              className="w-full mt-2 px-3 py-2.5 text-sm bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Add-ons Content */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-surface-200/50 shadow-sm overflow-hidden">
              {/* Add-ons Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-surface-50 to-surface-100/50 border-b border-surface-200/50">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search add-ons by name or description..."
                    value={addonSearchQuery}
                    onChange={(e) => setAddonSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/80 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 text-surface-900 placeholder-surface-500"
                  />
                </div>
              </div>

              {/* Add-ons Grid */}
              <div className="p-6">
                {addons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 text-surface-300">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        <path d="M16 6V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2h4v2h-4V4z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-surface-900 mb-2">No Add-ons Available</h3>
                    <p className="text-surface-600 text-center mb-8 max-w-md leading-relaxed">
                      You haven&apos;t created any add-ons yet. Add-ons are extras like sauces, drinks, or sides that customers can add to their orders.
                    </p>
                    <button
                      onClick={() => setShowCreateAddonModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Add-on
                    </button>
                  </div>
                ) : filteredAddons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 text-surface-300">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">No Add-ons Found</h3>
                    <p className="text-surface-600 text-center mb-8 max-w-md leading-relaxed">
                      No add-ons match your current search criteria. Try adjusting your search terms.
                    </p>
                    <button
                      onClick={() => setAddonSearchQuery('')}
                      className="px-6 py-3 text-primary-600 border-2 border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 font-medium"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAddons.map((addon) => (
                      <div key={addon.id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-surface-200/50 overflow-hidden hover:shadow-xl hover:shadow-surface-200/25 transition-all duration-300 hover:-translate-y-1">
                        {/* Card Header */}
                        <div className="p-5 pb-3">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-surface-900 text-base truncate flex-1">{addon.name}</h3>
                            <span className={`ml-2 px-3 py-1.5 text-xs font-medium rounded-full ${addon.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-surface-100 text-surface-600'}`}>
                              {addon.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-surface-600 line-clamp-2 mb-3 leading-relaxed">{addon.description}</p>
                          <div className="inline-flex items-center px-2.5 py-1 bg-surface-100 text-surface-700 rounded-lg text-xs font-medium">
                            {addon.ingredients && addon.ingredients.length > 0 
                              ? `Multi-ingredient (${addon.ingredients.length} items)`
                              : `Inventory: ${addon.inventoryItemName || 'N/A'}`
                            }
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="px-5 pb-5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold bg-gradient-to-r from-surface-900 to-surface-700 bg-clip-text text-transparent">
                              ₱{addon.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-surface-500 bg-surface-50 px-2 py-1 rounded-lg">
                              Cost: ₱{addon.cost.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                              Profit: ₱{(addon.price - addon.cost).toFixed(2)}
                            </span>
                            <span className="text-xs text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg font-medium">
                              {addon.ingredients && addon.ingredients.length > 0 
                                ? `${addon.ingredients.length} ingredients`
                                : `Qty: ${addon.inventoryQuantity || 'N/A'}`
                              }
                            </span>
                          </div>

                          {/* Card Actions */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleEditAddon(addon)}
                              className="px-3 py-2.5 text-sm bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-all duration-200 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleAddon(addon)}
                              className={`px-3 py-2.5 text-sm rounded-xl transition-all duration-200 font-medium ${addon.status === 'active' ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            >
                              {addon.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteAddon(addon.id!)}
                              className="px-3 py-2.5 text-sm bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modern Enterprise Add Product Modal */}
        {showCreateModal && (
        <div className="fixed inset-0 bg-surface-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-surface-200/50 w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-8 py-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Product</h2>
                    <p className="text-white/80 text-sm">Create a new menu item for {selectedBranch?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-3 hover:bg-white/20 backdrop-blur-sm rounded-2xl transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(95vh-200px)] overflow-y-auto bg-gradient-to-br from-surface-50 to-white">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Basic Information */}
                  <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-surface-200/50 shadow-sm">
                      <h3 className="text-xl font-bold text-surface-900 mb-4 flex items-center">
                        <div className="p-2.5 bg-primary-100 rounded-xl mr-3">
                          <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Product Details
                      </h3>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-surface-700 mb-3">
                            Product Name*
                          </label>
                          <input
                            type="text"
                            value={newItem.name}
                            onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3.5 bg-white/80 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 placeholder-surface-400 text-surface-900"
                            placeholder="Enter product name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-surface-700 mb-3">
                            Category*
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newItem.category}
                              onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full px-4 py-3.5 bg-white/80 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all duration-200 placeholder-surface-400 text-surface-900"
                              placeholder="e.g., Beverages, Main Course, Desserts"
                              list="categories-datalist"
                            />
                            <div className="absolute right-3 top-3">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                          </div>
                          <datalist id="categories-datalist">
                            {Array.from(new Set(menuItems.map(item => item.category)))
                              .filter(category => category.trim() !== '')
                              .sort()
                              .map((category) => (
                                <option key={category} value={category} />
                              ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={newItem.description}
                            onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                            placeholder="Describe your product..."
                          />
                        </div>

                        {/* Category-based Icon Selector */}
                        {newItem.category && (
                          <div className="transition-all duration-300 ease-in-out">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Menu Item Icon
                            </label>
                            <CategoryIconSelector
                              category={newItem.category}
                              selectedIcon={newItem.emoji}
                              onIconChange={(icon) => setNewItem(prev => ({ ...prev, emoji: icon }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        Pricing & Profitability
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Selling Price*
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newItem.price}
                              onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cost
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₱</span>
                            <input
                              type="text"
                              value={newItem.cost.toFixed(2)}
                              readOnly
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 font-medium"
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Auto-calculated from ingredients</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Profit Margin
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newItem.price > 0 && newItem.cost > 0 ? 
                                `₱${(newItem.price - newItem.cost).toFixed(2)}` : 
                                '₱0.00'
                              }
                              readOnly
                              className="w-full px-4 py-3 border border-green-300 rounded-xl bg-green-100 text-green-700 font-semibold"
                            />
                          </div>
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            {newItem.price > 0 && newItem.cost > 0 ? 
                              `${(((newItem.price - newItem.cost) / newItem.price) * 100).toFixed(1)}% margin` : 
                              '0% margin'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Recipe & Ingredients */}
                  <div className="space-y-6">
                    <div className="bg-orange-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <div className="p-2 bg-orange-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          Recipe Ingredients
                        </h3>
                        <button
                          onClick={addIngredient}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Ingredient</span>
                        </button>
                      </div>

                      {newItem.ingredients.length > 0 ? (
                        <div className="space-y-6">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900">Recipe Ingredients</h4>
                            <span className="text-sm text-gray-500">{newItem.ingredients.length} ingredient{newItem.ingredients.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {newItem.ingredients.map((ingredient, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 min-h-[280px]">
                              {/* Ingredient Header - Fixed Height */}
                              <div className="flex items-center justify-between p-6 pb-4 min-h-[80px]">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-orange-600 font-semibold text-sm">{index + 1}</span>
                                  </div>
                                  <h5 className="text-base font-semibold text-gray-900 truncate">
                                    {ingredient.inventoryItemName || 'Select Ingredient'}
                                  </h5>
                                </div>
                                <button
                                  onClick={() => removeIngredient(index)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 flex-shrink-0"
                                  title="Remove ingredient"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              {/* Ingredient Details - Consistent Grid */}
                              <div className="px-6 pb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[180px]">
                                  {/* Left Column */}
                                  <div className="flex flex-col space-y-4">
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Inventory Item
                                      </label>
                                      <select
                                        value={ingredient.inventoryItemId}
                                        onChange={(e) => updateIngredient(index, 'inventoryItemId', e.target.value)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white shadow-sm h-[44px]"
                                      >
                                        <option value="">Select ingredient</option>
                                        {inventoryItems.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.name} ({item.unit})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantity Required
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={ingredient.quantity}
                                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm h-[44px]"
                                        placeholder="Enter quantity"
                                      />
                                    </div>
                                  </div>

                                  {/* Right Column */}
                                  <div className="flex flex-col space-y-4">
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Unit of Measurement
                                      </label>
                                      <input
                                        type="text"
                                        value={ingredient.unit}
                                        readOnly
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50 text-gray-600 shadow-sm h-[44px]"
                                        placeholder="Unit will appear here"
                                      />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ingredient Cost
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={`₱${ingredient.cost.toFixed(2)}`}
                                          readOnly
                                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-semibold shadow-sm h-[44px]"
                                        />
                                        <div className="absolute inset-y-0 right-4 flex items-center">
                                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Total Cost Summary */}
                          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Total Recipe Cost</h3>
                                  <p className="text-sm text-gray-600">Based on {newItem.ingredients.length} ingredient{newItem.ingredients.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-orange-600">₱{newItem.cost.toFixed(2)}</div>
                                <div className="text-sm text-gray-500 mt-1">per serving</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-24 h-24 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-8">
                            <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">No ingredients added yet</h3>
                          <p className="text-gray-600 max-w-sm mx-auto mb-8">Add ingredients to calculate product cost and enable inventory tracking for this menu item.</p>
                          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Click "Add Ingredient" button above to get started</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stock Impact Preview */}
                    {newItem.ingredients.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-6">
                        <h4 className="text-md font-semibold text-blue-900 mb-4 flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          Stock Impact Preview
                        </h4>
                        <div className="space-y-3">
                          {newItem.ingredients.map((ingredient, index) => {
                            const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventoryItemId)
                            const maxServings = inventoryItem ? Math.floor(inventoryItem.currentStock / ingredient.quantity) : 0
                            const stockStatus = maxServings === 0 ? 'out' : maxServings <= 5 ? 'low' : 'good'
                            
                            return (
                              <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200">
                                <div>
                                  <span className="font-medium text-blue-900">{ingredient.inventoryItemName}</span>
                                  <p className="text-sm text-blue-600">
                                    {inventoryItem ? inventoryItem.currentStock : 0} {ingredient.unit} in stock
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                    stockStatus === 'out' ? 'bg-red-100 text-red-800' :
                                    stockStatus === 'low' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {maxServings} servings possible
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Branch isolation active - This item will only appear in {selectedBranch?.name}
                  </span>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMenuItem}
                    disabled={!newItem.name || !newItem.category || !newItem.price}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg"
                  >
                    Create Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Menu Item</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Category-based Icon Selector for Edit */}
                {editingItem.category && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <CategoryIconSelector
                      category={editingItem.category}
                      selectedIcon={editingItem.emoji || ''}
                      onIconChange={(icon) => setEditingItem(prev => prev ? { ...prev, emoji: icon } : null)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editingItem.status}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Cost Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ingredient Cost:</span>
                      <span className="font-medium">₱{editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">₱{editingItem.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className="font-medium text-green-600">
                        {editingItem.price > 0 && editingItem.ingredients.length > 0 ? 
                          `₱${(editingItem.price - editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0)).toFixed(2)} (${(((editingItem.price - editingItem.ingredients.reduce((sum, ing) => sum + ing.cost, 0)) / editingItem.price) * 100).toFixed(1)}%)`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Recipe Ingredients</h4>
                    <p className="text-sm text-gray-600">Manage ingredients to calculate product cost</p>
                  </div>
                  <button
                    onClick={addIngredientToEdit}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {editingItem.ingredients.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {editingItem.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateIngredientInEdit(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredientInEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-12">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={ingredient.unit}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Cost
                          </label>
                          <input
                            type="text"
                            value={`₱${ingredient.cost.toFixed(2)}`}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <button
                          onClick={() => removeIngredientFromEdit(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded mt-5"
                          title="Remove ingredient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No ingredients added yet</p>
                    <p className="text-xs text-gray-400">Click &quot;Add Ingredient&quot; to start building your recipe</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMenuItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Enterprise Create Add-on Modal */}
      {showCreateAddonModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Add New Add-on</h2>
                    <p className="text-emerald-100 text-sm">Create a new add-on for {selectedBranch?.name || 'your branch'}</p>
                  </div>
                </div>
                <button
                  onClick={resetAddonForm}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(95vh-200px)] overflow-y-auto">
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Basic Information */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        Basic Information
                      </h3>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add-on Name
                          </label>
                          <input
                            type="text"
                            value={newAddon.name}
                            onChange={(e) => setNewAddon(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                            placeholder="Enter add-on name (e.g., Extra Cheese, Hot Sauce)"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={newAddon.description}
                            onChange={(e) => setNewAddon(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm resize-none"
                            rows={3}
                            placeholder="Brief description of the add-on"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₱</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newAddon.price}
                              onChange={(e) => setNewAddon(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="w-full pl-8 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Recipe Ingredients */}
                  <div className="space-y-6">
                    <div className="bg-orange-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <div className="p-2 bg-orange-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          Recipe Ingredients
                        </h3>
                        <button
                          onClick={addAddonIngredient}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Ingredient</span>
                        </button>
                      </div>

                      {newAddon.ingredients.length > 0 ? (
                        <div className="space-y-6">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900">Add-on Ingredients</h4>
                            <span className="text-sm text-gray-500">{newAddon.ingredients.length} ingredient{newAddon.ingredients.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {newAddon.ingredients.map((ingredient, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 min-h-[280px]">
                              {/* Ingredient Header - Fixed Height */}
                              <div className="flex items-center justify-between p-6 pb-4 min-h-[80px]">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-orange-600 font-semibold text-sm">{index + 1}</span>
                                  </div>
                                  <h5 className="text-base font-semibold text-gray-900 truncate">
                                    {ingredient.inventoryItemName || 'Select Ingredient'}
                                  </h5>
                                </div>
                                <button
                                  onClick={() => removeAddonIngredient(index)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 flex-shrink-0"
                                  title="Remove ingredient"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              {/* Ingredient Details - Consistent Grid */}
                              <div className="px-6 pb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[180px]">
                                  {/* Left Column */}
                                  <div className="flex flex-col space-y-4">
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Inventory Item
                                      </label>
                                      <select
                                        value={ingredient.inventoryItemId}
                                        onChange={(e) => updateAddonIngredient(index, 'inventoryItemId', e.target.value)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white shadow-sm h-[44px]"
                                      >
                                        <option value="">Select ingredient</option>
                                        {inventoryItems.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.name} ({item.unit})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantity Required
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={ingredient.quantity}
                                        onChange={(e) => updateAddonIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm h-[44px]"
                                        placeholder="Enter quantity"
                                      />
                                    </div>
                                  </div>

                                  {/* Right Column */}
                                  <div className="flex flex-col space-y-4">
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Unit of Measurement
                                      </label>
                                      <input
                                        type="text"
                                        value={ingredient.unit}
                                        readOnly
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50 text-gray-600 shadow-sm h-[44px]"
                                        placeholder="Unit will appear here"
                                      />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ingredient Cost
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={`₱${ingredient.cost.toFixed(2)}`}
                                          readOnly
                                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-semibold shadow-sm h-[44px]"
                                        />
                                        <div className="absolute inset-y-0 right-4 flex items-center">
                                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Total Cost Summary */}
                          <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Total Add-on Cost</h3>
                                  <p className="text-sm text-gray-600">Based on {newAddon.ingredients.length} ingredient{newAddon.ingredients.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-emerald-600">₱{newAddon.cost.toFixed(2)}</div>
                                <div className="text-sm text-gray-500 mt-1">per serving</div>
                              </div>
                            </div>
                            
                            {/* Profit Calculation */}
                            {newAddon.price > 0 && (
                              <div className="mt-6 pt-6 border-t border-gray-300">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Profit Margin:</span>
                                  <div className="text-right">
                                    <span className="text-lg font-bold text-green-600">₱{(newAddon.price - newAddon.cost).toFixed(2)}</span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({(((newAddon.price - newAddon.cost) / newAddon.price) * 100).toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-24 h-24 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-8">
                            <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">No ingredients added yet</h3>
                          <p className="text-gray-600 max-w-sm mx-auto mb-8">Add ingredients to calculate add-on cost and enable inventory tracking for this add-on.</p>
                          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Click "Add Ingredient" button above to get started</span>
                          </div>
                        </div>
                      )}

                      {/* Legacy single inventory item support for backward compatibility */}
                      {newAddon.ingredients.length === 0 && (
                        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-start space-x-3">
                            <div className="p-1 bg-yellow-100 rounded-full mt-0.5">
                              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-yellow-800 mb-2">Legacy Mode</h4>
                              <p className="text-sm text-yellow-700 mb-4">You can also select a single inventory item for simple add-ons:</p>
                              <select 
                                value={newAddon.inventoryItemId}
                                onChange={(e) => {
                                  const selectedItem = inventoryItems.find(item => item.id === e.target.value)
                                  setNewAddon(prev => ({ 
                                    ...prev, 
                                    inventoryItemId: e.target.value,
                                    inventoryItemName: selectedItem?.name || '',
                                    cost: selectedItem?.costPerUnit || 0
                                  }))
                                }}
                                className="w-full px-4 py-3 text-sm border border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white shadow-sm"
                              >
                                <option value="">Select inventory item (or use ingredients above)</option>
                                {inventoryItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} ({item.currentStock} {item.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {!newAddon.name && <span className="text-red-500">• Add-on name is required</span>}
                  {newAddon.name && !newAddon.price && <span className="text-red-500">• Price is required</span>}
                  {newAddon.name && newAddon.price && (!newAddon.inventoryItemId && newAddon.ingredients.length === 0) && 
                    <span className="text-red-500">• Add at least one ingredient or select an inventory item</span>
                  }
                  {newAddon.name && newAddon.price && (newAddon.inventoryItemId || newAddon.ingredients.length > 0) && 
                    <span className="text-green-600">• Ready to create add-on</span>
                  }
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={resetAddonForm}
                    className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAddon}
                    disabled={!newAddon.name || (!newAddon.inventoryItemId && newAddon.ingredients.length === 0) || !newAddon.price}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Create Add-on
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Addon Modal */}
      {editingAddon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Add-on</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingAddon.name}
                    onChange={(e) => setEditingAddon(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add-on name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAddon.price}
                    onChange={(e) => setEditingAddon(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingAddon.description}
                  onChange={(e) => setEditingAddon(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description"
                />
              </div>

              {/* Ingredients Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Add-on Ingredients</h4>
                    <p className="text-sm text-gray-600">Manage ingredients to calculate add-on cost</p>
                  </div>
                  <button
                    onClick={addAddonIngredientToEdit}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Ingredient
                  </button>
                </div>

                {editingAddon.ingredients && editingAddon.ingredients.length > 0 ? (
                  <div className="space-y-3">
                    {editingAddon.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory Item
                          </label>
                          <select
                            value={ingredient.inventoryItemId}
                            onChange={(e) => updateAddonIngredientInEdit(index, 'inventoryItemId', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateAddonIngredientInEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-12">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={ingredient.unit}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div className="w-16">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Cost/U
                          </label>
                          <input
                            type="text"
                            value={`₱${ingredient.costPerUnit.toFixed(2)}`}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-600"
                          />
                        </div>
                        <button
                          onClick={() => removeAddonIngredientFromEdit(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded mt-5"
                          title="Remove ingredient"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Total Ingredient Cost: <span className="text-green-600">₱{((editingAddon.ingredients || []).reduce((sum, ing) => sum + (ing.quantity * ing.costPerUnit), 0)).toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Profit: <span className="text-green-600">₱{(editingAddon.price - (editingAddon.ingredients || []).reduce((sum, ing) => sum + (ing.quantity * ing.costPerUnit), 0)).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No ingredients added yet</p>
                    <p className="text-xs text-gray-400">Click &quot;Add Ingredient&quot; to start building your add-on recipe</p>
                  </div>
                )}
              </div>

              {/* Legacy single inventory item support for backward compatibility */}
              {(!editingAddon.ingredients || editingAddon.ingredients.length === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legacy Single Inventory Item
                  </label>
                  <select 
                    value={editingAddon.inventoryItemId || ''}
                    onChange={(e) => {
                      const selectedItem = inventoryItems.find(item => item.id === e.target.value)
                      setEditingAddon(prev => prev ? { 
                        ...prev, 
                        inventoryItemId: e.target.value,
                        inventoryItemName: selectedItem?.name || '',
                        cost: selectedItem?.costPerUnit || prev.cost
                      } : null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select inventory item (or use ingredients above)</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currentStock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manual Cost Override
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAddon.cost || 0}
                  onChange={(e) => setEditingAddon(prev => prev ? { ...prev, cost: parseFloat(e.target.value) || 0 } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Override calculated cost from ingredients if needed</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingAddon(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAddon}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Add-on
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
