# Atlantis AGENTS Guide

Purpose: give agentic coders concise, high-signal defaults for this Next.js 16 + TypeScript + Tailwind app. Keep scope tight, stay type-safe, avoid regressions.

## Quick Facts

- Framework: Next.js 16 App Router, TypeScript strict, moduleResolution bundler.
- Styling: Tailwind v4 + Shadcn UI primitives in `src/components/ui`.
- State: Zustand (`src/lib/store.ts`) for persisted settings.
- Diagrams: Mermaid-based editor; content persisted to Prisma DB (SQLite by default) or JSON backup.
- Icons/Fonts/Themes: lucide-react (named imports), `next/font`, `next-themes` (light/dark toggle).

## Commands (npm)

- Install deps: `npm install` (first step before any command).
- Dev server: `npm run dev` (runs `node scripts/bootstrap.js` then `next dev`, <http://localhost:3000>).
- Build (type-safety gate): `npm run build` (runs bootstrap then Next build).
- Start prod: `npm run start` (after build).
- Lint: `npm run lint` (ESLint via Next config).
- Prisma helpers: `npm run prisma:prepare`, `prisma:generate`, `prisma:push`, `prisma:migrate`, `migrate:json-to-db`.

## Testing Guidance

- No test runner configured. If tests are requested, add Vitest + @testing-library/react for Next 16.
- Suggested scripts once added: `"test": "vitest"`, `"test:watch": "vitest watch"`, `"test:ui": "vitest --ui"`.
- Run single test (after setup): `npm run test -- path/to/file.test.tsx` or `npx vitest path -t "case"`.
- Co-locate tests near components or under `tests/`; avoid brittle DOM globals; mock browser-only APIs (Clipboard, window) in Node.
- Prefer behavioral assertions over snapshotting large Mermaid strings.

## Repository Layout

- `src/app/` routes/layout; `src/app/[id]/` diagram editor (client-heavy); `src/app/api/` API routes.
- `src/components/` feature/layout components. **Do not edit `src/components/ui` unless fixing a global bug.**
- `src/lib/` utilities, data access, types, Zustand store.
- `data/` holds SQLite db or backups; `public/` static assets.
- `scripts/` bootstrap + Prisma helpers; bootstrap must run before dev/build.

## Data & Persistence

- Default persistence via Prisma + SQLite at `data/atlantis.db`; switch provider with env (`PRISMA_PROVIDER`, `DATABASE_URL`).
- JSON backup/restore via `/api/backup`; `data/diagrams.json` created on demand for file-based flows.
- Diagram shape: `{ id, title, content, emoji, createdAt, updatedAt, isFavorite }`. Update types, defaults, serializers, and UI when extending.
- Keep dates as ISO strings; format for UI with `formatDate` to avoid hydration mismatch.

## Styling

- Tailwind utilities; compose with `cn` from `src/lib/utils.ts`.
- Class order: layout → spacing → typography → colors → effects; keep classes readable.
- Respect design system: use Shadcn primitives and override via `className` rather than editing the primitive files.
- Support dark mode with semantic tokens (`bg-background`, `text-foreground`, `border-border`).

## State

- Use Zustand store setters; avoid direct mutation; prefer functional updates.
- Derive filtered/sorted arrays near usage to limit re-renders; supply stable keys (diagram id).

## React/Next Conventions

- Default to server components; add `'use client'` only when using state/effects/browser APIs.
- Gate browser-only libs (Mermaid, CodeMirror, react-resizable-panels, react-zoom-pan-pinch) with mounted checks (`useEffect`).
- Use async/await for data fetching; API routes return `NextResponse` with status codes.
- Keep route handlers server-only; avoid accessing `window`/`document` in them.
- Preserve `revalidate` settings (e.g., `src/app/page.tsx` uses ISR 30s) unless requirements change.

## Imports & Formatting

- Order imports: external libs, then `@/` absolute, then relative; separate groups with a blank line when edits are sizable.
- Use named exports; default exports only where Next requires (pages, route handlers).
- Type-only imports should use `type` modifier (`import type { Diagram } from '@/lib/types';`).
- Formatting: ESLint only; 2-space indent; minimal semicolons to match existing style; consistent quotes within a file.
- Keep files ASCII unless existing content requires otherwise.

## TypeScript Rules

- `strict: true`; avoid `any`; provide explicit return types and generics.
- Prefer `type` aliases for props/DTOs; use `interface` when extension is expected.
- Narrow optional fields before access; avoid non-null assertions unless unavoidable.
- Use `Readonly`/`readonly` where appropriate; maintain immutability in store setters.

## Naming & Structure

- Components/files: PascalCase (`DiagramGrid.tsx`, `Canvas.tsx`).
- Functions/vars: camelCase (`handleSave`, `currentDiagram`).
- Types/interfaces: PascalCase (`Diagram`, `DiagramStore`).
- API route folders: kebab-case (`api/diagrams/[id]/route.ts`).
- Descriptive prop names; avoid single-letter vars outside loops.

## Error Handling & UX

- Use `sonner` toasts for user feedback; avoid silent failures.
- Validate API inputs; return `NextResponse.json` with appropriate status (400/500) and non-leaky messages.
- Confirm destructive actions via Radix/AlertDialog patterns (see `DiagramGrid`).
- Handle hydration mismatches by gating client-only logic with mounted flags.

## Accessibility

- Maintain focus states; add `aria-label` for icon-only controls.
- Provide text alternatives for emoji/logo buttons; keep color contrast via tokens.

## Assets & Icons

- Import lucide icons individually (`import { Star, Trash2 } from 'lucide-react';`).
- Keep SVG/data URIs lightweight; favicon already in `src/app/layout.tsx`.

## API & Routing

- Follow App Router naming (`page.tsx`, `layout.tsx`, `route.ts`).
- Avoid dynamic `any` route params; type `params`/`searchParams` objects.
- Keep route handlers side-effect minimal; avoid long blocking writes; ensure directories exist before file writes (`fs.mkdir` recursive).

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
- Run `npm run build` after changes to catch type/route errors (acts as tests).
- Avoid modifying `src/components/ui` unless fixing a shared UI bug.
- Follow existing commit style (check `git log`); concise messages focus on why.
- No force-push unless explicitly allowed; no amend unless requested.

## Data & Backup Notes

- Backup/restore via `/api/backup`; validate uploaded JSON array shape before writing.
- Diagram id generation uses 6-char random with collision retry (see `api/diagrams/route.ts`).

## Documentation

- Docs live in `docs/`; see `docs/AI.md` for AI/agent usage guidance.
- Update this file when commands, tooling, or conventions change.

## When in Doubt

- Prefer explicitness over cleverness; ask for clarification on persistence/UX-sensitive work.
- Preserve existing UX patterns (toasts, dialogs, theme toggle, grid layout).
- Keep dark mode support intact and avoid breaking hydration safety checks.
