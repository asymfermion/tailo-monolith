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

After adding or changing a local native module, refresh CocoaPods before rebuilding:

```bash
cd ios
pod install
cd ..
```

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

### Photo permissions on simulator

iOS Simulator can add sample photos via **Photos** or drag images into the simulator. Limited-access flows should be tested on a physical device when possible.

---

## Backend (Phase 2)

Not set up yet. Task plan: **[BACKEND_TASKS.md](./BACKEND_TASKS.md)**. Architecture: **[architecture/phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md)**.

When added:

- Migrations → `supabase/migrations`
- Edge Functions → `supabase/functions`
- Portable logic → `packages/backend-core`
- Shared API contracts → `packages/shared`

Do not duplicate types across mobile and backend — use `@tailo/shared`.
