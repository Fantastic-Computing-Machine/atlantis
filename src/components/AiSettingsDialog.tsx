'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GeminiSpark } from '@/components/icons/GeminiSpark';
import { CheckCircle2, XCircle } from 'lucide-react';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useDiagramStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const { settings, setHasAiApiKey, setAiProvider } = useDiagramStore();
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'auto'>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const res = await fetch('/api/settings/ai-key');
        const data = await res.json();
        if (typeof data.provider === 'string') {
          setProvider(data.provider);
        }
        const hasKey = Boolean(data.hasKey);
        setHasExistingKey(hasKey);
        setHasAiApiKey(hasKey);
      } catch {
        // ignore
      }
    };
    load();
  }, [open, setHasAiApiKey]);

  const handleSave = async () => {
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
      onOpenChange(false);
      setApiKey('');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save AI key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GeminiSpark className="h-5 w-5 text-primary" />
            <DialogTitle>AI Settings</DialogTitle>
          </div>
          <DialogDescription>
            Add your AI API key to enable assistant mode for Mermaid editing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
        </div>

        <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancel
        </Button>
          {hasExistingKey && (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isRemoving || isSubmitting}
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSubmitting || apiKey.trim().length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
