# API Guide

Atlantis provides a REST API to manage diagrams and notes programmatically. This feature is disabled by default for security.

## Enabling the API

To enable the API, set the `ENABLE_API_ACCESS` environment variable to `true`. The API is disabled by default for security.

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
# or
ENABLE_API_ACCESS=true npm run start
```

## Interactive Documentation

Once enabled, you can access the interactive API documentation at:

- **Swagger UI**: `/docs` (Explore and test endpoints in the browser)
- **OpenAPI Spec**: `/openapi.json` (Download the raw JSON specification)

## Endpoints (Summary)

Base path: `/api/access`

### Diagrams

#### 1. Get All Diagrams

Retrieve a paginated list of diagrams.

- **URL**: `/diagrams`
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

Create a new diagram. Validates Mermaid syntax before saving.

- **URL**: `/diagrams`
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

### Notes

#### 1. Get All Notes

Retrieve a paginated list of notes.

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

    *Note: Private notes will have their content masked if accessed publicly without authentication (though currently API access tokens are not fully specified, `ENABLE_API_ACCESS` is the main gate).*

#### 3. Create Note

Create a new note.

- **URL**: `/notes`
- **Method**: `POST`
- **Body**:

    ```json
    {
      "title": "New Note",
      "content": "Note content here",
      "language": "markdown" // or "todo", "javascript", etc.
    }
    ```

- **Response** (201 Created):
    Returns the created note object.

---

## Related Documentation

- [Notes Feature](NOTES.md) - Full notes documentation
- [Container Startup](CONTAINER_STARTUP.md) - Docker deployment guide
- [Settings](settings.md) - Environment variables and configuration
