'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, ChevronDown, ChevronUp, Replace } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';

interface NoteSearchReplaceProps {
    editorView: EditorView | null;
    onClose: () => void;
}

export function NoteSearchReplace({ editorView, onClose }: NoteSearchReplaceProps) {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [wrapAround, setWrapAround] = useState(true);
    const [useRegex, setUseRegex] = useState(false);
    const [matchCount, setMatchCount] = useState(0);
    const [currentMatch, setCurrentMatch] = useState(0);
    const findInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        findInputRef.current?.focus();
    }, []);

    const getMatches = useCallback((): { from: number; to: number }[] => {
        if (!editorView || !findText) return [];

        const doc = editorView.state.doc.toString();
        const matches: { from: number; to: number }[] = [];

        try {
            let pattern: RegExp;
            if (useRegex) {
                pattern = new RegExp(findText, matchCase ? 'g' : 'gi');
            } else {
                const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordBoundary = wholeWord ? '\\b' : '';
                pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, matchCase ? 'g' : 'gi');
            }

            let match: RegExpExecArray | null;
            while ((match = pattern.exec(doc)) !== null) {
                matches.push({ from: match.index, to: match.index + match[0].length });
                if (match.index === pattern.lastIndex) {
                    pattern.lastIndex++;
                }
            }
        } catch {
            // Invalid regex, return empty
        }

        return matches;
    }, [editorView, findText, matchCase, wholeWord, useRegex]);

    useEffect(() => {
        const matches = getMatches();
        setMatchCount(matches.length);
        if (matches.length > 0 && currentMatch > matches.length) {
            setCurrentMatch(matches.length);
        } else if (matches.length > 0 && currentMatch === 0) {
            setCurrentMatch(1);
        } else if (matches.length === 0) {
            setCurrentMatch(0);
        }
    }, [findText, matchCase, wholeWord, useRegex, getMatches, currentMatch]);

    const goToMatch = useCallback((index: number) => {
        if (!editorView) return;
        const matches = getMatches();
        if (matches.length === 0) return;

        let targetIndex = index;
        if (wrapAround) {
            if (targetIndex > matches.length) targetIndex = 1;
            if (targetIndex < 1) targetIndex = matches.length;
        } else {
            if (targetIndex > matches.length) targetIndex = matches.length;
            if (targetIndex < 1) targetIndex = 1;
        }

        const match = matches[targetIndex - 1];
        editorView.dispatch({
            selection: { anchor: match.from, head: match.to },
            scrollIntoView: true,
        });
        setCurrentMatch(targetIndex);
    }, [editorView, getMatches, wrapAround]);

    const handleFindNext = useCallback(() => {
        goToMatch(currentMatch + 1);
    }, [currentMatch, goToMatch]);

    const handleFindPrev = useCallback(() => {
        goToMatch(currentMatch - 1);
    }, [currentMatch, goToMatch]);

    const handleReplace = useCallback(() => {
        if (!editorView) return;
        const matches = getMatches();
        if (matches.length === 0 || currentMatch === 0) return;

        const match = matches[currentMatch - 1];
        editorView.dispatch({
            changes: { from: match.from, to: match.to, insert: replaceText },
        });

        // Re-find matches and move to next
        setTimeout(() => {
            const newMatches = getMatches();
            if (newMatches.length > 0) {
                const nextIndex = Math.min(currentMatch, newMatches.length);
                setCurrentMatch(nextIndex);
                goToMatch(nextIndex);
            } else {
                setCurrentMatch(0);
            }
        }, 0);
    }, [editorView, getMatches, currentMatch, replaceText, goToMatch]);

    const handleReplaceAll = useCallback(() => {
        if (!editorView || !findText) return;
        const matches = getMatches();
        if (matches.length === 0) return;

        // Replace from end to start to preserve indices
        const sortedMatches = [...matches].sort((a, b) => b.from - a.from);
        const changes = sortedMatches.map((match) => ({
            from: match.from,
            to: match.to,
            insert: replaceText,
        }));

        editorView.dispatch({ changes });
        setMatchCount(0);
        setCurrentMatch(0);
    }, [editorView, findText, getMatches, replaceText]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handleFindPrev();
            } else {
                handleFindNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleFindNext, handleFindPrev, onClose]);

    return (
        <div className="border-b bg-muted/20 p-3 space-y-3">
            {/* Find Row */}
            <div className="flex items-center gap-2">
                <Input
                    ref={findInputRef}
                    placeholder="Find"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                    {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No matches'}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFindPrev} disabled={matchCount === 0}>
                    <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFindNext} disabled={matchCount === 0}>
                    <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Replace Row */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Replace with"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-8 text-sm"
                />
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleReplace} disabled={matchCount === 0}>
                    <Replace className="h-3 w-3 mr-1" />
                    Replace
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleReplaceAll} disabled={matchCount === 0}>
                    Replace All
                </Button>
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <Switch id="matchCase" checked={matchCase} onCheckedChange={setMatchCase} className="h-4 w-7" />
                    <Label htmlFor="matchCase" className="text-xs cursor-pointer">Match case</Label>
                </div>
                <div className="flex items-center gap-1.5">
                    <Switch id="wholeWord" checked={wholeWord} onCheckedChange={setWholeWord} className="h-4 w-7" />
                    <Label htmlFor="wholeWord" className="text-xs cursor-pointer">Whole word</Label>
                </div>
                <div className="flex items-center gap-1.5">
                    <Switch id="wrapAround" checked={wrapAround} onCheckedChange={setWrapAround} className="h-4 w-7" />
                    <Label htmlFor="wrapAround" className="text-xs cursor-pointer">Wrap around</Label>
                </div>
                <div className="flex items-center gap-1.5">
                    <Switch id="useRegex" checked={useRegex} onCheckedChange={setUseRegex} className="h-4 w-7" />
                    <Label htmlFor="useRegex" className="text-xs cursor-pointer">Regex</Label>
                </div>
            </div>
        </div>
    );
}
