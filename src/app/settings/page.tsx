'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { GeminiSpark } from '@/components/icons/GeminiSpark';
import { useDiagramStore } from '@/lib/store';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Loader2,
  Moon,
  Monitor,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
  XCircle,
  Workflow,
  Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const {
    settings,
    setAutoSave,
    setHasAiApiKey,
    setAiProvider,
    setAiModel,
    setMaxCheckpoints,
    setAutoSaveDelay,
    setDefaultExportFormat,
    setExportScale,
    setSnowMode,
  } = useDiagramStore();

  // AI Settings state
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'auto'>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [aiModel, setAiModelLocal] = useState<string | null>(null);
  const [isKeyFromEnv, setIsKeyFromEnv] = useState(false);

  // Advanced settings local state
  const [localMaxCheckpoints, setLocalMaxCheckpoints] = useState(settings.maxCheckpoints ?? 15);
  const [localAutoSaveDelay, setLocalAutoSaveDelay] = useState(settings.autoSaveDelay ?? 2000);
  const [localExportFormat, setLocalExportFormat] = useState(settings.defaultExportFormat ?? 'svg');
  const [localExportScale, setLocalExportScale] = useState(settings.exportScale ?? 2);
  const [isSavingAdvanced, setIsSavingAdvanced] = useState(false);

  // Backup/Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danger Zone state
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false);
  const [wipeConfirmationInput, setWipeConfirmationInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [serverWipeCode, setServerWipeCode] = useState<string | null>(null);
  const [isLoadingWipeCode, setIsLoadingWipeCode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    status: 'ok' | 'error' | 'loading';
    provider?: string;
    display?: string;
    database?: string;
    host?: string;
    error?: string;
  }>({ status: 'loading' });

  // Stats state
  const [stats, setStats] = useState<{
    totalNotes: number;
    totalDiagrams: number;
    activity: { date: string; notes: number; diagrams: number }[];
    loading: boolean;
  }>({ totalNotes: 0, totalDiagrams: 0, activity: [], loading: true });

  // Track mounted state for hydration-safe rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDbStatus = async () => {
    setDbStatus((prev) => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetch('/api/settings/db-status');
      const data = await res.json();
      setDbStatus({
        status: res.ok ? 'ok' : 'error',
        provider: data.provider,
        display: data.display,
        database: data.database,
        host: data.host,
        error: data.error,
      });
    } catch {
      setDbStatus({ status: 'error', error: 'Unable to load database status' });
    }
  };

  useEffect(() => {
    loadDbStatus();
  }, []);

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/settings/stats');
        const data = await res.json();
        if (res.ok) {
          setStats({
            totalNotes: data.totalNotes ?? 0,
            totalDiagrams: data.totalDiagrams ?? 0,
            activity: data.activity ?? [],
            loading: false,
          });
        } else {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };
    loadStats();
  }, []);

  // Fetch wipe code from server when dialog opens
  useEffect(() => {
    if (isWipeDialogOpen) {
      setIsLoadingWipeCode(true);
      setServerWipeCode(null);
      fetch('/api/settings/wipe')
        .then((res) => res.json())
        .then((data) => {
          if (data.code) {
            setServerWipeCode(data.code);
          }
        })
        .catch(() => {
          toast.error('Failed to generate confirmation code');
        })
        .finally(() => {
          setIsLoadingWipeCode(false);
        });
    }
  }, [isWipeDialogOpen]);

  // Load AI key status on mount
  useEffect(() => {
    const loadAiKey = async () => {
      try {
        const res = await fetch('/api/settings/ai-key');
        const data = await res.json();
        if (typeof data.hasKey === 'boolean') {
          setHasAiApiKey(data.hasKey);
          setHasExistingKey(data.hasKey);
        }
        if (typeof data.provider === 'string') {
          setProvider(data.provider);
          setAiProvider(data.provider);
        }
        if (typeof data.aiModel === 'string') {
          setAiModelLocal(data.aiModel);
          setAiModel(data.aiModel);
        }
        if (typeof data.fromEnv === 'boolean') {
          setIsKeyFromEnv(data.fromEnv);
        }
      } catch {
        // ignore
      }
    };
    loadAiKey();
  }, [setHasAiApiKey, setAiProvider, setAiModel]);

  // Load advanced settings on mount
  useEffect(() => {
    const loadAdvanced = async () => {
      try {
        const res = await fetch('/api/settings/advanced');
        const data = await res.json();
        if (typeof data.maxCheckpoints === 'number') {
          setLocalMaxCheckpoints(data.maxCheckpoints);
          setMaxCheckpoints(data.maxCheckpoints);
        }
        if (typeof data.autoSaveDelay === 'number') {
          setLocalAutoSaveDelay(data.autoSaveDelay);
          setAutoSaveDelay(data.autoSaveDelay);
        }
        if (data.defaultExportFormat) {
          setLocalExportFormat(data.defaultExportFormat);
          setDefaultExportFormat(data.defaultExportFormat);
        }
        if (typeof data.exportScale === 'number') {
          setLocalExportScale(data.exportScale);
          setExportScale(data.exportScale);
        }
      } catch {
        // ignore
      }
    };
    loadAdvanced();
  }, [setMaxCheckpoints, setAutoSaveDelay, setDefaultExportFormat, setExportScale]);

  const handleSaveAiKey = async () => {
    setIsSubmitting(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/settings/ai-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({ apiKey: apiKey.trim() || null, provider }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = typeof data.error === 'string' ? data.error : 'Failed to save';
        throw new Error(message);
      }

      const data = await res.json();
      setHasAiApiKey(Boolean(data.hasKey));
      if (typeof data.provider === 'string') {
        setAiProvider(data.provider);
      }
      setHasExistingKey(Boolean(data.hasKey));
      toast.success(data.hasKey ? 'AI key saved' : 'AI key removed');
      setApiKey('');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save AI key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAiKey = async () => {
    setIsRemoving(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/settings/ai-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({ apiKey: null, provider }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = typeof data.error === 'string' ? data.error : 'Failed to remove key';
        throw new Error(message);
      }
      setHasAiApiKey(false);
      setHasExistingKey(false);
      toast.success('AI key removed');
      setApiKey('');
    } catch (error) {
      console.error(error);
      toast.error('Unable to remove AI key');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const csrfToken = await ensureCsrfToken();
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [CSRF_HEADER_NAME]: csrfToken,
          },
          body: JSON.stringify(json),
        });
        if (res.ok) {
          toast.success('Backup restored successfully');
          window.location.reload();
        } else {
          throw new Error('Restore failed');
        }
      } catch {
        toast.error('Failed to restore backup');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openRestorePicker = () => {
    fileInputRef.current?.click();
  };

  const handleWipeDatabase = async () => {
    if (!serverWipeCode || wipeConfirmationInput !== serverWipeCode) {
      toast.error('Confirmation code does not match');
      return;
    }

    setIsWiping(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/settings/wipe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({
          confirmationCode: wipeConfirmationInput,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = typeof data.error === 'string' ? data.error : 'Failed to wipe database';
        throw new Error(message);
      }

      toast.success('All data has been wiped');
      setIsWipeDialogOpen(false);
      // Redirect to home after wipe
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      toast.error('Failed to wipe database');
    } finally {
      setIsWiping(false);
    }
  };

  const handleWipeDialogClose = (open: boolean) => {
    setIsWipeDialogOpen(open);
    if (!open) {
      setWipeConfirmationInput('');
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="atlantis logo">
              🔱
            </span>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="text-primary h-5 w-5" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>Connection status and basic info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connection</p>
                <p className="text-muted-foreground text-sm">
                  {dbStatus.display || 'Detecting database...'}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                  dbStatus.status === 'ok'
                    ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300'
                    : dbStatus.status === 'loading'
                      ? 'border-muted bg-muted/50 text-muted-foreground'
                      : 'border-red-200 bg-red-500/10 text-red-600 dark:border-red-800 dark:text-red-300'
                )}
              >
                {dbStatus.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {dbStatus.status === 'ok' && <CheckCircle2 className="h-4 w-4" />}
                {dbStatus.status === 'error' && <XCircle className="h-4 w-4" />}
                {dbStatus.status === 'ok' && 'Connected'}
                {dbStatus.status === 'loading' && 'Checking...'}
                {dbStatus.status === 'error' && 'Error'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="border-muted-foreground/30 bg-muted/30 rounded-md border border-dashed px-3 py-2">
                <p className="text-muted-foreground text-xs">Provider</p>
                <p className="font-medium capitalize">{dbStatus.provider || '—'}</p>
              </div>
              <div className="border-muted-foreground/30 bg-muted/30 rounded-md border border-dashed px-3 py-2">
                <p className="text-muted-foreground text-xs">Database</p>
                <p className="truncate font-medium">{dbStatus.database || '—'}</p>
              </div>
              {dbStatus.host && (
                <div className="border-muted-foreground/30 bg-muted/30 rounded-md border border-dashed px-3 py-2 sm:col-span-2">
                  <p className="text-muted-foreground text-xs">Host</p>
                  <p className="truncate font-medium">{dbStatus.host}</p>
                </div>
              )}
            </div>
            {dbStatus.status === 'error' && dbStatus.error && (
              <p className="text-xs text-red-500">{dbStatus.error}</p>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDbStatus}
                disabled={dbStatus.status === 'loading'}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-check
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-primary h-5 w-5" />
              <CardTitle>Statistics</CardTitle>
            </div>
            <CardDescription>Overview of your notes and diagrams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-muted-foreground/30 bg-muted/30 rounded-lg border border-dashed p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="text-primary h-5 w-5" />
                      <span className="text-muted-foreground text-sm font-medium">Notes</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold">{stats.totalNotes}</p>
                  </div>
                  <div className="border-muted-foreground/30 bg-muted/30 rounded-lg border border-dashed p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Workflow className="text-primary h-5 w-5" />
                      <span className="text-muted-foreground text-sm font-medium">Diagrams</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold">{stats.totalDiagrams}</p>
                  </div>
                </div>

                {/* Activity Graph */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Activity (Last 30 Days)</p>
                  <div className="border-muted-foreground/30 bg-muted/30 rounded-lg border border-dashed p-4">
                    {stats.activity.length > 0 ? (
                      (() => {
                        const maxNotes = Math.max(...stats.activity.map((d) => d.notes), 1);
                        const maxDiagrams = Math.max(...stats.activity.map((d) => d.diagrams), 1);
                        const maxValue = Math.max(maxNotes, maxDiagrams, 1);
                        const width = 100;
                        const height = 100;
                        const padding = 4;
                        const graphWidth = width - padding * 2;
                        const graphHeight = height - padding * 2;
                        const stepX = graphWidth / (stats.activity.length - 1 || 1);

                        const notesPath = stats.activity
                          .map((day, i) => {
                            const x = padding + i * stepX;
                            const y = padding + graphHeight - (day.notes / maxValue) * graphHeight;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');

                        const diagramsPath = stats.activity
                          .map((day, i) => {
                            const x = padding + i * stepX;
                            const y = padding + graphHeight - (day.diagrams / maxValue) * graphHeight;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ');

                        return (
                          <div className="relative">
                            <svg
                              viewBox={`0 0 ${width} ${height}`}
                              className="h-28 w-full"
                              preserveAspectRatio="none"
                            >
                              {/* Grid lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                                <line
                                  key={ratio}
                                  x1={padding}
                                  y1={padding + graphHeight * (1 - ratio)}
                                  x2={width - padding}
                                  y2={padding + graphHeight * (1 - ratio)}
                                  stroke="currentColor"
                                  strokeOpacity={0.1}
                                  strokeWidth={0.5}
                                />
                              ))}
                              {/* Notes line (blue) */}
                              <path
                                d={notesPath}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />
                              {/* Diagrams line (emerald) */}
                              <path
                                d={diagramsPath}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              />
                              {/* Data points for notes */}
                              {stats.activity.map((day, i) => {
                                const x = padding + i * stepX;
                                const y = padding + graphHeight - (day.notes / maxValue) * graphHeight;
                                return (
                                  <circle
                                    key={`note-${day.date}`}
                                    cx={x}
                                    cy={y}
                                    r={1.5}
                                    fill="#3b82f6"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                );
                              })}
                              {/* Data points for diagrams */}
                              {stats.activity.map((day, i) => {
                                const x = padding + i * stepX;
                                const y = padding + graphHeight - (day.diagrams / maxValue) * graphHeight;
                                return (
                                  <circle
                                    key={`diagram-${day.date}`}
                                    cx={x}
                                    cy={y}
                                    r={1.5}
                                    fill="#10b981"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                );
                              })}
                            </svg>
                            {/* Legend */}
                            <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-muted-foreground">Notes</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-muted-foreground">Diagrams</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-muted-foreground text-center text-sm">No activity data</p>
                    )}
                    <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-muted-foreground text-sm">Choose your preferred theme.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={mounted && theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTheme('light');
                    toast.success('Theme set to Light');
                  }}
                >
                  <Sun className="mr-1 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={mounted && theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTheme('dark');
                    toast.success('Theme set to Dark');
                  }}
                >
                  <Moon className="mr-1 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={mounted && theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTheme('system');
                    toast.success('Theme set to System');
                  }}
                >
                  <Monitor className="mr-1 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <Snowflake className="h-4 w-4 text-sky-400" />
                  Snow Mode
                </p>
                <p className="text-muted-foreground text-sm">Let it snow! ❄️</p>
              </div>
              <Switch
                checked={settings.snowMode ?? false}
                onCheckedChange={(checked) => {
                  setSnowMode(checked);
                  toast.success(checked ? 'Let it snow! ❄️' : 'Snow stopped');
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Editor Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <CardDescription>Configure editor behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-save</p>
                <p className="text-muted-foreground text-sm">
                  Automatically save diagrams and notes as you type.
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={(checked) => {
                  setAutoSave(checked);
                  toast.success(checked ? 'Auto-save enabled' : 'Auto-save disabled');
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-save Delay</p>
                <p className="text-muted-foreground text-sm">
                  Wait time before saving diagrams and notes.
                </p>
              </div>
              <select
                className="border-input bg-background h-9 w-32 rounded-md border px-3 text-sm"
                value={localAutoSaveDelay}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setLocalAutoSaveDelay(val);
                  setAutoSaveDelay(val);
                  try {
                    const csrf = await ensureCsrfToken();
                    await fetch('/api/settings/advanced', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', [CSRF_HEADER_NAME]: csrf },
                      body: JSON.stringify({ autoSaveDelay: val }),
                    });
                    toast.success('Auto-save delay updated');
                  } catch {
                    toast.error('Failed to save setting');
                  }
                }}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GeminiSpark className="text-primary h-5 w-5" />
              <CardTitle>AI Settings</CardTitle>
            </div>
            <CardDescription>
              Add your AI API key to enable assistant mode for Mermaid editing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isKeyFromEnv && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  🔒 Configured via environment variable
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  The AI API key is set via the{' '}
                  <code className="bg-muted rounded px-1">AI_API_KEY</code> environment variable and
                  cannot be modified through the UI.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={isKeyFromEnv ? '••••••••••••••••' : 'sk-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isKeyFromEnv}
              />
              <p className="text-muted-foreground text-xs">
                {isKeyFromEnv
                  ? 'Remove AI_API_KEY from .env to manage the key here.'
                  : 'Stored securely on your local database. The key is required for AI mode.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {settings.hasAiApiKey ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-muted-foreground">
                Status:{' '}
                {settings.hasAiApiKey
                  ? isKeyFromEnv
                    ? 'Configured (Environment)'
                    : 'Configured'
                  : 'Not set'}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini' | 'auto')}
                disabled={isKeyFromEnv}
              >
                <option value="auto">Auto-detect</option>
                <option value="openai">OpenAI-compatible</option>
                <option value="gemini">Gemini (Google AI Studio)</option>
              </select>
              <p className="text-muted-foreground text-xs">Auto will pick based on key prefix.</p>
            </div>

            {hasExistingKey && aiModel && (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium capitalize">
                    {provider === 'auto' ? 'Auto-detected' : provider}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs font-medium">{aiModel}</span>
                </div>
              </div>
            )}

            {!isKeyFromEnv && (
              <div className="flex gap-2 pt-2">
                {hasExistingKey && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveAiKey}
                    disabled={isRemoving || isSubmitting}
                  >
                    {isRemoving ? 'Removing...' : 'Remove Key'}
                  </Button>
                )}
                <Button
                  onClick={handleSaveAiKey}
                  disabled={isSubmitting || apiKey.trim().length === 0}
                >
                  {isSubmitting ? 'Saving...' : 'Save Key'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>Backup and restore your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Backup</p>
                <p className="text-muted-foreground text-sm">
                  Download all your diagrams and notes as JSON.
                </p>
              </div>
              <Button variant="outline" onClick={handleBackup}>
                <Download className="mr-2 h-4 w-4" />
                Download Backup
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Restore</p>
                <p className="text-muted-foreground text-sm">
                  Restore from a previously downloaded backup.
                </p>
              </div>
              <Button variant="outline" onClick={openRestorePicker}>
                <Upload className="mr-2 h-4 w-4" />
                Restore Backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
            <CardDescription>Fine-tune platform behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Checkpoints</label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={localMaxCheckpoints}
                  onChange={(e) => setLocalMaxCheckpoints(Number(e.target.value))}
                />
                <p className="text-muted-foreground text-xs">Versions to keep per diagram (5-50)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Export Format</label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={localExportFormat}
                  onChange={(e) => setLocalExportFormat(e.target.value as 'svg' | 'png' | 'pdf')}
                >
                  <option value="svg">SVG</option>
                  <option value="png">PNG</option>
                  <option value="pdf">PDF</option>
                </select>
                <p className="text-muted-foreground text-xs">Preferred download format</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Scale</label>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={localExportScale}
                  onChange={(e) => setLocalExportScale(Number(e.target.value) as 1 | 2 | 3)}
                >
                  <option value={1}>1x (Standard)</option>
                  <option value={2}>2x (High DPI)</option>
                  <option value={3}>3x (Ultra)</option>
                </select>
                <p className="text-muted-foreground text-xs">PNG/PDF resolution</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                setIsSavingAdvanced(true);
                try {
                  const csrf = await ensureCsrfToken();
                  await fetch('/api/settings/advanced', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      [CSRF_HEADER_NAME]: csrf,
                    },
                    body: JSON.stringify({
                      maxCheckpoints: localMaxCheckpoints,
                      autoSaveDelay: localAutoSaveDelay,
                      defaultExportFormat: localExportFormat,
                      exportScale: localExportScale,
                    }),
                  });
                  setMaxCheckpoints(localMaxCheckpoints);
                  setAutoSaveDelay(localAutoSaveDelay);
                  setDefaultExportFormat(localExportFormat);
                  setExportScale(localExportScale);
                  toast.success('Advanced settings saved');
                } catch {
                  toast.error('Failed to save settings');
                } finally {
                  setIsSavingAdvanced(false);
                }
              }}
              disabled={isSavingAdvanced}
            >
              {isSavingAdvanced ? 'Saving...' : 'Save Advanced Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>Irreversible and destructive actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Wipe All Data</p>
                <p className="text-muted-foreground text-sm">
                  Permanently delete all diagrams, notes, and settings.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setIsWipeDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Wipe Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Wipe Confirmation Dialog */}
      <AlertDialog open={isWipeDialogOpen} onOpenChange={handleWipeDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Database Wipe
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground space-y-4 text-sm">
                <p>
                  This action will <strong className="text-foreground">permanently delete</strong>{' '}
                  all your data including:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>All diagrams and their versions</li>
                  <li>All notes</li>
                  <li>All settings (including AI key)</li>
                </ul>
                <p className="text-destructive font-medium">This action cannot be undone.</p>
                <div className="space-y-2 pt-2">
                  <p>
                    To confirm, type the following code:{' '}
                    {isLoadingWipeCode ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : serverWipeCode ? (
                      <strong className="text-foreground font-mono text-base select-all">
                        {serverWipeCode}
                      </strong>
                    ) : (
                      <span className="text-destructive">Failed to generate code</span>
                    )}
                  </p>
                  <Input
                    type="text"
                    placeholder="Type the code above"
                    value={wipeConfirmationInput}
                    onChange={(e) => setWipeConfirmationInput(e.target.value.toUpperCase())}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isLoadingWipeCode || !serverWipeCode}
                    className="text-center font-mono text-lg tracking-widest uppercase"
                    style={{ userSelect: 'none' } as React.CSSProperties}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWiping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipeDatabase}
              disabled={!serverWipeCode || wipeConfirmationInput !== serverWipeCode || isWiping}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isWiping ? 'Wiping...' : 'Wipe All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <footer className="container mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">
          Made with <span className="text-red-500">❤️</span> by Terrestrian 🌏
        </p>
      </footer>
    </div>
  );
}

