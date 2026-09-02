import { z } from "zod";
import { groq } from "../ai/groq.js";
import { CHAT_MODEL, TEMPERATURE } from "../config/models.js";
import {
  CANONICAL_PREDICATES,
  type CanonicalPredicate,
} from "../domain/memory.js";

const QUERY_INTENTS = [...CANONICAL_PREDICATES, "general"] as const;
const QueryIntentSchema = z.enum(QUERY_INTENTS);

export type QueryIntent = CanonicalPredicate | "general";

const ROUTE_PROMPT = `You classify whether a user is asking for one stored memory predicate. Infer the intended meaning despite common typos, misspellings, and informal phrasing.

Return only one option:
- name: their name
- job_title: their job, profession, career, role, or what they do
- current_location: where they live now or their current city
- planned_location: where they plan to move
- past_location: where they used to live
- relationship_status: their relationship status
- activity_preference: their hobbies, interests, or what they like to do
- opinion: an opinion they previously shared
- career_plan: a role or career they want to become
- plan: a future plan or intention they previously shared
- general: anything else

Distinguish these carefully:
- "What do I do?" is job_title.
- "Who am I?" is name.
- "Where do I live?" is current_location.
- "Where do I plan to move?" is planned_location.
- "Where did I used to live?" is past_location.
- "What do I want to become?" is career_plan.
- "What do I want to bcome?" is career_plan.
- "What do I want to do?" is plan.
- "Where did I travel yesterday?" is general because it is not a stored location question.
- "What should I do?" is general.

Return only the option, without punctuation.`;

export async function routeQuery(userMessage: string): Promise<QueryIntent> {
  const knownIntent = routeKnownMemoryQuestion(userMessage);
  if (knownIntent) {
    return knownIntent;
  }

  try {
    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: ROUTE_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: TEMPERATURE.ROUTING,
      max_completion_tokens: 80,
    });
    const content = response.choices[0]?.message?.content
      ?.trim()
      .toLowerCase()
      .replace(/^["'`\s]+|["'`.\s]+$/g, "");
    const parsed = QueryIntentSchema.safeParse(content);

    return parsed.success ? parsed.data : "general";
  } catch {
    return "general";
  }
}

export function isIdentityQuestion(userMessage: string): boolean {
  return normalizeQuestion(userMessage) === "who am i";
}

export function isStandaloneQuestion(userMessage: string): boolean {
  return /^(who|what|where|when|which|how)\b/i.test(userMessage.trim());
}

function routeKnownMemoryQuestion(
  userMessage: string,
): QueryIntent | undefined {
  const question = normalizeQuestion(userMessage);

  if (
    question === "who am i" ||
    question === "what is my name" ||
    question === "whats my name"
  ) {
    return "name";
  }

  if (
    question === "what do i do" ||
    question === "what is my job" ||
    question === "whats my job" ||
    question === "what is my profession"
  ) {
    return "job_title";
  }

  if (
    question === "where do i live" ||
    question === "what city do i live in" ||
    question === "where is my home"
  ) {
    return "current_location";
  }

  if (
    question === "what is my plan" ||
    question === "what do i want to do"
  ) {
    return "plan";
  }

  if (
    question === "what is my moving plan" ||
    question === "where do i plan to move" ||
    question === "where am i planning to move"
  ) {
    return "planned_location";
  }

  if (
    question === "where did i used to live" ||
    question === "where did i live before"
  ) {
    return "past_location";
  }

  if (
    question === "what is my career plan" ||
    question === "what do i want to become" ||
    question === "what i want to become"
  ) {
    return "career_plan";
  }

  if (
    question === "what do i like" ||
    question === "what do i like to do" ||
    question === "what are my hobbies"
  ) {
    return "activity_preference";
  }

  return undefined;
}

function normalizeQuestion(userMessage: string): string {
  return userMessage
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
