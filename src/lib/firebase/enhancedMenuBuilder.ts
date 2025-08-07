import { MenuIngredient } from './menuBuilder';

// Enhanced Menu Item interface with new features
export interface EnhancedMenuItem {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  emoji?: string;
  
  // NEW: Image support
  imageUrl?: string;
  imageAlt?: string;
  
  // NEW: Advanced pricing
  pricing: {
    basePrice: number;
    bulkPricing?: Array<{
      minQuantity: number;
      price: number;
      discount: number;
    }>;
    seasonalPricing?: Array<{
      startDate: Date;
      endDate: Date;
      price: number;
      reason: string;
    }>;
    memberPrice?: number;
  };
  
  // NEW: Enhanced nutritional information
  nutrition: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    allergens: string[];
    dietaryTags: ('vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'keto' | 'halal' | 'kosher')[];
    servingSize?: string;
  };
  
  // Enhanced ingredients with alternatives
  ingredients: Array<MenuIngredient & {
    alternatives?: Array<{
      inventoryItemId: string;
      inventoryItemName: string;
      costDifference: number;
      reason: string;
    }>;
  }>;
  
  // NEW: Product templates and variants
  template?: {
    templateId: string;
    templateName: string;
    customizations: Record<string, any>;
  };
  
  variants?: Array<{
    id: string;
    name: string;
    priceModifier: number;
    costModifier: number;
    attributeChanges: Record<string, any>;
  }>;
  
  // Enhanced metadata
  metadata: {
    preparationTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    popularityScore?: number;
    tags: string[];
    internalNotes?: string;
    created: Date;
    lastModified: Date;
    createdBy: string;
  };
  
  // Business logic
  availability: {
    isAvailable: boolean;
    availableDays: number[]; // 0-6 (Sunday-Saturday)
    availableHours: {
      start: string;
      end: string;
    };
    seasonalAvailability?: {
      start: string; // MM-DD
      end: string; // MM-DD
    };
  };
  
  // Integration
  integration: {
    syncToPOS: boolean;
    posItemId?: string;
    lastSyncedAt?: Date;
  };
  
  // Legacy compatibility
  status: 'active' | 'inactive' | 'out_of_stock';
  tenantId: string;
  locationId: string;
}

// Product template interface
export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultImage?: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
    required: boolean;
    defaultValue?: any;
    options?: string[];
  }>;
  defaultIngredients: MenuIngredient[];
  defaultNutrition: Partial<EnhancedMenuItem['nutrition']>;
  businessType: string[];
  createdAt: Date;
  createdBy: string;
}

// Bulk import interface
export interface BulkProductImport {
  items: Array<{
    row: number;
    data: Partial<EnhancedMenuItem>;
    status: 'pending' | 'success' | 'error';
    errors?: string[];
  }>;
  summary: {
    total: number;
    success: number;
    errors: number;
    skipped: number;
  };
}

// Category management interface
export interface EnhancedCategory {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  order: number;
  parentId?: string;
  isActive: boolean;
  metadata: {
    itemCount: number;
    avgPrice: number;
    totalRevenue?: number;
  };
}

// Cost optimization suggestions
export interface CostOptimization {
  currentCost: number;
  suggestions: Array<{
    type: 'ingredient_substitute' | 'portion_adjustment' | 'supplier_change' | 'bulk_discount';
    description: string;
    potentialSaving: number;
    impact: 'low' | 'medium' | 'high';
    difficulty: 'easy' | 'medium' | 'hard';
    details: any;
  }>;
  totalPotentialSaving: number;
}

// Form state management
export interface ProductFormState {
  currentStep: number;
  totalSteps: number;
  data: Partial<EnhancedMenuItem>;
  validation: {
    isValid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  };
  isDirty: boolean;
  isSaving: boolean;
}

// Wizard step configuration
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  isRequired: boolean;
  isCompleted: boolean;
  validationRules: string[];
}
