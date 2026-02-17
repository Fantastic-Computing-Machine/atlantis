# API Guide

Atlantis provides a REST API to manage diagrams and notes programmatically. This feature is disabled by default for security. API routes require the CSRF cookie/header pair; the Swagger UI works in-browser because the app sets the cookie automatically.

## Enabling the API

To enable the API, set `ENABLE_API_ACCESS=true` in the environment. API routes are CSRF-protected; the Swagger UI works in-browser because the app sets the CSRF cookie automatically.

### Docker Run

```bash
docker run -d -p 3000:3000 \
  -e ENABLE_API_ACCESS=true \
  -v $(pwd)/data:/app/data \
  strikead/atlantis:latest
```

### Docker Compose

Pass the environment variable when starting your services:

```bash
# Full stack (with Redis)
ENABLE_API_ACCESS=true docker compose up -d

# Simple stack (without Redis)
ENABLE_API_ACCESS=true docker compose -f docker-compose.simple.yml up -d
```

Or add it directly to your compose override:

```yaml
# docker-compose.override.yml
services:
  atlantis:
    environment:
      - ENABLE_API_ACCESS=true
```

### Local Development

```bash
ENABLE_API_ACCESS=true npm run dev
# or (after build)
ENABLE_API_ACCESS=true npm run start
```

## Interactive Documentation

Once enabled, you can access the interactive API documentation at:

- **Swagger UI**: `/docs` (Explore and test endpoints in the browser)
- **OpenAPI Spec**: `/openapi.json` (Download the raw JSON specification)

## Endpoints (Summary)

Base path: `/api/access`

### Diagrams

Base path prefix: `/api/access`

#### 1. Get All Diagrams

- **URL**: `/diagrams`
- **Method**: `GET`
- **Query Params**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response**:

```json
{
  "data": [{ "id": "abc123", "title": "My Diagram" }],
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

- **URL**: `/diagrams/:id`
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

Validates Mermaid syntax before saving.

- **URL**: `/diagrams`
- **Method**: `POST`
- **Headers**: `x-csrf-token` (UI handles automatically)
- **Body**:

```json
{
  "title": "New Diagram",
  "content": "graph TD;\n    A-->B;"
}
```

- **Response** (201 Created): Created diagram object.
- **Errors**: 400 on invalid Mermaid or missing content; 403 if API disabled or CSRF invalid.

### Notes

#### 1. Get All Notes

- **URL**: `/notes`
- **Method**: `GET`
- **Query Params**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response**:

```json
{
  "data": [
    {
      "id": "note123",
      "title": "Meeting Notes",
      "language": "markdown",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

#### 2. Get Single Note

Retrieve full details of a specific note.

- **URL**: `/notes/:id`
- **Method**: `GET`
- **Response**:

  ```json
  {
    "id": "note123",
    "title": "Meeting Notes",
    "content": "# Agenda...",
    "language": "markdown",
    "starred": false,
    "private": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

  _Note: Private notes will have their content masked if accessed publicly without authentication (though currently API access tokens are not fully specified, `ENABLE_API_ACCESS` is the main gate)._

#### 3. Create Note

- **URL**: `/notes`
- **Method**: `POST`
- **Headers**: `x-csrf-token`
- **Body**:

```json
{
  "title": "New Note",
  "content": "Note content here",
  "language": "markdown"
}
```

- **Response** (201 Created): Created note metadata (content omitted for list consistency).

---

## Related Documentation

- [Notes Feature](NOTES.md) - Full notes documentation
- [Container Startup](CONTAINER_STARTUP.md) - Docker deployment guide
- [Settings](settings.md) - Environment variables and configuration
