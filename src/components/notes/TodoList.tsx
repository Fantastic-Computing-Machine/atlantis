'use client';

import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface TodoListProps {
    value: string;
    onChange: (value: string) => void;
}

interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

export function TodoList({ value, onChange }: TodoListProps) {
    const [items, setItems] = useState<TodoItem[]>([]);

    // Parse markdown to items
    useEffect(() => {
        const lines = value.split('\n');
        const parsedItems: TodoItem[] = lines
            .filter(line => line.trim().length > 0)
            .map((line) => {
                // Allow indentation and different bullet points (-, *, +)
                const match = line.match(/^\s*(?:[-*+]\s+\[([ xX])\])?\s*(.*)$/);
                const completed = match?.[1]?.toLowerCase() === 'x';
                const text = match ? (match[2] ?? '') : line;
                return {
                    id: Math.random().toString(36).substring(7),
                    text,
                    completed,
                };
            });

        // Only update if we have a different number of items or if the parsed content is significantly different
        // This is a naive check to prevent feedback loops, but for a true two-way binding we might need more robust diffing.
        // For now, we'll just initialize if empty or assume the editor controls the state.

        if (items.length === 0 && parsedItems.length > 0) {
            setItems(parsedItems);
        } else if (parsedItems.length === 0 && items.length === 0 && value.trim().length === 0) {
            // Initial empty state, do nothing or set empty
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount.

    const serialize = useCallback((currentItems: TodoItem[]) => {
        const markdown = currentItems
            .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`)
            .join('\n');
        onChange(markdown);
    }, [onChange]);

    const handleReorder = (newItems: TodoItem[]) => {
        setItems(newItems);
        serialize(newItems);
    };

    const handleToggle = (id: string, checked: boolean) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, completed: checked } : item
        );
        setItems(newItems);
        serialize(newItems);
    };

    const handleTextChange = (id: string, newText: string) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, text: newText } : item
        );
        setItems(newItems);
        serialize(newItems);
    };

    const handleDelete = (id: string) => {
        const newItems = items.filter(item => item.id !== id);
        setItems(newItems);
        serialize(newItems);
    };

    const handleAdd = () => {
        const newItem: TodoItem = {
            id: Math.random().toString(36).substring(7),
            text: '',
            completed: false,
        };
        const newItems = [...items, newItem];
        setItems(newItems);
        serialize(newItems);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
                    {items.map((item) => (
                        <TodoItem
                            key={item.id}
                            item={item}
                            onToggle={handleToggle}
                            onChange={handleTextChange}
                            onDelete={handleDelete}
                        />
                    ))}
                </Reorder.Group>

                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={handleAdd}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </div>
        </div>
    );
}

function TodoItem({
    item,
    onToggle,
    onChange,
    onDelete
}: {
    item: TodoItem;
    onToggle: (id: string, checked: boolean) => void;
    onChange: (id: string, text: string) => void;
    onDelete: (id: string) => void;
}) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            className="flex items-start gap-3 bg-card border rounded-lg p-3 group hover:border-muted-foreground/20 transition-colors"
        >
            <div
                className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground mt-1 shrink-0"
                onPointerDown={(e) => controls.start(e)}
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <Checkbox
                checked={item.completed}
                onCheckedChange={(checked) => onToggle(item.id, checked === true)}
                className="mt-2 shrink-0"
            />

            <Textarea
                value={item.text}
                onChange={(e) => onChange(item.id, e.target.value)}
                className={cn(
                    "border-none shadow-none focus-visible:ring-0 bg-transparent px-0 py-1 flex-1 min-h-[2rem] resize-none",
                    item.completed && "text-muted-foreground line-through"
                )}
                placeholder="Task description..."
                rows={1}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
            />

            <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                onClick={() => onDelete(item.id)}
            >
                <X className="h-4 w-4" />
            </Button>
        </Reorder.Item>
    );
}
