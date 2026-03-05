import { create } from 'zustand';

export interface StagedItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface EntryStore {
  stagedItems: StagedItem[];
  addStagedItem: (item: StagedItem) => void;
  removeStagedItem: (id: string) => void;
  clearStagedItems: () => void;
}

export const useEntryStore = create<EntryStore>((set) => ({
  stagedItems: [],
  addStagedItem: (item) => set((state) => ({ stagedItems: [...state.stagedItems, item] })),
  removeStagedItem: (id) => set((state) => ({ 
    stagedItems: state.stagedItems.filter(item => item.id !== id) 
  })),
  clearStagedItems: () => set({ stagedItems: [] }),
}));