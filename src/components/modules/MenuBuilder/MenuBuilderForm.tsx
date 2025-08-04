'use client';

import React, { useEffect, useState } from 'react';
import { useMenuBuilder, useMenuBuilderField } from '../../../lib/context/MenuBuilderContext';
import { getInventoryItems, type InventoryItem } from '../../../lib/firebase/inventory';
import { getMenuCategories, type MenuCategory, type MenuIngredient } from '../../../lib/firebase/menuBuilder';
import { useAuth } from '../../../lib/context/AuthContext';
import { useBranch } from '../../../lib/context/BranchContext';

interface MenuBuilderFormProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function MenuBuilderForm({ onSave, onCancel }: MenuBuilderFormProps) {
  const { profile } = useAuth();
  const { selectedBranch } = useBranch();
  const { state, actions } = useMenuBuilder();
  
  // Form field hooks
  const [name, setName] = useMenuBuilderField('name');
  const [description, setDescription] = useMenuBuilderField('description');
  const [category, setCategory] = useMenuBuilderField('category');
  const [price, setPrice] = useMenuBuilderField('price');
  const [cost, setCost] = useMenuBuilderField('cost');
  const [ingredients, setIngredients] = useMenuBuilderField('ingredients');

  // Local state for data
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories and inventory
  useEffect(() => {
    if (!profile?.tenantId || !selectedBranch?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [categoriesData, inventoryData] = await Promise.all([
          getMenuCategories(profile.tenantId),
          getInventoryItems(profile.tenantId, selectedBranch.id)
        ]);
        
        setCategories(categoriesData);
        setInventoryItems(inventoryData);
      } catch (error) {
        console.error('Failed to load form data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.tenantId, selectedBranch?.id]);

  // Auto-save indicator
  const showAutoSaveIndicator = state.isAutoSaving || 
    (state.lastSaved && Date.now() - state.lastSaved.getTime() < 3000);

  // Handle ingredient changes
  const updateIngredient = (index: number, updates: Partial<MenuIngredient>) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    const newIngredient: MenuIngredient = {
      inventoryItemId: '',
      inventoryItemName: '',
      quantity: 1,
      unit: 'pieces',
      cost: 0
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_: MenuIngredient, i: number) => i !== index);
    setIngredients(newIngredients);
  };

  // Handle form submission
  const handleSave = () => {
    if (actions.validateForm()) {
      actions.saveDraft(); // Save current state as draft
      onSave?.();
    }
  };

  // Handle draft management
  const saveDraft = () => {
    actions.saveDraft();
  };

  const loadDraft = (draftId: string) => {
    actions.loadDraft(draftId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading form...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Header with auto-save indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {state.editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
        </h2>
        
        <div className="flex items-center space-x-3">
          {/* Auto-save indicator */}
          {showAutoSaveIndicator && (
            <div className="flex items-center text-sm text-green-600">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {state.isAutoSaving ? 'Auto-saving...' : 'Saved'}
            </div>
          )}
          
          {/* Undo/Redo buttons */}
          <div className="flex space-x-1">
            <button
              onClick={actions.undo}
              disabled={!actions.canUndo}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={actions.redo}
              disabled={!actions.canRedo}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>
          
          {/* Draft actions */}
          <button
            onClick={saveDraft}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            disabled={!state.isFormDirty}
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Draft management */}
      {Object.keys(state.drafts).length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Saved Drafts</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(state.drafts).map(([draftId, draft]) => (
              <button
                key={draftId}
                onClick={() => loadDraft(draftId)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  state.activeDraftId === draftId
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 hover:bg-blue-100'
                }`}
              >
                {(draft as any).name || 'Untitled'} 
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.deleteDraft(draftId);
                  }}
                  className="ml-2 text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.formErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter item name"
            />
            {state.formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{state.formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.formErrors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {state.formErrors.category && (
              <p className="mt-1 text-sm text-red-600">{state.formErrors.category}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter item description"
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.formErrors.price ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {state.formErrors.price && (
              <p className="mt-1 text-sm text-red-600">{state.formErrors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingredients *
          </label>
          {state.formErrors.ingredients && (
            <p className="mb-2 text-sm text-red-600">{state.formErrors.ingredients}</p>
          )}
          
          <div className="space-y-3">
            {ingredients.map((ingredient: MenuIngredient, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                <select
                  value={ingredient.inventoryItemId}
                  onChange={(e) => {
                    const selectedItem = inventoryItems.find(item => item.id === e.target.value);
                    updateIngredient(index, { 
                      inventoryItemId: e.target.value,
                      inventoryItemName: selectedItem?.name || '',
                      cost: selectedItem?.costPerUnit || 0
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select ingredient</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  step="0.01"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Qty"
                />
                
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Unit"
                />
                
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addIngredient}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add Ingredient
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {state.isFormDirty && '• Unsaved changes'}
            {state.lastSaved && ` • Last saved: ${state.lastSaved.toLocaleTimeString()}`}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                actions.resetCurrentItem();
                onCancel?.();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!state.isFormDirty}
            >
              {state.editingItem ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MenuBuilderForm;
