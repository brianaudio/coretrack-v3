/**
 * Precision Math Utilities
 * 
 * Handles floating point precision issues in inventory calculations
 * to prevent rounding errors and calculation discrepancies.
 */

// Default precision for decimal calculations
const DEFAULT_PRECISION = 4;

/**
 * Rounds a number to specified decimal places
 */
export function preciseRound(value: number, decimals: number = DEFAULT_PRECISION): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Adds two numbers with precision handling
 */
export function preciseAdd(a: number, b: number, decimals: number = DEFAULT_PRECISION): number {
  // Convert to integers for calculation
  const factor = Math.pow(10, decimals);
  const aInt = Math.round(a * factor);
  const bInt = Math.round(b * factor);
  
  return (aInt + bInt) / factor;
}

/**
 * Subtracts two numbers with precision handling
 */
export function preciseSubtract(a: number, b: number, decimals: number = DEFAULT_PRECISION): number {
  const factor = Math.pow(10, decimals);
  const aInt = Math.round(a * factor);
  const bInt = Math.round(b * factor);
  
  return (aInt - bInt) / factor;
}

/**
 * Multiplies two numbers with precision handling
 */
export function preciseMultiply(a: number, b: number, decimals: number = DEFAULT_PRECISION): number {
  const factor = Math.pow(10, decimals);
  const result = (a * factor) * (b * factor) / (factor * factor);
  
  return preciseRound(result, decimals);
}

/**
 * Divides two numbers with precision handling
 */
export function preciseDivide(a: number, b: number, decimals: number = DEFAULT_PRECISION): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  
  const result = a / b;
  return preciseRound(result, decimals);
}

/**
 * Checks if two numbers are equal within a tolerance
 */
export function preciseEquals(a: number, b: number, tolerance: number = 0.0001): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Formats a number for display with consistent precision
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return preciseRound(value, decimals).toFixed(decimals);
}

/**
 * Formats a quantity with appropriate precision
 */
export function formatQuantity(value: number, decimals: number = 3): string {
  // Remove trailing zeros
  return preciseRound(value, decimals).toString();
}

/**
 * Calculates percentage with precision
 */
export function precisePercentage(value: number, total: number, decimals: number = 2): number {
  if (total === 0) return 0;
  
  const percentage = (value / total) * 100;
  return preciseRound(percentage, decimals);
}

/**
 * Sums an array of numbers with precision
 */
export function preciseSum(values: number[], decimals: number = DEFAULT_PRECISION): number {
  return values.reduce((sum, value) => preciseAdd(sum, value, decimals), 0);
}

/**
 * Calculates average with precision
 */
export function preciseAverage(values: number[], decimals: number = DEFAULT_PRECISION): number {
  if (values.length === 0) return 0;
  
  const sum = preciseSum(values, decimals);
  return preciseDivide(sum, values.length, decimals);
}

/**
 * Unit conversion utilities with precision
 */
export const UnitConverter = {
  // Volume conversions (all to ml)
  volumeToMl: {
    'ml': 1,
    'l': 1000,
    'liters': 1000,
    'cup': 250,
    'cups': 250,
    'tbsp': 15,
    'tsp': 5,
    'fl_oz': 29.5735,
    'gallon': 3785.41,
    'pint': 473.176,
    'quart': 946.353
  } as Record<string, number>,
  
  // Weight conversions (all to grams)
  weightToGrams: {
    'g': 1,
    'kg': 1000,
    'gram': 1,
    'grams': 1,
    'kilogram': 1000,
    'kilograms': 1000,
    'oz': 28.3495,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592
  } as Record<string, number>,
  
  // Count conversions
  countToUnits: {
    'piece': 1,
    'pieces': 1,
    'unit': 1,
    'units': 1,
    'each': 1,
    'dozen': 12,
    'pair': 2,
    'pack': 1
  } as Record<string, number>,
  
  /**
   * Converts between units with precision
   */
  convert(value: number, fromUnit: string, toUnit: string, decimals: number = DEFAULT_PRECISION): number {
    const normalizedFrom = fromUnit.toLowerCase().trim();
    const normalizedTo = toUnit.toLowerCase().trim();
    
    // Same unit - no conversion needed
    if (normalizedFrom === normalizedTo) {
      return preciseRound(value, decimals);
    }
    
    // Try volume conversion
    if (this.volumeToMl[normalizedFrom] && this.volumeToMl[normalizedTo]) {
      const mlValue = preciseMultiply(value, this.volumeToMl[normalizedFrom], decimals);
      return preciseDivide(mlValue, this.volumeToMl[normalizedTo], decimals);
    }
    
    // Try weight conversion
    if (this.weightToGrams[normalizedFrom] && this.weightToGrams[normalizedTo]) {
      const gramValue = preciseMultiply(value, this.weightToGrams[normalizedFrom], decimals);
      return preciseDivide(gramValue, this.weightToGrams[normalizedTo], decimals);
    }
    
    // Try count conversion
    if (this.countToUnits[normalizedFrom] && this.countToUnits[normalizedTo]) {
      const unitValue = preciseMultiply(value, this.countToUnits[normalizedFrom], decimals);
      return preciseDivide(unitValue, this.countToUnits[normalizedTo], decimals);
    }
    
    // No conversion possible - return original value with warning
    console.warn(`Unable to convert from ${fromUnit} to ${toUnit}`);
    return preciseRound(value, decimals);
  },
  
  /**
   * Checks if two units are compatible for conversion
   */
  areUnitsCompatible(unit1: string, unit2: string): boolean {
    const norm1 = unit1.toLowerCase().trim();
    const norm2 = unit2.toLowerCase().trim();
    
    const isVolume1 = this.volumeToMl.hasOwnProperty(norm1);
    const isVolume2 = this.volumeToMl.hasOwnProperty(norm2);
    
    const isWeight1 = this.weightToGrams.hasOwnProperty(norm1);
    const isWeight2 = this.weightToGrams.hasOwnProperty(norm2);
    
    const isCount1 = this.countToUnits.hasOwnProperty(norm1);
    const isCount2 = this.countToUnits.hasOwnProperty(norm2);
    
    return (isVolume1 && isVolume2) || (isWeight1 && isWeight2) || (isCount1 && isCount2);
  }
};

/**
 * Recipe scaling utilities with precision
 */
export const RecipeScaler = {
  /**
   * Scales a recipe ingredient quantity
   */
  scaleIngredient(
    originalQuantity: number,
    originalYield: number,
    targetYield: number,
    decimals: number = DEFAULT_PRECISION
  ): number {
    if (originalYield === 0) {
      throw new Error('Original yield cannot be zero');
    }
    
    const scaleFactor = preciseDivide(targetYield, originalYield, decimals);
    return preciseMultiply(originalQuantity, scaleFactor, decimals);
  },
  
  /**
   * Calculates total ingredient cost for a recipe
   */
  calculateIngredientCost(
    quantity: number,
    unit: string,
    costPerUnit: number,
    costUnit: string,
    decimals: number = DEFAULT_PRECISION
  ): number {
    try {
      // Convert quantity to cost unit
      const convertedQuantity = UnitConverter.convert(quantity, unit, costUnit, decimals);
      return preciseMultiply(convertedQuantity, costPerUnit, decimals);
    } catch (error) {
      console.error('Error calculating ingredient cost:', error);
      return 0;
    }
  }
};

/**
 * Inventory calculation utilities
 */
export const InventoryMath = {
  /**
   * Calculates total inventory value
   */
  calculateTotalValue(currentStock: number, costPerUnit: number): number {
    return preciseMultiply(currentStock, costPerUnit, 2);
  },
  
  /**
   * Calculates new stock level after transaction
   */
  calculateNewStock(currentStock: number, change: number): number {
    return preciseAdd(currentStock, change, 3);
  },
  
  /**
   * Calculates weighted average cost
   */
  calculateWeightedAverageCost(
    currentStock: number,
    currentCost: number,
    addedStock: number,
    addedCost: number
  ): number {
    const totalStock = preciseAdd(currentStock, addedStock, 3);
    
    if (totalStock === 0) return 0;
    
    const currentValue = preciseMultiply(currentStock, currentCost, 4);
    const addedValue = preciseMultiply(addedStock, addedCost, 4);
    const totalValue = preciseAdd(currentValue, addedValue, 4);
    
    return preciseDivide(totalValue, totalStock, 4);
  },
  
  /**
   * Calculates reorder level based on usage and lead time
   */
  calculateReorderLevel(
    dailyUsage: number,
    leadTimeDays: number,
    safetyStock: number = 0
  ): number {
    const leadTimeUsage = preciseMultiply(dailyUsage, leadTimeDays, 3);
    return preciseAdd(leadTimeUsage, safetyStock, 3);
  }
};

export default {
  preciseRound,
  preciseAdd,
  preciseSubtract,
  preciseMultiply,
  preciseDivide,
  preciseEquals,
  formatCurrency,
  formatQuantity,
  precisePercentage,
  preciseSum,
  preciseAverage,
  UnitConverter,
  RecipeScaler,
  InventoryMath
};
