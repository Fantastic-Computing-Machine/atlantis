'use client';

import { Button } from '@/components/ui/button';
import { useDiagramStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Settings2, Search } from 'lucide-react';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { useShortcutPlatform } from '@/lib/use-platform';

export function DashboardHeader() {
    const { settings, setHasAiApiKey, setAiProvider } = useDiagramStore();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
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

    return (
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm shrink-0">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="atlantis logo">🔱</span>
                    <h1 className="text-xl font-bold hidden sm:block">atlantis</h1>
                </div>

                <div className="flex-1 max-w-md flex justify-center">
                    <Button
                        variant="outline"
                        className="gap-2 w-full max-w-xs justify-start text-muted-foreground px-2 sm:px-4"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">Search diagrams...</span>
                        <span className="inline sm:hidden">Search...</span>
                        <span className="ml-auto text-xs hidden lg:inline">{shortcutHint}</span>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2">
                        <Button asChild variant="ghost"><Link href="/diagram">Diagrams</Link></Button>
                        <Button asChild variant="ghost"><Link href="/notes">Notes</Link></Button>
                    </div>

                    <Button variant="outline" className="gap-2 h-9 px-2 sm:px-3" asChild>
                        <Link href="/settings">
                            <Settings2 className="h-4 w-4" />
                            <span className="font-semibold hidden sm:inline">Settings</span>
                            <span className="text-muted-foreground ml-1 hidden lg:inline">
                                {settings.autoSave ? 'Auto-save On' : 'Auto-save Off'}
                            </span>
                        </Link>
                    </Button>
                </div>
            </div>

            <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </header>
    );
}
