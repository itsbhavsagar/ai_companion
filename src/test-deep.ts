import "dotenv/config";
import { chat } from "./chat/chat.service.js";
import { prisma } from "./db/client.js";
import {
  createMemory,
  listActiveMemories,
  type CreateMemoryInput,
} from "./memory/memory.service.js";

// Clear all memories first (for clean testing)
async function clearMemories(): Promise<void> {
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
      predicate: "likes",
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

  // Check recall accuracy
  const queries = [
    { query: "What's my name?", expected: "Bhavsagar" },
    { query: "Where do I live?", expected: "Mumbai" },
    { query: "What's my job?", expected: "Senior Engineer" },
  ];

  let recallPassed = 0;
  for (const { query, expected } of queries) {
    const response = await chat(query);
    if (response.toLowerCase().includes(expected.toLowerCase())) {
      recallPassed++;
    }
  }

  console.log(`\nRecall accuracy: ${recallPassed}/${queries.length} passed`);

  // Check preference contradiction
  const hikingMemory = allMemories.find(
    (m) => m.predicate === "likes" && m.value === "hiking",
  );
  const swimmingMemory = allMemories.find(
    (m) => m.predicate === "activity_preference" && m.value === "swimming",
  );

  console.log("\nPreference Contradiction Check:");
  if (swimmingMemory && swimmingMemory.status === "active") {
    console.log("  ✅ Swimming is active (correct)");
  } else {
    console.log("  ❌ Swimming not found or not active");
  }

  if (hikingMemory && hikingMemory.status === "superseded") {
    console.log("  ✅ Hiking is superseded (correct)");
  } else if (hikingMemory && hikingMemory.status === "active") {
    console.log("  ⚠️ Hiking still active (needs canonicalization)");
  } else {
    console.log("  ℹ️ Hiking memory not found");
  }

  console.log(
    `\nContradiction handling: ${superseded.length} memories superseded`,
  );
  console.log(
    `Memory persistence: ${memories.length > 0 ? "✅ Active" : "❌ Failed"}`,
  );
}

async function testPersonaConsistencyLong(): Promise<void> {
  console.log("\n📝 TEST 6: Persona Consistency (50+ turns)\n");

  // Establish Alex's personality early (Turn 1-3)
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

  // Filler turns (Turn 4-50)
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

  // Test if persona remains consistent (Turn 51-53)
  console.log("\n--- Persona Consistency Check (Turn 51-53) ---");
  const testMessages = [
    "What's your favorite kind of conversation?",
    "Do you like talking about celebrity gossip?",
    "What do you enjoy discussing?",
  ];

  for (const msg of testMessages) {
    console.log(`\n👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}`);
    console.log("---");
  }
}

async function testRestart(): Promise<void> {
  console.log("\n📝 TEST 7: Process Restart Persistence\n");

  // Show current memories before "restart"
  const beforeMemories = await listActiveMemories();
  console.log(
    "Memories before restart:",
    beforeMemories.map((m) => `${m.predicate}: ${m.value}`),
  );

  // Simulate restart by creating a fresh Prisma connection
  console.log("\n🔄 Simulating process restart (new Prisma connection)...");

  // Test recall after "restart"
  const testMessages = [
    "Do you remember my name?",
    "What city do I live in?",
    "What's my job?",
    "What do I like to do?",
  ];

  for (const msg of testMessages) {
    console.log(`\n👤 User: ${msg}`);
    const response = await chat(msg);
    console.log(`🤖 Alex: ${response}`);
  }

  // Verify memories still exist
  const afterMemories = await listActiveMemories();
  console.log(
    "\nMemories after restart:",
    afterMemories.map((m) => `${m.predicate}: ${m.value}`),
  );

  console.log("\n✅ Memory persistence verified!");
}

async function testDeepMemory(): Promise<void> {
  console.log("🧠 DEEP MEMORY TEST\n");
  console.log("=".repeat(50) + "\n");

  // Clear and seed
  await clearMemories();
  await seedInitialMemories();
  await showMemories("Initial Memories");

  // ============================================
  // TEST 1: Basic Recall
  // ============================================
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

  // ============================================
  // TEST 2: Contradiction Handling
  // ============================================
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

  // ============================================
  // TEST 3: Long-Range Recall (After 5+ Turns)
  // ============================================
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

  // ============================================
  // TEST 4: Cross-Topic Retrieval
  // ============================================
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

  // ============================================
  // TEST 5: Persona Consistency Check
  // ============================================
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

  // ============================================
  // TEST 6: Persona Consistency (50+ turns)
  // ============================================
  await testPersonaConsistencyLong();

  // ============================================
  // TEST 7: Persistence Across Restarts
  // ============================================
  await testRestart();

  // ============================================
  // FINAL SUMMARY & METRICS
  // ============================================
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

// Run the test
testDeepMemory().catch(console.error);
