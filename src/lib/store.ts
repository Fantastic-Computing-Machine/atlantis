import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiagramStore } from './types';

const DEFAULT_SETTINGS = {
  autoSave: true,
  hasAiApiKey: false,
  aiProvider: 'auto' as const,
  aiModel: undefined as string | undefined,
  maxCheckpoints: 15,
  autoSaveDelay: 2000,
  defaultExportFormat: 'svg' as const,
  exportScale: 2 as const,
  snowMode: false,
  liveSync: true,
  liveSyncInterval: 5000,
  kittyMode: false,
};

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
          diagrams: state.diagrams.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
          currentDiagram:
            state.currentDiagram?.id === id
              ? { ...state.currentDiagram, ...updates }
              : state.currentDiagram,
        })),
      addDiagram: (diagram) =>
        set((state) => ({ diagrams: [diagram, ...state.diagrams] })),
      removeDiagram: (id) =>
        set((state) => ({
          diagrams: state.diagrams.filter((d) => d.id !== id),
          currentDiagram:
            state.currentDiagram?.id === id ? null : state.currentDiagram,
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
      setAutoSave: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, autoSave: enabled },
        })),
      setHasAiApiKey: (hasKey) =>
        set((state) => ({
          settings: { ...state.settings, hasAiApiKey: hasKey },
        })),
      setAiProvider: (provider) =>
        set((state) => ({
          settings: { ...state.settings, aiProvider: provider ?? 'auto' },
        })),
      setAiModel: (model) =>
        set((state) => ({
          settings: { ...state.settings, aiModel: model },
        })),
      setMaxCheckpoints: (value) =>
        set((state) => ({
          settings: { ...state.settings, maxCheckpoints: value },
        })),
      setAutoSaveDelay: (value) =>
        set((state) => ({
          settings: { ...state.settings, autoSaveDelay: value },
        })),
      setDefaultExportFormat: (format) =>
        set((state) => ({
          settings: { ...state.settings, defaultExportFormat: format },
        })),
      setExportScale: (scale) =>
        set((state) => ({
          settings: { ...state.settings, exportScale: scale },
        })),
      setSnowMode: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, snowMode: enabled },
        })),
      setLiveSync: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, liveSync: enabled },
        })),
      setLiveSyncInterval: (ms) =>
        set((state) => ({
          settings: { ...state.settings, liveSyncInterval: ms },
        })),
      setKittyMode: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, kittyMode: enabled },
        })),
    }),
    {
      name: 'atlantis-settings',
      // Only persist settings, not diagrams (those come from the server)
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

