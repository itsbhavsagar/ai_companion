# AI Companion Memory System

A CLI-based AI companion that actually remembers what you tell it.

---

## What This Is

Most AI companions forget after a few turns. They contradict themselves. They dump everything into context. They sound like a generic assistant when you push them.

This one doesn't.

It remembers across sessions, retrieves only what's relevant, handles contradictions, and stays in character. It's not a finished product — it's a working prototype that proves the core loop.

---

## How It Works

```

You type something
↓
Alex finds relevant memories
↓
Alex responds (with context)
↓
New facts get extracted and saved
↓
Contradictions get handled

```

That's it. No magic. Just a clean loop.

---

## Quick Start

```bash
git clone https://github.com/itsbhavsagar/ai-companion-memory.git
cd ai-companion-memory
npm install
cp .env.example .env
# Add GROQ_API_KEY to .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Then talk to Alex in the terminal.

---

## Tech Stack

- Node.js + TypeScript
- SQLite + Prisma
- Groq API
- Zod for validation

---

## What Works

| Test                                         | Status |
| -------------------------------------------- | ------ |
| Basic recall                                 | ✅     |
| Contradictions (job, location, relationship, preference) | ✅     |
| Long-range recall (7+ turns)                 | ✅     |
| Persona consistency (50+ turns)              | ✅     |
| Process restart                              | ✅     |

---

## What Doesn't

- Semantic search (keyword matching only)
- Automatic memory decay (just recency weighting)
- Multi-user support (out of scope)

---

## What I'd Improve

- Embeddings for better retrieval
- Expiration for temporary memories
- Broader semantic contradiction detection and cardinality rules

---

## Files That Matter

- `src/chat/chat.service.ts` — the main loop
- `src/memory/memory.resolver.ts` — contradiction handling
- `src/test-deep.ts` — evaluation suite
- `ARCHITECTURE.md` — deeper design decisions
- `DEBUG.md` — stuff I broke and fixed

---

## Bottom Line

This is a prototype. It proves the memory loop works. If this were going to 1M users, I'd add Postgres with pgvector, user isolation, and a proper API layer. But the assignment asked for the core memory architecture, and that's what's here.
