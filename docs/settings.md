# Settings

Atlantis provides configurable settings accessible via the `/settings` page.

## Appearance

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Theme | Light, Dark, System | System | Application color scheme |

## Editor

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Auto-save | On/Off | On | Automatically save changes |
| Auto-save delay | 1s, 2s, 5s, 10s | 2s | Debounce time before auto-saving |

## AI Settings

| Setting | Description |
|---------|-------------|
| API Key | Your OpenAI or Gemini API key (stored locally or via env var) |
| Provider | Auto-detect, OpenAI-compatible, or Gemini |
| Model | Read-only display of the model in use |

### Supported Models

- **OpenAI**: `gpt-4o-mini`
- **Gemini**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env var)

> **Note**: When `AI_API_KEY` environment variable is set, the key cannot be modified through the UI and is shown as "read-only".

## Advanced

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Max checkpoints | 5-50 | 15 | Maximum version history per diagram |
| Default export format | SVG, PNG, PDF | SVG | Preferred diagram download format |
| Export scale | 1x, 2x, 3x | 2x | PNG/PDF resolution multiplier |

## Data

| Action | Description |
|--------|-------------|
| Backup | Download all diagrams and notes as JSON |
| Restore | Upload a previously downloaded backup (validated with strict schema) |

## Danger Zone

| Action | Description |
|--------|-------------|
| Wipe Database | Permanently delete all data (requires server-generated confirmation code) |

---

## Environment Variables

Settings can also be configured via environment variables. These are especially useful for Docker deployments.

### Complete Variable Reference

| Variable            | Default                     | Description                                        |
|---------------------|-----------------------------|----------------------------------------------------|
| `PORT`              | `3000`                      | Port the application listens on                    |
| `NODE_ENV`          | `development`               | Environment mode (`development`, `production`)     |
| `PRISMA_PROVIDER`   | `sqlite`                    | Database provider (`sqlite`, `postgresql`, `mysql`)|
| `DATABASE_URL`      | `file:./data/atlantis.db`   | Database connection string                         |
| `REDIS_URL`         | _(none)_                    | Redis connection (e.g., `redis://redis:6379`)      |
| `AI_API_KEY`        | _(none)_                    | AI API key for OpenAI/Gemini features              |
| `GEMINI_MODEL`      | `gemini-2.5-flash`          | Gemini model to use                                |
| `ENABLE_API_ACCESS` | `false`                     | Enable REST API endpoints and `/docs`              |
| `PRISMA_AUTO_APPLY` | `true` (dev), `false` (prod)| Auto-run `prisma db push` on startup               |
| `PRISMA_SKIP_AUTOPUSH` | `false`                  | Skip all db push/seed operations                   |

### Docker Compose Usage

Set variables inline when starting services:

```bash
PORT=8080 ENABLE_API_ACCESS=true docker compose up -d
```

Or create a `.env` file in your project root:

```env
PORT=3000
ENABLE_API_ACCESS=true
AI_API_KEY=your-api-key-here
REDIS_URL=redis://redis:6379
```

Then run:

```bash
docker compose up -d
```

### Security Notes

- **AI API Key**: Using `AI_API_KEY` env var is more secure than storing in the database. When set, the key is read-only in the UI.
- **Wipe Confirmation**: The confirmation code is generated server-side with a 5-minute TTL and timing-safe validation.
- **Backup Restore**: Imported backups are validated against a strict Zod schema before processing.

---

## Related Documentation

- [Container Startup](CONTAINER_STARTUP.md) - Docker deployment and environment variables
- [API Guide](API_GUIDE.md) - REST API documentation
- [AI Assistant Guide](AI.md) - AI feature configuration
- [Notes Feature](NOTES.md) - Notes documentation
