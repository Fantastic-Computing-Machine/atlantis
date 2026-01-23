'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Keyboard, PenSquare, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';
import { toast } from 'sonner';

type CreatedEntity = { id: string };
const examplesLink =
  'https://github.com/Fantastic-Computing-Machine/atlantis/tree/master/examples/mermaid';

export function DashboardEmptyState() {
  const router = useRouter();
  const [isDiagramLoading, setIsDiagramLoading] = useState(false);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const { setPaletteOpen } = useKeyboardShortcuts();

  const createDiagram = async () => {
    setIsDiagramLoading(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/diagrams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error('Failed to create');
      }

      const data = (await res.json()) as CreatedEntity;
      toast.success('New diagram ready');
      router.push(`/diagram/${data.id}`);
    } catch {
      toast.error('Unable to create diagram');
    } finally {
      setIsDiagramLoading(false);
    }
  };

  const createNote = async () => {
    setIsNoteLoading(true);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({ title: 'Untitled Note' }),
      });

      if (!res.ok) {
        throw new Error('Failed to create');
      }

      const data = (await res.json()) as CreatedEntity;
      toast.success('Note created');
      router.push(`/notes/${data.id}`);
    } catch {
      toast.error('Unable to create note');
    } finally {
      setIsNoteLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-teal-500/10 p-8">
        <div className="absolute inset-px rounded-2xl border border-amber-500/20" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="bg-background/60 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-amber-500 ring-1 ring-amber-500/40 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Fresh canvas, zero clutter
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Start your first diagram or note
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Map systems, jot ideas, and keep versions in sync. Create something new or import what
              you already have.
            </p>
            <p className="text-sm font-semibold text-amber-500">Where ideas foster</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={createDiagram} disabled={isDiagramLoading}>
                Create diagram
              </Button>
              <Button size="lg" variant="outline" onClick={createNote} disabled={isNoteLoading}>
                Create note
              </Button>
              <Link
                href={examplesLink}
                className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Browse examples
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3 md:max-w-sm">
            <QuickCard
              icon={<PenSquare className="h-4 w-4" />}
              title="Blank canvas"
              body="Kick off a new diagram with autosave and versioning."
              onClick={createDiagram}
            />
            <QuickCard
              icon={<FileText className="h-4 w-4" />}
              title="Scratch note"
              body="Capture ideas, snippets, or meeting notes fast."
              onClick={createNote}
            />
            <QuickCard
              icon={<UploadCloud className="h-4 w-4" />}
              title="Import Mermaid"
              body="Bring existing diagrams or JSON backups."
              href="/settings"
            />
            <QuickCard
              icon={<Keyboard className="h-4 w-4" />}
              title="Shortcut palette"
              body="Hit Ctrl+K to jump anywhere."
              onClick={() => setPaletteOpen(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type QuickCardProps = {
  icon: ReactNode;
  title: string;
  body: string;
  onClick?: () => void;
  href?: string;
};

function QuickCard({ icon, title, body, onClick, href }: QuickCardProps) {
  const content = (
    <Card className="group bg-background/60 hover:border-primary/40 h-full border-dashed transition-colors">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-muted text-primary flex h-8 w-8 items-center justify-center rounded-full">
            {icon}
          </span>
          <CardTitle className="text-sm leading-tight font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground pt-0 text-xs leading-snug">{body}</CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="h-full">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="h-full w-full text-left">
      {content}
    </button>
  );
}
