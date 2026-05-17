# Tailo Mobile — Development Tasks

Task plan for the mobile app. Work top-to-bottom within each phase; later phases depend on earlier ones.

**References:** [Architecture](./ARCHITECTURE.md) · [Phase 0 design](./architecture/phase-0-local-spike.md) · [Developer guide](./DEVELOPER.md) · [Agent guidelines](../Tailo_Agent_Coding_Guidelines_v2.md)

**How to use:** Check off tasks as completed (`[x]`). Add notes or PR links inline when useful. Pick the next unchecked task in the current phase.

---

## Status snapshot

| Phase   | Focus                                       | Status              |
| ------- | ------------------------------------------- | ------------------- |
| Setup   | Dev environment, monorepo, modules scaffold | Done                |
| Phase 0 | Local technical spike (no backend)          | In progress         |
| Phase 1 | Local MVP foundation                        | Not started         |
| Phase 2 | Mobile ↔ backend integration                | Blocked on Supabase |
| Phase 3 | Polish & first-session UX                   | Not started         |

---

## Setup (complete)

- [x] Monorepo with `apps/mobile` and `packages/shared`
- [x] Expo SDK 54 + core modules (`media-library`, `camera`, `image`, `file-system`, `secure-store`, `sqlite`)
- [x] `src/modules/` scaffold and path aliases
- [x] Developer guide and project README

---

## Phase 0 — Local technical spike

**Goal:** Generate a believable local pet timeline from real photos. No network, no account.

**Success condition:** User grants photo access → app shows grouped pet moments on a timeline within ~60s of useful partial results.

### 0.1 Foundation

- [x] **0.1.1** Define local TypeScript types in `apps/mobile/src/types/` (mirror processing pipeline: `LocalAsset`, `LocalEventCandidate`, `TimelineEvent`)
- [x] **0.1.2** Add SQLite schema + migration helper in `src/db/` for `local_assets`, `local_event_candidates`, `local_media_scores`
- [x] **0.1.3** Wire `getDatabase()` to run migrations on app launch
- [x] **0.1.4** Add minimal app shell: safe area, navigation container (or single-stack) ready for multiple screens

### 0.2 Photo access (`mediaScanner`)

- [x] **0.2.1** Implement permission check + request flow (full / limited / denied)
- [x] **0.2.2** Build permission UI states with calm copy (no technical jargon)
- [x] **0.2.3** Paginate camera roll — **newest first**, initial window last 2–4 weeks
- [x] **0.2.4** Persist scanned assets to `local_assets` (uri, dimensions, `created_at`, `media_type`)
- [x] **0.2.5** Expose scan progress (batch count, “Finding moments…”) without blocking UI
- [x] **0.2.6** Handle denied permission: explain + allow app to continue (manual capture path stub OK)

### 0.3 Pet detection (`eventBuilder` — pass 1)

- [x] **0.3.1** Spike on-device pet detection approach for iOS (Vision / Core ML bridge or interim heuristic)
- [x] **0.3.2** Mark assets `is_pet_candidate` + `pet_confidence` in `local_assets`
- [x] **0.3.3** Process in background batches; never block main thread
- [x] **0.3.4** Skip or degrade gracefully when no pet candidates found (empty state copy)

> **Note:** First pass can use a simple heuristic (e.g. confidence stub or sample classifier) to unblock clustering UI. Replace with real on-device ML in a follow-up task.

### 0.3a Dog/cat on-device detection

- [x] **0.3a.1** Add `detected_pet_type` (`dog | cat | null`) to local schema and asset types
- [x] **0.3a.2** Add `PetDetector` abstraction with native detector + heuristic fallback
- [x] **0.3a.3** Scaffold iOS local Expo module for Vision/Core ML image classification
- [x] **0.3a.4** Wire detection pipeline to prefer native detector when available
- [x] **0.3a.5** Add on-device Vision dog/cat classifier path (uses bundled `TailoPetClassifier.mlmodel` when present, otherwise Apple Vision built-in classification) and document dev-client requirement
- [ ] **0.3a.6** Validate dog/cat/other accuracy on real iPhone photo libraries

### 0.4 Event clustering (`eventBuilder`)

- [x] **0.4.1** Implement deterministic clustering: same day + within 10–30 min + pet candidate → one `local_event_candidate`
- [x] **0.4.2** Persist candidates with `timestamp`, `source: camera_roll`, `candidate_status`, `selected_asset_ids`
- [x] **0.4.3** Continue scanning older photos in background after first partial timeline render
- [x] **0.4.4** Deduplicate near-identical assets before clustering (basic hash / time+size heuristic)

### 0.5 Best image selection (`eventBuilder`)

- [x] **0.5.1** Score assets: sharpness, brightness, subject visibility, uniqueness (start simple)
- [x] **0.5.2** Store scores in `local_media_scores`
- [x] **0.5.3** Select **2–5 images per event** only; never show every similar photo
- [x] **0.5.4** Mark primary image per event for timeline thumbnail

### 0.6 Timeline UI (`timeline`)

- [x] **0.6.1** Home screen = timeline (not a photo grid)
- [x] **0.6.2** Timeline list: caption placeholder, image grid (2–5), timestamp, event type
- [x] **0.6.3** Apply calm visual design (off-white bg, large rounded photos, generous spacing — see theme constants)
- [x] **0.6.4** Loading states: “Finding moments…”, “Building your timeline…”
- [x] **0.6.5** Incremental render: show events as batches complete (newest first)
- [x] **0.6.6** Empty states: no permission, no pet photos, scan in progress

### 0.7 Phase 0 wrap-up

- [ ] **0.7.1** Manual test matrix: full / limited / denied photo access; many vs few pet photos; duplicates
- [ ] **0.7.2** Performance pass: first useful events visible within ~60s on real device
- [x] **0.7.3** Document known limitations and detection accuracy — see [architecture/phase-0-local-spike.md](./architecture/phase-0-local-spike.md)

### Phase 0 — notes & decisions

<!-- Add dated notes, PR links, and spike findings here -->

- 2026-05-17: Pet detection uses a `PetDetector` abstraction. The iOS local Expo module (`TailoPetClassifier`) uses a bundled Core ML model when present, otherwise Apple Vision built-in on-device classification, with deterministic dog/cat-aware heuristic fallback when native is unavailable. `detected_pet_type` is persisted for `dog | cat | null`; real-device accuracy validation remains.
- 2026-05-17: Event clustering groups same-day pet candidates within a 20-minute window, dedupes near-identical time/dimension matches, persists stable local candidate IDs, and starts a bounded older-photo scan after the first local pipeline pass.
- 2026-05-17: Best-image selection scores event media with deterministic local heuristics for sharpness/brightness/subject visibility/uniqueness, caps selected media at 5, and writes primary-image flags to `local_media_scores`.
- 2026-05-17: Timeline UI now loads scored local candidates newest-first and renders event rows with a primary image, secondary image strip, placeholder caption, timestamp, event type, and calm loading/empty states.

---

## Phase 1 — Local MVP foundation

**Goal:** User gets value without registering. One pet, full local experience.

### 1.1 Identity & pet profile (`auth`, `pets`)

- [x] **1.1.1** Generate `anonymous_user_id` on first launch; store in SecureStore
- [x] **1.1.2** Persist onboarding state (step, completed flags) in SecureStore
- [x] **1.1.3** Local pet model: name, type (dog | cat), optional gender
- [x] **1.1.4** Onboarding flow: welcome → photo permission → scan starts → partial timeline → pet name → type → gender → profile photo suggestion
- [x] **1.1.5** Suggest profile photo from highest-scoring pet image

### 1.2 Event model & processing state

- [ ] **1.2.1** Promote `local_event_candidate` → local `Event` with stable IDs
- [ ] **1.2.2** Track `processing_state` per asset/candidate (pending, processed, failed)
- [ ] **1.2.3** Map local events to shared `@tailo/shared` types where appropriate
- [ ] **1.2.4** Store `last_scan_timestamp` for incremental rescans

### 1.3 Timeline & event detail

- [ ] **1.3.1** Event detail screen: larger gallery, timestamp, type, placeholder caption
- [ ] **1.3.2** Basic event editing: caption, event type, favorite toggle (local only)
- [ ] **1.3.3** Favorite filter or visual indicator on timeline
- [ ] **1.3.4** Top area: pet profile summary + “Ask Tailo” entry (UI shell only — no AI yet)

### 1.4 Active capture (`capture`)

- [ ] **1.4.1** In-app camera screen using `expo-camera`
- [ ] **1.4.2** Save capture to local storage + create manual event (`source: in_app`)
- [ ] **1.4.3** Preview / confirm before adding to timeline
- [ ] **1.4.4** Works when photo library permission is denied

### 1.5 Local data hardening

- [ ] **1.5.1** Add `upload_queue` + `sync_state` tables (schema only; no network yet)
- [ ] **1.5.2** Offline: full local scan + timeline + manual capture queue
- [ ] **1.5.3** App restart: resume incomplete scan/processing from DB state

### 1.6 Phase 1 wrap-up

- [ ] **1.6.1** Test: first launch without account through onboarding to timeline
- [ ] **1.6.2** Test: edit persistence across app restarts
- [ ] **1.6.3** Externalize UI strings (prep for i18n)

### Phase 1 — notes & decisions

<!-- Add dated notes here -->

- 2026-05-17: First-session identity, onboarding progress, and the one-pet local profile are stored with Expo SecureStore. Onboarding now gates the app before the timeline and suggests a profile photo from the highest-scoring local media row.

---

## Phase 2 — Mobile backend integration

**Blocked until** Supabase project, migrations, and Edge Functions exist. Mobile tasks only — backend tracked separately.

### 2.1 Configuration & auth bridge

- [ ] **2.1.1** Env config: `EXPO_PUBLIC_SUPABASE_URL`, anon key
- [ ] **2.1.2** Link local `anonymous_user_id` to Supabase user record
- [ ] **2.1.3** Create/link pet record on server after local pet profile exists

### 2.2 Upload pipeline (`storage`, `sync`)

- [ ] **2.2.1** Compress images (~1280px max width) + generate thumbnail before upload
- [ ] **2.2.2** Upload **selected event media only** — never full camera roll
- [ ] **2.2.3** Implement `upload_queue` worker: pending → uploading → done / failed
- [ ] **2.2.4** Retry with backoff; persist `last_error`
- [ ] **2.2.5** Deduplicate uploads by local asset / event id
- [ ] **2.2.6** Signed URL or token flow for R2 (via Edge Function)

### 2.3 Sync & timeline merge

- [ ] **2.3.1** `create-event` idempotent sync from local event
- [ ] **2.3.2** Merge remote captions/types into local timeline when AI job completes
- [ ] **2.3.3** Background sync when network returns
- [ ] **2.3.4** UI: subtle sync status (no “Uploading assets…” technical copy)

### 2.4 AI presentation (`ai`)

- [ ] **2.4.1** Poll or subscribe for `ai_jobs` completion per event
- [ ] **2.4.2** Parse caption JSON contract; validate against shared schema
- [ ] **2.4.3** Low-confidence fallback captions (safe, non-invented)
- [ ] **2.4.4** Never surface “AI” in user-facing copy

### Phase 2 — notes & decisions

<!-- Add dated notes here -->

---

## Phase 3 — Polish

**Goal:** First session feels simple, calm, and useful.

### 3.1 Onboarding & permissions

- [ ] **3.1.1** Refine onboarding animations and pacing
- [ ] **3.1.2** Limited-access flow: process available photos + prompt to grant more later
- [ ] **3.1.3** Privacy copy: what is scanned, what is uploaded, what stays on device

### 3.2 Timeline & event UX

- [ ] **3.2.1** Timeline visual polish (typography, spacing, image aspect ratios)
- [ ] **3.2.2** Event detail polish (transitions, edit affordances)
- [ ] **3.2.3** Floating `+` for capture (per layout guidelines)
- [ ] **3.2.4** Pull-to-refresh / incremental rescan behavior

### 3.3 Reliability & edge cases

- [ ] **3.3.1** Error states: scan failure, processing failure, upload failure
- [ ] **3.3.2** Retry actions without losing local data
- [ ] **3.3.3** Low storage / low memory graceful degradation

### 3.4 Observability (minimal)

- [ ] **3.4.1** Basic analytics events (scan started, timeline shown, permission result) — provider TBD
- [ ] **3.4.2** Dev-only debug panel gated behind `__DEV__`

### 3.5 Release readiness

- [ ] **3.5.1** App icons and splash aligned with brand
- [ ] **3.5.2** iOS build via EAS (or dev client) with correct entitlements
- [ ] **3.5.3** TestFlight checklist from [Testing guidelines](../Tailo_Agent_Coding_Guidelines_v2.md#18-testing-guidelines)

### Phase 3 — notes & decisions

<!-- Add dated notes here -->

---

## Cross-cutting (ongoing)

- [ ] Keep shared types in `packages/shared`; avoid duplicating event/AI contracts in mobile
- [ ] No feature that requires registration for free-tier value
- [ ] No upload of full camera roll; no LLM-per-image calls
- [ ] UI copy: moments, memories, timeline — not “AI assistant”
- [ ] One pet in UI; `pet_id` on all local records for multi-pet readiness

---

## Suggested next task

**Start Phase 0 → task 0.1.2** (SQLite schema + migrations).

When picking up work, say: _“Continue from docs/MOBILE_TASKS.md — task 0.x.x”_ so work stays aligned with this plan.
