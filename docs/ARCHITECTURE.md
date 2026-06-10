# Tailo — Architecture Design

Living architecture docs for the monorepo. **Update these when implementing something new** — not only at phase end.

| Document                                                                                               | Scope                                                                                                                           | Status      |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [architecture/phase-0-local-spike.md](./architecture/phase-0-local-spike.md)                           | Local photo pipeline, SQLite spike (no backend)                                                                                 | Complete    |
| [architecture/phase-1-local-mvp.md](./architecture/phase-1-local-mvp.md)                               | Identity, onboarding, promoted events, local MVP                                                                                | In progress |
| [architecture/phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md)                           | Backend MVP, sync, uploads, AI, portability ([data sync workflow](./architecture/phase-2-backend-mvp.md#data-syncing-workflow)) | Planned     |
| [architecture/account-upgrade-ux.md](./architecture/account-upgrade-ux.md)                             | Legacy pointer to the canonical auth document                                                                                   | Merged      |
| [architecture/authentication-and-account-flows.md](./architecture/authentication-and-account-flows.md) | Canonical auth + account UX: anonymous-first, reminders, email/Apple/Google, login, recovery, and account profile               | Planned     |
| [architecture/notifications-and-inbox.md](./architecture/notifications-and-inbox.md)                   | Notification contract, local inbox model, producers, and read-state behavior                                                     | In progress |
| [architecture/encrypted-media-ai-plan.md](./architecture/encrypted-media-ai-plan.md)                   | Encrypted media at rest with decrypt-for-AI flow                                                                                | Planned     |

**Related:** [MOBILE_TASKS.md](./MOBILE_TASKS.md) (mobile + backend checklist) · [DEVELOPER.md](./DEVELOPER.md) (setup) · [AGENTS.md](../AGENTS.md) (agent instructions)

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
apps/landing/      Public website and marketing site
packages/shared/   Types and constants shared with backend (later)
packages/backend-core/ Portable backend domain logic (Phase 2+)
packages/ai/       Prompts and AI schemas (Phase 2+)
supabase/          Backend (Phase 2 — not started)
```

**Rule:** The phone filters and compresses. The cloud interprets and narrates (Phase 2+).

**Portability rule:** Put business logic in shared TypeScript packages. Keep Supabase functions thin.
