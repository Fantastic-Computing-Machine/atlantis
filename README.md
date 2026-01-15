# atlantis 🔱

A premium, self-hosted Mermaid.js diagramming application built with Next.js, Tailwind CSS, and Shadcn UI.

![Atlantis Preview](/public/preview.png)

## Features

- 🎨 **Modern Editor**: Split-pane interface with code editor and live preview.
- 🧜‍♂️ **Full Mermaid Support**: Supports all diagram types supported by Mermaid.js.
- 💾 **Local Persistence**: Diagrams are saved to a local JSON file (`data/diagrams.json`), making it easy to backup and self-host.
- 🌗 **Dark/Light Mode**: Beautiful UI that adapts to your system preference.
- ⭐ **Favorites**: Organize your diagrams by marking important ones.
- 📂 **Backup & Restore**: Export your data to JSON and restore it whenever needed.
- 🔎 **Search**: fast searching through your saved diagrams.

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Editor**: [CodeMirror](https://uiwjs.github.io/react-codemirror/)
- **Rendering**: [Mermaid.js](https://mermaid.js.org/)
- **State**: [Zustand](https://github.com/pmndrs/zustand)

## Getting Started

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
    # or
    yarn install
    # or
    pnpm install
    ```

3. Run the development server:

    ```bash
    npm run dev
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

The easiest way to self-host atlantis is with Docker.

### Quick Start

```bash
# Clone and run with docker-compose
git clone https://github.com/yourusername/atlantis.git
cd atlantis
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

#### Custom Port

Change the port by setting the `PORT` environment variable:

```bash
PORT=8080 docker compose up -d
```

Or create a `.env` file:

```env
PORT=8080
```

#### Custom Data Directory

By default, diagrams are stored in a Docker named volume. To persist data to a specific directory on your host:

```bash
# Use an absolute path
ATLANTIS_DATA_DIR=/path/to/your/data docker compose up -d

# Or use a relative path
ATLANTIS_DATA_DIR=./my-diagrams docker compose up -d
```

Or add to your `.env` file:

```env
ATLANTIS_DATA_DIR=/home/user/atlantis-data
```

#### Example: Custom Port + Data Directory

```bash
PORT=8080 ATLANTIS_DATA_DIR=./data docker compose up -d
```

### Run from Docker Hub (Recommended)

You can pull the pre-built image directly from Docker Hub. It supports AMD64 (Standard PC/Server), ARM64 (Raspberry Pi, Apple Silicon).

```bash
# Pull the latest version
docker pull strikead/atlantis:latest

# Run the container
docker run -d \
  --name atlantis \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  strikead/atlantis:latest
```

### Quick Run

If you just want to try it out (no data persistence):
```bash
docker run -p 3000:3000 strikead/atlantis:latest
```

### Versioning

You can valid tags from [Docker Hub](https://hub.docker.com/r/strikead/atlantis/tags):

- `latest` - Stable release from master branch
- `v1.0.0` - Specific semantic version
- `sha-xxxx` - Specific commit

### Docker Compose

You can also use the included `docker-compose.yml` but point it to the remote image:

```yaml
services:
  atlantis:
    image: strikead/atlantis:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## Data & Backup

Data is stored in `data/diagrams.json` (or your configured `ATLANTIS_DATA_DIR`).

- **Backup**: Click "Backup JSON" in the sidebar to download your diagrams.
- **Restore**: Click "Restore JSON" and select a valid backup file.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
