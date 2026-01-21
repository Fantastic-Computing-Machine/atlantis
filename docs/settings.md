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

Settings can also be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_API_KEY` | AI API key (recommended for security) | _(none)_ |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.5-flash` |
| `ENABLE_API_ACCESS` | Enable REST API endpoints | `false` |

### Security Notes

- **AI API Key**: Using `AI_API_KEY` env var is more secure than storing in the database. When set, the key is read-only in the UI.
- **Wipe Confirmation**: The confirmation code is generated server-side with a 5-minute TTL and timing-safe validation.
- **Backup Restore**: Imported backups are validated against a strict Zod schema before processing.
