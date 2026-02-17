# Notes Feature

Atlantis includes a built-in notetaking feature with a code-editor-like experience, accessible at `/notes`.

## Features

- **Rich Code Editor**: Powered by CodeMirror with:
  - Line numbers
  - Indentation guides
  - Bracket matching and auto-closing
  - Word wrap toggle
  - Syntax highlighting for multiple languages

- **Supported Languages** (stored as `language`): txt, markdown (with preview), tex (with LaTeX compile), javascript, typescript, python, html, css, json, todo (interactive task list).

- **Search & Replace**: Notepad++ style search panel with:
  - Find Next/Previous
  - Replace/Replace All
  - Match Case
  - Whole Word
  - Wrap Around
  - Regular Expression support

- **Organization**:
  - Star important notes
  - Filter by starred notes
  - Search notes by title
  - Auto-save with manual save option

- **Privacy**: Mark notes as private to hide content from API access.

## Todo List

When the language is `todo`, the note transforms into an interactive task manager:

- Check/uncheck items, drag to reorder, and add/delete tasks.
- Stored as Markdown task list (e.g., `- [ ] Task`) for portability.
- Multiline tasks are supported.

## API Endpoints

### List Notes

```http
GET /api/notes
```

Query parameters:

- `limit` - Number of notes to return (default: 24)
- `offset` - Pagination offset
- `query` - Search query
- `sort` - `recent` | `old` | `alphabetical`
- `starred` - Filter by starred: `true`/`false`

Response: List of notes without content (uses cache unless `fresh=true` or filters applied).

### Create Note

```http
POST /api/notes
```

Headers: `x-csrf-token` (set automatically by the app)

Body:

```json
{
  "title": "Note Title",
  "content": "Note content",
  "language": "txt"
}
```

### Get Note

```http
GET /api/notes/:id
```

Returns full note. If the note is marked as `private`, the `content` field returns "Content policy in effect.".

### Update Note

```http
PATCH /api/notes/:id
```

Body (all fields optional):

```json
{
  "title": "New Title",
  "content": "New content",
  "language": "markdown",
  "starred": true,
  "private": false
}
```

### Delete Note

```http
DELETE /api/notes/:id
```

## Privacy

Notes marked as `private: true` will not expose their content via the REST API. This is useful for sensitive information that should only be accessible through the web UI (which uses server-side rendering to bypass API restrictions).

## Markdown Preview

When the language is set to Markdown, a preview pane becomes available showing rendered markdown with:

- Headers
- Bold/Italic/Strikethrough
- Code blocks and inline code
- Blockquotes
- Lists
- Links and images
- Horizontal rules

---

## Related Documentation

- [Contributing Guide](../CONTRIBUTING.md) - Development setup, LaTeX installation, and Docker workflows
- [API Guide](API_GUIDE.md) - REST API endpoints for notes
- [Container Startup](CONTAINER_STARTUP.md) - Docker deployment guide
- [Settings](settings.md) - Configuration options
