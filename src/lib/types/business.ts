export type BusinessType = 'restaurant' | 'retail' | 'hybrid'

export interface BusinessSettings {
  businessType: BusinessType
  enableTableManagement: boolean
  enableRecipeTracking: boolean
  enableIngredientInventory: boolean
  enableProductInventory: boolean
  defaultOrderType: 'dine-in' | 'takeout' | 'delivery' | 'over-counter'
  currency: string
  timezone: string
  taxRate: number
  serviceCharge: number
  enableTips: boolean
  enableLoyaltyProgram: boolean
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessType: 'restaurant',
  enableTableManagement: true,
  enableRecipeTracking: true,
  enableIngredientInventory: true,
  enableProductInventory: false,
  defaultOrderType: 'dine-in',
  currency: 'PHP',
  timezone: 'Asia/Manila',
  taxRate: 12, // VAT in Philippines
  serviceCharge: 10,
  enableTips: true,
  enableLoyaltyProgram: false,
}

export const RESTAURANT_PRESET: Partial<BusinessSettings> = {
  businessType: 'restaurant',
  enableTableManagement: true,
  enableRecipeTracking: true,
  enableIngredientInventory: true,
  enableProductInventory: false,
  defaultOrderType: 'dine-in',
  enableTips: true,
}

export const RETAIL_PRESET: Partial<BusinessSettings> = {
  businessType: 'retail',
  enableTableManagement: false,
  enableRecipeTracking: false,
  enableIngredientInventory: false,
  enableProductInventory: true,
  defaultOrderType: 'over-counter',
  enableTips: false,
}

export const HYBRID_PRESET: Partial<BusinessSettings> = {
  businessType: 'hybrid',
  enableTableManagement: true,
  enableRecipeTracking: true,
  enableIngredientInventory: true,
  enableProductInventory: true,
  defaultOrderType: 'dine-in',
  enableTips: true,
}
