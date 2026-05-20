# Phase 3 — App navigation structure

**Status:** Implemented (3.0.1–3.0.4, May 2026)

## Main shell

Three primary tabs (bottom bar):

| Tab          | Screen             | Purpose                                                       |
| ------------ | ------------------ | ------------------------------------------------------------- |
| **Timeline** | `TimelineScreen`   | Moment list, photo scan status, favorites filter, capture FAB |
| **Pet**      | `PetProfileScreen` | Pet name, type, profile photo, Ask Tailo shell                |
| **Settings** | `SettingsScreen`   | Account, language (placeholder), app shortcuts                |

Implementation: `MainTabShell` + floating `MainTabBar` (icon-only, Instagram-style pill) in `apps/mobile/src/navigation/`. Timeline tab uses a **home** icon and is the default tab (`INITIAL_MAIN_TAB`).

## Modal / secondary routes

Full-screen flows pushed **above** the tab shell (tabs hidden until dismissed):

| Route             | Screen                     |
| ----------------- | -------------------------- |
| `EventDetail`     | Moment detail + edits      |
| `Capture`         | In-app camera              |
| `CapturePreview`  | Confirm captured moment    |
| `AccountSettings` | Email link / save memories |

Implementation: `modalStack` reducer + `ModalShell` in `NavigationContext`.

## Settings information architecture (3.0.2)

1. **Account** — save memories (email link); opens `AccountSettings` modal
2. **Language** — English only for now (read-only row)
3. **App** — shortcuts to Timeline (scan) and Pet profile tabs

## Navigation API

- `setActiveTab('Timeline' | 'PetProfile' | 'Settings')`
- `push('EventDetail', …)` / `pop()` / `popToRoot()` for modals
- `openSettings({ section: 'account' })` — switches to Settings tab and optionally opens account modal

## Change log

| Date       | Change                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| 2026-05-20 | Replace single `Home` stack with tab shell + modal stack; `HomeScreen` → `TimelineScreen` |
| 2026-05-19 | Floating icon tab bar (home / paw / settings); Timeline labeled Home in copy & a11y       |
| 2026-05-19 | Tab bar overlays content; scroll padding only (no shell bottom reserved band)             |
| 2026-05-19 | Glass tab bar via `expo-blur` (`systemChromeMaterialLight` on iOS)                        |
| 2026-05-19 | Keep `MainTabShell` mounted under modals so timeline scroll position survives back        |
| 2026-05-19 | Modal stack: detail card slides over fixed timeline (edge swipe + push/pop)               |
| 2026-05-19 | Main tab horizontal pager (swipe Timeline ↔ Pet ↔ Settings); back btn aligned             |
