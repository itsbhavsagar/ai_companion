import { z } from "zod";

export const MEMORY_CATEGORIES = [
  "work",
  "relationship",
  "personal",
  "opinion",
  "plan",
] as const;

export const MEMORY_TYPES = ["stable", "temporary"] as const;

export const CANONICAL_PREDICATES = [
  "name",
  "location",
  "job_title",
  "relationship_status",
  "activity_preference",
  "opinion",
  "plan",
] as const;

export type CanonicalPredicate = (typeof CANONICAL_PREDICATES)[number];

const PREDICATE_ALIASES: Record<string, CanonicalPredicate> = {
  city: "location",
  current_city: "location",
  lives_in: "location",
  job: "job_title",
  role: "job_title",
  title: "job_title",
  relationship: "relationship_status",
  activity: "activity_preference",
  activity_preferences: "activity_preference",
  enjoy: "activity_preference",
  enjoys: "activity_preference",
  hobbies: "activity_preference",
  hobby: "activity_preference",
  interest: "activity_preference",
  interests: "activity_preference",
  like: "activity_preference",
  likes: "activity_preference",
  love: "activity_preference",
  loves: "activity_preference",
  prefer: "activity_preference",
  preference: "activity_preference",
  preferences: "activity_preference",
  prefers: "activity_preference",
};

function normalizePredicate(predicate: string): string {
  return predicate.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

export function canonicalizePredicate(predicate: string): string {
  const normalized = normalizePredicate(predicate);
  return PREDICATE_ALIASES[normalized] ?? normalized;
}

export function equivalentPredicates(predicate: string): string[] {
  const canonical = canonicalizePredicate(predicate);
  const aliases = Object.entries(PREDICATE_ALIASES)
    .filter(([, aliasTarget]) => aliasTarget === canonical)
    .map(([alias]) => alias);

  return Array.from(new Set([canonical, ...aliases]));
}

export const MemorySchema = z.object({
  subject: z.string(),
  predicate: z.string().transform(canonicalizePredicate),
  value: z.string(),
  category: z.enum(MEMORY_CATEGORIES),
  importance: z.number().min(1).max(10),
  memoryType: z.enum(MEMORY_TYPES),
});

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type CreateMemoryInput = z.infer<typeof MemorySchema>;
export type ExtractedMemory = CreateMemoryInput;
