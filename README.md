# atlantis

A premium, self-hosted Mermaid.js diagramming application built with Next.js, Tailwind CSS, and Shadcn UI.

![Atlantis Preview](/public/preview.png)

## Features

- Modern Editor: Split-pane interface with code editor and live preview.
- Full Mermaid Support: Supports all diagram types supported by Mermaid.js.
- Local Persistence: Diagrams are stored in SQLite by default (data/atlantis.db), with optional Postgres/MySQL via envs.
- Dark/Light Mode: Beautiful UI that adapts to your system preference.
- Favorites: Organize your diagrams by marking important ones.
- Backup & Restore: Export your data to JSON and restore it whenever needed.
- Search: fast searching through your saved diagrams.

## Tech Stack

- Framework: [Next.js 14+](https://nextjs.org/) (App Router)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- Components: [Shadcn UI](https://ui.shadcn.com/)
- Icons: [Lucide React](https://lucide.dev/)
- Editor: [CodeMirror](https://uiwjs.github.io/react-codemirror/)
- Rendering: [Mermaid.js](https://mermaid.js.org/)
- State: [Zustand](https://github.com/pmndrs/zustand)

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

- [Container Startup & Deployment](docs/CONTAINER_STARTUP.md): Detailed instructions for running Atlantis with Docker, Docker Compose, and configuring the environment.
- [API Guide](docs/API_GUIDE.md): How to enable and use the REST API for programmatic access.

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
