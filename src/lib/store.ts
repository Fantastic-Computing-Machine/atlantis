import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DiagramStore } from './types';

const DEFAULT_SETTINGS = {
  autoSave: true,
  hasAiApiKey: false,
  aiProvider: 'auto' as const,
  aiModel: undefined as string | undefined,
  maxCheckpoints: 15,
  autoSaveDelay: 2000,
  defaultExportFormat: 'svg' as const,
  exportScale: 2 as const,
};

type PersistedDiagramStoreState = Pick<DiagramStore, 'settings'>;

export const useDiagramStore = create<DiagramStore>()(
  persist(
    (set) => ({
      diagrams: [],
      currentDiagram: null,
      isLoading: false,
      settings: DEFAULT_SETTINGS,
      setDiagrams: (diagrams) => set({ diagrams }),
      setCurrentDiagram: (diagram) => set({ currentDiagram: diagram }),
      updateDiagram: (id, updates) =>
        set((state) => ({
          diagrams: state.diagrams.map((d) => (d.id === id ? { ...d, ...updates } : d)),
          currentDiagram:
            state.currentDiagram?.id === id
              ? { ...state.currentDiagram, ...updates }
              : state.currentDiagram,
        })),
      addDiagram: (diagram) => set((state) => ({ diagrams: [diagram, ...state.diagrams] })),
      removeDiagram: (id) =>
        set((state) => ({
          diagrams: state.diagrams.filter((d) => d.id !== id),
          currentDiagram: state.currentDiagram?.id === id ? null : state.currentDiagram,
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          diagrams: state.diagrams.map((d) =>
            d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
          ),
          currentDiagram:
            state.currentDiagram?.id === id
              ? { ...state.currentDiagram, isFavorite: !state.currentDiagram.isFavorite }
              : state.currentDiagram,
        })),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    {
      name: 'atlantis-settings',
      // Only persist settings, not diagrams (those come from the server)
      partialize: (state) => ({ settings: state.settings }),
      merge: (persistedState, currentState) => {
        const state = persistedState as PersistedDiagramStoreState | undefined;
        return {
          ...currentState,
          ...state,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(state?.settings ?? {}),
          },
        };
      },
    }
  )
);
