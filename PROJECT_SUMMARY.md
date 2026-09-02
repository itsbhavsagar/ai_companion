# AI Companion Memory System — Project Summary

## Overview

A CLI-based AI companion with persistent memory — not a chatbot with context window, but a real memory architecture with extraction, retrieval, contradiction handling, and persona consistency.

Built for the OnceMore Founding Engineer assessment.

---

## What The PRD Asked

The assignment asked for:

1. CLI/minimal chat loop
2. Persist across sessions
3. Extract and store memory
4. Retrieve relevantly
5. Update and decay (contradiction handling)
6. Stay in character (50+ turns)
7. Optional evaluation harness

---

## What I Built (Beyond The PRD)

| Feature                     | What I Built                                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| **Memory Model**            | Structured triples (subject, predicate, value) with status tracking         |
| **Contradiction Handling**  | Supersession with transactions — old facts marked `superseded`, not deleted |
| **Retrieval**               | Relevance + importance + recency scoring — not dumping everything           |
| **Persona**                 | Hard eval assertions — 50+ turn consistency test                            |
| **Query Understanding**     | LLM-based routing — natural language questions understood                   |
| **Direct Lookup**           | Factual questions answered from memory — no hallucinations                  |
| **Location Types**          | `current_location`, `planned_location`, `past_location` — coexist           |
| **Plan Types**              | `career_plan`, `moving_plan`, `plan` — coexist                              |
| **Evaluation**              | 7-test harness with `assertEval()` — fails loudly                           |
| **Defensive JSON parsing**  | Handles fenced `json` from LLM                                              |
| **Groq retry budget**       | Handles rate limits gracefully                                              |
| **Response length control** | Natural, complete responses                                                 |
| **Rate limit handling**     | Retry logic + reduced test calls                                            |

---

## Decisions-Level

| Decision                         | Why                                               |
| -------------------------------- | ------------------------------------------------- |
| **Structured triples**           | Makes contradiction handling explicit             |
| **Predicate canonicalization**   | `likes` → `activity_preference` — handles aliases |
| **Separate location types**      | Current, planned, and past locations coexist      |
| **Separate plan types**          | Career, moving, and generic plans coexist         |
| **Direct memory lookup first**   | Factual questions never hallucinate               |
| **LLM for general conversation** | Warmth and personality, not facts                 |
| **Prisma transactions**          | Atomic updates — no partial state                 |
| **Hard eval failures**           | Tests fail loudly, not silently                   |
| **Real restart test**            | Fresh Node process proves persistence             |

---

## Architecture

```

User message
↓
Retrieve memories (relevance + importance + recency)
↓
Direct memory lookup? (name, job, location, plan)
↓
YES → Answer from memory (no LLM call, no hallucination)
↓
NO → Route query (LLM-based routing)
↓
├── Router identifies predicate (name, job, location, plan)
├── Answer from memory
└── OR → General conversation (LLM call)
↓
Extract and store new memories (Zod validation + canonicalization)
↓
Resolve contradictions (transactions + supersession)
↓
Respond

```

---

## Test Results

| Test                            | Result  |
| ------------------------------- | ------- |
| Basic Recall                    | ✅ Pass |
| Contradiction (Job)             | ✅ Pass |
| Contradiction (Location)        | ✅ Pass |
| Contradiction (Relationship)    | ✅ Pass |
| Contradiction (Preference)      | ✅ Pass |
| Long-Range Recall (7+ turns)    | ✅ Pass |
| Persona Consistency (50+ turns) | ✅ Pass |
| Process Restart                 | ✅ Pass |
| Recall Accuracy                 | 4/4 ✅  |

---

## What I'd Improve Next

- Embeddings for semantic retrieval
- Multi-user support
- Web/API layer
- Real-time sync

---

## Final Thought

The assignment asked for a memory system. I built a memory system that doesn't hallucinate, handles contradictions properly, and stays in character — exactly what Replika and Ira fail at.
