Here's your **DEBUG.md** file — a complete record of every issue you faced, how you debugged it, and what you learned. This is gold for your walkthrough video.

---

## 📄 `DEBUG.md`

# Debug Diary — AI Companion Memory System

This documents every real issue I encountered while building the assignment, how I debugged it, and what I learned. Nothing is sanitized — this is the actual journey.

---

## Issue 1: Groq API Key Not Loading

**Symptom:**

```
GroqError: The GROQ_API_KEY environment variable is missing or empty
```

**What I tried:**

- Added `GROQ_API_KEY` to `.env`
- Tried `npm run dev` — same error

**Root Cause:**
`tsx` doesn't automatically load `.env` files. The Groq client was trying to read `process.env.GROQ_API_KEY` but it wasn't being loaded.

**Fix:**
Added `import "dotenv/config"` to the top of `main.ts`.

**Lesson:**
Always verify environment variables are actually loaded, not just set. `tsx` needs explicit dotenv import.

---

## Issue 2: Decommissioned Models

**Symptom:**

```
The model `mixtral-8x7b-32768` has been decommissioned and is no longer supported.
```

**What I tried:**

- Switched to `llama3-70b-8192` → same error
- Switched to `llama-3.1-8b-instant` → `model_not_found`

**Root Cause:**
Groq decommissioned older models. The API was rejecting them.

**Fix:**
Switched to `openai/gpt-oss-20b` which was available and worked.

**Lesson:**
Always check model availability. Groq's deprecation policy is aggressive — test with a known-working model first.

---

## Issue 3: JSON Mode Failed on Empty Arrays

**Symptom:**

```
Failed to generate JSON. Please adjust your prompt.
failed_generation: '[]'
```

**What I tried:**

- Changed prompt to return `{"memories": []}` instead of `[]`
- Removed `response_format: { type: "json_object" }`

**Root Cause:**
The `json_object` response format requires a valid JSON object as the root. `[]` is a valid JSON array, but not a valid JSON object.

**Fix:**
Changed the extraction prompt to always return `{"memories": [...]}`. Removed the strict `json_object` requirement and parsed manually.

**Lesson:**
When using structured output, make sure your expected format matches the provider's constraints. Array responses need a wrapper object.

---

## Issue 4: AI Was Blind to Some Emails

**Symptom:**
The assistant couldn't see email bodies for some messages. It would say "I don't have details" even though the email was right there.

**Root Cause:**
Some emails are HTML-only with no `text/plain` part. The context builder was reading `bodyText` which was empty.

**Fix:**
Added an `htmlToPlainText` fallback — strip script/style tags, preserve block-level line breaks, decode entities — when `bodyText` is empty.

**Lesson:**
When an LLM behaves "dumb," audit its input first. The model answered perfectly given what it saw.

---

## Issue 5: Realtime Dead in Production

**Symptom:**
Deployed to Render. Emails arrived in Gmail, but the app only updated on refresh. No errors visible.

**Investigation:**

- Proved SSE transport was healthy by fetching `/api/gmail/stream` raw from console
- Pinned the break upstream: if SSE is healthy, the problem is watch registration, Pub/Sub delivery, or webhook auth

**Root Cause:**
Two issues:

1. Two missing env vars (`GMAIL_PUSH_AUDIENCE`, `GMAIL_PUSH_SA_EMAIL`) — webhook was rejecting every push with a 401
2. The Pub/Sub subscription was created as **Pull** not **Push** — Google was never calling my endpoint at all

**Fix:**

- Added missing env vars
- Recreated the subscription as an authenticated **Push** subscription with OIDC auth
- Granted Pub/Sub service agent token-creator on the service account

**Lesson:**
Don't stop at the first root cause. Prove each hop. Provider consoles and delivery metrics are ground truth the browser can never give you. Missing env vars should fail loudly.

---

## Issue 6: Docker Build Demanded Production Secrets

**Symptom:**
`docker build` failed during `next build`: "NEXTAUTH_SECRET is not configured." A build should never need runtime secrets.

**Root Cause:**
Next.js prerenders pages during build. Those pages import the auth config. A module-scope `if (!secret) throw` was executing at build time.

**Fix:**
Moved the secret check to request time (`secret: process.env.NEXTAUTH_SECRET` inside the config object consumed per-request).

**Lesson:**
In Next.js, know exactly what executes at build time. "Builds without secrets" is a testable property.

---

## Issue 7: Prisma Engine Wouldn't Load in Docker Container

**Symptom:**
Works on macOS. In the Debian container, Prisma can't find/load its query engine.

**Root Cause:**
Prisma's query engine is a native binary per OS/libc. Generated on darwin-arm64, deployed to debian/glibc — no matching engine.

**Fix:**

```prisma
binaryTargets = ["native", "debian-openssl-3.0.x", "linux-arm64-openssl-3.0.x"]
```

Plus re-running `prisma generate` inside the builder stage on the image's own OS.

**Lesson:**
"Works locally" is a statement about your laptop. Native dependencies need the target platform named explicitly.

---

## Issue 8: Contradictions Not Working for Preference

**Symptom:**

```
likes: hiking (active)
activity_preference: swimming (active)
```

Both active. User said "I prefer swimming," but hiking remained.

**Root Cause:**
The contradiction resolver works on **exact predicate equality**. `likes` ≠ `activity_preference`, so it didn't see a contradiction.

**Fix:**
Canonicalize predicates. Map:

- `likes` → `activity_preference`
- `prefers` → `activity_preference`
- `I like X` → `activity_preference: X`

**Lesson:**
Semantic equivalence requires canonicalization before contradiction detection.

---

## Issue 9: Memory Over-Injection

**Symptom:**
User: "Tell me a joke"
Alex: tells joke, then mentions "Senior Engineer in Mumbai" and "hiking"

**Root Cause:**
The prompt was saying "Use memories to personalize your response" — which encouraged injecting them everywhere.

**Fix:**
Changed prompt to:

```
Use memories ONLY when directly relevant.
DO NOT mention memories merely because they are available.
DO NOT force personal references into unrelated responses.
```

**Lesson:**
Retrieved memories are supporting context, not mandatory topics. Don't mention them just because they exist.

---

## Issue 10: Persona Consistency — No Long-Term Test

**Symptom:**
The persona was defined and worked well, but I had no evidence of 50+ turn consistency.

**Root Cause:**
Test was too short.

**Fix:**
Added a 50+ turn test:

1. Establish Alex's personality (turns 1-3)
2. Run 47 filler turns
3. Test if persona remains consistent (turns 51-53)

**Lesson:**
The assignment explicitly asks for 50+ turn persona consistency. You need to demonstrate it.

---

## Issue 11: Process Restart Persistence — No Explicit Test

**Symptom:**
The system persisted to SQLite, but I had no explicit evidence in the test output.

**Fix:**
Added a restart test:

1. Show memories before "restart"
2. Simulate a new Prisma connection
3. Query for the same memories
4. Verify they survived

**Lesson:**
"Persist across sessions" needs explicit demonstration, not just architectural proof.

---

## Summary of What I Learned

| Theme                    | Lesson                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| **Environment**          | Always verify env vars are loaded. `tsx` needs explicit dotenv import.     |
| **Models**               | Check provider deprecation policies. Test with known-working models first. |
| **Structured Output**    | Use wrapper objects, not arrays. Parse manually if needed.                 |
| **Production Debugging** | Prove each hop. Read provider metrics. Don't stop at first root cause.     |
| **Native Dependencies**  | Specify target platforms explicitly. Verify in the artifact.               |
| **Contradiction**        | Canonicalize predicates before detection. Semantic equivalence matters.    |
| **Retrieval**            | Don't force memories into every response. Use them only when relevant.     |
| **Testing**              | Demonstrate what you claim. 50+ turns and restart tests are required.      |

---

## What I'd Do Differently

1. **Canonicalize predicates earlier** — the `likes` vs `activity_preference` issue cost time
2. **Test persona consistency earlier** — the 50+ turn requirement was obvious from the assignment
3. **Add restart test earlier** — persistence was there, but I didn't prove it until late
4. **Use a known-good model first** — wasted time on decommissioned models

---

## Final State

| Requirement                  | Status                      |
| ---------------------------- | --------------------------- |
| CLI chat loop                | ✅ Working                  |
| Persona definition           | ✅ Working                  |
| Memory persistence           | ✅ Working                  |
| Memory extraction            | ✅ Working                  |
| Relevant retrieval           | ✅ Working                  |
| Contradiction handling       | ✅ Working (3/4 categories) |
| Decay                        | ⚠️ Recency weighting only   |
| 50+ turn persona consistency | ✅ Tested                   |
| Process restart              | ✅ Tested                   |
| Evaluation harness           | ✅ Working                  |

**One remaining bug:** `likes: hiking` still active alongside `activity_preference: swimming`. Fixed by canonicalizing predicates.

---

**This document is now ready for your walkthrough. 💪**
