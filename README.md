# 🔱 atlantis

Self-hosted platform for Mermaid.js diagrams, notes, and knowledge management. Built with Next.js, Tailwind CSS, and Shadcn UI.

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

- Modern Editor: Split-pane interface with code editor and live preview.
- Interactive Todo Lists: Manage tasks with drag-and-drop support, backed by standard Markdown.
- Full Mermaid Support: Supports all diagram types supported by Mermaid.js.
- Local Persistence: Diagrams are stored in SQLite by default (data/atlantis.db), with optional Postgres/MySQL via envs.
- Dark/Light Mode: Beautiful UI that adapts to your system preference.
- Favorites: Organize your diagrams by marking important ones.
- Backup & Restore: Export your data to JSON and restore it whenever needed.
- Management: Create, edit, and delete diagrams easily.
- Search: fast searching through your saved diagrams.

## Screenshots

![Home Screen](screenshots/1.%20home.png)
*Home Dashboard*

![Diagram Editor](screenshots/2.%20diagram.png)
*Diagram Editor*

**More Screenshots:**

- [Notes Interface](screenshots/3.%20notes.png)
- [Settings - General](screenshots/4.1%20settings.png)
- [Settings - Advanced](screenshots/4.2%20settings.png)

## Quick Start (Docker)

Run Atlantis instantly with a single command:

```bash
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name atlantis strikead/atlantis:latest
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ installed on your machine.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/atlantis.git
   cd atlantis
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Setup Environment:

   ```bash
   cp .env.example .env
   ```

4. Run Development Server:

   ```bash
   npm run dev
   ```

## Documentation

- [Contributing Guide](CONTRIBUTING.md): Tech stack, workflow, LaTeX setup, and guidelines for contributors.
- [Agent Guide](AGENTS.md): Conventions and commands for contributors and AI agents.
- [AI Contribution Guide](docs/AI.md): Practices specific to agentic/AI contributors.
- [Container Startup & Deployment](docs/CONTAINER_STARTUP.md): Detailed instructions for running Atlantis with Docker, Docker Compose, and configuring the environment.
- [API Guide](docs/API_GUIDE.md): How to enable and use the REST API for programmatic access.
- [Notes Feature](docs/NOTES.md): Guide for the notetaking feature with API documentation.
- [Settings](docs/settings.md): Configuration options and environment variables.

## Data & Backup

Data is stored in a database (default SQLite at data/atlantis.db; switch via PRISMA_PROVIDER/DATABASE_URL).

- Backup: Use Settings -> Backup (homepage header) to download your diagrams.
- Restore: Use Settings -> Restore and select a valid backup file.
- Checkpoints: Create manual checkpoints in the editor (up to 15 recent checkpoints kept per diagram).

## Support

If you find this project useful, you can support its development:

<a href="https://www.buymeacoffee.com/strikead"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&slug=strikead&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" /></a>

## License

MIT - see [LICENSE](LICENSE) for details.
