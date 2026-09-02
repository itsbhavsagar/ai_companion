import "dotenv/config";
import { chat } from "./chat/chat.service.js";
import { listActiveMemories } from "./memory/memory.service.js";

async function testChat(): Promise<void> {
  console.log("\n--- Phase 5: Chat Service ---");

  const memories = await listActiveMemories();
  console.log(
    "Current memories:",
    memories.map((memory) => `${memory.predicate}: ${memory.value}`),
  );
  console.log();

  const messages: string[] = [
    "I just got promoted to Senior Engineer!",
    "I'm really excited about it, but also nervous.",
    "Do you remember what I do for work?",
  ];

  for (const userMessage of messages) {
    console.log(`\n👤 User: ${userMessage}`);
    const response: string = await chat(userMessage);
    console.log(`🤖 Alex: ${response}`);
  }

  console.log("\n--- Updated Memories ---");
  const updatedMemories = await listActiveMemories();
  console.log(
    updatedMemories.map((memory) => `${memory.predicate}: ${memory.value}`),
  );
}

async function main(): Promise<void> {
  const existing = await listActiveMemories();
  if (existing.length === 0) {
    console.log(
      "No memories found. Please run Phase 3 first to seed memories.",
    );
    return;
  }

  await testChat();
}

async function testContradiction(): Promise<void> {
  console.log("\n--- Phase 6: Contradiction Test ---");

  const userMessage = "I'm a Senior Engineer now, actually";
  console.log(`👤 User: ${userMessage}`);

  const response: string = await chat(userMessage);
  console.log(`🤖 Alex: ${response}`);

  const memories = await listActiveMemories();
  console.log(
    "\nUpdated memories:",
    memories.map((memory) => `${memory.predicate}: ${memory.value}`),
  );
}

async function testPersona(): Promise<void> {
  console.log("\n--- Phase 7: Persona Consistency Test ---");

  const conversation: string[] = [
    "Tell me a joke",
    "What's the weather like?",
    "I'm feeling a bit down today",
    "What do you think about AI?",
  ];

  for (const message of conversation) {
    console.log(`\n👤 User: ${message}`);
    const response: string = await chat(message);
    console.log(`🤖 Alex: ${response}`);
    console.log("---");
  }
}

main().catch((error: unknown) => {
  console.error(error);
});
