# AI Companion Memory System

A CLI-based AI companion with persistent memory — not a chatbot with context window, but a real memory architecture with extraction, retrieval, contradiction handling, and persona consistency.

## Features

- **Persistent Memory** — Facts survive process restarts (SQLite)
- **Memory Extraction** — LLM extracts memory-worthy facts from conversations
- **Relevant Retrieval** — Retrieves only relevant memories (not everything)
- **Contradiction Handling** — Old facts superseded when new information arrives
- **Persona Consistency** — Companion stays warm and consistent over 50+ turns
- **CLI Chat Loop** — Simple command-line interface
- **Evaluation Harness** — Deep test suite for recall, contradictions, persona, and restart

## Tech Stack

| Layer       | Technology                  |
| ----------- | --------------------------- |
| Runtime     | Node.js                     |
| Language    | TypeScript                  |
| LLM         | Groq (`openai/gpt-oss-20b`) |
| Database    | SQLite + Prisma             |
| Validation  | Zod                         |
| Persistence | Prisma ORM                  |

## Quick Start

### Prerequisites

- Node.js 20+
- Groq API key ([console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone and install
git clone https://github.com/itsbhavsagar/ai-companion-memory.git
cd ai-companion-memory
npm install

# Set up environment
cp .env.example .env
# Add GROQ_API_KEY to .env

# Set up database
npx prisma generate
npx prisma migrate dev --name init
```
