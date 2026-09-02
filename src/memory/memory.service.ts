import type { Memory } from "@prisma/client";
import { prisma } from "../db/client.js";

export type MemoryCategory =
  | "work"
  | "relationship"
  | "personal"
  | "opinion"
  | "plan";

export type MemoryType = "stable" | "temporary";

export type CreateMemoryInput = {
  subject: string;
  predicate: string;
  value: string;
  category: MemoryCategory;
  importance: number;
  memoryType: MemoryType;
};

export type UpdateMemoryInput = Partial<
  Omit<Memory, "id" | "createdAt" | "updatedAt">
>;

export async function createMemory(data: CreateMemoryInput): Promise<Memory> {
  return prisma.memory.create({
    data: {
      ...data,
      status: "active",
    },
  });
}

export async function getMemory(id: string): Promise<Memory | null> {
  return prisma.memory.findUnique({
    where: { id },
  });
}

export async function listActiveMemories(): Promise<Memory[]> {
  return prisma.memory.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateMemory(
  id: string,
  data: UpdateMemoryInput,
): Promise<Memory> {
  return prisma.memory.update({
    where: { id },
    data,
  });
}

export async function supersedeMemory(
  oldId: string,
  newId: string,
): Promise<void> {
  await prisma.memory.update({
    where: { id: oldId },
    data: {
      status: "superseded",
      supersededBy: newId,
    },
  });
}
