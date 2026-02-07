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

[![Docker Hub](https://img.shields.io/badge/View_on-Docker_Hub-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/strikead/atlantis)

### Quick Run (No Persistence)

Perfect for testing:

```bash
docker run -p 3000:3000 strikead/atlantis:latest
```

### Docker Compose

We provide two Docker Compose configurations depending on your needs:

| File                        | Description                   | Best For                          |
| --------------------------- | ----------------------------- | --------------------------------- |
| `docker-compose.yml`        | Full stack with Redis caching | Production, multi-user setups     |
| `docker-compose.simple.yml` | Standalone without Redis      | Personal use, simpler deployments |

---

#### Full Stack (with Redis)

The default `docker-compose.yml` includes Redis for improved caching performance.

```bash
# Start the full stack
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Configuration:**

```yaml
services:
  atlantis:
    image: strikead/atlantis:latest
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

#### Simple Stack (without Redis)

Use `docker-compose.simple.yml` for a simpler setup without Redis. In Docker/production mode, caching is disabled when `REDIS_URL` is not set.

```bash
# Start the simple stack
docker compose -f docker-compose.simple.yml up -d

# View logs
docker compose -f docker-compose.simple.yml logs -f

# Stop services
docker compose -f docker-compose.simple.yml down
```

> **Note**: For in-memory caching during local development, run without `NODE_ENV=production` or use `npm run dev` instead of the Docker image. In Docker/production, caching stays off unless `REDIS_URL` is provided.

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

| Variable                         | Default                           | Description                                                         |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `PORT`                           | `3000`                            | The port the application will listen on.                            |
| `PRISMA_PROVIDER`                | `sqlite`                          | Database provider (`sqlite`, `postgresql`, `mysql`).                |
| `DATABASE_URL` / `DB_CONNECTION` | `file:./data/atlantis.db`         | Connection string; defaults to local SQLite file.                   |
| `REDIS_URL`                      | None                              | Connection string for Redis cache (e.g. `redis://redis:6379`).      |
| `AI_API_KEY`                     | None                              | API Key for AI features (OpenAI/Gemini).                            |
| `PRISMA_AUTO_APPLY`              | `true` (non-prod), `false` (prod) | Auto-runs `prisma db push` on server start to ensure schema exists. |
| `PRISMA_SKIP_AUTOPUSH`           | `false`                           | Set to `true` to skip all db push/seed operations.                  |
| `ENABLE_API_ACCESS`              | `false`                           | Set to `true` to enable the REST API and /docs.                     |

## Versioning

Available tags on [Docker Hub](https://hub.docker.com/r/strikead/atlantis/tags):

- `latest`: The most recent stable release.
- `vX.Y.Z`: Specific version releases.
- `sha-xxxx`: Development builds from specific commits.

---

## Related Documentation

- [Contributing Guide](../CONTRIBUTING.md) - Development setup, LaTeX installation, and Docker workflows
- [API Guide](API_GUIDE.md) - REST API documentation
- [Settings](settings.md) - Configuration options
