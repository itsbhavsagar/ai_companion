import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client.js";
import { resolveContradictions } from "../memory/memory.resolver.js";
import { createMemory, listActiveMemories } from "../memory/memory.service.js";

describe("Memory Service", () => {
  beforeAll(async () => {
    await prisma.memory.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and canonicalizes a memory", async () => {
    const memory = await createMemory({
      subject: "user",
      predicate: "likes",
      value: "hiking",
      category: "personal",
      importance: 5,
      memoryType: "stable",
    });
    expect(memory.id).toBeDefined();
    expect(memory.status).toBe("active");
    expect(memory.predicate).toBe("activity_preference");
  });

  it("lists active memories", async () => {
    const memories = await listActiveMemories();
    expect(memories.length).toBeGreaterThan(0);
  });

  it("supersedes a conflicting memory", async () => {
    const oldMemory = await createMemory({
      subject: "user",
      predicate: "job_title",
      value: "Engineer",
      category: "work",
      importance: 5,
      memoryType: "stable",
    });

    await prisma.$transaction(async (tx) => {
      const newMemory = await tx.memory.create({
        data: {
          subject: "user",
          predicate: "job_title",
          value: "Designer",
          category: "work",
          importance: 5,
          memoryType: "stable",
          status: "active",
        },
      });

      await resolveContradictions(
        tx,
        "user",
        "job_title",
        "Designer",
        newMemory.id,
      );
    });

    const supersededMemory = await prisma.memory.findUnique({
      where: { id: oldMemory.id },
    });
    expect(supersededMemory?.status).toBe("superseded");
  });
});
