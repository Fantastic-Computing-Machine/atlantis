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
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    Moon,
    Sun,
    Monitor,
    Trash2,
    Upload,
    XCircle,
} from 'lucide-react';

// Generate a random 6-character alphanumeric code
const generateConfirmationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars like 0/O, 1/I/L
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

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
    } = useDiagramStore();

    // AI Settings state
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState<'openai' | 'gemini' | 'auto'>('auto');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [aiModel, setAiModelLocal] = useState<string | null>(null);

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
    const expectedCode = useMemo(() => generateConfirmationCode(), [isWipeDialogOpen]);

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
        if (wipeConfirmationInput !== expectedCode) {
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
                    expectedCode: expectedCode,
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
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl" role="img" aria-label="atlantis logo">🔱</span>
                        <h1 className="text-xl font-bold">Settings</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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
                                <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => { setTheme('light'); toast.success('Theme set to Light'); }}
                                >
                                    <Sun className="h-4 w-4 mr-1" />
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => { setTheme('dark'); toast.success('Theme set to Dark'); }}
                                >
                                    <Moon className="h-4 w-4 mr-1" />
                                    Dark
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => { setTheme('system'); toast.success('Theme set to System'); }}
                                >
                                    <Monitor className="h-4 w-4 mr-1" />
                                    System
                                </Button>
                            </div>
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
                                <p className="text-sm text-muted-foreground">Automatically save diagrams and notes as you type.</p>
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
                                <p className="text-sm text-muted-foreground">Wait time before saving diagrams and notes.</p>
                            </div>
                            <select
                                className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
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
                            <GeminiSpark className="h-5 w-5 text-primary" />
                            <CardTitle>AI Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Add your AI API key to enable assistant mode for Mermaid editing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API Key</label>
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Stored securely on your local database. The key is required for AI mode.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            {settings.hasAiApiKey ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-muted-foreground">
                                Status: {settings.hasAiApiKey ? 'Configured' : 'Not set'}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Provider</label>
                            <select
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini' | 'auto')}
                            >
                                <option value="auto">Auto-detect</option>
                                <option value="openai">OpenAI-compatible</option>
                                <option value="gemini">Gemini (Google AI Studio)</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Auto will pick based on key prefix.
                            </p>
                        </div>

                        {hasExistingKey && aiModel && (
                            <div className="rounded-md bg-muted/50 p-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Provider</span>
                                    <span className="font-medium capitalize">{provider === 'auto' ? 'Auto-detected' : provider}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted-foreground">Model</span>
                                    <span className="font-medium font-mono text-xs">{aiModel}</span>
                                </div>
                            </div>
                        )}

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
                                <p className="text-sm text-muted-foreground">Download all your diagrams and notes as JSON.</p>
                            </div>
                            <Button variant="outline" onClick={handleBackup}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Backup
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Restore</p>
                                <p className="text-sm text-muted-foreground">Restore from a previously downloaded backup.</p>
                            </div>
                            <Button variant="outline" onClick={openRestorePicker}>
                                <Upload className="h-4 w-4 mr-2" />
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
                                <p className="text-xs text-muted-foreground">Versions to keep per diagram (5-50)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Default Export Format</label>
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={localExportFormat}
                                    onChange={(e) => setLocalExportFormat(e.target.value as 'svg' | 'png' | 'pdf')}
                                >
                                    <option value="svg">SVG</option>
                                    <option value="png">PNG</option>
                                    <option value="pdf">PDF</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Preferred download format</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Export Scale</label>
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={localExportScale}
                                    onChange={(e) => setLocalExportScale(Number(e.target.value) as 1 | 2 | 3)}
                                >
                                    <option value={1}>1x (Standard)</option>
                                    <option value={2}>2x (High DPI)</option>
                                    <option value={3}>3x (Ultra)</option>
                                </select>
                                <p className="text-xs text-muted-foreground">PNG/PDF resolution</p>
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
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        </div>
                        <CardDescription>
                            Irreversible and destructive actions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Wipe All Data</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete all diagrams, notes, and settings.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setIsWipeDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
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
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Database Wipe
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-muted-foreground text-sm">
                                <p>
                                    This action will <strong className="text-foreground">permanently delete</strong> all your data including:
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>All diagrams and their versions</li>
                                    <li>All notes</li>
                                    <li>All settings (including AI key)</li>
                                </ul>
                                <p className="font-medium text-destructive">
                                    This action cannot be undone.
                                </p>
                                <div className="space-y-2 pt-2">
                                    <p>
                                        To confirm, type the following code: <strong className="font-mono text-base text-foreground select-all">{expectedCode}</strong>
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
                                        className="font-mono text-center text-lg tracking-widest uppercase"
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
                            disabled={wipeConfirmationInput !== expectedCode || isWiping}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isWiping ? 'Wiping...' : 'Wipe All Data'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

