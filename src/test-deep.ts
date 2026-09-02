import type { Memory } from "@prisma/client";
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chat } from "./chat/chat.service.js";
import { prisma } from "./db/client.js";
import {
  createMemory,
  listActiveMemories,
  type CreateMemoryInput,
} from "./memory/memory.service.js";

const execFileAsync = promisify(execFile);

function assertEval(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function findMemory(
  memories: Memory[],
  predicate: string,
  value: string,
): Memory | undefined {
  return memories.find(
    (memory) =>
      memory.predicate === predicate &&
      memory.value.toLowerCase() === value.toLowerCase(),
  );
}

async function clearMemories(): Promise<void> {
  // WARNING: Destructive eval reset; this script assumes an isolated test database.
  await prisma.memory.deleteMany({});
  console.log("🗑️  All memories cleared\n");
}

async function seedInitialMemories(): Promise<void> {
  console.log("🌱 Seeding initial memories...");

  const initialFacts: CreateMemoryInput[] = [
    {
      subject: "user",
      predicate: "name",
      value: "Bhavsagar",
      category: "personal",
      importance: 9,
      memoryType: "stable",
    },
    {
      subject: "user",
      predicate: "job_title",
      value: "Software Engineer",
      category: "work",
      importance: 8,
      memoryType: "stable",
    },
    {
      subject: "user",
      predicate: "activity_preference",
      value: "hiking",
      category: "personal",
      importance: 6,
      memoryType: "stable",
    },
    {
      subject: "user",
      predicate: "location",
      value: "Bengaluru",
      category: "personal",
      importance: 5,
      memoryType: "stable",
    },
    {
      subject: "user",
      predicate: "relationship_status",
      value: "single",
      category: "personal",
      importance: 4,
      memoryType: "temporary",
    },
  ];

  for (const fact of initialFacts) {
    await createMemory(fact);
  }

  console.log("✅ Initial memories seeded\n");
}

async function showMemories(label: string): Promise<void> {
  const memories = await listActiveMemories();
  console.log(`\n📚 ${label} (${memories.length} memories):`);
  for (const m of memories) {
    console.log(`   - ${m.predicate}: ${m.value} (${m.status})`);
  }
  console.log();
}

async function generateMetrics(): Promise<void> {
  console.log("\n📊 EVALUATION METRICS\n");

  const memories = await listActiveMemories();
  const allMemories = await prisma.memory.findMany({
    orderBy: { createdAt: "desc" },
  });
  const superseded = await prisma.memory.findMany({
    where: { status: "superseded" },
  });

  console.log(`Active memories: ${memories.length}`);
  console.log(`Superseded memories: ${superseded.length}`);
  console.log(`Total contradictions resolved: ${superseded.length}`);

  const queries = [
    { query: "What's my name?", expected: "Bhavsagar" },
    { query: "Where do I live?", expected: "Mumbai" },
    { query: "What's my job?", expected: "Senior Engineer" },
    { query: "What did I say I like to do now?", expected: "swimming" },
  ];

  let recallPassed = 0;
  for (const { query, expected } of queries) {
    const response = await chat(query);
    if (response.toLowerCase().includes(expected.toLowerCase())) {
      recallPassed++;
    }
  }

  console.log(`\nRecall accuracy: ${recallPassed}/${queries.length} passed`);
  assertEval(
    recallPassed === queries.length,
    `Recall accuracy failed: ${recallPassed}/${queries.length} passed`,
  );

  const hikingMemory = findMemory(allMemories, "activity_preference", "hiking");
  const swimmingMemory = findMemory(
    allMemories,
    "activity_preference",
    "swimming",
  );

  console.log("\nPreference Contradiction Check:");
  if (!swimmingMemory || swimmingMemory.status !== "active") {
    console.log("  ❌ Swimming not found or not active");
    throw new Error("Preference contradiction failed: swimming is not active");
  }

  console.log("  ✅ Swimming is active (correct)");

  if (!hikingMemory || hikingMemory.status !== "superseded") {
    console.log("  ❌ Hiking was not superseded");
    throw new Error("Preference contradiction failed: hiking is still active");
  }

  console.log("  ✅ Hiking is superseded (correct)");

  console.log(
    `\nContradiction handling: ${superseded.length} memories superseded`,
  );
  console.log(
    `Memory persistence: ${memories.length > 0 ? "✅ Active" : "❌ Failed"}`,
  );
}

async function testPersonaConsistencyLong(): Promise<void> {
  console.log("\n📝 TEST 6: Persona Consistency (50+ turns)\n");
  console.log("Establishing Alex's personality...");
  const personaEstablishment = [
    "What kind of conversations do you enjoy?",
    "Tell me about yourself.",
    "What do you like to talk about?",
  ];

  for (const msg of personaEstablishment) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  console.log("Running 47 filler turns...");
  const fillerMessages = [
    "Tell me a joke",
    "What's the weather like?",
    "I'm feeling tired today",
    "Tell me something interesting",
    "What do you think about life?",
  ];

  for (let i = 0; i < 47; i++) {
    const filler = fillerMessages[i % fillerMessages.length];
    await chat(filler);
  }

  console.log("\n--- Persona Consistency Check (Turn 51-53) ---");
  const testMessages = [
    "What's your favorite kind of conversation?",
    "Do you like talking about celebrity gossip?",
    "What do you enjoy discussing?",
  ];

  const responses: string[] = [];

  for (const msg of testMessages) {
    console.log(`\n👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}`);
    responses.push(response);
    console.log("---");
  }

  const allResponses = responses.join(" ").toLowerCase();
  assertEval(
    allResponses.includes("music") || allResponses.includes("book"),
    "Persona drifted: Alex stopped mentioning music or books",
  );
  assertEval(
    !allResponses.includes("i am an ai assistant") &&
      !allResponses.includes("how can i help you"),
    "Persona flattened to generic assistant voice",
  );
}

async function testRestart(): Promise<void> {
  console.log("\n📝 TEST 7: Process Restart Persistence\n");

  const beforeMemories = await listActiveMemories();
  console.log(
    "Memories before restart:",
    beforeMemories.map((m) => `${m.predicate}: ${m.value}`),
  );

  console.log("\n🔄 Simulating process restart (fresh Node process)...");

  const childProgram = `
    import { PrismaClient } from "@prisma/client";
    const prisma = new PrismaClient();
    try {
      const memories = await prisma.memory.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
      });
      process.stdout.write(JSON.stringify(memories));
    } finally {
      await prisma.$disconnect();
    }
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", childProgram],
    { env: process.env },
  );
  const afterMemories: Memory[] = JSON.parse(stdout) as Memory[];
  console.log(
    "\nMemories after restart:",
    afterMemories.map((m) => `${m.predicate}: ${m.value}`),
  );

  assertEval(
    afterMemories.length === beforeMemories.length,
    `Memory count mismatch: ${beforeMemories.length} → ${afterMemories.length}`,
  );

  const beforeValues = beforeMemories
    .map((memory) => `${memory.predicate}:${memory.value}`)
    .sort();
  const afterValues = afterMemories
    .map((memory) => `${memory.predicate}:${memory.value}`)
    .sort();

  assertEval(
    beforeValues.every((value, index) => value === afterValues[index]),
    "Memory content changed after restart",
  );

  console.log("\n✅ Memory persistence verified!");
}

async function testDeepMemory(): Promise<void> {
  console.log("🧠 DEEP MEMORY TEST\n");
  console.log("=".repeat(50) + "\n");

  await clearMemories();
  await seedInitialMemories();
  await showMemories("Initial Memories");

  console.log("📝 TEST 1: Basic Recall\n");

  const test1Messages = [
    "What's my name?",
    "Where do I live?",
    "What's my job?",
    "What do I like to do?",
  ];

  for (const msg of test1Messages) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  await showMemories("After Test 1");

  console.log("📝 TEST 2: Contradiction Handling\n");

  const test2Messages = [
    "I actually got promoted to Senior Engineer now!",
    "I moved to Mumbai last week",
    "I'm in a relationship now",
    "I don't really like hiking anymore, I prefer swimming",
  ];

  for (const msg of test2Messages) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  await showMemories("After Test 2 (Contradictions)");

  console.log("📝 TEST 3: Long-Range Recall\n");

  const test3Messages = [
    "Tell me a joke",
    "What's the weather like?",
    "I'm feeling tired today",
    "Do you remember my name?",
    "Where do I work now?",
    "What city do I live in?",
    "What did I say I like to do now?",
  ];

  for (const msg of test3Messages) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  await showMemories("After Test 3 (Long-Range Recall)");

  console.log("📝 TEST 4: Cross-Topic Retrieval\n");

  const test4Messages = [
    "I'm planning a trip",
    "What should I pack?",
    "I'm stressed about work",
    "Can you give me some advice?",
  ];

  for (const msg of test4Messages) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  console.log("📝 TEST 5: Persona Consistency\n");
  console.log("Checking if Alex sounds like a generic assistant...\n");

  const personaCheckMessages = [
    "Tell me something interesting",
    "What do you think about life?",
    "How do you feel about AI?",
    "What's your favorite thing to talk about?",
  ];

  for (const msg of personaCheckMessages) {
    console.log(`👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}\n`);
  }

  await testPersonaConsistencyLong();

  await testRestart();

  console.log("=".repeat(50));
  console.log("\n📊 FINAL MEMORY SUMMARY\n");

  const finalMemories = await listActiveMemories();
  console.log(`Active memories: ${finalMemories.length}`);
  for (const m of finalMemories) {
    const superseded = m.supersededBy ? " (superseded others)" : "";
    console.log(`   - ${m.predicate}: ${m.value}${superseded}`);
  }

  await generateMetrics();

  console.log("\n✅ Deep memory test complete!");
}

testDeepMemory().catch((error) => {
  console.error(error);
  process.exit(1);
});
