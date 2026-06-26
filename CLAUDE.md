# Tailo — Claude Code instructions

The full agent rulebook lives in **[AGENTS.md](./AGENTS.md)** and is imported below. It is the single source of truth for product scope, architecture boundaries, styling, testing, and workflow — do not duplicate its rules here (the file says so itself).

@AGENTS.md

---

## Quick orientation (pointers only — see AGENTS.md for rules)

**What this is:** Tailo — a passive, local-first pet *memory* app. Monorepo, npm workspaces (`apps/*`, `packages/*`). Node >= 20. Default phase is Phase 0/1 mobile-first unless the user asks for backend.

**Where things live:**

| Path                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `apps/mobile/`         | React Native + Expo (SDK 54) app — main focus    |
| `apps/landing/`        | Public landing site                              |
| `packages/shared/`     | Shared types, constants, contracts, Zod schemas  |
| `packages/ai/`         | AI prompts + response schemas                    |
| `packages/backend-core/` | Portable backend business logic                |
| `supabase/`            | Migrations, storage, Edge Functions (Phase 2+)   |
| `docs/`                | Architecture, tasks, and UI principles           |

**Key docs:** `docs/MOBILE_TASKS.md` (task plan) · `docs/ARCHITECTURE.md` · `docs/DEVELOPER.md` (run/setup) · `docs/architecture/` (per-phase) · `docs/UI/` (UI principles, style, sketches).

**Common commands (run from repo root):**

```bash
npm run mobile            # start Expo
npm run mobile:ios        # iOS
npm run mobile:typecheck  # typecheck mobile
npm run lint              # lint mobile
npm test                  # shared + backend-core + ai + mobile tests
npm run format:check      # prettier check (run npm run format after edits)
```

**Before finishing a change:** run the smallest relevant checks first, then `npm run mobile:typecheck && npm run lint && npm test && npm run format:check`. Add unit tests for changed logic. Do not commit or push unless the user asks. See AGENTS.md for the full loop and guardrails.

**Reminders that are easy to forget:** StyleSheet only (no CSS/Tailwind); use `packages/shared`/`packages/ai` for AI + sync contracts; never upload the full camera roll; keep copy memory-first ("moments"/"memories", not "AI assistant"); avoid drive-by refactors and unrequested features.
