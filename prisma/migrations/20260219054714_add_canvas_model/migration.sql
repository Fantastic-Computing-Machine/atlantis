-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Diagram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "totalVersions" INTEGER NOT NULL DEFAULT 1,
    "searchVector" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diagramId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Content_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'txt',
    "emoji" TEXT NOT NULL DEFAULT '',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "searchVector" TEXT NOT NULL DEFAULT '',
    "hasTodos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_DiagramToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DiagramToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Diagram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DiagramToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NoteToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NoteToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NoteToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CanvasToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CanvasToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Canvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CanvasToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "diagram_updatedAt_idx" ON "Diagram"("updatedAt");

-- CreateIndex
CREATE INDEX "diagram_searchVector_idx" ON "Diagram"("searchVector");

-- CreateIndex
CREATE INDEX "content_diagram_updated_idx" ON "Content"("diagramId", "updatedAt");

-- CreateIndex
CREATE INDEX "note_updatedAt_idx" ON "Note"("updatedAt");

-- CreateIndex
CREATE INDEX "note_hasTodos_idx" ON "Note"("hasTodos");

-- CreateIndex
CREATE INDEX "note_searchVector_idx" ON "Note"("searchVector");

-- CreateIndex
CREATE INDEX "note_starred_idx" ON "Note"("starred");

-- CreateIndex
CREATE INDEX "canvas_updatedAt_idx" ON "Canvas"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_DiagramToTag_AB_unique" ON "_DiagramToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_DiagramToTag_B_index" ON "_DiagramToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_NoteToTag_AB_unique" ON "_NoteToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_NoteToTag_B_index" ON "_NoteToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CanvasToTag_AB_unique" ON "_CanvasToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_CanvasToTag_B_index" ON "_CanvasToTag"("B");
