# Tailo — AI Agent Instructions

This file is the **entry point for all AI coding agents** (Cursor, Claude, Codex, etc.) working in this repository. Read it before making changes.

For full product and architecture detail, see **[Tailo_Agent_Coding_Guidelines_v2.md](./Tailo_Agent_Coding_Guidelines_v2.md)**.

---

## Project

**Tailo** is a passive pet memory app: scan recent photos → detect pet moments → group into events → show a calm timeline. AI captions stay invisible; the product should feel like it remembers automatically.

| Path               | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `apps/mobile/`     | React Native + Expo (primary client)     |
| `packages/shared/` | Shared TypeScript types and constants    |
| `packages/ai/`     | AI prompts and response schemas (later)  |
| `supabase/`        | Backend (Phase 2 — not started)          |
| `docs/`            | Developer guide, tasks, **architecture** |

---

## Current default phase

Unless the user says otherwise, assume the project is in **Phase 0 / Phase 1 mobile-first implementation**.

Default work should focus on:

- Expo mobile app
- Local photo permission
- Local media scan
- Local event candidate creation
- Timeline UI
- Local unit tests

Do **not** start Supabase, R2, Edge Functions, or OpenAI integration unless explicitly requested.

---

## Required reading

1. **[docs/MOBILE_TASKS.md](./docs/MOBILE_TASKS.md)** — pick the next unchecked task
2. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — phase architecture (update when implementing something new)
3. **[docs/DEVELOPER.md](./docs/DEVELOPER.md)** — setup, run commands, troubleshooting
4. **[Tailo_Agent_Coding_Guidelines_v2.md](./Tailo_Agent_Coding_Guidelines_v2.md)** — full reference when needed

Expo SDK 54 docs: https://docs.expo.dev/versions/v54.0.0/

---

## How to work

1. **Follow the task plan** — next open item in `docs/MOBILE_TASKS.md` unless the user specifies otherwise. Tasks are tracked as [GitHub issues](https://github.com/asymfermion/tailo-monolith/issues?q=label%3Amobile-tasks+is%3Aopen) on the [mobile project board](https://github.com/users/asymfermion/projects/2); see [guidelines §5.6](./Tailo_Agent_Coding_Guidelines_v2.md#56-github-issue--project-workflow).
2. **Plan with an issue, code with an issue, close when done** — create or pick an issue (on the project board) before coding; move status on the board while working; close the issue and check off `MOBILE_TASKS.md` when complete.
3. **Update architecture docs** — when implementing something new, update the relevant doc under `docs/architecture/` (see below).
4. **Reuse before rewrite** — search the repo first; extract shared logic instead of copying (see below).
5. **Respect boundaries** — mobile in `apps/mobile`; contracts in `packages/shared` / `packages/ai`.
6. **Stay focused** — no drive-by refactors or scope creep (architecture doc updates are required, not optional scope).
7. **Match existing style** — calm UI copy (moments/memories, not “AI assistant”).

---

## Architecture documentation (required)

When you implement something **new** (module, pipeline stage, table, API boundary, or major behavior change):

1. Update **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** if phase scope or monorepo boundaries change.
2. Update the matching **phase doc** in `docs/architecture/` (e.g. [phase-0-local-spike.md](./docs/architecture/phase-0-local-spike.md), [phase-1-local-mvp.md](./docs/architecture/phase-1-local-mvp.md)).
3. Add a short row to that doc’s **Change log** (date + what changed).

Keep updates concise: flow, modules, data model, thresholds — not a duplicate of every PR.

Do **not** create extra architecture files unless starting a new phase or major subsystem.

---

## Product scope rule

Do **not** add new product features unless requested.

Do **not** add:

- Social features
- Dashboards
- Gamification
- Medical/health scoring
- Complex onboarding
- Multi-pet UI
- Login/paywall flows

When unsure, implement the **smallest version** that supports the current task.

---

## Reuse over duplication

**Prefer one implementation used in many places.**

| Scope                    | Location                          |
| ------------------------ | --------------------------------- |
| Mobile + backend (later) | `packages/shared`                 |
| AI prompts/schemas       | `packages/ai`                     |
| Mobile-only, shared      | `apps/mobile/src/lib/`            |
| Single feature           | `apps/mobile/src/modules/<name>/` |

Before writing new code: search `packages/shared`, `src/lib/`, and relevant `src/modules/*`. If you would copy more than a few lines, extract and test once.

Do not duplicate: types in `@tailo/shared`, DB mappers, clustering/scoring, caption parsing, permission/retry patterns.

---

## AI contracts

AI request/response schemas must live in **`packages/shared`** or **`packages/ai`**.

Do not define ad-hoc AI response shapes inside screens or feature components.

All AI outputs must be **parsed and validated** before use.

---

## Privacy consistency

Do not write UI copy that implies Tailo uploads or analyzes the **entire photo library** in the cloud.

**Acceptable:**

- “Tailo looks for pet moments on your device.”
- “Only selected moments are saved.”

**Avoid:**

- “Upload your library”
- “Analyze all your photos”

Never upload the full camera roll — filter and select on device only.

---

## Unit tests (required)

Every feature or logic change must include unit tests.

| Must test       | Examples                                                  |
| --------------- | --------------------------------------------------------- |
| Pure logic      | Clustering, scoring, mappers, validation, caption parsing |
| Shared packages | `packages/shared` constants and schemas                   |
| Optional        | Full RN screens — prefer logic extraction + unit tests    |

- **Framework:** Jest (`jest-expo`) in `apps/mobile`; Vitest (`environment: 'node'`) in `packages/shared`.
- **Files:** `*.test.ts` next to the module or in `__tests__/`.
- Mock Expo/native APIs at the boundary.

**Before finishing a task:**

```bash
npm run mobile:typecheck
npm run lint
npm test
npm run format:check
```

Pre-commit hook runs **lint** (with one auto-fix pass) and **tests**.

---

## Formatting (required)

Run `npm run format` after edits. Verify with `npm run format:check`. Config: [`.prettierrc`](./.prettierrc).

---

## Security vulnerabilities

**Required when dependencies or lockfiles change** (`package.json`, `package-lock.json`), not on every unrelated task.

```bash
npm audit
npm audit fix          # safe fixes only — never --force without user approval
```

After dependency changes, re-run `npm test`, `npm run mobile:typecheck`, and `npm run lint`.

- Fix **critical/high** in the same task when possible without breaking the app.
- Prefer Expo-aligned bumps: `npx expo install` in `apps/mobile`.
- Document unfixed issues with no upstream patch in task notes.
- Root **`overrides`** exist for known transitive issues — do not remove without checking `npm audit`.

---

## Code organization (mobile)

```txt
apps/mobile/src/
  modules/     auth, mediaScanner, eventBuilder, timeline, capture, …
  components/  screens/  lib/  db/  types/
```

- **Events over files** — timeline is event-centric, not a photo grid.
- **No registration required** for core MVP value.
- **One pet in UI**; include `pet_id` in data models for later multi-pet.

---

## Styling (mobile)

The Expo app uses **React Native `StyleSheet`**, not CSS files. Do not add `.css` files or web-only styling libraries (e.g. CSS Modules, Tailwind/NativeWind) unless the user explicitly requests them.

### Tokens (required)

- Put shared visual constants in **[`apps/mobile/src/constants/theme.ts`](./apps/mobile/src/constants/theme.ts)** — `colors`, `spacing`, and typography when added.
- Reference `colors.*` and `spacing.*` in styles; do not hardcode hex values or spacing literals in screens unless there is a one-off exception.

### Where styles live

| Scope              | Location                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Design tokens      | `src/constants/theme.ts`                                                                                |
| Screen/feature UI  | `StyleSheet.create(...)` at the **bottom** of the same `.tsx` file                                      |
| Large style blocks | Extract to `ScreenName.styles.ts` next to the screen (only when the block is hard to scan, ~150+ lines) |
| Reused UI          | `src/components/` — extract before copying the same style object twice                                  |

### Rules

1. **Co-locate by default** — keep `StyleSheet.create` in the component file that uses it; name the export `styles`.
2. **No inline style objects in JSX** for static layout — use `styles.foo`. Inline is OK only for truly dynamic values (e.g. `{ width: progress }`).
3. **Reuse components** — prefer shared buttons, rows, and bands in `src/components/` over duplicating style definitions across screens.
4. **Calm UI** — off-white backgrounds, muted text, one accent; generous spacing from `theme.ts`. Match existing screens (`HomeScreen`, `OnboardingScreen`).
5. **Do not** introduce global style frameworks or theme providers without an explicit task — the project standard is `theme.ts` + `StyleSheet`.

### Example

```tsx
import { colors, spacing } from '@/constants/theme';

export function Example() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
});
```

---

## Product guardrails

- Passive-first: automatic scan/group over manual logging.
- AI is invisible in copy and UI.
- No medical/diagnostic language in captions or UI.

---

## Git

- **Do not commit** or **push** unless the user asks.
- Never commit secrets (`.env`, keys).

---

## When unsure

- Prefer the guidelines and task doc over inventing architecture.
- Ask before backend work or large dependency additions.
- Note decisions in `docs/MOBILE_TASKS.md` under the phase “notes & decisions” section.
