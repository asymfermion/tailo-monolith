# Tailo — AI Agent Instructions

This file is the entry point for AI coding agents working in this repository, including Cursor, Claude, Codex, and similar tools.

Tailo-specific rules live here. Do not duplicate Tailo product, architecture, testing, or workflow rules in `.cursor/rules/`; duplication causes drift and wastes context. Personal or third-party behavior rules may live outside the repo, but this file is the project source of truth.

For product and architecture detail, use the focused docs under `docs/`.

---

## Instruction priority

When instructions conflict, use this order:

1. The user's current request
2. This `AGENTS.md`
3. Relevant docs under `docs/`
4. Existing code style and tests
5. General Cursor/user rules

If a lower-priority instruction conflicts with Tailo product scope, follow Tailo scope and mention the conflict briefly.

---

## Project summary

Tailo is a passive pet memory app.

Core flow:

1. Scan recent photos locally.
2. Detect pet-related moment candidates.
3. Group candidates into timeline events.
4. Show a calm, memory-like timeline.

Product feel:

- Passive-first, not manual logging-first.
- AI should feel invisible.
- Use language like “moments” and “memories”, not “AI assistant”.
- Sharing, when added, should be export-based, not a social feed.

---

## Repository map

| Path               | Purpose                                                       |
| ------------------ | ------------------------------------------------------------- |
| `apps/mobile/`     | React Native + Expo mobile app                                |
| `apps/landing/`    | Public landing page website                                   |
| `packages/shared/` | Shared TypeScript types, constants, contracts, schemas        |
| `packages/ai/`     | AI prompts and response schemas when needed                   |
| `supabase/`        | Backend, migrations, storage, and Edge Functions for Phase 2+ |
| `docs/`            | Developer guide, task plan, and architecture docs             |

---

## Current default phase

Unless the user says otherwise, assume Tailo is in Phase 0 / Phase 1 mobile-first implementation.

Default work should focus on:

- Expo mobile app
- Local photo permission
- Local media scan
- Local event candidate creation
- Timeline UI
- SQLite/local-first state
- Local unit tests

Phase 2 backend work is in scope only when the user asks for backend, sync, uploads, auth, Supabase, Edge Functions, or cloud work.

Do not add OpenAI, cloud AI, sync, uploads, login, or paywall flows unless explicitly requested or already part of the selected task.

---

## Required reading by task type

Read only what is needed for the task. Do not load every doc by default.

| Task type                        | Read first                            |
| -------------------------------- | ------------------------------------- |
| Pick next mobile task            | `docs/MOBILE_TASKS.md`                |
| Understand architecture boundary | `docs/ARCHITECTURE.md`                |
| Run/setup/debug commands         | `docs/DEVELOPER.md`                   |
| Phase-specific implementation    | matching file in `docs/architecture/` |
| Expo API behavior                | Expo SDK 54 docs                      |

Prefer focused reading over broad context loading.

---

## AI context discipline

Keep agent context small and task-specific.

Before broad search:

- Read the user's request carefully.
- Prefer exact files named by the user.
- Search the relevant module first.
- Use broad codebase search only for discovery, not by default.

When implementing:

- Identify the smallest relevant file set.
- Do not load unrelated docs.
- Do not summarize long files unless needed.
- Do not rewrite large files for small changes.
- Prefer targeted diffs over full-file replacement.

When finishing:

- Summarize changed files.
- State what was verified.
- State any skipped checks honestly.
- Keep explanations short unless the user asks for detail.

---

## Default implementation loop

For normal coding tasks:

1. Locate the smallest relevant file set.
2. Read existing implementation and tests.
3. Make a brief plan for non-trivial changes.
4. Implement the minimal change.
5. Add or update unit tests for changed logic.
6. Run the smallest relevant checks first.
7. Update docs only when architecture, behavior, or task status changed.

Do not perform unrelated cleanup.
Do not commit or push unless the user explicitly asks.

---

## How to work

1. Follow the task plan in `docs/MOBILE_TASKS.md` unless the user specifies a different task.
2. Use GitHub issues/project-board workflow when the task requires it.
3. Update architecture docs when implementing a new module, pipeline stage, table, API boundary, or major behavior change.
4. Reuse existing code before writing new code.
5. Keep mobile code in `apps/mobile`, shared contracts in `packages/shared` / `packages/ai`, and backend code under the backend packages/adapters.
6. Match existing style.
7. Avoid scope creep and drive-by refactors.

When adding tasks to `docs/MOBILE_TASKS.md`:

- Put the task under the most specific existing section instead of creating a side-track section unless the work genuinely needs a new section.
- Use the next numeric ID in that section, for example `3.6.9`; do not use letter suffixes such as `3.6.4a`, alternate prefixes such as `B2.`, or duplicate an existing ID.
- If a new section is needed, use the next numeric phase/section number and then number tasks sequentially under it.
- After editing, check for duplicate or lettered task IDs and update nearby notes that reference renamed IDs.

Every changed line should trace directly to the user's request or the selected task.

---

## Product scope guardrails

Do not add new product features unless requested.

Do not add by default:

- Social networking features
- Dashboards
- Gamification
- Medical or health scoring
- Complex onboarding
- Multi-pet UI
- Login or paywall flows
- Full-library cloud upload

When unsure, implement the smallest version that supports the current task.

---

## Product language and privacy

Tailo should not sound like a visible AI tool.

Acceptable copy:

- “Tailo looks for pet moments on your device.”
- “Only selected moments are saved.”
- “A quiet memory from today.”

Avoid copy such as:

- “Upload your library”
- “Analyze all your photos”
- “AI assistant”
- “Medical assessment”
- “Diagnosis”

Never upload the full camera roll. Filter and select on device first.

---

## Architecture documentation

When implementing something new, update docs concisely.

Update `docs/ARCHITECTURE.md` if phase scope or monorepo boundaries change.

Update the matching phase doc under `docs/architecture/`, for example:

- `phase-0-local-spike.md`
- `phase-1-local-mvp.md`
- `phase-2-backend-mvp.md`

Add a short change-log row with date and what changed.

For any new architecture/design document (or substantial architecture update), include all three:

1. A **high-level design diagram** (system boundaries, major flows, and ownership)
2. A **low-level design diagram** (module/service interactions, key call paths, and state transitions)
3. A **DB schema section** for touched persistence layers (tables/fields/indexes/constraints and migration/version notes)

Diagrams should be text-source (`mermaid` preferred) so they stay versioned and reviewable in git.

If adding, renaming, editing, or removing a Supabase migration under `supabase/migrations/`, update `docs/architecture/database-schema-ledger.md` in the same change.

Do not create extra architecture files unless starting a new phase or a major subsystem.

---

## Reuse over duplication

Prefer one implementation used in many places.

| Scope                         | Location                          |
| ----------------------------- | --------------------------------- |
| Mobile + backend shared logic | `packages/shared`                 |
| AI prompts/schemas            | `packages/ai`                     |
| Mobile-only shared logic      | `apps/mobile/src/lib/`            |
| Single mobile feature         | `apps/mobile/src/modules/<name>/` |

Before writing new code, search:

- `packages/shared`
- `apps/mobile/src/lib/`
- relevant `apps/mobile/src/modules/*`

Do not duplicate:

- shared types
- DB mappers
- clustering/scoring logic
- caption parsing
- permission/retry patterns
- validation helpers
- sync/upload contracts

If copying more than a few lines, consider extracting and testing shared logic.

---

## Mobile code organization

```txt
apps/mobile/src/
  modules/      auth, mediaScanner, eventBuilder, timeline, capture, ...
  components/   shared UI components
  screens/      screen-level components
  lib/          mobile-only shared helpers
  db/           SQLite and persistence
  types/        mobile-only types
  constants/    theme and app constants
```

Rules:

- Timeline is event-centric, not a photo grid.
- Core MVP value should not require registration.
- UI may be single-pet for now.
- Data models should include pet identifiers where needed for future multi-pet support.

---

## Styling and layout

The Expo app uses React Native `StyleSheet`, not CSS files.

Do not add:

- `.css` files
- CSS Modules
- Tailwind/NativeWind
- web-only styling libraries
- global theme providers

Use `apps/mobile/src/constants/theme.ts` for shared visual constants such as colors and spacing.

Rules:

- Co-locate `StyleSheet.create(...)` at the bottom of the component file by default.
- Extract `ScreenName.styles.ts` only when the style block becomes hard to scan.
- Do not use inline style objects for static layout.
- Inline styles are acceptable for genuinely dynamic values.
- Reuse shared components before duplicating style definitions.
- Keep UI calm: off-white backgrounds, muted text, one accent, generous spacing.

Responsive layout is required for compact phones, large phones, and tablets.

Use existing helpers such as:

- `useDialogMaxWidth()`
- `getTabScreenTopPadding()`
- `getModalHeaderHeight()`
- `MIN_TOUCH_TARGET`
- `useTabBarContentInset()`

Before finishing UI work, check narrow and wide layouts where practical.

---

## Performance and cost

Tailo should feel useful quickly without spending cloud budget unnecessarily.

Rules:

- First useful local timeline value should appear within about 60 seconds on a real device where practical.
- Scan newest photos first, render progressively, and continue long-running scan/detection work in background batches.
- Do not block UI for scanning, detection, compression, uploads, or sync.
- Never upload all photos, call an LLM per image, reprocess unchanged media, or store unnecessary originals.
- Filter on device, cluster before upload, compress media, cache AI results, deduplicate uploads, and process AI per event.

---

## React hooks and effects

Avoid infinite render/update loops.

Rules:

1. Do not put whole hook return objects in dependency arrays.
2. Depend on stable primitives and memoized callbacks.
3. Wrap composite hook returns in `useMemo` when identity stability matters.
4. Do not drive timeline refresh from high-frequency scan/progress counters.
5. Break feedback loops between remote polling, apply callbacks, and UI refresh.
6. Import concrete files in low-level modules; avoid barrels that create require cycles.

Before finishing hook/effect work:

- Check new effects for object/array dependencies.
- Confirm the screen does not log repeated update-depth errors.
- Trace poll/apply/refresh loops if sync or timeline refresh changed.

---

## User input validation

Every screen or flow that accepts user input must validate before acting.

Client rules:

1. Disable primary actions until required fields are valid.
2. Validate again on submit.
3. Use shared validation helpers for email, OTP, password, pet name, birthdays, and similar rules.
4. For `AuthFormTextInput` + `valueRef` fields, use `onValueChange` or controlled state so readiness updates as the user types.
5. Normalize before send: trim emails, parse dates, reject empty required strings.

Server/contract rules:

1. Parse and validate API bodies with Zod or shared parsers.
2. Reject invalid input with stable error codes/messages.
3. Validate mobile sync/upload payloads before enqueue and again at the API boundary.

Add unit tests for validation helpers and parsers.

---

## AI contracts

AI request and response schemas must live in `packages/shared` or `packages/ai`.

Do not define ad-hoc AI response shapes inside screens or feature components.

All AI outputs must be parsed and validated before use.

Do not add OpenAI or cloud AI usage unless explicitly requested or required by the active task.

---

## Local-first identity and sync boundaries

Tailo is local-first.

Local state and cloud identity are related, but not the same thing.

Rules:

1. Do not switch SQLite databases during anonymous-to-cloud bootstrap.
2. Local IDs stay device-scoped.
3. Cloud IDs are metadata for sync.
4. Account state comes from auth/session metadata, not DB filenames.
5. Do not add account switching unless explicitly requested and designed.

When backend work is active, Supabase is the current adapter, not a permanent platform choice.

Backend portability rules:

- SQLite/on-device pipeline remains the source of truth.
- Business logic belongs in portable packages, not Edge Function bodies or screens.
- Supabase functions should be thin adapters.
- Mobile should call Tailo APIs via shared contracts rather than scattering Supabase SDK calls.
- Secrets must never be committed or shipped in the app.
- Prefer fewer Edge Function entrypoints: group related API actions under existing domain routers (`api-auth`, `api-account`, `api-pet`, `api-events`) instead of creating new function entrypoints by default.
- Create a new Edge Function entrypoint only when there is a clear runtime boundary (for example background/scheduled workers, special auth requirements, or materially different scaling/deployment needs).

---

## SecureStore and reinstall safety

Treat install identity reconciliation as security-sensitive.

Rules:

1. Fresh SQLite plus stale SecureStore must clear stale identity/session/workspace state before continuing.
2. Do not preserve global auth for legacy workspaces if local DB is fresh.
3. Test stale-store cleanup and normal existing-data preservation when changing install identity, auth storage, reset, logout, or SecureStore keys.
4. Do not silently wipe data except in explicit reset, logout/login-gate, or stale-install reconciliation flows.

Document the reason in code/tests when clearing identity-related state.

---

## Background async work

Every fire-and-forget async task needs an error boundary.

Rules:

- Wrap `void task()`, `.then(...)`, app-state listeners, timers, background sync, post-onboarding work, and similar tasks in `try/catch` or equivalent error handling.
- Use structured Tailo logging such as `logTailo` / `logAuth`.
- Extract background runners so success/failure paths can be unit-tested.
- Avoid stale DB handles in long-lived workers; resolve the current DB close to execution time.

---

## Compatibility APIs and naming

Names should describe current behavior.

Rules:

- Avoid functions named `set*`, `switch*`, `migrate*`, or `reset*` unless they really perform that action.
- Mark legacy compatibility paths clearly in names or short comments.
- Prefer removal over shims for unshipped branch-only behavior.

---

## Unit tests

Every feature or logic change must include unit tests where practical.

Test pure logic such as:

- clustering
- scoring
- mappers
- validation
- caption parsing
- shared constants
- schemas
- install identity behavior
- sync/upload contracts

Frameworks:

- `jest-expo` in `apps/mobile`
- Vitest with node environment in `packages/shared`

Prefer logic extraction plus unit tests over brittle full-screen tests.

Before finishing a task, run the smallest relevant checks first. For complete verification, use:

```bash
npm run mobile:typecheck
npm run lint
npm test
npm run format:check
```

Run `npm run format` after edits when formatting may have changed.

For manual release or TestFlight QA, use the checklist in `docs/DEVELOPER.md`.

---

## Security and dependencies

When dependency or lockfiles change, run:

```bash
npm audit
```

Use safe fixes only:

```bash
npm audit fix
```

Do not use `npm audit fix --force` without user approval.

After dependency changes, rerun relevant tests, typecheck, and lint.

Prefer Expo-aligned dependency updates with `npx expo install` inside `apps/mobile` when applicable.

Never commit secrets, service-role keys, database passwords, private tokens, or `.env` files.

---

## Git rules

Do not commit unless the user asks.
Do not push unless the user asks.
Do not rewrite history unless the user explicitly asks and understands the impact.

When summarizing work, mention:

- files changed
- tests/checks run
- tests/checks not run
- follow-up risks or TODOs

---

## When unsure

Prefer existing docs, code style, and tests over inventing architecture.

Ask before:

- backend work not already requested
- large dependency additions
- major architecture changes
- account/auth model changes
- data deletion behavior
- product features outside the current scope

If the task can proceed safely with a small local decision, make the smallest reasonable choice and state it in the summary.
