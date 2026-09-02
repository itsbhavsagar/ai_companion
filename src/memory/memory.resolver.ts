import type { Memory, Prisma } from "@prisma/client";
import {
  canonicalizePredicate,
  equivalentPredicates,
} from "../domain/memory.js";

export async function resolveContradictions(
  tx: Prisma.TransactionClient,
  subject: string,
  predicate: string,
  newValue: string,
  newMemoryId: string,
): Promise<void> {
  const canonicalPredicate = canonicalizePredicate(predicate);
  const existing: Memory[] = await tx.memory.findMany({
    where: {
      subject,
      predicate: { in: equivalentPredicates(canonicalPredicate) },
      status: "active",
    },
  });

  for (const memory of existing) {
    if (memory.id === newMemoryId) {
      continue;
    }

    if (memory.value.toLowerCase() !== newValue.toLowerCase()) {
      console.log(
        `🔄 Superseding memory: ${canonicalPredicate}: ${memory.value} → ${newValue}`,
      );

      await tx.memory.update({
        where: { id: memory.id },
        data: {
          status: "superseded",
          supersededBy: newMemoryId,
        },
      });
    }
  }
}
