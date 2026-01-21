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
| API Key | Your OpenAI or Gemini API key (stored locally) |
| Provider | Auto-detect, OpenAI-compatible, or Gemini |
| Model | Read-only display of the model in use |

### Supported Models

- **OpenAI**: `gpt-4o-mini`
- **Gemini**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env var)

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
| Restore | Upload a previously downloaded backup |

## Danger Zone

| Action | Description |
|--------|-------------|
| Wipe Database | Permanently delete all data (requires confirmation) |

---

## Environment Variables

Settings can also be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.5-flash` |
| `ENABLE_API_ACCESS` | Enable REST API endpoints | `false` |
