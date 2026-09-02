import { z } from "zod";
import { groq } from "../ai/groq.js";
import { EXTRACTION_MODEL, TEMPERATURE } from "../config/models.js";
import { MemorySchema, type ExtractedMemory } from "../domain/memory.js";

export type { ExtractedMemory } from "../domain/memory.js";

const ExtractionResponseSchema = z.object({
  memories: z.array(MemorySchema).default([]),
});

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
      model: EXTRACTION_MODEL,
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

    const parsedJson: unknown = JSON.parse(content);
    const parsed = ExtractionResponseSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return [];
    }

    return parsed.data.memories;
  } catch (error: unknown) {
    console.error("Memory extraction failed:", error);
    return [];
  }
}
