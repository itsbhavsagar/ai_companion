import { z } from "zod";

export const MEMORY_CATEGORIES = [
  "work",
  "relationship",
  "personal",
  "opinion",
  "plan",
] as const;

export const MEMORY_TYPES = ["stable", "temporary"] as const;

export const MemorySchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  value: z.string(),
  category: z.enum(MEMORY_CATEGORIES),
  importance: z.number().min(1).max(10),
  memoryType: z.enum(MEMORY_TYPES),
});

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type CreateMemoryInput = z.infer<typeof MemorySchema>;
export type ExtractedMemory = CreateMemoryInput;
