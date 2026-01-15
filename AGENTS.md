# AGENTS.md - Atlantis Codebase Guide

This document provides essential information for AI agents working on the Atlantis codebase. Atlantis is a self-hosted Mermaid.js diagramming application.

## 🛠️ Build & Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server at `http://localhost:3000` |
| `npm run build` | Create optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint to check for code quality issues |

**Note on Testing:** currently, there is no test infrastructure (Jest/Vitest) configured. If you are asked to add tests, you must first set up the testing environment (e.g., install Vitest, configure it).

## 📂 Project Structure

```
src/
├── app/                 # Next.js 16 App Router
│   ├── [id]/            # Dynamic route for diagram editor
│   ├── api/             # API routes (diagrams, backup)
│   ├── globals.css      # Global styles (Tailwind)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page (DiagramGrid)
├── components/          # React components
│   ├── ui/              # Shadcn UI primitives (DO NOT MODIFY unless necessary)
│   ├── Canvas.tsx       # Mermaid rendering component
│   ├── Editor.tsx       # CodeMirror editor component
│   ├── Sidebar.tsx      # App sidebar
│   └── ...
├── lib/                 # Core logic & utilities
│   ├── data.ts          # File system persistence layer
│   ├── store.ts         # Zustand state management
│   ├── types.ts         # Shared TypeScript interfaces
│   └── utils.ts         # Utility functions (cn, etc.)
└── ...
```

## 📝 Code Style & Conventions

### TypeScript & React

* **Strict Mode:** The project uses `strict: true`. All code must be fully typed. Avoid `any`.
* **Functional Components:** Use React functional components with named exports.
* **Hooks:** Use standard React hooks (`useState`, `useEffect`) and custom hooks.
* **State Management:** Use **Zustand** (`src/lib/store.ts`) for global state.
* **Imports:** Use absolute imports with `@/` alias (e.g., `import { Button } from '@/components/ui/button'`).

### Styling (Tailwind CSS)

* Use Tailwind CSS utility classes for styling.
* Use `cn()` utility (from `clsx` and `tailwind-merge`) for conditional class names.
* Follow the design system established by **Shadcn UI**.
* Support both Light and Dark modes using `next-themes`.

### Icons

* Use **Lucide React** for icons.
* Import individual icons: `import { Save, Menu } from 'lucide-react'`.

### Naming Conventions

* **Files/Components:** `PascalCase` (e.g., `DiagramEditor.tsx`).
* **Functions/Variables:** `camelCase` (e.g., `handleSave`, `currentDiagram`).
* **Types/Interfaces:** `PascalCase` (e.g., `Diagram`, `DiagramStore`).
* **API Routes:** Kebab-case folders (e.g., `api/diagrams/[id]/route.ts`).

## ⚠️ Critical Rules for Agents

1. **Hydration Safety:** When using client-only libraries (like `react-resizable-panels`, `mermaid`, or `codemirror`) or browser APIs (`window`, `localStorage`), ensure code runs only on the client or handle hydration mismatches (e.g., using `useEffect` to set a `mounted` state).
2. **Shadcn UI:** Do not modify components in `src/components/ui/` unless you are fixing a bug in the component itself or customizing the design system globally. Use them as primitives.
3. **Persistence:** The app uses file-based persistence (`data/diagrams.json`). Ensure file operations are safe and handle errors.
4. **Error Handling:** Use `sonner` for toast notifications (`toast.success`, `toast.error`) to provide user feedback.
5. **Verification:** After making changes, ALWAYS run `npm run build` to ensure type safety and successful compilation.

## 🚀 Workflow

1. **Analyze:** Read relevant files first using `read` or `glob`. Understand the context.
2. **Research:** Use web search, web fetch, or MCP tools to consult official documentation for the latest APIs and best practices, especially for libraries like Next.js, Shadcn UI, and Mermaid.js.
3. **Plan:** Formulate a plan for your changes.
4. **Implement:** specific, minimal changes. prefer editing existing files over creating new ones if functionality fits.
5. **Verify:** Run `npm run build` to catch TypeScript errors or build failures.
