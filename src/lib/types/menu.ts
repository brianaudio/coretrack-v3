export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  cost: number
  category: string
  status: 'active' | 'inactive' | 'out_of_stock'
  isAvailable: boolean
  image?: string
  allergens: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  preparationTime: number
  ingredients: Array<{
    id: string
    quantity: number
    unit: string
  }>
  profitMargin?: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateMenuItem {
  name: string
  description: string
  price: number
  category: string
  status: 'active' | 'inactive' | 'out_of_stock'
  isAvailable: boolean
  image?: string
  allergens: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  preparationTime: number
  ingredients: Array<{
    id: string
    quantity: number
    unit: string
  }>
}

export interface InventoryItem {
  id: string
  name: string
  description: string
  sku: string
  category: string
  quantity: number
  unit: string
  cost: number
  price: number
  minStock: number
  maxStock: number
  supplier: string
  location: string
  status: 'active' | 'inactive' | 'discontinued'
  lastUpdated: Date
  expiryDate?: Date
}

export interface MenuCategory {
  id: string
  name: string
  description: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Recipe {
  id: string
  menuItemId: string
  name: string
  description: string
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    notes?: string
  }>
  createdAt: Date
  updatedAt: Date
}
