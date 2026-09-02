import { z } from "zod";
import { groq } from "../ai/groq.js";
import { EXTRACTION_MODEL, TEMPERATURE } from "../config/models.js";
import {
  canonicalizePredicate,
  MemorySchema,
  type ExtractedMemory,
} from "../domain/memory.js";
import { AIProviderError, ExtractionError } from "../errors.js";

export type { ExtractedMemory } from "../domain/memory.js";

const ExtractionResponseSchema = z.object({
  memories: z.array(MemorySchema).default([]),
});

function extractJsonObject(content: string): unknown {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in extraction response");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

const EXTRACTION_PROMPT = `You are a memory extraction system. Given a user message, extract ANY personal facts that are worth remembering.

## Canonical Predicates (USE THESE EXACTLY):
- "name" — user's name
- "current_location" — where the user lives now
- "planned_location" — where the user plans to move; store only the destination as the value
- "past_location" — where the user used to live; store only the location as the value
- "job_title" — user's job/role
- "relationship_status" — single, in a relationship, married, etc.
- "activity_preference" — what the user likes to do (hiking, swimming, reading, etc.)
- "opinion" — user's views on topics
- "career_plan" — a planned career goal; store only the role or goal as the value
- "plan" — other future plans or intentions

## Critical Rules:
- Map "likes X" → activity_preference: X
- Map "prefers X" → activity_preference: X
- Map "I like X" → activity_preference: X
- Map "I prefer X" → activity_preference: X
- Map "I love X" → activity_preference: X
- ALWAYS use "activity_preference" for ANY activity-related preference
- DO NOT use "likes" as a predicate — use "activity_preference" instead
- Map a planned move to planned_location, never plan
- Map a planned career goal to career_plan, never plan
- current_location, planned_location, and past_location are different predicates and must not replace one another
- planned_location, career_plan, and plan are different predicates and must not replace one another

## Examples:
User: "I like hiking" → { "predicate": "activity_preference", "value": "hiking" }
User: "I prefer swimming" → { "predicate": "activity_preference", "value": "swimming" }
User: "I live in Delhi" → { "predicate": "current_location", "value": "Delhi" }
User: "I'm planning to move to Mumbai" → { "predicate": "planned_location", "value": "Mumbai" }
User: "I used to live in Bengaluru" → { "predicate": "past_location", "value": "Bengaluru" }
User: "I want to become a pilot" → { "predicate": "career_plan", "value": "pilot" }
User: "I plan to learn guitar" → { "predicate": "plan", "value": "learn guitar" }

Return only a valid JSON object with a "memories" array. Do not wrap it in markdown fences:
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
      response_format: { type: "json_object" },
      temperature: TEMPERATURE.EXTRACTION,
    });

    const content: string | null | undefined =
      response.choices[0]?.message?.content ?? null;
    if (!content) {
      return [];
    }

    const parsedJson = extractJsonObject(content);
    const parsed = ExtractionResponseSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return [];
    }

    return parsed.data.memories.map((memory) => ({
      ...memory,
      predicate: canonicalizePredicate(memory.predicate),
    }));
  } catch (error: unknown) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        (error.message.includes("JSON") ||
          error.message.includes("No JSON object")))
    ) {
      console.warn("Memory extraction returned invalid JSON");
      return [];
    }

    if (error instanceof Error) {
      const providerStatus =
        typeof (error as { status?: unknown }).status === "number"
          ? (error as unknown as { status: number }).status
          : undefined;
      const errorMessage = error.message.toLowerCase();

      if (
        providerStatus === 429 ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit")
      ) {
        throw new AIProviderError("Memory extraction rate limit exceeded", 429);
      }

      throw new ExtractionError(`Memory extraction failed: ${error.message}`);
    }

    throw new ExtractionError("Memory extraction failed unexpectedly");
  }
}
