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

The easiest way to self-host Atlantis is with Docker. We provide multi-platform images supporting **AMD64** (Standard PC/Server) and **ARM64** (Apple Silicon, Raspberry Pi).

### Run from Docker Hub (Recommended)

Pull and run the official pre-built image:

```bash
# Pull the latest stable version
docker pull strikead/atlantis:latest

# Run the container with data persistence
docker run -d \
  --name atlantis \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  strikead/atlantis:latest
```

### Docker Compose

Alternatively, use the included `docker-compose.yml`. You can point it to the remote image or build it locally.

**Using Remote Image:**

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

### Building Your Own Image

If you want to build a custom image from source:

```bash
# Build the image locally
docker build -t my-atlantis:local .

# Run your custom image
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data my-atlantis:local
```

### Configuration

#### Custom Port & Data Directory

You can customize the deployment using environment variables:

```bash
PORT=8080 ATLANTIS_DATA_DIR=./my-data docker compose up -d
```

#### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | The port the application will listen on. |
| `ATLANTIS_DATA_DIR` | `atlantis_data` | Path on host to store diagram JSON files. |
| `ENABLE_API_ACCESS` | `false` | Set to `true` to enable the REST API and /docs. |

### Versioning

Available tags on [Docker Hub](https://hub.docker.com/r/strikead/atlantis/tags):

- `latest`: The most recent stable release.
- `vX.Y.Z`: Specific version releases.
- `sha-xxxx`: Development builds from specific commits.

### Quick Run (No Persistence)

Perfect for testing:

```bash
docker run -p 3000:3000 strikead/atlantis:latest
```

## Data & Backup

Data is stored in `data/diagrams.json` (or your configured `ATLANTIS_DATA_DIR`).

- **Backup**: Use **Settings → Backup** (homepage header) to download your diagrams.
- **Restore**: Use **Settings → Restore** and select a valid backup file.

## API Access

Atlantis provides a REST API to manage diagrams programmatically. This feature is disabled by default for security.

### Enabling the API

To enable the API, set the `ENABLE_API_ACCESS` environment variable to `true`.

**Docker Compose:**

```yaml
environment:
  - ENABLE_API_ACCESS=true
```

**Manual:**

```bash
ENABLE_API_ACCESS=true npm run start
```

### Interactive Documentation

Once enabled, you can access the interactive API documentation at:

- **Swagger UI**: `/docs` (Explore and test endpoints in the browser)
- **OpenAPI Spec**: `/openapi.json` (Download the raw JSON specification)

### Endpoints (Summary)

Base path: `/api/access`

#### 1. Get All Diagrams

Retrieve a paginated list of diagrams.

- **URL**: `/`
- **Method**: `GET`
- **Query Params**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response**:

    ```json
    {
      "data": [
        { "id": "abc123", "title": "My Diagram" }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 5,
        "totalPages": 1
      }
    }
    ```

#### 2. Get Single Diagram

Retrieve full details of a specific diagram.

- **URL**: `/:id`
- **Method**: `GET`
- **Response**:

    ```json
    {
      "id": "abc123",
      "title": "My Diagram",
      "content": "graph TD; A-->B;",
      "emoji": "📊",
      "createdAt": "2024-03-20T10:00:00.000Z",
      "updatedAt": "2024-03-20T10:00:00.000Z",
      "isFavorite": false
    }
    ```

#### 3. Create Diagram

Create a new diagram. Validates Mermaid syntax before saving.

- **URL**: `/`
- **Method**: `POST`
- **Body**:

    ```json
    {
      "title": "New Diagram",
      "content": "graph TD;\n    A-->B;"
    }
    ```

- **Response** (201 Created):
    Returns the created diagram object.
- **Errors**:
  - 400 Bad Request: If content is missing or invalid Mermaid syntax.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
