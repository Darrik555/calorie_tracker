import { create } from 'zustand';

export interface RecipeIngredient {
  barcode: string;
  name: string;
  amount_in_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RecipeStore {
  title: string;
  ingredients: RecipeIngredient[];
  setTitle: (title: string) => void;
  addIngredient: (ingredient: RecipeIngredient) => void;
  removeIngredient: (barcode: string) => void;
  clearRecipe: () => void;
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  title: '',
  ingredients: [],
  setTitle: (title) => set({ title }),
  addIngredient: (ingredient) => 
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),
  removeIngredient: (barcode) => 
    set((state) => ({ 
      ingredients: state.ingredients.filter(ing => ing.barcode !== barcode) 
    })),
  clearRecipe: () => set({ title: '', ingredients: [] }),
}));