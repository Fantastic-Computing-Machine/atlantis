# Container Startup & Configuration

The easiest way to self-host Atlantis is with Docker. We provide multi-platform images supporting AMD64 (Standard PC/Server) and ARM64 (Apple Silicon, Raspberry Pi).

## Docker Deployment

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

### Quick Run (No Persistence)

Perfect for testing:

```bash
docker run -p 3000:3000 strikead/atlantis:latest
```

### Docker Compose

Alternatively, use the included docker-compose.yml. You can point it to the remote image or build it locally.

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

## Configuration

### Custom Port & Data Directory

You can customize the deployment using environment variables:

```bash
PORT=8080 ATLANTIS_DATA_DIR=./my-data docker compose up -d
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | The port the application will listen on. |
| `PRISMA_PROVIDER` | `sqlite` | Database provider (`sqlite`, `postgresql`, `mysql`). |
| `DATABASE_URL` / `DB_CONNECTION` | `file:./data/atlantis.db` | Connection string; defaults to local SQLite file. |
| `PRISMA_AUTO_APPLY` | `true` (non-prod), `false` (prod) | Auto-runs `prisma db push` on server start to ensure schema exists. |
| `ENABLE_API_ACCESS` | `false` | Set to `true` to enable the REST API and /docs. |

## Versioning

Available tags on [Docker Hub](https://hub.docker.com/r/strikead/atlantis/tags):

- `latest`: The most recent stable release.
- `vX.Y.Z`: Specific version releases.
- `sha-xxxx`: Development builds from specific commits.

