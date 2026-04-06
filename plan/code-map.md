# Atlantis Code Map (Compact)

Goal: minimize search tokens and maximize first-pass routing accuracy.

## Hard Rules

- Read this file before edits.
- Route via Intent Map first; avoid blind repo-wide search.
- If intent is missing, add it in the same change.
- Update this file whenever paths/routes/exports/responsibilities/schema change.

## Umbrella Intent Map (Sequential)

1. Dashboard/Home -> `src/app/page.tsx` -> `src/lib/dashboard-data.ts` -> `src/components/InsightsPanel.tsx` + `src/components/DashboardSection.tsx` (home composition + stats).
2. Diagram list/filter/paging -> `src/app/diagram/page.tsx` -> `src/components/DiagramGrid.tsx` -> `src/app/api/diagrams/route.ts` -> `src/lib/data.ts`.
3. Diagram editor/canvas/save/checkpoints -> `src/app/diagram/[id]/page.tsx` -> `src/components/DiagramEditor.tsx` + `src/components/Editor.tsx` + `src/components/Canvas.tsx` + `src/components/CheckpointHistory.tsx` -> `src/app/api/diagrams/[id]/route.ts` + `src/app/api/diagrams/[id]/checkpoint/route.ts` -> `src/lib/data.ts`.
4. Notes shell/list/workspace/editor -> `src/app/notes/layout.tsx` + `src/app/notes/page.tsx` + `src/app/notes/[id]/page.tsx` -> `src/components/notes/NotesLayoutClient.tsx` + `src/components/notes/NoteList.tsx` + `src/components/notes/NoteWorkspace.tsx` + `src/components/notes/NoteEditor.tsx` -> `src/lib/notes-data.ts`.
5. Notes markdown/latex/todo/search UX -> `src/components/notes/NoteMarkdownPreview.tsx` + `src/components/notes/NoteLatexPreview.tsx` + `src/components/notes/TodoList.tsx` + `src/components/notes/NoteSearchReplace.tsx` -> `src/app/api/notes/compile/route.ts`.
6. Tags (pages/settings/CRUD) -> `src/app/tags/page.tsx` + `src/app/tags/[tagSlug]/page.tsx` + `src/app/settings/tags/page.tsx` -> `src/app/api/tags/route.ts` + `src/app/api/tags/[id]/route.ts`.
7. Settings + advanced prefs/stats chart -> `src/app/settings/page.tsx` -> `src/components/ui/chart.tsx` -> `src/app/api/settings/advanced/route.ts` + `src/app/api/settings/ai-key/route.ts` + `src/app/api/settings/stats/route.ts` -> `src/lib/settings.ts` + `src/lib/store.ts`.
8. AI assistant -> `src/components/AiChatPanel.tsx` -> `src/app/api/ai/assist/route.ts` -> `src/app/api/settings/ai-key/route.ts` + `src/lib/settings.ts`.
9. Live sync/SSE/collab -> `src/lib/useLiveSync.ts` + `src/lib/useListSync.ts` + `src/lib/pubsub.ts` -> `src/app/api/sync/stream/route.ts` + `src/app/api/sync/publish/route.ts` -> `src/lib/live-sync-config.ts`.
10. Cache/freshness behavior -> `src/lib/cache.ts` -> `src/app/api/diagrams/route.ts` + `src/app/api/diagrams/[id]/route.ts` + `src/app/api/notes/route.ts` + `src/app/api/notes/[id]/route.ts`.
11. API docs/public access API -> `src/app/docs/page.tsx` + `src/components/ApiDoc.tsx` + `docs/API_GUIDE.md` -> `src/app/api/access/diagrams/route.ts` + `src/app/api/access/diagrams/[id]/route.ts` + `src/app/api/access/notes/route.ts` + `src/app/api/access/notes/[id]/route.ts`.
12. CSRF/auth guard -> `src/lib/csrf.ts` + `src/lib/csrf-client.ts` + `src/lib/csrf-constants.ts` -> `src/app/api/csrf/route.ts`.
13. Backup/restore/wipe -> `src/app/api/backup/route.ts` + `src/app/api/settings/wipe/route.ts` -> `src/lib/data.ts` + `src/lib/schemas.ts`.
14. DB/provider/bootstrap changes -> `prisma/schema.prisma` + `src/lib/prisma.ts` + `src/lib/database-url.ts` + `scripts/database-url.js` + `scripts/bootstrap.js` + `scripts/prepare-prisma-schema.js` + `scripts/backfill-tag-counts.js`.

## Ownership Map (Condensed)

- `src/app/`: App Router pages/layout/error.
- `src/app/api/`: server endpoints by feature domain.
- `src/components/`: feature UI; `src/components/notes/` is notes-specific; `src/components/ui/` shared primitives (includes chart wrappers in `src/components/ui/chart.tsx`).
- `src/lib/`: domain logic (data, notes-data, cache, sync, csrf, settings, schemas, types, store).
- `prisma/`: schema source of truth.
- `scripts/`: bootstrap/prisma/backfill flows.
- `docs/`: user-facing docs.

## Critical Contracts

- Models: `prisma/schema.prisma`.
- Shared types: `src/lib/types.ts`.
- Validation: `src/lib/schemas.ts`.
- Diagram service: `src/lib/data.ts`.
- Note service: `src/lib/notes-data.ts`.
- Settings service/store: `src/lib/settings.ts` + `src/lib/store.ts`.

## Required Map Update Triggers

- Added/moved/renamed file/folder/route.
- Added/renamed/removed exported function that changes ownership.
- Changed module responsibility.
- Changed schema or persistence/bootstrap flow.

If any trigger is true, update this file in the same change.
