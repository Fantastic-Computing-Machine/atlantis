# Contributing to atlantis

Thank you for your interest in contributing to atlantis! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Git

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/atlantis.git
   cd atlantis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-export-png` - New features
- `fix/diagram-centering` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/sidebar-component` - Code refactoring

### Making Changes

1. Create a new branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Run linting to check for issues
   ```bash
   npm run lint
   ```

4. Build to verify everything compiles
   ```bash
   npm run build
   ```

5. Commit your changes with a descriptive message
   ```bash
   git commit -m "feat: add PNG export functionality"
   ```

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add dark mode toggle to canvas
fix: resolve diagram centering issue on load
docs: update installation instructions
refactor: extract date formatting to utils
```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript - all code must pass strict type checking
- Define interfaces in `src/lib/types.ts` for shared types
- Use explicit return types for functions

### React Components

- Use function components with TypeScript
- Mark client components with `'use client';` directive
- Use named exports (not default exports)
- Define props interface inline or in types.ts

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

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` from `@/lib/utils` for conditional classes
- Leverage Shadcn UI components from `src/components/ui/`

### Imports

- Use path alias `@/*` for imports from `src/`
- Order: external packages → internal modules → relative imports

```typescript
import { NextResponse } from 'next/server';
import { getDiagrams } from '@/lib/data';
import { Diagram } from '@/lib/types';
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/             # API routes
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page
├── components/          # React components
│   ├── ui/              # Shadcn UI components
│   └── *.tsx            # Feature components
└── lib/                 # Utilities
    ├── data.ts          # Data persistence
    ├── store.ts         # Zustand store
    ├── types.ts         # TypeScript interfaces
    └── utils.ts         # Utility functions
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Ensure all checks pass** (lint, build)
3. **Write a clear PR description** explaining:
   - What changes were made
   - Why the changes were needed
   - Any breaking changes
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Title Format

Use the same format as commit messages:
```
feat: add PNG export functionality
fix: resolve hydration mismatch in sidebar
```

## Reporting Issues

When reporting issues, please include:

1. **Description** - Clear description of the issue
2. **Steps to reproduce** - How to trigger the issue
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment** - Browser, OS, Node version
6. **Screenshots** - If applicable

## Feature Requests

Feature requests are welcome! Please include:

1. **Use case** - Why is this feature needed?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - Other approaches you've thought about

## Docker Development

To run the application in Docker:

```bash
# Build and run
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Questions?

Feel free to open an issue for any questions about contributing.

---

Thank you for contributing to atlantis!
