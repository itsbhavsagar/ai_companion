import { Groq } from "groq-sdk";
import { z } from "zod";
import { LLM_MODEL, TEMPERATURE } from "../config/models.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MemorySchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  value: z.string(),
  category: z.enum(["work", "relationship", "personal", "opinion", "plan"]),
  importance: z.number().min(1).max(10),
  memoryType: z.enum(["stable", "temporary"]),
});

export type ExtractedMemory = z.infer<typeof MemorySchema>;

export interface ExtractionResponse {
  memories: unknown[];
}

function isExtractedMemory(value: unknown): value is ExtractedMemory {
  return MemorySchema.safeParse(value).success;
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a user message, extract ANY personal facts that are worth remembering.

## Canonical Predicates (USE THESE EXACTLY):
- "name" — user's name
- "location" — where the user lives
- "job_title" — user's job/role
- "relationship_status" — single, in a relationship, married, etc.
- "activity_preference" — what the user likes to do (hiking, swimming, reading, etc.)
- "opinion" — user's views on topics
- "plan" — future plans or intentions

## Critical Rules:
- Map "likes X" → activity_preference: X
- Map "prefers X" → activity_preference: X
- Map "I like X" → activity_preference: X
- Map "I prefer X" → activity_preference: X
- Map "I love X" → activity_preference: X
- ALWAYS use "activity_preference" for ANY activity-related preference
- DO NOT use "likes" as a predicate — use "activity_preference" instead

## Examples:
User: "I like hiking" → { "predicate": "activity_preference", "value": "hiking" }
User: "I prefer swimming" → { "predicate": "activity_preference", "value": "swimming" }

Return a JSON object with a "memories" array:
{
  "memories": [
    {
      "subject": "user",
      "predicate": "activity_preference",
      "value": "swimming",
      "category": "personal",
      "importance": 6,
      "memoryType": "stable"
    }
  ]
}

User message:`;

export async function extractMemories(
  userMessage: string,
): Promise<ExtractedMemory[]> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — skipping memory extraction");
    return [];
  }

  try {
    const response = await groq.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: TEMPERATURE.EXTRACTION,
    });

    const content: string | null | undefined =
      response.choices[0]?.message?.content ?? null;
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content) as ExtractionResponse;
    const memories: unknown[] = parsed.memories ?? [];

    return memories.filter(isExtractedMemory);
  } catch (error: unknown) {
    console.error("Memory extraction failed:", error);
    return [];
  }
}
