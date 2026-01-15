# AGENTS.md - Atlantis Codebase Guide

A self-hosted Mermaid.js diagramming app with split-view editor + live preview.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Zustand, Tailwind CSS v4, Shadcn UI, CodeMirror, Mermaid.js

## Build/Lint/Test Commands

```bash
npm install        # Install dependencies
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

**Testing:** No test infrastructure configured. When adding tests, use Vitest or Jest.

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/diagrams/    # CRUD endpoints (route.ts, [id]/route.ts)
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout (server component)
│   └── page.tsx         # Main page (server component)
├── components/          # React components
│   ├── ui/              # Shadcn UI components (don't modify directly)
│   └── *.tsx            # Feature components (MainApp, Sidebar, etc.)
└── lib/
    ├── data.ts          # File-based persistence (getDiagrams, saveDiagrams)
    ├── store.ts         # Zustand store (useDiagramStore)
    ├── types.ts         # TypeScript interfaces
    └── utils.ts         # Utility functions (cn)
data/diagrams.json       # Runtime data storage (gitignored)
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled - all code must pass strict type checking
- Define shared interfaces in `src/lib/types.ts`
- Use explicit return types for functions

```typescript
export interface Diagram {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

export async function getDiagrams(): Promise<Diagram[]> { /* ... */ }
```

### Imports
- Use path alias `@/*` for `src/` imports
- Order: external packages → internal modules → relative
- Single quotes for paths

```typescript
import { NextResponse } from 'next/server';
import { getDiagrams } from '@/lib/data';
import { Diagram } from '@/lib/types';
```

### React Components
- Function components only, named exports
- Client components: add `'use client';` at top
- Props interface inline or in types.ts

```typescript
'use client';

interface MyComponentProps {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  return <Button onClick={onSave}>{title}</Button>;
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MainApp`, `Sidebar` |
| Functions/Variables | camelCase | `handleEditorChange`, `currentDiagram` |
| Interfaces | PascalCase | `DiagramStore` |
| Component files | PascalCase | `MainApp.tsx` |
| Utility files | camelCase | `store.ts` |
| API route dirs | kebab-case | `api/diagrams/[id]/` |

### Styling
- Tailwind CSS utility classes
- Use `cn()` from `@/lib/utils` for conditional classes

```typescript
<div className={cn("h-full flex flex-col", isActive && "bg-accent")} />
```

### Error Handling
- try/catch for async operations
- Appropriate HTTP status codes in API routes
- Toast notifications (`sonner`) for user feedback

```typescript
// API route
if (index === -1) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Client-side
try {
  const res = await fetch(`/api/diagrams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  toast.success('Saved');
} catch { toast.error('Failed to save'); }
```

### API Routes (Next.js App Router)
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Use `NextResponse.json()` for responses
- Dynamic params via Promise

```typescript
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(updatedDiagram);
}
```

### State Management (Zustand)
- Store in `src/lib/store.ts`, types in `src/lib/types.ts`
- Access via `useDiagramStore()` hook

```typescript
const { diagrams, currentDiagram, updateDiagram } = useDiagramStore();
```

## Common Patterns

### Adding a New Feature
1. Define types in `src/lib/types.ts`
2. Add state/actions to `src/lib/store.ts` if needed
3. Create component in `src/components/`
4. Add API route in `src/app/api/` if backend needed

### Data Persistence
- All data in `data/diagrams.json`
- Use `getDiagrams()` and `saveDiagrams()` from `@/lib/data`
- Data directory auto-created if missing
