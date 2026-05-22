# Tailo — AI Agent Instructions

This file is the **entry point for all AI coding agents** (Cursor, Claude, Codex, etc.) working in this repository. Read it before making changes.

**Tailo-specific agent rules live here** — not in separate `.cursor/rules/` files. Cursor loads this file as workspace context; duplicating the same guidance in `.mdc` rules causes drift. (Third-party or personal always-on rules, e.g. general coding behavior, may stay outside the repo if you use them.)

For full product and architecture detail, see **[Tailo_Agent_Coding_Guidelines_v2.md](./Tailo_Agent_Coding_Guidelines_v2.md)**.

---

## Project

**Tailo** is a passive pet memory app: scan recent photos → detect pet moments → group into events → show a calm timeline. AI captions stay invisible; the product should feel like it remembers automatically.

| Path               | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `apps/mobile/`     | React Native + Expo (primary client)      |
| `packages/shared/` | Shared TypeScript types and constants     |
| `packages/ai/`     | AI prompts and response schemas (later)   |
| `supabase/`        | Backend (Phase 2 — scaffold + migrations) |
| `docs/`            | Developer guide, tasks, **architecture**  |

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

Phase 2 backend work (Supabase, sync, uploads, Edge Functions) is in scope when the user requests it. Do not add OpenAI or cloud AI until sync/upload foundations exist unless explicitly requested.

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

## Backend portability (Phase 2+)

Supabase is the **current** adapter, not a permanent platform choice. Design so we can move auth, storage, or hosting later without rewriting the mobile app or domain rules.

### Rules

1. **Local-first** — SQLite and the on-device pipeline remain the source of truth; cloud is sync/enrichment only.
2. **Business logic stays portable** — sync merge, idempotency, AI job rules, and validation live in `packages/backend-core` and `packages/shared`, not in Edge Function bodies or screens.
3. **Thin adapters** — `supabase/functions/*` only parse HTTP, read auth context, call use cases, and talk to Postgres/Storage.
4. **HTTP contracts over SDK sprawl** — mobile sync/upload should call Tailo APIs (`fetch` + shared Zod schemas), not `supabase.from(...)` across feature code.
5. **Single SDK choke points** — Supabase client usage belongs in adapter modules (`modules/auth/providers/`, future `modules/sync/`), never in screens or timeline UI.
6. **Provider interfaces on mobile** — use `AuthProvider` / `authService` for sessions and tokens; do not import `@/lib/supabase` outside `modules/auth/providers/` and future sync adapters.
7. **Postgres schema is SQL** — migrations in `supabase/migrations/` can move to another host; replace `auth.uid()` RLS when auth platform changes.
8. **No secrets in the app** — anon/publishable key only; service role and DB password stay server/CLI-side.

See [docs/architecture/phase-2-backend-mvp.md](./docs/architecture/phase-2-backend-mvp.md) for the full split (`backend-core` vs `supabase/functions`).

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

## React hooks (mobile) — avoid infinite loops

These rules prevent **“Maximum update depth exceeded”** and runaway re-fetch/sync loops. Apply them whenever you add or change `useEffect`, custom hooks, or screen-level refresh keys.

### `useEffect` dependencies

1. **Never put a whole hook return object in a dependency array.**  
   Custom hooks such as `usePhotoAccess()` return a **new object every render** (`{ ...state, startScan, … }`). Depending on `photoAccess` re-runs the effect every render → `setState` in the effect → infinite loop.

   **Do:** depend on stable primitives and memoized callbacks only:

   ```tsx
   // Bad
   useEffect(() => {
     void photoAccess.startScan();
   }, [photoAccess, step]);

   // Good
   useEffect(() => {
     void photoAccess.startScan();
   }, [
     step,
     photoAccess.initialScanCompleted,
     photoAccess.permissionStatus,
     photoAccess.startScan,
   ]);
   ```

2. **Same rule for any object/array built inline** — `options`, `config`, `style` objects, and `timeline` state bags are not stable unless wrapped in `useMemo` with correct deps.

3. **Do not call `setState` in an effect if the effect’s deps change on every render** because of (1) or (2). If you need to react to “something finished”, depend on a **boolean or counter that only changes when the transition happens** (e.g. pipeline was active → now idle).

### Custom hooks that return objects

4. **If a hook returns a composite object, wrap it in `useMemo`** so referential identity is stable when underlying state and callbacks are unchanged:

   ```tsx
   return useMemo(
     () => ({ ...state, requestAccess, startScan }),
     [state, requestAccess, startScan],
   );
   ```

5. **Prefer returning a tuple or separate values** when consumers only need one field — easier to use safely in effects.

### Refresh keys and polling

6. **Do not drive `useTimelineEvents({ refreshKey })` from high-frequency pipeline progress** (scan counts, clustering counts, etc.). Those change many times per second and will hammer SQLite and promotion. Refresh when:
   - capture completes,
   - a sync/poll **actually merged** remote changes,
   - or the pipeline **transitions** from active → idle.

7. **Break feedback loops between poll and UI refresh:** remote apply → `onApplied` → timeline refresh → must **not** re-trigger poll via a shared `refreshKey`. Poll on mount, app resume, and interval when `pending_ai` only.

8. **`applyRemoteEventUpdates` (and similar) must only count/write when merged data differs** from local — do not increment “applied” on no-op merges.

### Module imports (require cycles)

9. **Do not import from barrel `index.ts` inside low-level modules** (`db/`, `installIdentity`, `petProfile`, `uploadQueueWorker`, `scanState`). Import the concrete file (`authService`, `secureStorage`, `petProfile`, `uploadQueueWorker`) so Metro does not create `A → B → index → A` cycles (warnings and subtle init bugs).

10. **Screens may use `@/modules/<name>` barrels; hooks/services used during DB open or sync should not.**

### Before finishing hook/effect work

- Grep new effects for deps that are **objects** (`photoAccess`, `timeline`, `options`, whole hook results).
- Reload the screen once in the simulator — confirm no repeated **Maximum update depth exceeded** logs.
- If adding sync poll + timeline refresh, trace the loop: poll → apply → callback → refresh → poll.

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

## Responsive layout (mobile, required)

Every screen and shared UI component must remain usable across **compact phones, large phones, and tablets** (portrait-first; landscape may stay locked unless a task says otherwise).

### Layout rules

1. **Flex-first** — use `flex: 1`, `flexGrow` / `flexShrink`, and `minWidth: 0` on rows so text and chips wrap instead of overflowing. Avoid fixed widths for main content; percentage widths only when necessary.
2. **Safe areas** — use `react-native-safe-area-context` (`useSafeAreaInsets`, `getTabScreenTopPadding`, `getModalHeaderHeight` in `src/navigation/modalHeaderInset.ts`). Do not rely on a non-scrolling `paddingTop` on `AppShell` for tab content — put top inset on scrollable headers.
3. **Scroll overflow** — long copy, forms, and lists belong in `ScrollView` / `FlatList` with bottom inset for the floating tab bar (`useTabBarContentInset`). Set list/scroll `backgroundColor` to `colors.background` so overscroll does not flash white.
4. **Width-aware overlays** — menus and dialogs use helpers in [`apps/mobile/src/lib/responsive.ts`](./apps/mobile/src/lib/responsive.ts) (`useDialogMaxWidth`, `getContentWidth`), not hardcoded `maxWidth` literals.
5. **Touch targets** — interactive controls should be at least **44×44pt** (`MIN_TOUCH_TARGET` in `responsive.ts`) unless nested in a larger pressable row.
6. **Images** — prefer `width: '100%'` with `aspectRatio`; never assume a single phone width in px.
7. **Tab / modal shell** — horizontal tab pager must size pages from `onLayout` width; modals use measured container width for swipe-back.

### Text and accessibility

- App startup calls `configureTextAccessibility()` in [`apps/mobile/App.tsx`](./apps/mobile/App.tsx) so `Text` / `TextInput` respect system font size with a capped multiplier (`MAX_FONT_SIZE_MULTIPLIER`).
- Do not disable `allowFontScaling` on body copy. Titles may use `numberOfLines` / wrapping where needed.

### Helpers (reuse, do not duplicate)

| Helper                     | Use                                      |
| -------------------------- | ---------------------------------------- |
| `useDialogMaxWidth()`      | Action menus, centered sheets            |
| `getTabScreenTopPadding()` | Tab screen scroll header top inset       |
| `getModalHeaderHeight()`   | Modal scroll padding under fixed toolbar |
| `MIN_TOUCH_TARGET`         | Buttons, icon hit areas                  |

### Before finishing UI work

- Check **narrow** (~320pt width) and **wide** (~768pt tablet) in the simulator or Expo preview.
- Confirm header rows wrap, nothing clips under the status bar or tab bar, and pull-to-refresh does not show a white band.
- Add or update unit tests for pure layout helpers in `responsive.test.ts`.

`supportsTablet` is **true** in `app.json`; tablet layouts may remain phone-like until a dedicated tablet task, but must not clip or overlap.

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
