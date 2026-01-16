export interface Diagram {
  id: string;
  title: string;
  content: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

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

export interface AppSettings {
  autoSave: boolean;
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
}
