import { z } from 'zod';

export const diagramSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(400).optional(),
  content: z.string().optional(),
  emoji: z.string().max(10).optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).max(3).optional(),
});

export const checkpointSchema = z.object({
  content: z.string(),
  title: z.string().max(100).optional(),
  description: z.string().max(400).optional(),
  emoji: z.string().max(10).optional(),
  isFavorite: z.boolean().optional(),
});

// Notes API validation
export const noteCreateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  language: z.string().max(20).optional(),
  tags: z.array(z.string()).max(3).optional(),
});

export const noteUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().optional(),
  language: z.string().max(20).optional(),
  starred: z.boolean().optional(),
  private: z.boolean().optional(),
  tags: z.array(z.string()).max(3).optional(),
  emoji: z.string().max(10).optional(),
});

// Backup restore validation
export const backupDiagramSchema = z.object({
  id: z.string().min(1).max(10),
  title: z.string().max(100),
  content: z.string(),
  emoji: z.string().max(10).optional(),
  description: z.string().max(400).optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const backupSchema = z.array(backupDiagramSchema);
