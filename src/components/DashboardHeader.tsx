
'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useDiagramStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { BookOpen, Download, KeyRound, Moon, Settings2, Sun, Upload, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ensureCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf-client';
import { AiSettingsDialog } from '@/components/AiSettingsDialog';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { useShortcutPlatform } from '@/lib/use-platform';

export function DashboardHeader() {
    const { setTheme, theme } = useTheme();
    const { settings, setAutoSave, setHasAiApiKey, setAiProvider } = useDiagramStore();
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const enableApiAccess = process.env.NEXT_PUBLIC_ENABLE_API_ACCESS === 'true' || process.env.ENABLE_API_ACCESS === 'true'; // Check both for client safety
    const { shortcutHint } = useShortcutPlatform();

    // Load AI key status on mount
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
                // ignore
            }
        };
        loadAiKey();
    }, [setHasAiApiKey, setAiProvider]);

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
                    // Reload page to show restored data
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

    return (
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm shrink-0">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="atlantis logo">🔱</span>
                    <h1 className="text-xl font-bold">atlantis</h1>
                </div>

                <div className="flex-1 max-w-md flex justify-center">
                    <Button
                        variant="outline"
                        className="gap-2 w-full max-w-xs justify-start text-muted-foreground"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">Search diagrams...</span>
                        <span className="ml-auto text-xs hidden lg:inline">{shortcutHint}</span>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost"><Link href="/diagram">Diagrams</Link></Button>
                    <Button asChild variant="ghost"><Link href="/notes">Notes</Link></Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 h-9 px-3">
                                <Settings2 className="h-4 w-4" />
                                <span className="font-semibold">Settings</span>
                                <span className="text-muted-foreground ml-1">
                                    {settings.autoSave ? 'Auto-save On' : 'Auto-save Off'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Quick settings</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onSelect={(event) => {
                                    event.preventDefault();
                                    setTheme(theme === 'dark' ? 'light' : 'dark');
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    {theme === 'dark' ? (
                                        <Sun className="h-4 w-4" />
                                    ) : (
                                        <Moon className="h-4 w-4" />
                                    )}
                                    <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                className="flex items-center justify-between gap-4"
                                onSelect={(event) => event.preventDefault()}
                            >
                                <div className="flex flex-col">
                                    <span>Auto-save</span>
                                    <span className="text-xs text-muted-foreground">Platform-wide 2s debounce</span>
                                </div>
                                <Switch checked={settings.autoSave} onCheckedChange={setAutoSave} />
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onSelect={(event) => {
                                    event.preventDefault();
                                    setIsAiSettingsOpen(true);
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4" />
                                    <span>AI settings</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onSelect={(event) => {
                                    event.preventDefault();
                                    handleBackup();
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Download className="h-4 w-4" />
                                    <span>Backup diagrams</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onSelect={(event) => {
                                    event.preventDefault();
                                    openRestorePicker();
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    <span>Restore from backup</span>
                                </div>
                            </DropdownMenuItem>

                            {enableApiAccess && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/docs" className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            <span>API Documentation</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
            />
            <AiSettingsDialog open={isAiSettingsOpen} onOpenChange={setIsAiSettingsOpen} />
            <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </header>
    );
}
