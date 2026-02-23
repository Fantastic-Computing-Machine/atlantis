# 🔱 atlantis

Self-hosted platform for Mermaid.js diagrams, notes, and knowledge management. Built with Next.js 16 (App Router), Tailwind CSS v4, and Shadcn UI.

![Atlantis Preview](/public/preview.png)

---

[![Build and Publish Docker Image](https://github.com/Fantastic-Computing-Machine/atlantis/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/Fantastic-Computing-Machine/atlantis/actions/workflows/docker-publish.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/strikead/atlantis)](https://hub.docker.com/r/strikead/atlantis)
[![Docker Image Size](https://img.shields.io/docker/image-size/strikead/atlantis/latest)](https://hub.docker.com/r/strikead/atlantis)

[![GitHub Issues](https://img.shields.io/github/issues/Fantastic-Computing-Machine/atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis/issues)
[![Last Commit](https://img.shields.io/github/last-commit/Fantastic-Computing-Machine/atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis/commits/master)
[![Repo Views](https://visitor-badge.laobi.icu/badge?page_id=Fantastic-Computing-Machine.atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis)

[![Docker Hub](https://img.shields.io/badge/View_on-Docker_Hub-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/strikead/atlantis)

## Features

- Modern editor with live Mermaid preview and checkpoints (keeps 15 recent versions).
- Notes workspace with Markdown/LaTeX/code modes, interactive todo lists, tags, and search.
- Full Mermaid support plus SVG/PNG/PDF exports and favorites.
- Local persistence via SQLite (data/atlantis.db) with optional PostgreSQL/MySQL through env vars.
- Optional Redis cache; light/dark themes; backup/restore to JSON.

## Walkthrough

![Walkthrough](docs/screenshots/walkthrough.gif)

## Quick Start (Docker)

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name atlantis \
  strikead/atlantis:latest
```

- Browse at <http://localhost:3000>
- Set `ENABLE_API_ACCESS=true` to expose `/api/access/*` and `/docs`.

## Quick Start (Local Development)

Prerequisites: Node.js 18.18+ and npm 10+.

```bash
git clone https://github.com/Fantastic-Computing-Machine/atlantis.git
cd atlantis
npm install
cp .env.example .env
npm run dev
```

Scripts: `npm run lint` (ESLint), `npm run build` (type/check + Next build).

## Documentation

- [Contributing Guide](CONTRIBUTING.md): Dev setup, lint/build steps, LaTeX notes, Docker workflows.
- [AI Doc](docs/AI.md): AI assistant configuration and usage.
- [Container Startup & Deployment](docs/CONTAINER_STARTUP.md): Docker/Docker Compose and env vars.
- [API Guide](docs/API_GUIDE.md): Enable and use the REST API (`/api/access/*`).
- [Notes Feature](docs/NOTES.md): Notes UX and related endpoints.
- [Settings](docs/settings.md): UI settings and complete env var reference.

## Data & Backup

Default storage: SQLite at `data/atlantis.db` (override with `PRISMA_PROVIDER` + `DATABASE_URL`/`DB_CONNECTION`).

- Backup: Settings → Backup downloads diagrams and notes as JSON.
- Restore: Settings → Restore accepts validated backup JSON.
- Checkpoints: Editor keeps up to 15 recent checkpoints per diagram.

## License

MIT - see [LICENSE](LICENSE) for details.
