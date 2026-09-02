import "dotenv/config";
import readline from "node:readline";
import { chat } from "./chat/chat.service.js";
import { listActiveMemories } from "./memory/memory.service.js";

async function showMemories(): Promise<void> {
  const memories = await listActiveMemories();

  if (memories.length === 0) {
    console.log("\nNo memories yet. Start chatting with Alex!\n");
    return;
  }

  console.log("\nAlex remembers:");
  for (const memory of memories) {
    console.log(`  - ${memory.predicate}: ${memory.value}`);
  }
  console.log();
}

async function startCli(): Promise<void> {
  console.log("\nAI Companion Memory System\n");
  console.log("Commands: memories, exit\n");

  await showMemories();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Alex: Hi! I'm your AI companion. What's on your mind?\n");

  rl.on("line", async (input: string) => {
    const message = input.trim();

    if (!message) {
      return;
    }

    if (message.toLowerCase() === "exit") {
      console.log("Alex: Goodbye! See you next time.");
      rl.close();
      return;
    }

    if (message.toLowerCase() === "memories") {
      await showMemories();
      return;
    }

    try {
      const response = await chat(message);
      console.log(`Alex: ${response}\n`);
    } catch (error: unknown) {
      console.error("Alex could not respond:", error);
    }
  });
}

startCli().catch((error: unknown) => {
  console.error("Failed to start CLI:", error);
  process.exitCode = 1;
});
