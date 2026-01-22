export interface Diagram {
  id: string;
  title: string;
  description: string;
  content: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  totalVersions: number;
}

export type SortOption = 'recent' | 'old' | 'alphabetical' | 'versions';

export interface Checkpoint {
  id: string;
  content: string;
  updatedAt: string;
}

export interface DiagramPage {
  items: Diagram[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  language: string;
  emoji: string;
  starred: boolean;
  private: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteSortOption = 'recent' | 'old' | 'alphabetical';

export interface NotePage {
  items: Omit<Note, 'content'>[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface AppSettings {
  autoSave: boolean;
  hasAiApiKey: boolean;
  aiProvider?: 'openai' | 'gemini' | 'auto';
  aiModel?: string;
  maxCheckpoints?: number;
  autoSaveDelay?: number;
  defaultExportFormat?: 'svg' | 'png' | 'pdf';
  exportScale?: 1 | 2 | 3;
  snowMode?: boolean;
}

export interface DiagramStore {
  diagrams: Diagram[];
  currentDiagram: Diagram | null;
  isLoading: boolean;
  settings: AppSettings;
  setDiagrams: (diagrams: Diagram[]) => void;
  setCurrentDiagram: (diagram: Diagram | null) => void;
  updateDiagram: (id: string, updates: Partial<Diagram>) => void;
  addDiagram: (diagram: Diagram) => void;
  removeDiagram: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setAutoSave: (enabled: boolean) => void;
  setHasAiApiKey: (hasKey: boolean) => void;
  setAiProvider: (provider: AppSettings['aiProvider']) => void;
  setAiModel: (model: string | undefined) => void;
  setMaxCheckpoints: (value: number) => void;
  setAutoSaveDelay: (value: number) => void;
  setDefaultExportFormat: (format: AppSettings['defaultExportFormat']) => void;
  setExportScale: (scale: AppSettings['exportScale']) => void;
  setSnowMode: (enabled: boolean) => void;
}
