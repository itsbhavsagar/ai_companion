import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db/client.js";
import { createMemory, listActiveMemories } from "../memory/memory.service.js";

describe("Memory Service", () => {
  beforeAll(async () => {
    await prisma.memory.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a memory", async () => {
    const memory = await createMemory({
      subject: "user",
      predicate: "test",
      value: "test value",
      category: "personal",
      importance: 5,
      memoryType: "stable",
    });
    expect(memory.id).toBeDefined();
    expect(memory.status).toBe("active");
  });

  it("lists active memories", async () => {
    const memories = await listActiveMemories();
    expect(memories.length).toBeGreaterThan(0);
  });
});
