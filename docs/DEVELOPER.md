# Tailo Developer Guide

Setup and day-to-day development for the Tailo monorepo.

For product architecture and agent coding rules, see [Tailo_Agent_Coding_Guidelines_v2.md](../Tailo_Agent_Coding_Guidelines_v2.md) at the repo root.

---

## Prerequisites

- **Node.js 20+** (see `.nvmrc` at repo root)
- **npm** (workspaces are configured at the root)
- For mobile:
  - [Expo Go](https://expo.dev/go) on a physical device, **or**
  - **Xcode** (iOS Simulator + Command Line Tools), **or**
  - **Android Studio** (Android emulator)
  - **A physical iPhone + Xcode** for validating local native modules such as on-device dog/cat detection

---

## Initial setup

From the repository root:

```bash
npm install
```

This installs all workspace packages (`apps/mobile`, `packages/shared`, etc.).

---

## Mobile app

### Start the dev server

From the repository root:

```bash
npm run mobile          # Expo dev server
npm run mobile:ios      # Open iOS simulator
npm run mobile:android  # Open Android emulator
```

Or from `apps/mobile`:

```bash
npm run start
npm run ios
npm run android
```

### Device testing with Expo Go

1. Run `npm run mobile` from the repo root.
2. Scan the QR code with the Expo Go app (Android) or the Camera app (iOS).

Expo Go is useful for UI and JavaScript-only flows. It does **not** load Tailo's local native iOS modules, so dog/cat on-device detection falls back to the JavaScript heuristic in Expo Go.

### Real iPhone testing with a development build

Use this path when validating photo-library behavior, native modules, or dog/cat on-device detection.

From `apps/mobile`:

```bash
npx expo install expo-dev-client
npx expo prebuild --platform ios
```

After adding or changing **any** native Expo module (e.g. `expo-image-manipulator` for upload compression), regenerate native projects and reinstall the app — **Metro reload is not enough**:

```bash
cd apps/mobile
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios --device    # or open ios/Tailo.xcworkspace and Run in Xcode
npx expo start --dev-client
```

If you see `Cannot find native module 'ExpoImageManipulator'`, the installed dev client was built before that dependency was linked. Run the steps above (not Expo Go alone).

Connect and unlock the iPhone, trust the Mac if prompted, and confirm Xcode can see the device:

```bash
xcrun devicectl list devices
```

The phone should show as `available (paired)`. Then try the Expo CLI device install:

```bash
npx expo run:ios --device <device-udid-or-name>
```

If Expo falls back to Simulator.app or cannot select the phone, open the generated Xcode workspace instead:

```bash
open ios/Tailo.xcworkspace
```

In Xcode:

1. Select the `Tailo` scheme.
2. Select the physical iPhone as the run destination.
3. Press **Run**.

After the app is installed on the phone, start Metro for the development client:

```bash
npx expo start --dev-client
```

Keep the phone unlocked and on the same network as the Mac. If the phone appears as `Connecting` in `xcrun xctrace list devices`, open **Xcode → Window → Devices and Simulators** and wait for Xcode to finish preparing the device.

### Quality checks

From the repository root:

```bash
npm run mobile:typecheck
npm run mobile:lint
npm test
npm run format:check
```

Format all code (Prettier):

```bash
npm run format
```

AI agents must add unit tests for new logic — see [AGENTS.md](../AGENTS.md).

### Git pre-commit hook

After `npm install`, Husky runs **lint** and **tests** on every commit.

Lint behavior:

1. `npm run lint` — if it passes, continue
2. If it fails → `npm run lint:fix` → re-stage fixed files that were already staged → `npm run lint` again
3. Commit is blocked if lint still fails after auto-fix

Manual fix: `npm run lint:fix`

To run the hook manually: `.husky/pre-commit`

Hooks are installed via the `prepare` script — run `npm install` once after cloning.

Or per workspace:

```bash
npm run typecheck --workspace=@tailo/mobile
npm run lint --workspace=@tailo/mobile
```

---

## Repository layout

```txt
apps/mobile/              React Native + Expo app
packages/shared/          Shared TypeScript types (@tailo/shared)
supabase/                 Backend (Phase 2 — not started)
docs/                     Developer and product documentation
```

### Mobile app (`apps/mobile`)

```txt
src/
  modules/       Feature modules (auth, mediaScanner, eventBuilder, …)
  components/    Shared UI
  screens/       Screen components
  lib/           Utilities
  db/            Local SQLite (expo-sqlite)
  constants/     Theme, app constants
```

Shared types used by mobile (and later backend) live in `packages/shared`.

### Environment variables

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` when backend integration begins (Phase 2). No env vars are required for Phase 0 local development.

---

## Tech stack (mobile)

| Area           | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | React Native + Expo SDK 54                        |
| Local DB       | SQLite (`expo-sqlite`)                            |
| Secure storage | `expo-secure-store`                               |
| Photos         | `expo-media-library`, `expo-camera`, `expo-image` |
| Files          | `expo-file-system`                                |

---

## Current phase: Phase 0 (local spike)

Build locally before backend work. Track progress in **[MOBILE_TASKS.md](./MOBILE_TASKS.md)**.

No Supabase or network required for this phase.

---

## Monorepo scripts (root)

| Script                     | Description                 |
| -------------------------- | --------------------------- |
| `npm run mobile`           | Start Expo dev server       |
| `npm run mobile:ios`       | Start on iOS simulator      |
| `npm run mobile:android`   | Start on Android emulator   |
| `npm run mobile:typecheck` | TypeScript check for mobile |
| `npm run mobile:lint`      | ESLint for mobile           |

---

## Troubleshooting

### `npm install` fails

- Confirm Node 20+: `node -v`
- Delete `node_modules` at root and in `apps/mobile`, then run `npm install` again from the root.

### Expo / simulator issues

- iOS: open Xcode once and accept licenses; ensure a simulator runtime is installed.
- Android: start an AVD from Android Studio before `npm run mobile:android`.
- Clear Metro cache: `cd apps/mobile && npx expo start -c`
- **`Unable to resolve "../../App"`** — start Metro from `apps/mobile` (or `npm run mobile` from repo root), not `expo start` at the monorepo root without a workspace.
- **`Cannot find native module 'ExpoImageManipulator'`** — rebuild the dev client after `expo-image-manipulator` was added (see [Real iPhone testing](#real-iphone-testing-with-a-development-build)); Expo Go / an old binary will not have it.
- **Require cycle warnings** — usually harmless in dev; note them but prioritize fixing native-module errors first.

### Photo permissions on simulator

iOS Simulator can add sample photos via **Photos** or drag images into the simulator. Limited-access flows should be tested on a physical device when possible.

### Debug logs (`[Tailo]`)

Structured dev logs use the `[Tailo]` prefix with an area tag. Filter Metro / Xcode console on **`[Tailo]`** (SQL-only messages still use **`[Tailo DB]`**).

| Tag          | Meaning                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `[Scan]`     | Photo library ingest (initial 28-day window vs incremental since last moment) |
| `[Pipeline]` | Local scan → detect → cluster → select → promote orchestration                |
| `[Detect]`   | On-device pet detection batches                                               |
| `[Cluster]`  | Grouping pet candidates into event candidates                                 |
| `[Promote]`  | **New timeline moments** promoted to `local_events`                           |
| `[Upload]`   | Cloud **media** upload (R2 signed URLs) — existing moments, not new discovery |
| `[Sync]`     | Cloud **metadata** sync + AI poll (`sync-event`, `get-event-updates`)         |
| `[App]`      | App lifecycle (startup, foreground)                                           |

**New local moments** → look for `[Promote] New timeline moments promoted locally`.  
**Cloud backlog** → `[Upload] Cloud media upload completed for moment` (includes `note: not a new on-device discovery`).

### Account email upgrade sends a link instead of an 8-digit code

The app uses **8-digit OTP codes** for email linking, sign-in codes, and password reset — not link-only emails.

Configure every template listed in **[supabase/templates/README.md](../supabase/templates/README.md)** (hosted dashboard) or [supabase/config.toml](../supabase/config.toml) (local stack). At minimum:

- **Change email address** → `email_change.html` with `{{ .Token }}`
- **Magic Link** → `magic_link.html` with `{{ .Token }}`
- **Reset password** → `recovery.html` with `{{ .Token }}`

Verify repo templates: `node scripts/verify-supabase-email-templates.mjs`

If the email contains only a magic link, the in-app verification screen will not match.

---

## Backend (Phase 2)

Task plan: **[MOBILE_TASKS.md](./MOBILE_TASKS.md#phase-2--mobile--backend-integration)** (Phase 2 section). Architecture: **[architecture/phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md)** ([data syncing workflow](./architecture/phase-2-backend-mvp.md#data-syncing-workflow) — overview, outbound/inbound flowcharts, sequence diagram).

Dev project details: **[supabase/SETUP.md](../supabase/SETUP.md)** (ref `sgxtyxvithlmuuofkzlk`). Operator view of upload → AI → poll back: **[How AI captions return to the app](../supabase/SETUP.md#how-ai-captions-return-to-the-app)**.

### Environment variables

| File                     | Purpose                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| `apps/mobile/.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile client)  |
| `supabase/.env.local`    | `DATABASE_URL` for CLI migrations (postgres password — **never** in the app) |

Copy from `apps/mobile/.env.example` and `supabase/env.example`. Restart Metro after changing mobile env vars.

The **direct** Postgres host (`db.*.supabase.co`) may be IPv6-only. On IPv4-only networks, use the **Session pooler** URI from the Supabase dashboard (see `supabase/SETUP.md`).

### Supabase CLI

From the repo root (uses `npx`, no global install required):

```bash
npx supabase login
npx supabase link --project-ref sgxtyxvithlmuuofkzlk
npm run deploy:supabase           # db push + deploy all Edge Functions
npm run test:supabase:rls -- --linked   # B2.1.10 RLS cross-user smoke (after link)
npm run test:supabase:upload          # B2.4.3a signed PUT Content-Type (needs apps/mobile/.env.local)
npm run test:supabase:qa              # B2.6 Edge Function hardening (optional SUPABASE_SERVICE_ROLE_KEY)
npm run audit:supabase                # B2.6.3 dependency audit
npx supabase functions serve      # local edge functions
npx supabase start                # optional full local stack
```

**RLS smoke (B2.1.10):** `supabase/tests/rls_cross_user_smoke.sql` seeds two test users, impersonates user B via JWT claims, and asserts B cannot read or write user A’s rows on `profiles`, `anonymous_id_links`, `pets`, `events`, `event_media`, and `ai_jobs`. The script runs in a transaction and rolls back (no leftover data). Requires `npx supabase link` or `DATABASE_URL` in `supabase/.env.local` (with `psql` on PATH).

Scaffold lives in `supabase/` (`config.toml`, `migrations/`, `functions/`).

Edge Functions bundle code from `packages/shared` and `packages/backend-core`. Deno needs `supabase/functions/import_map.json` (maps `@tailo/shared` to the monorepo package). See [supabase/SETUP.md](../supabase/SETUP.md#deploy-migrations--edge-functions-one-command).

### Monorepo layout

- Migrations → `supabase/migrations`
- Edge Functions → `supabase/functions`
- Portable logic → `packages/backend-core` (scaffold pending)
- Shared API contracts → `packages/shared`

Do not duplicate types across mobile and backend — use `@tailo/shared`.

### CI deploy (main branch)

Merges to `main` auto-deploy Supabase when backend paths change. Configure GitHub secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` — see [supabase/SETUP.md](../supabase/SETUP.md#cicd-github-actions).

## Landing page deploy

The public landing page lives in `apps/landing` and is linked to the Vercel project `tailo-web`. Deploy it from the landing app directory only; do not deploy the monorepo root.

Local production deploy:

```bash
npm run deploy:landing
```

The script verifies `apps/landing/vercel.json`, builds the static site, and runs `vercel deploy --prod` from `apps/landing`. If the local Vercel link is missing, run:

```bash
cd apps/landing
npx vercel link --yes --scope brendanzj-6054s-projects --project tailo-web
```

Merges to `main` auto-deploy the landing page when `apps/landing/**` changes. Configure GitHub repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
