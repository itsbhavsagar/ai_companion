# Architecture

This project is a focused prototype of an AI companion memory system. The goal is not to build a production social app. The goal is to prove the core loop: remember facts, retrieve the right ones, update stale ones, and keep a stable companion persona over long conversations.

The assignment explicitly scoped out UI polish, auth, billing, multi-user support, and production-scale infrastructure. Those are real product concerns, but this repo concentrates on the memory architecture.

## What This Architecture Is Not

- Not a production-scale system
- Not a multi-user app
- Not a semantic search engine
- Not a finished product

It's a working prototype of the memory loop. That's it.

## System Shape

```text
User message
  -> Chat service
  -> Memory retriever
  -> Persona + memory-aware system prompt
  -> LLM response
  -> Memory extractor
  -> Zod validation
  -> Memory service
  -> Contradiction resolver
  -> SQLite persistence
```

The system has two loops per user turn:

1. Response loop: retrieve relevant stored memories before generating the companion response.
2. Memory loop: extract memory-worthy facts from the new user message and update storage afterward.

## Module Boundaries

```text
src/
|-- ai/
|   `-- groq.ts
|-- chat/
|   `-- chat.service.ts
|-- config/
|   `-- models.ts
|-- db/
|   `-- client.ts
|-- domain/
|   `-- memory.ts
|-- memory/
|   |-- memory.extractor.ts
|   |-- memory.resolver.ts
|   |-- memory.retriever.ts
|   `-- memory.service.ts
|-- persona/
|   `-- companion.ts
|-- main.ts
`-- test-deep.ts
```

## Responsibilities

### `src/chat/chat.service.ts`

The orchestration layer. It retrieves memories, builds the system prompt, calls the chat model, extracts new memories, stores them, and resolves contradictions.

The user message is kept in the user role. It is not embedded into the system prompt. Retrieved memories are included as context, with an explicit instruction that they are user-provided data, not instructions.

### `src/memory/memory.retriever.ts`

Ranks active memories using three signals:

- Keyword relevance between the user message and memory text
- Memory importance from `1` to `10`
- Recency decay with a 30-day half-life

The result is a small top-N memory set for the prompt instead of dumping the entire memory store into context.

### `src/memory/memory.extractor.ts`

Uses the LLM to turn natural language into structured memory candidates. The extractor asks for JSON and validates the result against the central Zod schema before anything is stored.

Invalid or malformed extraction output is ignored instead of poisoning the memory store.

### `src/memory/memory.resolver.ts`

Handles contradictions by finding active memories with the same `subject + canonical predicate`. When the new value differs, the old memory is marked `superseded` and points at the new memory through `supersededBy`.

This keeps history instead of destructively overwriting old facts.

### `src/memory/memory.service.ts`

Thin persistence layer around Prisma memory operations. It owns memory creation, lookup, listing, updates, and supersession writes.

### `src/domain/memory.ts`

Single source of truth for memory categories, memory types, Zod validation, and TypeScript types.

### `src/persona/companion.ts`

Defines Alex, the companion persona. The persona is intentionally small and stable so it can survive repeated prompt construction without drifting into a generic assistant voice.

### `src/test-deep.ts`

Evaluation harness that seeds memory, runs recall and contradiction scenarios, tests long-range recall, exercises persona consistency over 50+ turns, and checks persistence after restart.

This script is destructive by design and should be run against an isolated local database.

## Data Model

The core unit is a structured memory triple:

```text
subject   -> who the memory is about
predicate -> what kind of fact it is
value     -> the remembered value
```

Example:

```json
{
  "subject": "user",
  "predicate": "job_title",
  "value": "Senior Engineer",
  "category": "work",
  "importance": 8,
  "memoryType": "stable"
}
```

The Prisma `Memory` model also stores status, supersession links, timestamps, and a future-facing `embedding` field.

## Retrieval Pipeline

```text
Input message
  -> load active memories
  -> tokenize query
  -> score keyword overlap
  -> apply importance weight
  -> apply recency weight
  -> sort by score
  -> return top memories
```

Scoring formula:

```text
score =
  relevance * 0.5
  + normalizedImportance * 0.3
  + recencyScore * 0.2
```

This is simple, inspectable, and enough for the assessment scope. It is not semantic retrieval.

## Update Pipeline

```text
User message
  -> LLM extraction
  -> JSON parse
  -> Zod validation
  -> predicate canonicalization
  -> create active memory
  -> find active memories with same subject + canonical predicate
  -> supersede older conflicting values
```

The resolver favors historical traceability. Superseded memories remain in the database, which makes debugging and evaluation easier.

## Prompting Strategy

The chat prompt has three parts:

- Persona definition
- Memory usage rules
- Retrieved memory context

The current user message is sent only as a user-role message. This keeps the system prompt more stable and reduces the chance that user text gets promoted into privileged instruction space.

Retrieved memories are still untrusted user data. The prompt explicitly tells the model to treat memory values as context, not instructions.

## Evaluation Strategy

The deep evaluation script covers:

- Basic recall
- Job contradiction
- Location contradiction
- Relationship contradiction
- Preference contradiction
- Long-range recall after unrelated turns
- Persona consistency over 50+ turns
- Process restart persistence

The current evaluation is intentionally lightweight and demo-friendly. It proves behavior through scripted scenarios and printed metrics, not through a full CI-grade assertion suite.

## Known Limitations

### Semantic Contradiction Detection

The system canonicalizes common predicate aliases like `likes`, `prefers`, `hobby`, and `interest` into `activity_preference`.

Deeper semantic contradiction detection is still future work. The resolver handles known predicate families, but it does not yet reason about every possible natural-language paraphrase or temporal nuance.

### Retrieval

Retrieval is keyword-based, not semantic. It does not use embeddings, vector search, reranking, or query classification.

### Decay

Recency affects retrieval score, but temporary memories are not automatically expired or deleted.

### Single User

The system assumes one local user. Multi-user isolation, auth, and tenant-scoped memory were out of scope for the assignment.

### Testing

The evaluation harness calls the live LLM and mutates the local database. A production-quality test setup would mock LLM calls and use an isolated test database with assertions.

## Why This Architecture

Structured memories were chosen over pure embeddings because contradiction handling needs explicit facts. Embeddings are useful for recall, but they make updates and supersession fuzzy.

The next version should be hybrid:

```text
structured facts for correctness
+ embeddings for semantic recall
+ evaluator tests for behavioral confidence
```

That keeps memory inspectable while making retrieval smarter.

## Next Improvements

- Add embeddings for semantic retrieval
- Expand predicate cardinality and temporal rules
- Add automatic expiration for temporary memories
- Add transaction boundaries around memory creation and supersession
- Add user-scoped memory for multi-user support
- Add provider-level structured outputs for extraction
- Convert `src/test-deep.ts` into assertion-based tests

## Summary

The architecture is intentionally small, but it has the right spine: extraction, validation, retrieval, contradiction handling, persistence, and evaluation. It is a prototype, not a product shell. The memory loop is the product.
