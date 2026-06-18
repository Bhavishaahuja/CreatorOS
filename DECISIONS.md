# DECISIONS.md

---

**Decision:** Return structured JSON from Claude rather than free text
**Options considered:** Free text response parsed with regex; structured JSON
**Chosen approach:** Structured JSON
**Why:** Predictable output means the frontend can render cards without any parsing logic. Reduces the failure surface significantly.

---

**Decision:** Switch from OpenRouter to Anthropic API directly
**Options considered:** OpenRouter (aggregator), Anthropic API directly
**Chosen approach:** Anthropic API directly
**Why:** OpenRouter free credits ran out mid-build. Direct Anthropic API is more reliable for a portfolio project and avoids a third-party dependency.

---

**Decision:** Store approved_ids in localStorage rather than re-querying Supabase
**Options considered:** Re-fetch approved suggestions from Supabase on calendar page; pass IDs via localStorage
**Chosen approach:** localStorage
**Why:** Simpler for MVP. No extra DB read needed — the IDs are already known client-side from the approval flow.

---

**Decision:** Place generate and events routes under /api/calendar/ not /calendar/
**Options considered:** App route at /calendar/generate; API route at /api/calendar/generate
**Chosen approach:** /api/calendar/generate
**Why:** Next.js App Router requires API routes to live under /app/api/. A route.ts outside that path is treated as a page, causing 404s.

---

**Decision:** Retry Claude with a stricter prompt on malformed JSON
**Options considered:** Fail immediately; retry with same prompt; retry with stricter prompt
**Chosen approach:** Retry once with explicit instruction to return only a JSON array
**Why:** Claude occasionally wraps JSON in markdown code blocks. A single retry with a stricter instruction resolves this in almost all cases without adding significant latency.

---

**Decision:** Block calendar generation if zero ideas are approved
**Options considered:** Generate an empty calendar; show an error; redirect back
**Chosen approach:** Show a clear error message with a link back to suggestions
**Why:** A calendar with zero items is meaningless. Blocking early with a clear message is better UX than letting the user reach an empty state.