export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

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
  tags?: Tag[];
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

export interface DiagramMetadataItem {
  id: string;
  updatedAt: string;
}

export interface DiagramMetadataPage {
  items: DiagramMetadataItem[];
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
  tags?: Tag[];
}

export type NoteSortOption = 'recent' | 'old' | 'alphabetical';

export interface NotePage {
  items: Omit<Note, 'content'>[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface NoteMetadataItem {
  id: string;
  updatedAt: string;
}

export interface NoteMetadataPage {
  items: NoteMetadataItem[];
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
  kittyMode?: boolean;
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
  updateSettings: (updates: Partial<AppSettings>) => void;
}
