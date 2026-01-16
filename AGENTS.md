# Atlantis AGENTS Guide

Purpose: equip agentic coders with reliable, high-signal defaults for this Next.js 16 + TypeScript + Tailwind app. Keep scope tight, stay type-safe, and avoid regressions.

## Quick Facts
- Framework: Next.js 16 App Router (TypeScript strict, `moduleResolution: bundler`).
- Styling: Tailwind 4 + Shadcn UI primitives under `src/components/ui`.
- State: Zustand (`src/lib/store.ts`), persisted settings only.
- Diagrams: Mermaid content, stored on disk at `data/diagrams.json` via `src/lib/data.ts`.
- Icons: lucide-react, import named icons only.
- Fonts/themes: `next/font` + `next-themes` (light/dark switch).

## Repository Layout
- `src/app/` – App Router routes, API routes, layout, global styles.
- `src/app/[id]/` – Diagram editor page (client-heavy, Mermaid/Codemirror usage).
- `src/app/api/` – API endpoints for diagrams and backup/restore.
- `src/components/` – Feature and layout components (client/server as needed).
- `src/components/ui/` – Shadcn primitives; **do not edit unless fixing a bug globally**.
- `src/lib/` – Utilities, data access, types, Zustand store.
- `data/diagrams.json` – File-based persistence created on demand.
- `public/` – Static assets.

## Commands (npm)
- Install: `npm install` (required before anything else).
- Dev server: `npm run dev` (http://localhost:3000).
- Build (type-safety gate): `npm run build`.
- Start production: `npm run start` (after build).
- Lint: `npm run lint` (ESLint via Next config).
- Tests: **no test runner configured**. See Testing section for how to add/run.

## Testing Guidance
- There is currently **no Jest/Vitest setup**. If tests are requested, add Vitest + @testing-library/react following Next 16 patterns.
- Suggested scripts to add: `"test": "vitest"`, `"test:ui": "vitest --ui"`, `"test:watch": "vitest watch"`.
- Run single test (after setup): `npm run test -- path/to/file.test.tsx` or `npx vitest path -t "name"`.
- Keep tests colocated near components or under `tests/`; use React Testing Library, avoid DOM globals hacks.
- Mock browser-only APIs (Clipboard, window) when running in node.
- Do not snapshot large Mermaid strings; prefer behavioral assertions.

## Linting & Formatting
- ESLint only (no Prettier checked in). Use `npm run lint` to validate.
- Prefer the existing formatting style: 2-space indent, mixed quotes tolerated but be consistent within a file.
- Keep trailing semicolons aligned with surrounding code (existing files lean minimal semicolons inside TSX).
- Order imports: external libs, then absolute `@/`, then relative. Group by blank lines when edits are large.
- Use named exports; avoid default exports unless matching Next conventions (e.g., route handlers, page components).
- Avoid unused imports/vars; satisfy `strict` TypeScript.

## TypeScript Rules
- `strict: true`: avoid `any`, use explicit generics and return types.
- Favor `type` aliases for props/DTOs; interfaces for objects with extension needs.
- Narrow with guards before accessing optional fields; no non-null assertions unless unavoidable.
- Use `Readonly`/`readonly` for props/state where appropriate; respect immutability in Zustand setters.

## React/Next Conventions
- Use functional components with hooks; mark client components via `'use client'` when using state/effects or browser APIs.
- Keep server components default; move browser APIs to client wrappers to avoid hydration issues.
- Use `useEffect` to gate client-only work (Mermaid, CodeMirror, clipboard, FileReader, window/localStorage).
- Prefer async/await for data fetching; API routes return `NextResponse` with proper status codes.
- Handle suspense/streaming cautiously; current pages mostly static + client transitions.
- `revalidate` is set per route (`src/app/page.tsx` uses ISR at 30s); preserve unless instructed.

## Styling
- Use Tailwind utility classes; compose with `cn` from `src/lib/utils.ts`.
- Keep classNames readable; group layout -> spacing -> typography -> colors -> effects.
- Respect design system: buttons/cards/etc. come from Shadcn primitives; do not restyle primitives directly—wrap with className overrides instead.
- Support dark mode: prefer semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`).

## Icons & Media
- Import lucide icons individually: `import { Star, Trash2 } from "lucide-react"`.
- Provide accessible labels/aria where icons are clickable.
- Keep SVG/data URIs lightweight; favicon already embedded in `src/app/layout.tsx`.

## State & Data
- Global state lives in `useDiagramStore` (Zustand). Use setter functions; avoid direct mutation.
- Persistence: `src/lib/data.ts` reads/writes `data/diagrams.json` with `fs/promises`. Ensure directory exists (`fs.mkdir` recursive) before writing.
- Avoid blocking long writes on the request path; prefer minimal writes and handle errors with toasts or HTTP errors.
- When adding fields to Diagram, update type in `src/lib/types.ts`, creation defaults, and persistence serialization.

## Error Handling & UX
- Use `sonner` toasts for user feedback (`toast.success`/`toast.error`).
- Catch fetch/file errors; show friendly messages. Avoid silent failures.
- For destructive actions, confirm via Radix/AlertDialog (pattern in `DiagramGrid`).
- In API routes, validate inputs and return appropriate status codes (400/500). Avoid leaking stack traces.
- Handle hydration mismatches: gate browser-only logic with `useEffect` + mounted flag if needed.

## Accessibility
- Maintain focus states on buttons/links; use `aria-label` where icons stand alone.
- Ensure text alternatives for emoji/logo when used as buttons/branding.
- Keep color contrast by relying on design tokens; avoid hard-coded colors when possible.

## Imports & Paths
- Use `@/` alias for anything under `src/` (configured in `tsconfig.json`).
- Use relative paths only for sibling imports within the same folder when brevity helps.
- Group type-only imports with `type` modifier: `import type { Diagram } from '@/lib/types';`.
- Do not import from `src/components/ui` index barrels if not present; prefer direct component files.

## Routing & API
- App Router file names must follow Next conventions (`route.ts` in API folders, `page.tsx`, `layout.tsx`).
- Avoid dynamic `any` route params; use typed objects for `params` and `searchParams`.
- For API mutators, validate body JSON; use `NextResponse.json(data, { status })` when returning non-200.
- Keep routes server-only; do not pull browser APIs into route handlers.

## Client-Side Libraries
- Mermaid/CodeMirror/react-resizable-panels/react-zoom-pan-pinch are client-only; guard rendering to avoid SSR crashes.
- Clipboard/File APIs: check for `navigator.clipboard` and secure context (pattern in `copyToClipboard`). Provide fallbacks.
- Theme switching uses `next-themes`; avoid accessing `window` before mounted.

## Performance
- Prefer memoization only when profiling shows need; keep components simple first.
- When mapping large lists, supply stable keys (diagram id).
- Avoid unnecessary re-renders by deriving filtered/sorted arrays close to render and keeping dependency arrays accurate.

## Naming & Structure
- Components and files: PascalCase (e.g., `DiagramGrid.tsx`, `Canvas.tsx`).
- Functions/variables: camelCase (`handleSave`, `currentDiagram`).
- Types/interfaces: PascalCase (`Diagram`, `DiagramStore`).
- API route folders: kebab-case (`api/diagrams/[id]/route.ts`).
- Keep prop names descriptive; avoid single-letter vars unless loop indexes.

## Data Contracts
- Diagram shape currently: `{ id, title, content, emoji, createdAt, updatedAt, isFavorite }`.
- When extending, update creators, transformers, UI displays, and serialization defaults.
- Dates stored as ISO strings; format with `formatDate` for UI to avoid hydration mismatch.

## Logging & Debugging
- Avoid `console.log` in production code; use toasts or error boundaries for user-facing messaging.
- If temporary logging is required during dev, remove before finalizing changes.

## Security & Safety
- Do not trust request bodies; validate before writing to disk.
- Avoid exposing file paths or stack traces in responses.
- When copying to clipboard or doing downloads/uploads, ensure proper MIME handling and size awareness.

## Tooling
- No Cursor rules (`.cursor/` absent) and no Copilot instructions (`.github/copilot-instructions.md` missing). This file is the authoritative agent guide.
- Editors: respect existing formatting; no automated reformat unless project adds Prettier.

## Workflow Expectations for Agents
- Read relevant files before editing; follow scope instructions.
- Keep changes minimal and targeted; avoid drive-by refactors.
- After code changes, run `npm run build` to catch type and route errors (acts as test gate).
- If you introduce tests, document new commands here and keep this file updated.
- Do not modify `src/components/ui` unless fixing a shared UI bug.
- Avoid adding licenses/headers; keep repo defaults.

## Pull Requests & Commits
- Follow repository commit style if present (check `git log`).
- Write concise commit messages focusing on the why, not the what.
- Do not force-push unless explicitly allowed by the user.

## Notes on Data & Backups
- Backup/restore flows use `/api/backup`; downloads entire JSON, uploads expect valid JSON array. Validate shape before write.
- Diagram creation uses random 6-char id; collisions resolved by regenerate loop (see `api/diagrams/route.ts`).

## Hydration Safety Checklist
- Client-only libs behind `'use client'` and mounted checks.
- Avoid passing Dates directly to client; stringify to ISO.
- When toggling themes or accessing `window`, gate with `useEffect` or `useTheme` values.

## When in Doubt
- Prefer explicitness over cleverness.
- Ask for clarification on requirements that touch persistence or UX flows.
- Preserve existing UX patterns (toasts, dialogs, theme toggle, grid layout).

_End of guide. Keep this file updated when commands or conventions change._
