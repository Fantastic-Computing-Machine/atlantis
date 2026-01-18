# API Guide

Atlantis provides a REST API to manage diagrams programmatically. This feature is disabled by default for security.

## Enabling the API

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

## Interactive Documentation

Once enabled, you can access the interactive API documentation at:

- **Swagger UI**: `/docs` (Explore and test endpoints in the browser)
- **OpenAPI Spec**: `/openapi.json` (Download the raw JSON specification)

## Endpoints (Summary)

Base path: `/api/access`

### 1. Get All Diagrams

Retrieve a paginated list of diagrams.

- **URL**: `/
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

### 2. Get Single Diagram

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

### 3. Create Diagram

Create a new diagram. Validates Mermaid syntax before saving.

- **URL**: `/
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