'use client';

import { GeminiSpark } from '@/components/icons/GeminiSpark';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CSRF_HEADER_NAME, ensureCsrfToken } from '@/lib/csrf-client';
import { useState } from 'react';
import { toast } from 'sonner';

interface AiChatPanelProps {
  diagramId: string;
  currentContent: string;
  onApply: (content: string) => void;
}

export function AiChatPanel({ diagramId, currentContent, onApply }: AiChatPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setErrorText(null);
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrf,
        },
        body: JSON.stringify({ prompt, diagramId, content: currentContent }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'AI request failed';
        const detail = typeof data.details === 'string' ? data.details : null;
        const full = detail ? `${msg}: ${detail}` : msg;
        setErrorText(full);
        toast.error(full);
        return;
      }

      if (typeof data.content !== 'string') throw new Error('Invalid AI response');
      onApply(data.content);
      toast.success('AI suggestion applied');
      setPrompt('');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'AI request failed';
      setErrorText(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-muted/40 space-y-2 border-t p-3">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <GeminiSpark className="text-primary h-4 w-4" />
          <span className="text-foreground font-medium">AI assistant</span>
        </div>
        <span>{isLoading ? 'Thinking…' : 'Ready'}</span>
      </div>
      <Textarea
        placeholder="Ask for changes to your Mermaid diagram..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[96px]"
      />
      {errorText && (
        <p className="text-xs text-red-500" role="alert">
          {errorText}
        </p>
      )}
      <div className="flex flex-col items-end gap-1">
        <div className="flex w-full items-center justify-between">
          <p className="text-muted-foreground/70 flex-1 text-center text-xs">
            AI can make mistakes. Please cross-check the output.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrompt('')} disabled={isLoading}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSend} disabled={isLoading || !prompt.trim()}>
              {isLoading ? 'Sending...' : 'Ask AI'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
