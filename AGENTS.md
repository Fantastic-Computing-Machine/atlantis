# Atlantis AGENTS Guide

Purpose: concise, high-signal defaults for this Next.js 16 + TypeScript + Tailwind app. Keep scope tight, stay type-safe, avoid regressions.

## Quick Facts

- Framework: Next.js 16 App Router, TypeScript strict, moduleResolution bundler.
- Styling: Tailwind v4 + Shadcn UI primitives in `src/components/ui`.
- State: Zustand (`src/lib/store.ts`) for persisted settings.
- Diagrams: Mermaid editor; persisted to Prisma SQLite or JSON backup.
- Notes: see `src/app/notes`, server layouts fetch data and render client shells.
- Icons/Fonts/Themes: lucide-react, `next/font`, `next-themes` (light/dark toggle).
- Code map: `plan/code-map.md` is the required map-first index for file ownership and task routing.
- Editors: no Cursor rules (`.cursor/` missing); no Copilot instructions (`.github/copilot-instructions.md` missing). This file is authoritative.

## Mandatory Code Map Workflow

- Always read `plan/code-map.md` before searching or editing code.
- Use map-first navigation: start with the intent map and open those files before broad searching.
- Avoid blind repo-wide searches unless the code map does not cover the task.
- If you add/move/rename files, routes, folders, or exported functions, update `plan/code-map.md` in the same change.
- Treat stale code-map entries as bugs; fix them as part of the task.

## Commands (npm)

- Install deps: `npm install` (first step before any command).
- DB setup: `npm run db:setup` (runs `node scripts/bootstrap.js`), run this first and once.
- Dev server: `npm run dev` (runs `next dev`, http://localhost:3000).
- Build (type-safety gate): `npm run build` (runs `next build`).
- Start prod: `npm run start` (after build).
- Lint: `npm run lint` (ESLint via Next config).
- Prisma helpers: `npm run prisma:prepare`, `prisma:generate`, `prisma:push`, `prisma:migrate`, `migrate:json-to-db`.

## Testing Guidance

- No test runner configured. If tests are requested, add Vitest + @testing-library/react for Next 16.
- Suggested scripts once added: `"test": "vitest"`, `"test:watch": "vitest watch"`, `"test:ui": "vitest --ui"`.
- Run single test (after setup): `npm run test -- path/to/file.test.tsx` or `npx vitest path -t "case"`.
- Co-locate tests near components or under `tests/`; mock browser-only APIs (Clipboard, window) in Node.
- Prefer behavioral assertions over snapshotting large Mermaid/notes content.

## Project Map

- `src/app/`: routes/layout. `src/app/page.tsx` uses ISR 30s.
- `src/app/diagram/[id]/`: diagram editor (client-heavy); gate browser libs with mounted checks.
- `src/app/notes/`: notes layout + list; dynamic fetch with `getNotePage`; entry page shows empty-state; `[id]/page` loads note with `getNoteById` and renders `NoteWorkspace`; `dynamic = 'force-dynamic'` on layout and page to avoid caching.
- `src/app/api/`: API routes; keep server-only.
- `src/components/`: feature/layout components. Avoid touching `src/components/ui` unless fixing a shared UI bug.
- `src/lib/`: utilities, data access (`notes-data`), types, Zustand store.
- `data/`: SQLite db/backups; `public/`: static assets; `scripts/`: bootstrap + Prisma helpers (bootstrap must run before dev/build).
- `docs/`: repo docs; update this file and `docs/AI.md` if conventions change.
- `plan/`: planning docs; `plan/code-map.md` must stay current with structure and ownership.

## Styling

- Tailwind utilities; compose with `cn` from `src/lib/utils.ts`.
- Class order: layout → spacing → typography → colors → effects; keep classes readable.
- Respect design system: use Shadcn primitives and override via `className` rather than editing primitives.
- Support dark mode using semantic tokens (`bg-background`, `text-foreground`, `border-border`).
- Avoid generic purple/white defaults; pick intentional palettes when adding UI.

## State

- Use Zustand store setters; avoid direct mutation; prefer functional updates.
- Derive filtered/sorted arrays near usage to limit re-renders; supply stable keys (diagram id).

## React/Next Conventions

- Default to server components; add `'use client'` only when using state/effects/browser APIs.
- Gate browser-only libs (Mermaid, CodeMirror, react-resizable-panels, react-zoom-pan-pinch) with mounted checks (`useEffect`).
- Use async/await for data fetching; API routes return `NextResponse` with status codes; avoid accessing `window`/`document` in route handlers.
- Keep route handlers side-effect minimal; validate input; avoid long blocking writes; ensure directories exist before file writes (`fs.mkdir` recursive).
- Preserve `revalidate` settings (e.g., home uses ISR 30s) unless requirements change.
- Follow App Router naming (`page.tsx`, `layout.tsx`, `route.ts`).
- Type `params`/`searchParams` objects; avoid dynamic `any` route params.
- Notes routes: `NotesLayout` fetches first page server-side; `NotePage` awaits params via `params: Promise<{ id: string }>`; ensure types match this shape.

## Imports & Formatting

- Order imports: external libs, then `@/` absolute, then relative; separate groups with a blank line when edits are sizable.
- Use named exports; default exports only when Next requires (pages, route handlers).
- Type-only imports use `type` modifier (`import type { Diagram } from '@/lib/types';`).
- Formatting via ESLint; 2-space indent; minimal semicolons to match existing style; keep quotes consistent per file.
- Keep files ASCII unless the file already uses non-ASCII and it is necessary.
- Avoid auto-reformatting whole files; keep diffs focused.

## TypeScript Rules

- `strict: true`; avoid `any`; provide explicit return types and generics.
- Prefer `type` aliases for props/DTOs; use `interface` when extension is expected.
- Narrow optional fields before access; avoid non-null assertions unless unavoidable.
- Use `Readonly`/`readonly` where appropriate; keep immutability in Zustand setters.

## Naming & Structure

- Components/files: PascalCase (`DiagramGrid.tsx`, `NoteWorkspace.tsx`).
- Functions/vars: camelCase (`handleSave`, `currentDiagram`).
- Types/interfaces: PascalCase (`Diagram`, `Note`, `DiagramStore`).
- API route folders: kebab-case (`api/diagrams/[id]/route.ts`).
- Descriptive prop names; avoid single-letter vars outside loops.

## Data & Persistence

- Default persistence via Prisma + SQLite at `data/atlantis.db`; switch provider with env (`PRISMA_PROVIDER`, `DATABASE_URL`).
- Backup/restore via `/api/backup`; `data/diagrams.json` created on demand for file-based flows.
- Diagram shape: `{ id, title, content, emoji, createdAt, updatedAt, isFavorite }`; extend types, defaults, serializers, and UI together; id generation uses 6-char random with collision retry.
- Notes data access lives in `src/lib/notes-data`; keep dates as ISO strings; format for UI with `formatDate` to avoid hydration mismatch.
- Validate API inputs; keep route handlers side-effect minimal and ensure directories exist before file writes.

## Error Handling & UX

- Use `sonner` toasts for user feedback; avoid silent failures.
- Validate API inputs; respond with clear 400/500 messages without leaking internals.
- Confirm destructive actions via Radix/AlertDialog patterns (see `DiagramGrid`).
- Handle hydration mismatches by gating client-only logic with mounted flags.
- For notes/diagrams, ensure missing entities call `notFound()`.

## Accessibility

- Maintain focus states; add `aria-label` for icon-only controls.
- Provide text alternatives for emoji/logo buttons; keep color contrast via tokens.

## Assets & Icons

- Import lucide icons individually (`import { Star, Trash2 } from 'lucide-react';`).
- Keep SVG/data URIs lightweight; favicon already referenced in `src/app/layout.tsx`.

## Performance

- Memoize only when profiling indicates benefit; keep components simple first.
- Avoid unnecessary re-renders; ensure dependency arrays are accurate.

## Logging & Debugging

- Avoid `console.log` in production code; remove temporary logs.
- Prefer toasts or error boundaries for user-visible messaging.

## Tooling Notes

- No Cursor rules (`.cursor/` absent) and no Copilot instructions (`.github/copilot-instructions.md` missing). This file is authoritative.
- Editors: do not auto-reformat; follow existing style.

## Git & Workflow

- Read files before editing; keep changes minimal and scoped.
- Do not revert user changes; avoid drive-by refactors.
- Avoid modifying `src/components/ui` unless fixing a shared UI bug.
- Follow existing commit style (check `git log`); concise messages focus on why.
- No force-push unless explicitly allowed; no amend unless requested.
- Run `npm run build` after changes to catch type/route errors (acts as tests when no test runner).

## Notes Feature

- Layout: `NotesLayoutClient` wraps children with `initialNotes`; respect existing sidebar/list interactions.
- Empty state: `src/app/notes/page.tsx` shows centered prompt with `FileText` icon; keep copy concise.
- Note page: `NoteWorkspace` receives `initialNote`; missing note triggers `notFound()`.
- When extending notes, keep server fetches fast and cache-safe (dynamic rendering already configured).

## Documentation

- Docs live in `docs/`; see `docs/AI.md` for AI/agent usage guidance.
- Update this file when commands, tooling, or conventions change.
- Update `plan/code-map.md` whenever code structure, directory ownership, routes, or exported responsibilities change.

## Extension Checklist

- Add new dependencies to package.json only when necessary; prefer existing patterns.
- When adding tests, wire scripts and ensure Vitest config respects Next 16 (jsdom where needed).
- Update types, serializers, and UI together for new diagram/note fields.
- Keep dark mode support intact; preserve hydration safety checks.

## When in Doubt

- Prefer explicitness over cleverness; ask for clarification on persistence/UX-sensitive work.
- Preserve existing UX patterns (toasts, dialogs, theme toggle, grid layout, notes empty state).
- Keep changes incremental; avoid broad refactors unless requested.
- Maintain ASCII output unless justified by existing content.
- Deliver small, reviewable diffs with rationale.
