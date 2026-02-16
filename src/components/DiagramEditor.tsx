'use client';

import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveTagPicker } from '@/components/responsive-tag-picker';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useDiagramStore } from '@/lib/store';
import { Checkpoint, Diagram, Tag } from '@/lib/types';
import { useLiveSync } from '@/lib/useLiveSync';

import { copyToClipboard, formatDate, cn } from '@/lib/utils';
import {
  Info,
  Moon,
  Save,
  Search,
  Share2,
  Star,
  Sun,
  Settings2,
  Trash2,
  MoreHorizontal,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CheckpointHistory } from '@/components/CheckpointHistory';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const Canvas = dynamic(() => import('@/components/Canvas').then((mod) => mod.Canvas), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
      Loading Canvas...
    </div>
  ),
});

const Editor = dynamic(() => import('@/components/Editor').then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <div className="bg-muted/30 h-full w-full animate-pulse" />,
});

const MAX_CHECKPOINTS = 15;

interface DiagramEditorProps {
  initialDiagram: Diagram;
}

type NodeSelection = { id: string; label?: string };
type TextRange = { from: number; to: number };

const COLOR_PRESETS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#94a3b8' },
] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type NodeOption = { id: string; label?: string };

const EDGE_RE = /((?:--!?>)|\s---\s|-\.-?>|==>|<--|<---|<-\.-?|<==|--\s*[^-]+\s*(?:--!?>)|==\s*[^=]+\s*==>)/;
const DIRECTIVE_RE = /^\s*(flowchart|graph|style|classDef|class|linkStyle|subgraph|end|click)\b/i;

const extractMermaidNodes = (src: string): NodeOption[] => {
  const nodes = new Map<string, NodeOption>();

  const ensureNode = (idRaw: string, labelRaw?: string) => {
    const id = idRaw.trim();
    if (!id) return;
    const cleanLabel = labelRaw?.trim();
    const existing = nodes.get(id);
    if (!existing) {
      nodes.set(id, cleanLabel && cleanLabel !== id ? { id, label: cleanLabel } : { id });
      return;
    }
    if ((!existing.label || existing.label === existing.id) && cleanLabel && cleanLabel !== id) {
      nodes.set(id, { id, label: cleanLabel });
    }
  };

  const lines = src.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (DIRECTIVE_RE.test(line)) continue;

    // Edge lines: collect endpoints only
    if (EDGE_RE.test(line)) {
      const sanitized = line
        .replace(/\s*--\s*[^-]+?\s*(?:--!?>)\s*/g, ' --> ')
        .replace(/\s*==\s*[^=]+?\s*==>\s*/g, ' ==> ');
      const parts = sanitized.split(/\s+(?:--!?>|==>|---|-\.-?>|<--|<==)\s+/);
      parts.forEach((part) => {
        const idMatch = part.trim().match(/^[A-Za-z0-9_][A-Za-z0-9_:-]*/);
        if (idMatch) ensureNode(idMatch[0]);
      });
      continue;
    }

    // Node declarations with shapes/labels
    const decl = line.match(
      /^([A-Za-z0-9_][A-Za-z0-9_:-]*)\s*(?:\(\(|\(|\[\[|\[|\{)\s*("?)(.*?)\2\s*(?:\]\]|\]|\}|\)\)|\))\s*$/
    );
    if (decl) {
      const [, id, , label] = decl;
      ensureNode(id, label);
      continue;
    }

    // Bare node id
    const bare = line.match(/^([A-Za-z0-9_][A-Za-z0-9_:-]*)\s*$/);
    if (bare) {
      ensureNode(bare[1]);
    }
  }

  return Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
};

const getNodeIdFromLine = (line: string): string | null => {
  const styleMatch = line.match(/^\s*style\s+([A-Za-z0-9_:-]+)/);
  if (styleMatch) return styleMatch[1];

  // Ignore edge-only lines to avoid showing palette on connectors
  if (/\s*[A-Za-z0-9_:-]+\s*[-.]*[-=]*>\s*[A-Za-z0-9_:-]+/.test(line)) return null;
  if (/\s*[A-Za-z0-9_:-]+\s*---\s*[A-Za-z0-9_:-]+/.test(line)) return null;

  const nodeMatch = line.match(/(^|\s)([A-Za-z0-9_:-]+)\s*(\[|\(|\{|\"|:::|>|\\{\\{)/);
  if (nodeMatch) return nodeMatch[2];

  return null;
};

const findNodeDefinitionRange = (content: string, nodeId: string): TextRange | null => {
  const pattern = new RegExp(
    `(^|\\s)${escapeRegExp(nodeId)}\\s*(\\[|\\(|\\{|\"|:::|>|\\{\\{)`,
    'm'
  );
  const match = pattern.exec(content);
  if (!match || match.index === undefined) return null;

  const lineStart = content.lastIndexOf('\n', match.index) + 1;
  const lineEnd = content.indexOf('\n', match.index);
  return {
    from: lineStart,
    to: lineEnd === -1 ? content.length : lineEnd,
  };
};

const getNodeFillColor = (content: string, nodeId: string): string | null => {
  const styleRegex = new RegExp(`^\\s*style\\s+${escapeRegExp(nodeId)}\\s+([^\\n]+)$`, 'm');
  const match = styleRegex.exec(content);
  if (!match) return null;
  const fillMatch = match[1].match(/fill:\\s*([^,\\s]+)/);
  return fillMatch ? fillMatch[1].trim() : null;
};

const upsertNodeStyleLine = (content: string, nodeId: string, color: string | null): string => {
  const lines = content.split('\n');
  const styleRegex = new RegExp(`^\\s*style\\s+${escapeRegExp(nodeId)}\\s+([^\\n]+)$`);
  const nodeRegex = new RegExp(`(^|\\s)${escapeRegExp(nodeId)}\\s*(\\[|\\(|\\{|\"|:::|>|\\{\\{)`);
  const styleIndex = lines.findIndex((line) => styleRegex.test(line));
  const nodeIndex = lines.findIndex((line) => nodeRegex.test(line));

  if (color === null) {
    if (styleIndex !== -1) {
      lines.splice(styleIndex, 1);
    }
    return lines.join('\n');
  }

  const buildProps = (existing?: string) => {
    const parts = (existing ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    let hasFill = false;

    const updated = parts.map((part) => {
      if (part.startsWith('fill:')) {
        hasFill = true;
        return `fill:${color}`;
      }
      return part;
    });

    if (!hasFill) updated.unshift(`fill:${color}`);

    return updated.join(',');
  };

  if (styleIndex !== -1) {
    const match = lines[styleIndex].match(styleRegex);
    const props = match?.[1] ?? '';
    const indent = lines[styleIndex].match(/^\s*/)?.[0] ?? '';
    lines[styleIndex] = `${indent}style ${nodeId} ${buildProps(props)}`;
  } else {
    const insertAt = nodeIndex !== -1 ? nodeIndex + 1 : lines.length;
    const indent = nodeIndex !== -1 ? (lines[nodeIndex].match(/^\s*/)?.[0] ?? '') : '';
    lines.splice(insertAt, 0, `${indent}style ${nodeId} ${buildProps()}`);
  }

  return lines.join('\n');
};

export function DiagramEditor({ initialDiagram }: DiagramEditorProps) {
  const router = useRouter();
  const [diagram, setDiagram] = useState<Diagram>(initialDiagram);
  const [tags, setTags] = useState<Tag[]>(initialDiagram.tags || []);
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeSelection | null>(null);
  const [selectionRange, setSelectionRange] = useState<TextRange | null>(null);
  // const { shortcutHint } = useShortcutPlatform(); // Unused
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);
  const [viewingCheckpointId, setViewingCheckpointId] = useState<string | null>(null);
  const { setTheme, theme } = useTheme();
  const settings = useDiagramStore((state) => state.settings);
  const updateDiagram = useDiagramStore((state) => state.updateDiagram);
  const removeDiagram = useDiagramStore((state) => state.removeDiagram);
  const setHasAiApiKey = useDiagramStore((state) => state.setHasAiApiKey);
  const setAiProvider = useDiagramStore((state) => state.setAiProvider);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialDiagram.content);
  const lastSavedTitleRef = useRef(initialDiagram.title);
  const lastSavedDescriptionRef = useRef(initialDiagram.description);
  const lastSavedTagsRef = useRef(initialDiagram.tags || []);
  const selectedNodeId = selectedNode?.id ?? null;
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [activePane, setActivePane] = useState<'editor' | 'preview'>('preview');

  // Track if user has unsaved local changes (for live sync conflict detection)
  const hasLocalChanges =
    diagram.content !== lastSavedContentRef.current ||
    diagram.title !== lastSavedTitleRef.current ||
    diagram.description !== lastSavedDescriptionRef.current;

  // Live sync: poll for external changes from other users
  const { refresh: syncFromServer } = useLiveSync<Diagram>({
    resourceUrl: `/api/diagrams/${diagram.id}`,
    currentUpdatedAt: diagram.updatedAt,
    hasLocalChanges,
    enabled: Boolean(settings.liveSync) && mounted,
    intervalMs: settings.liveSyncInterval ?? 5000,
    onUpdate: (remoteDiagram) => {
      setDiagram(remoteDiagram);
      setTags(remoteDiagram.tags || []);
      lastSavedContentRef.current = remoteDiagram.content;
      lastSavedTitleRef.current = remoteDiagram.title;
      lastSavedDescriptionRef.current = remoteDiagram.description;
      lastSavedTagsRef.current = remoteDiagram.tags || [];
      updateDiagram(diagram.id, remoteDiagram);
    },
    onExternalChange: () => {
      toast.info('Document updated by another user');
    },
  });

  // Prevent hydration mismatch by only rendering client-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadAiKey = async () => {
      try {
        const res = await fetch('/api/settings/ai-key');
        const data = await res.json();
        if (typeof data.hasKey === 'boolean') {
          setHasAiApiKey(data.hasKey);
        }
        if (typeof data.provider === 'string') {
          setAiProvider(data.provider);
        }
      } catch {
        // silently ignore; AI is optional
      }
    };
    loadAiKey();
  }, [setHasAiApiKey, setAiProvider]);

  useEffect(() => {
    if (!selectedNodeId) {
      setSelectionRange(null);
      return;
    }
    const range = findNodeDefinitionRange(diagram.content, selectedNodeId);
    setSelectionRange(range);
  }, [diagram.content, selectedNodeId]);

  const handleEditorChange = (value: string) => {
    // Ignore changes when viewing a past checkpoint (read-only mode)
    if (viewingCheckpointId !== null) return;
    setDiagram((prev) => ({ ...prev, content: value }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiagram((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDiagram((prev) => ({ ...prev, description: e.target.value }));
  };

  const handleNodeSelect = useCallback(
    (node: NodeSelection) => {
      setSelectedNode(node);
      const range = findNodeDefinitionRange(diagram.content, node.id);
      setSelectionRange(range);
    },
    [diagram.content]
  );

  const nodeOptions = useMemo(() => {
    const nodes = extractMermaidNodes(diagram.content);
    if (selectedNode && !nodes.some((node) => node.id === selectedNode.id)) {
      nodes.unshift(selectedNode);
    }
    return nodes;
  }, [diagram.content, selectedNode]);

  const handleCursorLineChange = useCallback(
    (line: string) => {
      const nodeId = getNodeIdFromLine(line);
      if (!nodeId) {
        setSelectedNode(null);
        setSelectionRange(null);
        return;
      }
      if (nodeId === selectedNodeId) return;
      const node = nodeOptions.find((item) => item.id === nodeId) ?? { id: nodeId };
      setSelectedNode(node);
      const range = findNodeDefinitionRange(diagram.content, nodeId);
      setSelectionRange(range);
    },
    [diagram.content, nodeOptions, selectedNodeId]
  );

  const handleNodeColorChange = useCallback(
    (color: string | null) => {
      if (!selectedNodeId) return;
      setDiagram((prev) => {
        const updatedContent = upsertNodeStyleLine(prev.content, selectedNodeId, color);
        return { ...prev, content: updatedContent };
      });
    },
    [selectedNodeId]
  );

  const handleToggleAiChat = useCallback(() => {
    setAiChatOpen((prev) => !prev);
  }, []);

  const handleApplyAiContent = useCallback(
    (content: string) => {
      setDiagram((prev) => ({ ...prev, content }));
      updateDiagram(diagram.id, { content });
    },
    [diagram.id, updateDiagram]
  );

  const saveChanges = useCallback(
    async (showToast = true) => {
      try {
        const csrfToken = await ensureCsrfToken();
        const res = await fetch(`/api/diagrams/${diagram.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: csrfToken,
          },
          body: JSON.stringify({ ...diagram, tags: tags.map((t) => t.id) }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const updated = await res.json();
        setTags(updated.tags || []);
        setDiagram((prev) => ({ ...prev, updatedAt: updated.updatedAt }));
        updateDiagram(diagram.id, {
          title: diagram.title,
          description: diagram.description,
          content: diagram.content,
          tags: updated.tags || [],
          emoji: updated.emoji, // Ensure emoji is synced if changed
          updatedAt: updated.updatedAt,
        });
        lastSavedContentRef.current = diagram.content;
        lastSavedTitleRef.current = diagram.title;
        lastSavedDescriptionRef.current = diagram.description;
        lastSavedTagsRef.current = updated.tags || [];
        if (showToast) {
          toast.success('Changes saved');
        }
        // Sync from server after save to pull any concurrent changes
        syncFromServer();
      } catch {
        toast.error('Failed to save changes');
      }
    },
    [diagram, updateDiagram, syncFromServer, tags]
  );

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Don't save when viewing a past checkpoint
        if (viewingCheckpointId !== null) {
          toast.info('Cannot save while viewing a past checkpoint');
          return;
        }
        saveChanges();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges, viewingCheckpointId]);

  // Auto-save with debounce
  // Content-only auto-save with debounce
  useEffect(() => {
    // Don't auto-save when viewing a past checkpoint
    if (!settings.autoSave || viewingCheckpointId !== null) return;

    const hasContentChanged = diagram.content !== lastSavedContentRef.current;
    const hasTitleChanged = diagram.title !== lastSavedTitleRef.current;
    const hasDescriptionChanged = diagram.description !== lastSavedDescriptionRef.current;

    // Explicitly exclude tags from this check
    if (!hasContentChanged && !hasTitleChanged && !hasDescriptionChanged) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (2 second debounce)
    autoSaveTimerRef.current = setTimeout(() => {
      saveChanges(false); // Silent save
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    diagram.content,
    diagram.title,
    diagram.description,
    // tags removed from dependencies
    settings.autoSave,
    saveChanges,
    viewingCheckpointId,
  ]);

  // Immediate save for tags
  useEffect(() => {
    // Skip initial mount or if no changes
    if (JSON.stringify(tags) === JSON.stringify(lastSavedTagsRef.current)) return;

    // If we are viewing a past checkpoint, we shouldn't save tags either (or maybe we should? tags are global). 
    // Logic above says "Don't save when viewing a past checkpoint". Following that rule.
    if (viewingCheckpointId !== null) return;

    // Save immediately
    saveChanges(false);
  }, [tags, saveChanges, viewingCheckpointId]);

  // Save on blur for title (if auto-save is off)
  const handleTitleBlur = () => {
    // Don't save when viewing a past checkpoint
    if (!settings.autoSave && viewingCheckpointId === null) {
      saveChanges();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/diagram/${diagram.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleFavorite = async () => {
    try {
      const nextFavorite = !diagram.isFavorite;
      setDiagram((prev) => ({ ...prev, isFavorite: nextFavorite }));
      updateDiagram(diagram.id, { isFavorite: nextFavorite });
      const csrfToken = await ensureCsrfToken();
      await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      toast.success(nextFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDelete = useCallback(async () => {
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'DELETE',
        headers: {
          [CSRF_HEADER_NAME]: csrfToken,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      removeDiagram(diagram.id);
      toast.success('Diagram deleted');
      router.push('/diagram');
    } catch {
      toast.error('Failed to delete diagram');
    }
  }, [diagram.id, router, removeDiagram]);

  const selectedNodeColor = selectedNodeId
    ? getNodeFillColor(diagram.content, selectedNodeId)
    : null;

  const loadCheckpoints = useCallback(async () => {
    setIsLoadingCheckpoints(true);
    try {
      const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`);
      if (!res.ok) throw new Error('Failed to load checkpoints');
      const data = await res.json();
      setCheckpoints(data.checkpoints ?? []);
    } catch {
      toast.error('Failed to load checkpoints');
    } finally {
      setIsLoadingCheckpoints(false);
    }
  }, [diagram.id]);

  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  const handleSaveCheckpoint = useCallback(async () => {
    setIsSavingCheckpoint(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        body: JSON.stringify({
          content: diagram.content,
          title: diagram.title,
          emoji: diagram.emoji,
          isFavorite: diagram.isFavorite,
        }),
      });
      if (!res.ok) throw new Error('Failed to create checkpoint');
      const data = await res.json();
      setDiagram((prev) => ({ ...prev, updatedAt: data.diagram.updatedAt }));
      updateDiagram(diagram.id, { updatedAt: data.diagram.updatedAt });
      setCheckpoints((prev) => {
        const next = [
          data.checkpoint as Checkpoint,
          ...prev.filter((cp) => cp.id !== data.checkpoint.id),
        ];
        return next.slice(0, MAX_CHECKPOINTS);
      });
      toast.success('Checkpoint saved');
    } catch {
      toast.error('Failed to save checkpoint');
    } finally {
      setIsSavingCheckpoint(false);
    }
  }, [diagram, updateDiagram]);

  const handleViewCheckpoint = useCallback(
    (checkpointId: string) => {
      const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);
      if (!checkpoint) return;

      // If viewing the current (first) checkpoint, clear viewing mode
      if (checkpoints[0]?.id === checkpointId) {
        setViewingCheckpointId(null);
        return;
      }

      setViewingCheckpointId(checkpointId);
      setDiagram((prev) => ({ ...prev, content: checkpoint.content }));
      toast.info('Viewing past checkpoint (read-only)');
    },
    [checkpoints]
  );

  const handleMakeCurrent = useCallback(
    async (checkpointId: string) => {
      try {
        const csrfToken = await ensureCsrfToken();
        const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: csrfToken,
          },
          body: JSON.stringify({ checkpointId }),
        });
        if (!res.ok) throw new Error('Failed to restore checkpoint');
        const data = await res.json();

        // Update diagram with restored content
        setDiagram(data.diagram);
        lastSavedContentRef.current = data.diagram.content;
        lastSavedTitleRef.current = data.diagram.title;
        lastSavedDescriptionRef.current = data.diagram.description;
        updateDiagram(diagram.id, data.diagram);

        // Add new checkpoint to list
        setCheckpoints((prev) => {
          const next = [
            data.checkpoint as Checkpoint,
            ...prev.filter((cp) => cp.id !== data.checkpoint.id),
          ];
          return next.slice(0, MAX_CHECKPOINTS);
        });

        // Clear viewing mode
        setViewingCheckpointId(null);
        toast.success('Checkpoint restored as current');
      } catch {
        toast.error('Failed to restore checkpoint');
      }
    },
    [diagram.id, updateDiagram]
  );

  const handleDeleteCheckpoint = useCallback(
    async (checkpointId: string) => {
      try {
        const csrfToken = await ensureCsrfToken();
        const res = await fetch(`/api/diagrams/${diagram.id}/checkpoint`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: csrfToken,
          },
          body: JSON.stringify({ checkpointId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete checkpoint');
        }

        // Remove from list
        setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId));

        // If we were viewing the deleted checkpoint, go back to current
        if (viewingCheckpointId === checkpointId) {
          setViewingCheckpointId(null);
          // Reload current content
          loadCheckpoints();
        }

        toast.success('Checkpoint deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete checkpoint');
      }
    },
    [diagram.id, viewingCheckpointId, loadCheckpoints]
  );

  // When returning to current (clearing viewingCheckpointId), reload current content
  useEffect(() => {
    if (viewingCheckpointId === null && checkpoints.length > 0) {
      const currentCheckpoint = checkpoints[0];
      if (currentCheckpoint && diagram.content !== currentCheckpoint.content) {
        setDiagram((prev) => ({ ...prev, content: currentCheckpoint.content }));
      }
    }
  }, [viewingCheckpointId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isViewingPastCheckpoint = viewingCheckpointId !== null;

  // Show loading state until client hydration is complete
  if (!mounted) {
    return (
      <div className="bg-background text-foreground flex h-screen w-screen items-center justify-center overflow-hidden">
        <div className="text-muted-foreground flex items-center gap-2">
          <span className="text-2xl">🔱</span>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-background text-foreground flex h-screen w-screen flex-col overflow-hidden pb-24 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0">
        {/* Header */}
        <div className="bg-background/50 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm">
          {/* Left: Branding & Title */}
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1 transition-opacity hover:opacity-80"
            >
              <span className="text-2xl sm:hidden">🔱</span>
              <span className="hidden text-lg font-semibold sm:inline">🔱 atlantis //</span>
            </Link>

            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />

            <div className="flex max-w-xl min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-xl">{diagram.emoji || '📊'}</span>
              <input
                value={diagram.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                maxLength={60}
                className="min-w-[60px] flex-1 truncate border-none bg-transparent px-0 text-sm font-medium focus:ring-0 focus:outline-none sm:text-base"
                placeholder="Untitled Diagram"
              />
              <div className="shrink-0">
                <ResponsiveTagPicker
                  selectedTags={tags}
                  onTagsChange={setTags}
                  maxTags={3}
                  align="start"
                />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Checkpoints */}
            <CheckpointHistory
              checkpoints={checkpoints}
              currentCheckpointId={checkpoints[0]?.id}
              viewingCheckpointId={viewingCheckpointId}
              isLoading={isLoadingCheckpoints}
              isSaving={isSavingCheckpoint}
              onCreateCheckpoint={handleSaveCheckpoint}
              onViewCheckpoint={handleViewCheckpoint}
              onMakeCurrent={handleMakeCurrent}
              onDeleteCheckpoint={handleDeleteCheckpoint}
            />

            {/* Desktop only actions moved to overflow menu on mobile if needed, but fitting key ones here */}
            <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share">
              <Share2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsInfoOpen(true)}>
                  <Info className="mr-2 h-4 w-4" />
                  <span>Info</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFavorite}>
                  <Star
                    className={cn(
                      'mr-2 h-4 w-4',
                      diagram.isFavorite && 'fill-amber-400 text-amber-400'
                    )}
                  />
                  <span>{diagram.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>Switch Theme</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Diagram</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="bg-border mx-1 h-6 w-px" />

            <Button onClick={() => saveChanges()} size="sm" className="gap-2" aria-label="Save">
              <Save size={16} />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {/* Mobile quick nav */}
        <div className="bg-background/80 flex items-center justify-between border-b px-4 py-2 text-sm backdrop-blur sm:hidden">
          <Link href="/" className="text-primary font-medium hover:underline">
            Home
          </Link>
          <Link href="/diagram" className="text-foreground hover:underline">
            All diagrams
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Read-only banner when viewing past checkpoint */}
          {isViewingPastCheckpoint && (
            <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>Viewing past checkpoint (read-only)</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                onClick={() => viewingCheckpointId && handleMakeCurrent(viewingCheckpointId)}
              >
                <RotateCcw className="h-3 w-3" />
                Make Current
              </Button>
            </div>
          )}
          <div className="bg-muted/30 flex items-center gap-2 border-b px-3 py-2 sm:hidden">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activePane === 'preview' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActivePane('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activePane === 'editor' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActivePane('editor')}
            >
              Editor
            </button>
          </div>

          <div className="hidden h-full sm:block">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={45} minSize={25}>
                <Editor
                  value={diagram.content}
                  onChange={handleEditorChange}
                  selectionRange={selectionRange}
                  onCursorLineChange={handleCursorLineChange}
                  onToggleAiChat={handleToggleAiChat}
                  aiEnabled={aiChatOpen}
                  hasAiKey={settings.hasAiApiKey}
                  aiChatOpen={aiChatOpen}
                  onApplyAiContent={handleApplyAiContent}
                  diagramId={diagram.id}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={55} minSize={25}>
                <Canvas
                  code={diagram.content}
                  diagramId={diagram.id}
                  title={diagram.title}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={handleNodeSelect}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <div className="h-full pb-14 sm:hidden">
            {activePane === 'preview' ? (
              <Canvas
                code={diagram.content}
                diagramId={diagram.id}
                title={diagram.title}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
              />
            ) : (
              <Editor
                value={diagram.content}
                onChange={handleEditorChange}
                selectionRange={selectionRange}
                onCursorLineChange={handleCursorLineChange}
                onToggleAiChat={handleToggleAiChat}
                aiEnabled={aiChatOpen}
                hasAiKey={settings.hasAiApiKey}
                aiChatOpen={aiChatOpen}
                onApplyAiContent={handleApplyAiContent}
                diagramId={diagram.id}
              />
            )}
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="fixed right-0 bottom-3 left-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] sm:right-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:px-0">
          <div className="bg-background/95 mx-auto flex max-w-full min-w-0 items-center gap-2 overflow-x-auto rounded-full border px-2.5 py-2 shadow-lg backdrop-blur sm:max-w-3xl sm:justify-center sm:px-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="bg-muted/50 text-foreground hover:bg-muted focus-visible:outline-primary inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
                  aria-label="Select block"
                >
                  <span className="whitespace-nowrap">
                    Block {selectedNode.label || selectedNode.id}
                  </span>
                  <span className="text-muted-foreground text-[11px]">▾</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-64 w-56 overflow-auto">
                <DropdownMenuLabel>Blocks</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {nodeOptions.length === 0 ? (
                  <DropdownMenuItem disabled>No blocks found</DropdownMenuItem>
                ) : (
                  nodeOptions.map((node) => (
                    <DropdownMenuItem
                      key={node.id}
                      onClick={() => handleNodeSelect(node)}
                      className={node.id === selectedNode?.id ? 'bg-muted' : ''}
                    >
                      <span className="truncate">{node.label || node.id}</span>
                      {node.label && (
                        <span className="text-muted-foreground ml-auto text-xs">{node.id}</span>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-3 text-xs whitespace-nowrap sm:text-sm"
              onClick={() => handleNodeColorChange(null)}
            >
              Default
            </Button>

            <div className="flex items-center gap-1 pr-2 sm:gap-1.5">
              {COLOR_PRESETS.map((color) => {
                const isActive = selectedNodeColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    aria-label={`Set ${selectedNode.label ?? selectedNode.id} color to ${color.name}`}
                    className={`border-border focus-visible:outline-primary h-7 w-7 shrink-0 rounded-full border shadow-sm transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-8 sm:w-8 ${isActive ? 'ring-primary ring-offset-background ring-2 ring-offset-1 sm:ring-offset-2' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleNodeColorChange(color.value)}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="text-muted-foreground hover:bg-muted focus-visible:outline-primary ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Close block tools"
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} hideTrigger />

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Diagram Info</DialogTitle>
            <DialogDescription>View and edit diagram details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                value={diagram.title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={diagram.description}
                onChange={handleDescriptionChange}
                onBlur={handleTitleBlur}
                maxLength={400}
                className="h-32 resize-none"
                placeholder="Add a description..."
              />
              <p className="text-muted-foreground text-right text-xs">
                {diagram.description?.length || 0}/400
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(diagram.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(diagram.updatedAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Versions</span>
                <span>{diagram.totalVersions}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this diagram?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The diagram &quot;{diagram.title}&quot; will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
