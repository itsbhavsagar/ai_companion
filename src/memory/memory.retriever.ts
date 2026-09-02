import type { Memory } from "@prisma/client";
import { prisma } from "../db/client.js";
import {
  equivalentPredicates,
  type CanonicalPredicate,
} from "../domain/memory.js";

export type ScoredMemory = {
  memory: Memory;
  score: number;
  matches: number;
};

export async function retrieveRelevantMemories(
  query: string,
  limit: number = 5,
  targetPredicate?: CanonicalPredicate,
): Promise<Memory[]> {
  const allMemories: Memory[] = await prisma.memory.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  const queryWords = query.toLowerCase().match(/[a-z_]+/g) ?? [];
  const now: number = Date.now();

  const scored: ScoredMemory[] = allMemories.map(
    (memory: Memory): ScoredMemory => {
      const text: string =
        `${memory.subject} ${memory.predicate} ${memory.value}`.toLowerCase();

      const matches: number = queryWords.filter((word: string) =>
        text.includes(word),
      ).length;
      const relevance: number =
        queryWords.length > 0 ? matches / queryWords.length : 0;
      const predicateRelevance = targetPredicate &&
        equivalentPredicates(targetPredicate).includes(memory.predicate)
        ? 1
        : relevance;

      const createdAtMs: number = new Date(memory.createdAt).getTime();
      const ageInDays: number = Math.max(
        0,
        (now - createdAtMs) / (1000 * 60 * 60 * 24),
      );
      const recencyScore: number = Math.exp((-Math.log(2) * ageInDays) / 30);

      const relevanceWeight: number = 0.5;
      const importanceWeight: number = 0.3;
      const recencyWeight: number = 0.2;

      const score: number =
        predicateRelevance * relevanceWeight +
        (memory.importance / 10) * importanceWeight +
        recencyScore * recencyWeight;

      return { memory, score, matches };
    },
  );

  const hasRelevantMemory = targetPredicate
    ? allMemories.some((memory) =>
        equivalentPredicates(targetPredicate).includes(memory.predicate),
      )
    : scored.some((item) => item.matches > 0);

  if (!hasRelevantMemory) {
    return allMemories.slice(0, limit);
  }

  scored.sort((a: ScoredMemory, b: ScoredMemory): number => b.score - a.score);
  return scored
    .slice(0, limit)
    .map((item: ScoredMemory): Memory => item.memory);
}
