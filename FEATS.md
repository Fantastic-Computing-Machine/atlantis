# Feature Enhancement Proposals

## 1. Smart Notes (AI Integration)

Currently, AI is only available for Diagrams. We can extend this to Notes.

1. **Summarization**: Auto-generate summaries for long notes.
2. **Drafting**: "Write a blog post about..." inside the note editor.
3. **Chat with Notes**: Ask questions like "What did I write about the server architecture?".
4. **Tech**: Reuse existing AiChatPanel logic, add existing `AI_API_KEY` support to a new `NoteAiAssistant`.

## 2. Organization Layer (Tags & Folders)

The content is currently flat. As the number of notes and diagrams grows, this will become unmanageable.

1. **Universal Tags**: Add a `Tag` model in Prisma. Allow tagging both Diagrams and Notes.
2. **Smart Folders**: Virtual folders based on tags (e.g., "Work", "Ideas").
3. **UI**: Add a sidebar section for filtering by tags.

## 3. Bi-Directional Linking (The "Brain" Feature)

Transform the app from a simple storage into a knowledge base.

1. **Wiki-links**: Support `[[Note Title]]` syntax in Markdown notes to link to other notes.
2. **Backlinks**: Show "Linked from..." at the bottom of notes.
3. **Graph View**: A visual node-graph of connected notes (using Mermaid or a canvas library).

## 4. Enhanced Export & Publishing

1. **PDF Export for Notes**: Generate professional PDFs from Markdown notes (using `jspdf` which is already in `package.json`).
2. **Markdown Export**: Download notes as `.md` files for portability.
3. **Presentation Mode**: Turn a Mermaid diagram or a Note into a simple slide deck for meetings.

## 5. Command Palette (Superpowered)

Existing `GlobalSearchDialog` can be upgraded.

1. **Actions**: Add commands like`/create note`, `/theme dark`, `/export`.
2. **Navigation**: Jump to specific sections or tags.

## // Recommendation

I recommend starting with **Organization Layer (Tags)** or **Smart Notes (AI)** as they provide the most immediate value for a "second brain" type application.

## // Quick Improvements

1. ctrl to go to Link:
