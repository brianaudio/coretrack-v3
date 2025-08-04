'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { MenuItem, CreateMenuItem, MenuIngredient } from '../firebase/menuBuilder';

// Types for Menu Builder State
interface MenuBuilderState {
  // Current form state
  currentItem: {
    name: string;
    description: string;
    category: string;
    price: number;
    cost: number;
    ingredients: MenuIngredient[];
  };
  
  // Draft management
  drafts: Record<string, CreateMenuItem>;
  activeDraftId: string | null;
  
  // Form state management
  isFormDirty: boolean;
  formErrors: Record<string, string>;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  
  // UI state
  showCreateModal: boolean;
  editingItem: MenuItem | null;
  selectedItems: Set<string>;
  
  // History for undo/redo
  history: MenuBuilderState['currentItem'][];
  historyIndex: number;
  maxHistorySize: number;
}

// Action types
type MenuBuilderAction =
  | { type: 'UPDATE_CURRENT_ITEM'; payload: Partial<MenuBuilderState['currentItem']> }
  | { type: 'RESET_CURRENT_ITEM' }
  | { type: 'SAVE_DRAFT'; payload: { id: string; data: CreateMenuItem } }
  | { type: 'LOAD_DRAFT'; payload: string }
  | { type: 'DELETE_DRAFT'; payload: string }
  | { type: 'SET_FORM_DIRTY'; payload: boolean }
  | { type: 'SET_FORM_ERRORS'; payload: Record<string, string> }
  | { type: 'SET_AUTO_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: Date }
  | { type: 'SET_SHOW_CREATE_MODAL'; payload: boolean }
  | { type: 'SET_EDITING_ITEM'; payload: MenuItem | null }
  | { type: 'SET_SELECTED_ITEMS'; payload: Set<string> }
  | { type: 'ADD_TO_HISTORY'; payload: MenuBuilderState['currentItem'] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'LOAD_FROM_STORAGE'; payload: Partial<MenuBuilderState> };

// Initial state
const initialState: MenuBuilderState = {
  currentItem: {
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    ingredients: []
  },
  drafts: {},
  activeDraftId: null,
  isFormDirty: false,
  formErrors: {},
  isAutoSaving: false,
  lastSaved: null,
  showCreateModal: false,
  editingItem: null,
  selectedItems: new Set(),
  history: [],
  historyIndex: -1,
  maxHistorySize: 50
};

// Reducer
function menuBuilderReducer(state: MenuBuilderState, action: MenuBuilderAction): MenuBuilderState {
  switch (action.type) {
    case 'UPDATE_CURRENT_ITEM':
      return {
        ...state,
        currentItem: { ...state.currentItem, ...action.payload },
        isFormDirty: true
      };
      
    case 'RESET_CURRENT_ITEM':
      return {
        ...state,
        currentItem: { ...initialState.currentItem },
        isFormDirty: false,
        formErrors: {}
      };
      
    case 'SAVE_DRAFT':
      return {
        ...state,
        drafts: { ...state.drafts, [action.payload.id]: action.payload.data },
        activeDraftId: action.payload.id,
        isFormDirty: false,
        lastSaved: new Date()
      };
      
    case 'LOAD_DRAFT':
      const draft = state.drafts[action.payload];
      if (!draft) return state;
      
      return {
        ...state,
        currentItem: {
          name: draft.name,
          description: draft.description,
          category: draft.category,
          price: draft.price,
          cost: 0, // Default if not in draft
          ingredients: draft.ingredients
        },
        activeDraftId: action.payload,
        isFormDirty: false
      };
      
    case 'DELETE_DRAFT':
      const { [action.payload]: deletedDraft, ...remainingDrafts } = state.drafts;
      return {
        ...state,
        drafts: remainingDrafts,
        activeDraftId: state.activeDraftId === action.payload ? null : state.activeDraftId
      };
      
    case 'SET_FORM_DIRTY':
      return { ...state, isFormDirty: action.payload };
      
    case 'SET_FORM_ERRORS':
      return { ...state, formErrors: action.payload };
      
    case 'SET_AUTO_SAVING':
      return { ...state, isAutoSaving: action.payload };
      
    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };
      
    case 'SET_SHOW_CREATE_MODAL':
      return { ...state, showCreateModal: action.payload };
      
    case 'SET_EDITING_ITEM':
      return { ...state, editingItem: action.payload };
      
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
      
    case 'ADD_TO_HISTORY':
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);
      
      // Trim history if it exceeds max size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }
      
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
      
    case 'UNDO':
      if (state.historyIndex > 0) {
        return {
          ...state,
          currentItem: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
          isFormDirty: true
        };
      }
      return state;
      
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          currentItem: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
          isFormDirty: true
        };
      }
      return state;
      
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
        historyIndex: -1
      };
      
    case 'LOAD_FROM_STORAGE':
      return { ...state, ...action.payload };
      
    default:
      return state;
  }
}

// Context
interface MenuBuilderContextType {
  state: MenuBuilderState;
  actions: {
    updateCurrentItem: (updates: Partial<MenuBuilderState['currentItem']>) => void;
    resetCurrentItem: () => void;
    saveDraft: (id?: string) => void;
    loadDraft: (id: string) => void;
    deleteDraft: (id: string) => void;
    setFormErrors: (errors: Record<string, string>) => void;
    setShowCreateModal: (show: boolean) => void;
    setEditingItem: (item: MenuItem | null) => void;
    setSelectedItems: (items: Set<string>) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    addToHistory: (item: MenuBuilderState['currentItem']) => void;
    validateForm: () => boolean;
    autoSave: () => void;
  };
}

const MenuBuilderContext = createContext<MenuBuilderContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  DRAFTS: 'menuBuilder_drafts',
  CURRENT_ITEM: 'menuBuilder_currentItem',
  ACTIVE_DRAFT: 'menuBuilder_activeDraft',
  LAST_SAVED: 'menuBuilder_lastSaved'
};

// Provider component
export function MenuBuilderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(menuBuilderReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedDrafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      const savedCurrentItem = localStorage.getItem(STORAGE_KEYS.CURRENT_ITEM);
      const savedActiveDraft = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRAFT);
      const savedLastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);

      const loadedState: Partial<MenuBuilderState> = {};

      if (savedDrafts) {
        loadedState.drafts = JSON.parse(savedDrafts);
      }

      if (savedCurrentItem) {
        loadedState.currentItem = JSON.parse(savedCurrentItem);
        loadedState.isFormDirty = true; // Assume form is dirty if we have saved data
      }

      if (savedActiveDraft) {
        loadedState.activeDraftId = savedActiveDraft;
      }

      if (savedLastSaved) {
        loadedState.lastSaved = new Date(savedLastSaved);
      }

      if (Object.keys(loadedState).length > 0) {
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: loadedState });
      }
    } catch (error) {
      console.error('Failed to load MenuBuilder state from storage:', error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(state.drafts));
      localStorage.setItem(STORAGE_KEYS.CURRENT_ITEM, JSON.stringify(state.currentItem));
      
      if (state.activeDraftId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAFT, state.activeDraftId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRAFT);
      }
      
      if (state.lastSaved) {
        localStorage.setItem(STORAGE_KEYS.LAST_SAVED, state.lastSaved.toISOString());
      }
    } catch (error) {
      console.error('Failed to save MenuBuilder state to storage:', error);
    }
  }, [state.drafts, state.currentItem, state.activeDraftId, state.lastSaved]);

  // Auto-save functionality
  const autoSave = useCallback(() => {
    if (!state.isFormDirty) return;

    dispatch({ type: 'SET_AUTO_SAVING', payload: true });
    
    const draftId = state.activeDraftId || `draft_${Date.now()}`;
    const draftData: CreateMenuItem = {
      name: state.currentItem.name,
      description: state.currentItem.description,
      category: state.currentItem.category,
      price: state.currentItem.price,
      ingredients: state.currentItem.ingredients,
      preparationTime: 0,
      calories: 0,
      allergens: [],
      tenantId: '', // Will be set when actually saving
      locationId: '' // Will be set when actually saving
    };

    dispatch({ type: 'SAVE_DRAFT', payload: { id: draftId, data: draftData } });
    
    setTimeout(() => {
      dispatch({ type: 'SET_AUTO_SAVING', payload: false });
    }, 500);
  }, [state.isFormDirty, state.activeDraftId, state.currentItem]);

  // Auto-save every 30 seconds when form is dirty
  useEffect(() => {
    if (!state.isFormDirty) return;

    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [state.isFormDirty, autoSave]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!state.currentItem.name.trim()) {
      errors.name = 'Item name is required';
    }

    if (!state.currentItem.category.trim()) {
      errors.category = 'Category is required';
    }

    if (state.currentItem.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (state.currentItem.ingredients.length === 0) {
      errors.ingredients = 'At least one ingredient is required';
    }

    dispatch({ type: 'SET_FORM_ERRORS', payload: errors });
    return Object.keys(errors).length === 0;
  }, [state.currentItem]);

  // Action creators
  const actions: MenuBuilderContextType['actions'] = {
    updateCurrentItem: (updates) => {
      // Add to history before updating
      dispatch({ type: 'ADD_TO_HISTORY', payload: state.currentItem });
      dispatch({ type: 'UPDATE_CURRENT_ITEM', payload: updates });
    },
    
    resetCurrentItem: () => {
      dispatch({ type: 'RESET_CURRENT_ITEM' });
      dispatch({ type: 'CLEAR_HISTORY' });
    },
    
    saveDraft: (id) => {
      const draftId = id || state.activeDraftId || `draft_${Date.now()}`;
      const draftData: CreateMenuItem = {
        name: state.currentItem.name,
        description: state.currentItem.description,
        category: state.currentItem.category,
        price: state.currentItem.price,
        ingredients: state.currentItem.ingredients,
        preparationTime: 0,
        calories: 0,
        allergens: [],
        tenantId: '',
        locationId: ''
      };
      dispatch({ type: 'SAVE_DRAFT', payload: { id: draftId, data: draftData } });
    },
    
    loadDraft: (id) => {
      dispatch({ type: 'LOAD_DRAFT', payload: id });
    },
    
    deleteDraft: (id) => {
      dispatch({ type: 'DELETE_DRAFT', payload: id });
    },
    
    setFormErrors: (errors) => {
      dispatch({ type: 'SET_FORM_ERRORS', payload: errors });
    },
    
    setShowCreateModal: (show) => {
      dispatch({ type: 'SET_SHOW_CREATE_MODAL', payload: show });
    },
    
    setEditingItem: (item) => {
      dispatch({ type: 'SET_EDITING_ITEM', payload: item });
    },
    
    setSelectedItems: (items) => {
      dispatch({ type: 'SET_SELECTED_ITEMS', payload: items });
    },
    
    undo: () => {
      dispatch({ type: 'UNDO' });
    },
    
    redo: () => {
      dispatch({ type: 'REDO' });
    },
    
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    
    addToHistory: (item) => {
      dispatch({ type: 'ADD_TO_HISTORY', payload: item });
    },
    
    validateForm,
    autoSave
  };

  return (
    <MenuBuilderContext.Provider value={{ state, actions }}>
      {children}
    </MenuBuilderContext.Provider>
  );
}

// Hook to use the context
export function useMenuBuilder() {
  const context = useContext(MenuBuilderContext);
  if (!context) {
    throw new Error('useMenuBuilder must be used within a MenuBuilderProvider');
  }
  return context;
}

// Hook for form field binding
export function useMenuBuilderField<K extends keyof MenuBuilderState['currentItem']>(
  field: K
): [
  MenuBuilderState['currentItem'][K],
  (value: MenuBuilderState['currentItem'][K]) => void
] {
  const { state, actions } = useMenuBuilder();
  
  const setValue = useCallback((value: MenuBuilderState['currentItem'][K]) => {
    actions.updateCurrentItem({ [field]: value });
  }, [actions, field]);
  
  return [state.currentItem[field], setValue];
}

export default MenuBuilderProvider;
