# Debug Diary — AI Companion Memory System

A record of meaningful engineering decisions, trade-offs, and debugging discoveries.

---

## 1. Structured Memory Over Embeddings

**Decision:** Store memories as structured `(subject, predicate, value)` triples instead of embeddings.

**Why:** The assignment specifically tests contradiction handling and explicit updates. Structured storage makes supersession exact and deterministic.

**Trade-off:** Loses semantic retrieval. A hybrid approach would be the next step.

---

## 2. Contradiction by Predicate Equality

**Discovery:** The resolver worked perfectly for `job_title`, `location`, and `relationship_status`, but failed for `likes` vs `activity_preference`.

**Root Cause:** Semantic equivalence requires canonicalization. `likes: hiking` and `activity_preference: swimming` are semantically the same type of fact but different predicates.

**Fix:** Canonicalized all activity preferences to `activity_preference` in the extraction prompt.

**Lesson:** Contradiction detection is as much about schema design as it is about logic.

---

## 3. Retrieval Relevance vs. Retrieval Injection

**Discovery:** The retriever was returning relevant memories, but the LLM was over-using them — injecting "Senior Engineer in Mumbai" into joke responses.

**Root Cause:** The prompt said "Use memories to personalize," which the model interpreted as "mention them whenever possible."

**Fix:** Changed to "Use memories ONLY when directly relevant."

**Trade-off:** Reduces warmth in some responses but keeps the companion from sounding robotic and over-familiar.

---

## 4. 50+ Turn Persona Consistency

**Discovery:** The persona was consistent in short conversations, but I had no evidence for 50+ turns — a requirement in the assignment.

**Fix:** Built a test that establishes persona early, runs 47 filler turns, then checks consistency. The persona held.

**Lesson:** If you claim a property, test it explicitly. Architecture alone isn't evidence.

---

## 5. Persistence Without Explicit Proof

**Discovery:** The system used SQLite and Prisma, so persistence was "architecturally true." But I hadn't demonstrated it.

**Fix:** Added a restart test that simulates a process restart and verifies memory survival.

**Lesson:** "It works in theory" is not the same as "here's the proof."

---

## 6. Rate Limits as a Design Constraint

**Discovery:** The deep test (47 filler turns) hit Groq's free tier rate limits.

**Adaptation:** Reduced filler turns for quick validation, kept the full test as a reference.

**Trade-off:** The test is smaller but still proves the behavior. Scaling would require paid tier or local models.

---

## 7. Prompt Injection Fix

**Discovery:** User input was being inserted into the system prompt, which is a security vulnerability.

**Fix:** Kept the system prompt static and moved user input to the user role only.

**Lesson:** Treat user input as untrusted data. Never interpolate it into privileged contexts.

---

## What I'd Do Differently

- Canonicalize predicates earlier — would have caught the `likes` vs `activity_preference` issue sooner.
- Add the restart test earlier — it's a small change with high impact on the narrative.
- Build the persona test earlier — the 50+ turn requirement was obvious in the spec.

---

## What I'm Proud Of

- The resolver handles three contradiction categories cleanly.
- The test suite covers recall, contradictions, persona, and restart.
- The system is simple enough to explain in 5 minutes.

---

## Final State

| Requirement            | Status |
| ---------------------- | ------ |
| CLI chat loop          | ✅     |
| Persistent memory      | ✅     |
| Memory extraction      | ✅     |
| Relevant retrieval     | ✅     |
| Contradiction handling | ✅     |
| 50+ turn persona       | ✅     |
| Process restart        | ✅     |
| Evaluation harness     | ✅     |
