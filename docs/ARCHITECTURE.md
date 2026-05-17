# Tailo — Architecture Design

Living architecture docs for the monorepo. **Update these when implementing something new** — not only at phase end.

| Document                                                                     | Scope                                               | Status      |
| ---------------------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| [architecture/phase-0-local-spike.md](./architecture/phase-0-local-spike.md) | Local photo pipeline, SQLite, timeline (no backend) | Current     |
| Phase 1                                                                      | Local MVP (identity, onboarding, capture)           | Not written |
| Phase 2                                                                      | Mobile ↔ Supabase, R2, sync                         | Not written |

**Related:** [MOBILE_TASKS.md](./MOBILE_TASKS.md) (checklist) · [DEVELOPER.md](./DEVELOPER.md) (setup) · [Tailo_Agent_Coding_Guidelines_v2.md](../Tailo_Agent_Coding_Guidelines_v2.md) (full product reference)

---

## When to update

Update the relevant phase doc (or add a new one) when you:

- Add or change a **module boundary**, data flow, or SQLite table
- Introduce a new **pipeline stage** (scan, detect, cluster, score, sync)
- Change **defaults** (time windows, thresholds, batch sizes)
- Add a **screen** or navigation route that reflects architecture
- Make a **spike decision** (e.g. heuristic vs Core ML) that affects future work

Keep updates **concise**: what changed, why, and where in the codebase.

---

## Monorepo boundaries (all phases)

```txt
apps/mobile/       Expo client — local processing + UI
packages/shared/   Types and constants shared with backend (later)
packages/ai/       Prompts and AI schemas (Phase 2+)
supabase/          Backend (Phase 2 — not started)
```

**Rule:** The phone filters and compresses. The cloud interprets and narrates (Phase 2+).
