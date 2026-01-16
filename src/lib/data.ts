import fs from 'fs/promises';
import path from 'path';
import { Diagram } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'diagrams.json');

export async function getDiagrams(): Promise<Diagram[]> {
  try {
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // If file doesn't exist, return empty array and create it
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }
}

export async function saveDiagrams(diagrams: Diagram[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(diagrams, null, 2), 'utf-8');
}
