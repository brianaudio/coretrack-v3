'use client';

import { 
  preciseAdd, 
  preciseSubtract, 
  preciseMultiply, 
  preciseDivide,
  preciseRound,
  UnitConverter,
  InventoryMath
} from '../utils/precisionMath';

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  minStock: number;
  maxStock?: number;
  lastUpdated: Date;
  tenantId: string;
  locationId: string;
}

export interface StockMovement {
  id?: string;
  inventoryItemId: string;
  inventoryItemName: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'waste' | 'return';
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  referenceId?: string; // Order ID, POS sale ID, etc.
  transactionId?: string; // Transaction ID for grouping related movements
  timestamp: Date;
  userId: string;
  tenantId: string;
  locationId: string;
}

export interface CalculationResult {
  success: boolean;
  newStock: number;
  totalCost?: number;
  warnings: string[];
  errors: string[];
  movement?: StockMovement;
}

export interface IngredientDeduction {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  cost?: number;
}

/**
 * Centralized Inventory Calculation Service
 * 
 * Handles all inventory calculations with precision math,
 * validation, and comprehensive error handling.
 */
export class InventoryCalculationService {
  private static instance: InventoryCalculationService;
  
  static getInstance(): InventoryCalculationService {
    if (!this.instance) {
      this.instance = new InventoryCalculationService();
    }
    return this.instance;
  }

  /**
   * Validates inventory item data
   */
  private validateInventoryItem(item: InventoryItem): string[] {
    const errors: string[] = [];
    
    if (!item.id) errors.push('Item ID is required');
    if (!item.name) errors.push('Item name is required');
    if (typeof item.currentStock !== 'number') errors.push('Current stock must be a number');
    if (typeof item.costPerUnit !== 'number') errors.push('Cost per unit must be a number');
    if (item.currentStock < 0) errors.push('Current stock cannot be negative');
    if (item.costPerUnit < 0) errors.push('Cost per unit cannot be negative');
    if (!item.unit) errors.push('Unit is required');
    
    return errors;
  }

  /**
   * Validates stock movement data
   */
  private validateStockMovement(movement: Partial<StockMovement>): string[] {
    const errors: string[] = [];
    
    if (!movement.inventoryItemId) errors.push('Inventory item ID is required');
    if (!movement.type) errors.push('Movement type is required');
    if (typeof movement.quantityChanged !== 'number') errors.push('Quantity changed must be a number');
    if (movement.quantityChanged === 0) errors.push('Quantity changed cannot be zero');
    
    const validTypes = ['sale', 'purchase', 'adjustment', 'transfer', 'waste', 'return'];
    if (movement.type && !validTypes.includes(movement.type)) {
      errors.push(`Invalid movement type: ${movement.type}`);
    }
    
    return errors;
  }

  /**
   * Calculates new stock level after a transaction
   */
  calculateStockChange(
    currentItem: InventoryItem,
    quantityChange: number,
    movementType: StockMovement['type'],
    unitCost?: number,
    reason?: string
  ): CalculationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Validate inputs
    const itemErrors = this.validateInventoryItem(currentItem);
    if (itemErrors.length > 0) {
      return {
        success: false,
        newStock: currentItem.currentStock,
        errors: itemErrors,
        warnings
      };
    }
    
    const movementErrors = this.validateStockMovement({
      inventoryItemId: currentItem.id,
      type: movementType,
      quantityChanged: quantityChange
    });
    
    if (movementErrors.length > 0) {
      return {
        success: false,
        newStock: currentItem.currentStock,
        errors: movementErrors,
        warnings
      };
    }
    
    // Calculate new stock with precision
    const newStock = InventoryMath.calculateNewStock(currentItem.currentStock, quantityChange);
    
    // Validate business rules
    if (newStock < 0) {
      if (movementType === 'sale') {
        errors.push(`Insufficient stock: Cannot sell ${Math.abs(quantityChange)} ${currentItem.unit}. Available: ${currentItem.currentStock}`);
      } else {
        warnings.push(`Stock will be negative after ${movementType}: ${newStock}`);
      }
    }
    
    if (newStock < currentItem.minStock) {
      warnings.push(`Stock below minimum level: ${newStock} < ${currentItem.minStock}`);
    }
    
    if (currentItem.maxStock && newStock > currentItem.maxStock) {
      warnings.push(`Stock above maximum level: ${newStock} > ${currentItem.maxStock}`);
    }
    
    // Calculate cost
    const calculatedUnitCost = unitCost || currentItem.costPerUnit;
    const totalCost = preciseMultiply(Math.abs(quantityChange), calculatedUnitCost, 4);
    
    // Create movement record
    const movement: StockMovement = {
      inventoryItemId: currentItem.id,
      inventoryItemName: currentItem.name,
      type: movementType,
      quantityBefore: currentItem.currentStock,
      quantityChanged: quantityChange,
      quantityAfter: newStock,
      unitCost: calculatedUnitCost,
      totalCost,
      reason,
      timestamp: new Date(),
      userId: '', // Will be set by caller
      tenantId: currentItem.tenantId,
      locationId: currentItem.locationId
    };
    
    return {
      success: errors.length === 0,
      newStock,
      totalCost,
      warnings,
      errors,
      movement
    };
  }

  /**
   * Calculates inventory deductions for multiple ingredients
   */
  calculateBulkDeductions(
    inventoryItems: InventoryItem[],
    deductions: IngredientDeduction[]
  ): { results: CalculationResult[]; totalCost: number; canProceed: boolean } {
    const results: CalculationResult[] = [];
    let totalCost = 0;
    let canProceed = true;
    
    deductions.forEach(deduction => {
      const item = inventoryItems.find(i => i.id === deduction.inventoryItemId);
      
      if (!item) {
        results.push({
          success: false,
          newStock: 0,
          errors: [`Inventory item not found: ${deduction.inventoryItemId}`],
          warnings: []
        });
        canProceed = false;
        return;
      }
      
      // Convert units if necessary
      let adjustedQuantity = deduction.quantity;
      if (deduction.unit !== item.unit) {
        if (UnitConverter.areUnitsCompatible(deduction.unit, item.unit)) {
          adjustedQuantity = UnitConverter.convert(deduction.quantity, deduction.unit, item.unit);
        } else {
          results.push({
            success: false,
            newStock: item.currentStock,
            errors: [`Unit conversion not possible: ${deduction.unit} to ${item.unit}`],
            warnings: []
          });
          canProceed = false;
          return;
        }
      }
      
      // Calculate deduction (negative change for sales)
      const result = this.calculateStockChange(
        item,
        -adjustedQuantity,
        'sale',
        deduction.cost || item.costPerUnit,
        `Ingredient deduction: ${deduction.inventoryItemName}`
      );
      
      results.push(result);
      
      if (result.success && result.totalCost) {
        totalCost = preciseAdd(totalCost, result.totalCost, 4);
      }
      
      if (!result.success || result.errors.length > 0) {
        canProceed = false;
      }
    });
    
    return { results, totalCost, canProceed };
  }

  /**
   * Calculates weighted average cost after stock addition
   */
  calculateWeightedAverageCost(
    currentItem: InventoryItem,
    addedQuantity: number,
    addedCost: number
  ): { newCost: number; calculation: string } {
    const newCost = InventoryMath.calculateWeightedAverageCost(
      currentItem.currentStock,
      currentItem.costPerUnit,
      addedQuantity,
      addedCost
    );
    
    const calculation = `Weighted Average: (${currentItem.currentStock} × ${currentItem.costPerUnit} + ${addedQuantity} × ${addedCost}) ÷ ${preciseAdd(currentItem.currentStock, addedQuantity, 3)} = ${newCost}`;
    
    return { newCost, calculation };
  }

  /**
   * Calculates reorder recommendations
   */
  calculateReorderRecommendations(
    items: InventoryItem[],
    dailyUsageData?: Record<string, number>
  ): Array<{
    item: InventoryItem;
    recommendation: 'urgent' | 'soon' | 'normal' | 'none';
    daysRemaining?: number;
    suggestedOrderQuantity?: number;
    reason: string;
  }> {
    return items.map(item => {
      const dailyUsage = dailyUsageData?.[item.id] || 0;
      
      // Check current stock level
      if (item.currentStock <= 0) {
        return {
          item,
          recommendation: 'urgent' as const,
          daysRemaining: 0,
          suggestedOrderQuantity: item.maxStock || preciseMultiply(item.minStock, 2, 0),
          reason: 'Out of stock'
        };
      }
      
      if (item.currentStock <= item.minStock) {
        const suggestedOrder = item.maxStock 
          ? preciseSubtract(item.maxStock, item.currentStock, 0)
          : preciseMultiply(item.minStock, 2, 0);
          
        return {
          item,
          recommendation: 'urgent' as const,
          daysRemaining: dailyUsage > 0 ? Math.floor(item.currentStock / dailyUsage) : undefined,
          suggestedOrderQuantity: suggestedOrder,
          reason: 'Below minimum stock level'
        };
      }
      
      // Calculate days remaining if we have usage data
      if (dailyUsage > 0) {
        const daysRemaining = Math.floor(item.currentStock / dailyUsage);
        
        if (daysRemaining <= 3) {
          return {
            item,
            recommendation: 'soon' as const,
            daysRemaining,
            suggestedOrderQuantity: item.maxStock || preciseMultiply(item.minStock, 3, 0),
            reason: `Only ${daysRemaining} days of stock remaining`
          };
        }
        
        if (daysRemaining <= 7) {
          return {
            item,
            recommendation: 'normal' as const,
            daysRemaining,
            suggestedOrderQuantity: item.maxStock || preciseMultiply(item.minStock, 2, 0),
            reason: `${daysRemaining} days of stock remaining`
          };
        }
      }
      
      return {
        item,
        recommendation: 'none' as const,
        reason: 'Stock levels adequate'
      };
    });
  }

  /**
   * Validates calculation consistency
   */
  validateCalculationConsistency(
    beforeStock: number,
    change: number,
    afterStock: number,
    tolerance: number = 0.001
  ): { isConsistent: boolean; expected: number; actual: number; difference: number } {
    const expected = preciseAdd(beforeStock, change, 4);
    const difference = Math.abs(preciseSubtract(expected, afterStock, 4));
    const isConsistent = difference < tolerance;
    
    return {
      isConsistent,
      expected,
      actual: afterStock,
      difference
    };
  }

  /**
   * Performs inventory reconciliation
   */
  performReconciliation(
    systemStock: number,
    physicalCount: number,
    item: InventoryItem,
    reason: string = 'Physical count reconciliation'
  ): CalculationResult {
    const difference = preciseSubtract(physicalCount, systemStock, 3);
    
    if (Math.abs(difference) < 0.001) {
      return {
        success: true,
        newStock: systemStock,
        warnings: [],
        errors: []
      };
    }
    
    return this.calculateStockChange(
      { ...item, currentStock: systemStock },
      difference,
      'adjustment',
      item.costPerUnit,
      reason
    );
  }
}

// Export singleton instance
export const inventoryCalculationService = InventoryCalculationService.getInstance();
