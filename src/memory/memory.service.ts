import type { Memory } from "@prisma/client";
import {
  canonicalizePredicate,
  type CreateMemoryInput,
} from "../domain/memory.js";
import { prisma } from "../db/client.js";

export type {
  CreateMemoryInput,
  MemoryCategory,
  MemoryType,
} from "../domain/memory.js";

export type UpdateMemoryInput = Partial<
  Omit<Memory, "id" | "createdAt" | "updatedAt">
>;

export async function createMemory(data: CreateMemoryInput): Promise<Memory> {
  return prisma.memory.create({
    data: {
      ...data,
      predicate: canonicalizePredicate(data.predicate),
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
  const updateData: UpdateMemoryInput = data.predicate
    ? {
        ...data,
        predicate: canonicalizePredicate(data.predicate),
      }
    : data;

  return prisma.memory.update({
    where: { id },
    data: updateData,
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
