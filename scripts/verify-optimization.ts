import { prisma } from '../src/lib/prisma';
import { createNote, updateNoteById, deleteNoteById } from '../src/lib/notes-data';
import { createDiagram, deleteDiagramById } from '../src/lib/data';

async function main() {
    console.log('Starting verification...');

    // 1. Create a Test Tag
    const tagName = `test-tag-${Date.now()}`;
    const tagSlug = `test-tag-${Date.now()}`;
    const tag = await prisma.tag.create({
        data: { name: tagName, slug: tagSlug },
    });
    console.log(`Created tag: ${tagName} (ID: ${tag.id}, Usage: ${tag.usageCount})`);

    if (tag.usageCount !== 0) throw new Error('Initial usage count should be 0');

    // 2. Create Note with Tag and Todo
    console.log('Creating note...');
    const note = await createNote({
        title: 'Test Note',
        content: 'This is a test note\n- [ ] Todo item',
        tags: [tag.id]
    });

    // Verify Note
    const noteCheck = await prisma.note.findUnique({ where: { id: note.id } });
    if (!noteCheck?.hasTodos) throw new Error('Note should have hasTodos=true');
    console.log('Note hasTodos verified.');

    // Verify Tag Usage
    const tagCheck1 = await prisma.tag.findUnique({ where: { id: tag.id } });
    if (tagCheck1?.usageCount !== 1) throw new Error(`Tag usage should be 1, got ${tagCheck1?.usageCount}`);
    console.log('Tag usage after note creation verified (1).');

    // 3. Update Note (Remove Todo, Keep Tag)
    console.log('Updating note (removing todo)...');
    await updateNoteById(note.id, {
        content: 'Todo is done now',
        tags: [tag.id] // Keep tag
    });

    const noteCheck2 = await prisma.note.findUnique({ where: { id: note.id } });
    if (noteCheck2?.hasTodos) throw new Error('Note should have hasTodos=false');
    console.log('Note hasTodos update verified.');

    const tagCheck2 = await prisma.tag.findUnique({ where: { id: tag.id } });
    if (tagCheck2?.usageCount !== 1) throw new Error(`Tag usage should be 1, got ${tagCheck2?.usageCount}`);

    // 4. Create Diagram with Tag
    console.log('Creating diagram...');
    const diagram = await createDiagram({
        title: 'Test Diagram',
        content: 'graph TD; A-->B;',
        tags: [tag.id]
    });

    const tagCheck3 = await prisma.tag.findUnique({ where: { id: tag.id } });
    if (tagCheck3?.usageCount !== 2) throw new Error(`Tag usage should be 2, got ${tagCheck3?.usageCount}`);
    console.log('Tag usage after diagram creation verified (2).');

    // 5. Delete Note
    console.log('Deleting note...');
    await deleteNoteById(note.id);

    const tagCheck4 = await prisma.tag.findUnique({ where: { id: tag.id } });
    if (tagCheck4?.usageCount !== 1) throw new Error(`Tag usage should be 1, got ${tagCheck4?.usageCount}`);
    console.log('Tag usage after note deletion verified (1).');

    // 6. Delete Diagram
    console.log('Deleting diagram...');
    await deleteDiagramById(diagram.id);

    const tagCheck5 = await prisma.tag.findUnique({ where: { id: tag.id } });
    if (tagCheck5?.usageCount !== 0) throw new Error(`Tag usage should be 0, got ${tagCheck5?.usageCount}`);
    console.log('Tag usage after diagram deletion verified (0).');

    // Cleanup
    await prisma.tag.delete({ where: { id: tag.id } });
    console.log('Verification Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
