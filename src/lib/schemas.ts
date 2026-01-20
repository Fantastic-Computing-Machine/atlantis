import { z } from 'zod';

export const diagramSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(400).optional(),
  content: z.string().optional(),
  emoji: z.string().max(10).optional(),
  isFavorite: z.boolean().optional(),
});

export const checkpointSchema = z.object({
  content: z.string(),
  title: z.string().max(100).optional(),
  description: z.string().max(400).optional(),
  emoji: z.string().max(10).optional(),
  isFavorite: z.boolean().optional(),
});
