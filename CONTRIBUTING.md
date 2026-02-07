# Contributing to atlantis

Thank you for your interest in contributing to atlantis! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Git
- **LaTeX distribution** (optional, for LaTeX note compilation)

#### Installing LaTeX (Optional)

LaTeX is only required if you want to use the LaTeX note compilation feature during local development. The Docker image includes TeX Live by default.

<details>
<summary><strong>macOS</strong></summary>

```bash
# Full TeX Live (recommended, ~4GB)
brew install --cask mactex

# Or minimal installation (~100MB)
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install collection-fontsrecommended
```

</details>

<details>
<summary><strong>Windows</strong></summary>

**MiKTeX (Recommended):** Download from [miktex.org](https://miktex.org/download) - auto-installs missing packages.

**TeX Live:** Download from [tug.org/texlive](https://www.tug.org/texlive/acquire-netinstall.html)

Verify installation: `pdflatex --version`

</details>

<details>
<summary><strong>Debian / Ubuntu</strong></summary>

```bash
# Minimal
sudo apt install texlive-latex-base

# Recommended
sudo apt install texlive-latex-recommended texlive-fonts-recommended

# Full (~5GB)
sudo apt install texlive-full
```

</details>

<details>
<summary><strong>Fedora / RHEL / CentOS</strong></summary>

```bash
# Minimal
sudo dnf install texlive-scheme-basic

# Recommended
sudo dnf install texlive-scheme-medium

# Full
sudo dnf install texlive-scheme-full
```

</details>

<details>
<summary><strong>Arch Linux</strong></summary>

```bash
# Core packages
sudo pacman -S texlive-basic texlive-latex texlive-latexrecommended

# Full
sudo pacman -S texlive-full
```

</details>

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

   Navigate to [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Framework: [Next.js 14+](https://nextjs.org/) (App Router)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- Components: [Shadcn UI](https://ui.shadcn.com/)
- Icons: [Lucide React](https://lucide.dev/)
- Editor: [CodeMirror](https://uiwjs.github.io/react-codemirror/)
- Rendering: [Mermaid.js](https://mermaid.js.org/)
- State: [Zustand](https://github.com/pmndrs/zustand)

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/add-export-png` - New features
- `fix/diagram-centering` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/layout-component` - Code refactoring

### Making Changes

1. Create a new branch from `master`

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
fix: resolve hydration mismatch in header
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

Atlantis provides two Docker Compose configurations for different use cases:

### Compose Configurations

| File | Description | When to Use |
|------|-------------|-------------|
| `docker-compose.yml` | Full stack with Redis | Production, testing caching behavior |
| `docker-compose.simple.yml` | Standalone (no Redis) | Quick testing, simpler setups |

### Running with Docker Compose

**Full Stack (with Redis):**

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f atlantis

# Rebuild after code changes
docker compose up --build -d

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (fresh start)
docker compose down -v
```

**Simple Stack (without Redis):**

```bash
# Start without Redis
docker compose -f docker-compose.simple.yml up -d

# Rebuild
docker compose -f docker-compose.simple.yml up --build -d
```

### Building a Local Image

For testing changes before pushing:

```bash
# Build local image
docker build -t atlantis:local .

# Run your local build
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data atlantis:local
```

### Environment Variables

Customize your deployment with environment variables:

```bash
# Custom port and data directory
PORT=8080 ATLANTIS_DATA_DIR=./my-data docker compose up -d

# Enable API access
ENABLE_API_ACCESS=true docker compose up -d
```

See [Container Startup & Deployment](docs/CONTAINER_STARTUP.md) for the full list of configuration options.

[![Docker Hub](https://img.shields.io/badge/View_on-Docker_Hub-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/strikead/atlantis)

## Questions?

Feel free to open an issue for any questions about contributing.

---

Thank you for contributing to atlantis!
