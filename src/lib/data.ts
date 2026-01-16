import fs from 'fs/promises';
import path from 'path';
import { Diagram } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'diagrams.json');
const TEMP_FILE = `${DATA_FILE}.tmp`;

// Simple in-memory mutex to serialize writes and avoid file corruption under concurrent requests
let writeLock: Promise<void> = Promise.resolve();

async function runWithWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  let release: () => void;
  const previousLock = writeLock;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLock = previousLock.then(() => nextLock);
  await previousLock;

  try {
    return await operation();
  } finally {
    release!();
  }
}

export async function getDiagrams(): Promise<Diagram[]> {
  // Wait for any in-flight writes to complete to ensure consistent reads
  await writeLock;

  try {
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }
}

export async function saveDiagrams(diagrams: Diagram[]): Promise<void> {
  const payload = JSON.stringify(diagrams, null, 2);

  await runWithWriteLock(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write to a temp file first, then move into place to keep writes atomic
    await fs.writeFile(TEMP_FILE, payload, 'utf-8');
    await fs.rename(TEMP_FILE, DATA_FILE);
  });
}
