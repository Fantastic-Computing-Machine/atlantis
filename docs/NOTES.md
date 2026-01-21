# Notes Feature

Atlantis includes a built-in notetaking feature with a code-editor-like experience, accessible at `/notes`.

## Features

- **Rich Code Editor**: Powered by CodeMirror with:
  - Line numbers
  - Indentation guides
  - Bracket matching and auto-closing
  - Word wrap toggle
  - Syntax highlighting for multiple languages

- **Supported Languages**:
  - Plain Text (txt)
  - Markdown (md) - with live preview
  - JavaScript
  - TypeScript
  - Python
  - HTML
  - CSS
  - JSON

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

## API Endpoints

### List Notes

```http
GET /api/notes
```

Query parameters:

- `limit` - Number of notes to return (default: 24)
- `offset` - Pagination offset
- `query` - Search query
- `sort` - Sort option: `recent`, `old`, `alphabetical`
- `starred` - Filter by starred: `true`/`false`

Response: List of notes (without content).

### Create Note

```http
POST /api/notes
```

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

Returns full note. **Note**: If the note is marked as private, the content field returns `"Content policy in effect."` instead of actual content.

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
