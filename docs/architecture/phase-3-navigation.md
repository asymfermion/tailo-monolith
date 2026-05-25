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

## Responsive layout

- Tab screens: top safe-area padding on scroll content (`getTabScreenTopPadding`), not on `AppShell`.
- Modals: fixed overlay toolbar + `getModalHeaderHeight` scroll padding (`EventDetailScreen`).
- Shared helpers: `apps/mobile/src/lib/responsive.ts`; global text scaling via `configureTextAccessibility()` in `App.tsx`.
- See **AGENTS.md → Responsive layout (mobile, required)** for agent rules.

## Change log

| Date       | Change                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-25 | Save-memories reminder now appears only after timeline value and follows cooldown/snooze rules; anonymous scanning stays recent-only while linked accounts can run historical backfill |
| 2026-05-20 | Responsive layout helpers, safe-area on scroll headers, `supportsTablet`, AGENTS.md rules                                                                                              |
| 2026-05-20 | Replace single `Home` stack with tab shell + modal stack; `HomeScreen` → `TimelineScreen`                                                                                              |
| 2026-05-19 | Floating icon tab bar (home / paw / settings); Timeline labeled Home in copy & a11y                                                                                                    |
| 2026-05-19 | Tab bar overlays content; scroll padding only (no shell bottom reserved band)                                                                                                          |
| 2026-05-19 | Glass tab bar via `expo-blur` (`systemChromeMaterialLight` on iOS)                                                                                                                     |
| 2026-05-19 | Keep `MainTabShell` mounted under modals so timeline scroll position survives back                                                                                                     |
| 2026-05-19 | Modal stack: detail card slides over fixed timeline (edge swipe + push/pop)                                                                                                            |
| 2026-05-19 | Main tab horizontal pager (swipe Timeline ↔ Pet ↔ Settings); back btn aligned                                                                                                          |
