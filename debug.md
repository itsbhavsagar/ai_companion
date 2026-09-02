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

**Initial Fix:** Canonicalized all activity preferences to `activity_preference` in the extraction prompt.

**Second Discovery:** The eval still exposed an active `likes: hiking` memory after the user said they preferred swimming. Prompt-level canonicalization was not enough because seeded or legacy memories could still enter storage with alias predicates.

**Final Fix:** Moved predicate canonicalization into the domain layer, normalized predicates before storage, normalized LLM-extracted memories after validation, and made the resolver search equivalent predicate aliases. The eval now treats preference contradiction as a hard failure instead of a warning.

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

## 8. Eval Should Fail Loudly

**Discovery:** The deep eval printed `Hiking still active (needs canonicalization)` but still ended with `Deep memory test complete`. That made the run look healthier than it really was.

**Fix:** Added hard assertions for recall accuracy and preference contradiction. If the system keeps `hiking` active after the user switches to `swimming`, the eval throws instead of quietly passing.

**Lesson:** A demo script is useful, but a serious eval needs failure conditions. If a core behavior breaks, the script should make that impossible to miss.

---

## 9. LLM Output Is Not Automatically JSON

**Discovery:** The promotion test failed because the extractor expected raw JSON, but the model returned fenced markdown like ````json`. `JSON.parse` rejected it, so `job_title` stayed `Software Engineer` instead of updating to `Senior Engineer`.

**Fix:** Enabled Groq JSON mode for extraction, tightened the prompt to request only JSON, and added a defensive parser that can recover a JSON object from fenced output if the model still wraps it.

**Lesson:** Asking for JSON is not the same as enforcing JSON. Provider-level JSON mode plus validation is the right baseline, and local parsing should still be defensive.

---

## 10. Rate Limits During Eval

**Discovery:** The 50+ turn persona eval can hit Groq's token-per-minute limit during repeated extraction calls.

**Fix:** Increased the Groq client's retry budget so short-lived 429s are retried instead of immediately leaking into the eval output.

**Lesson:** Live LLM evals are useful demos, but deterministic CI should mock model calls or use a paid/local model path.

---

## What I'd Do Differently

- Canonicalize predicates at the domain boundary from the start.
- Add the restart test earlier — it's a small change with high impact on the narrative.
- Build the persona test earlier — the 50+ turn requirement was obvious in the spec.

---

## What I'm Proud Of

- The resolver handles exact contradictions and common predicate aliases cleanly.
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
