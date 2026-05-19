# Tailo Mobile — Development Tasks

Task plan for the mobile app. Work top-to-bottom within each phase; later phases depend on earlier ones.

**References:** [Architecture](./ARCHITECTURE.md) · [Phase 0 design](./architecture/phase-0-local-spike.md) · [Developer guide](./DEVELOPER.md) · [Agent guidelines](../Tailo_Agent_Coding_Guidelines_v2.md)

**How to use:** Check off tasks as completed (`[x]`). Add notes or PR links inline when useful. Pick the next unchecked task in the current phase.

**GitHub tracking:** Each task has a matching issue in [asymfermion/tailo-monolith](https://github.com/asymfermion/tailo-monolith/issues?q=label%3Amobile-tasks), organized on the [Tailo mobile project board](https://github.com/users/asymfermion/projects/2). Filter issues by phase label (`setup`, `phase-0`, `phase-1`, `phase-2`, `phase-3`, `cross-cutting`). Closed issues = completed tasks; use the board for status and prioritization.

---

## Status snapshot

| Phase   | Focus                                       | Status      |
| ------- | ------------------------------------------- | ----------- |
| Setup   | Dev environment, monorepo, modules scaffold | Done        |
| Phase 0 | Local technical spike (no backend)          | In progress |
| Phase 1 | Local MVP foundation                        | Not started |
| Phase 2 | Mobile + backend integration                | Not started |
| Phase 3 | Polish & first-session UX                   | Not started |

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
- [x] **0.3a.6** Validate dog/cat/other accuracy on real iPhone photo libraries

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

- 2026-05-17: Pet detection uses a `PetDetector` abstraction. The iOS local Expo module (`TailoPetClassifier`) uses a bundled Core ML model when present, otherwise Apple Vision on-device animal detection, with heuristic fallback when native is unavailable. `detected_pet_type` is persisted for `dog | cat | null`.
- 2026-05-18: **0.3a.6** — dog/cat detection validated on a real iPhone photo library with an Expo dev client build (native path + confidence threshold; timeline reflects pet photos only).
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

- [x] **1.2.1** Promote `local_event_candidate` → local `Event` with stable IDs
- [x] **1.2.2** Track `processing_state` per asset/candidate (pending, processed, failed)
- [x] **1.2.3** Map local events to shared `@tailo/shared` types where appropriate
- [x] **1.2.4** Store `last_scan_timestamp` for incremental rescans

### 1.3 Timeline & event detail

- [x] **1.3.1** Event detail screen: larger gallery, timestamp, type, placeholder caption
- [x] **1.3.2** Basic event editing: caption, event type, favorite toggle (local only)
- [x] **1.3.3** Favorite filter or visual indicator on timeline
- [x] **1.3.4** Top area: pet profile summary + “Ask Tailo” entry (UI shell only — no AI yet)

### 1.4 Active capture (`capture`)

- [x] **1.4.1** In-app camera screen using `expo-camera`
- [x] **1.4.2** Save capture to local storage + create manual event (`source: in_app`)
- [x] **1.4.3** Preview / confirm before adding to timeline
- [x] **1.4.4** Works when photo library permission is denied

### 1.5 Local data hardening

- [x] **1.5.1** Add `upload_queue` + `sync_state` tables (schema only; no network yet)
- [x] **1.5.2** Offline: full local scan + timeline + manual capture queue
- [x] **1.5.3** App restart: resume incomplete scan/processing from DB state

### 1.6 Phase 1 wrap-up

- [x] **1.6.1** Test: first launch without account through onboarding to timeline
- [x] **1.6.2** Test: edit persistence across app restarts
- [x] **1.6.3** Externalize UI strings (prep for i18n)

### Phase 1 — notes & decisions

- 2026-05-17: First-session identity, onboarding progress, and the one-pet local profile are stored with Expo SecureStore. Onboarding now gates the app before the timeline and suggests a profile photo from the highest-scoring local media row.
- 2026-05-18: **1.2** — SQLite v4 adds `local_events` (promoted timeline rows with `pet_id`, `processing_state`, caption/type/favorite fields). Scored `local_event_candidates` promote via `promoteScoredCandidatesToLocalEvents` after image selection; timeline reads `local_events` (not candidates). `mapLocalEventToSharedEvent` maps to `@tailo/shared` `Event`. `last_scan_timestamp` stored in SecureStore after each successful scan batch.
- 2026-05-18: **1.3** — `EventDetail` route with gallery + local edits (caption, type, favorite). Timeline favorites filter + star indicator. Pet profile header and Ask Tailo shell on Home.
- 2026-05-18: **1.4** — In-app camera (`Capture` / `CapturePreview`), persist to app documents, `createInAppCaptureEvent` writes `local_assets` + `local_events` with `source: in_app`. Floating + on Home works without photo library permission.
- 2026-05-18: **1.5** — SQLite v5 adds `upload_queue` + `sync_state`. Promoted/captured events enqueue pending uploads (no network worker yet). Pipeline scan cursor + phase persisted; app restart resumes incomplete scan/processing instead of always re-scanning.
- 2026-05-18: **1.6.1–1.6.2** — Manual QA: welcome → scan → pet select → profile → timeline without account; event detail edits (caption, type, favorite) persist after force-quit and relaunch.
- 2026-05-18: **1.6.3** — User-facing copy moved to `apps/mobile/src/i18n/` (`locales/en.ts`, `t()`, dynamic helpers under `i18n/messages/`). Screens and timeline modules consume `t()` instead of inline strings.

---

## Phase 2 — Mobile + backend integration

This phase now tracks both the mobile client work and the backend work needed to ship sync, uploads, and AI enrichment. Specs: [phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md).

### 2.1 Configuration & auth (anonymous-first)

- [x] **2.1.1** Env config: `EXPO_PUBLIC_SUPABASE_URL`, anon key; Supabase client + session in SecureStore
- [x] **2.1.2** On launch: `signInAnonymously()` if no session (no login UI)
- [x] **2.1.3** One-time legacy bridge: Phase 1 `anonymous_user_id` → `link-anonymous-user` after first session (upgrades only)
- [x] **2.1.4** Create/link pet record on server after local pet profile exists (`upsert-pet`)
- [x] **2.1.5** Account upgrade UI (settings): **email** via `updateUser` + OTP (`verifyOtp`); Apple / Google deferred

### 2.2 Upload pipeline (`storage`, `sync`)

- [x] **2.2.1** Compress per [upload spec](./architecture/phase-2-backend-mvp.md#compression--files-mvp-defaults): original 1280px JPEG, thumb 400px; HEIC→JPEG; strip GPS EXIF
- [x] **2.2.2** Upload **selected event media only** — never full camera roll
- [x] **2.2.3** Implement `upload_queue` worker: pending → uploading → done / failed
- [x] **2.2.4** Retry with backoff; persist `last_error`
- [x] **2.2.5** Deduplicate uploads by local asset / event id
- [x] **2.2.6** Signed URL or token flow for uploads (Supabase Storage via Edge Function; R2 optional later)

### 2.3 Sync & timeline merge

- [x] **2.3.1** `sync-event` payload: local ids, media paths, `user_edited` flags, `client_sync_version` (see [sync spec](./architecture/phase-2-backend-mvp.md#sync-specification))
- [x] **2.3.2** Poll `get-event-updates` (~30s when pending AI); merge per [field matrix](./architecture/phase-2-backend-mvp.md#field-merge-matrix) — do not overwrite user-edited caption/type
- [x] **2.3.3** Background sync when network returns
- [x] **2.3.4** UI: subtle sync status (no “Uploading assets…” technical copy)

### 2.4 AI presentation (`ai`)

- [x] **2.4.1** Poll or subscribe for `ai_jobs` completion per event
- [x] **2.4.2** Parse caption JSON contract; validate against shared schema
- [x] **2.4.3** Low-confidence fallback captions (safe, non-invented)
- [x] **2.4.4** Never surface “AI” in user-facing copy

### 2.5 Backend setup (`supabase`, `packages/backend-core`)

- [x] **B0.1** Create Supabase **dev** project; record project ref + region in Setup notes (not secret)
- [x] **B0.2** Enable **Anonymous** sign-ins
- [x] **B0.3** Enable **Manual linking** (for future Apple/Google/email; no UI yet)
- [x] **B0.4** Add `supabase/config.toml`, `migrations/`, `functions/`
- [x] **B0.5** `apps/mobile/.env.example`: `EXPO_PUBLIC_SUPABASE_URL`, anon key
- [x] **B0.6** Document local workflow in [DEVELOPER.md](./DEVELOPER.md) (`supabase start`, `db push`, `functions serve`)
- [x] **B0.7** Scaffold `packages/backend-core/` (`contracts/`, `usecases/`, `repositories/`) — initial `linkAnonymousUser` use case
- [x] **B0.8** `packages/shared`: zod schemas for `sync-event`, `get-event-updates`, AI result (match specs); `create-upload-urls` contract added
- [ ] **B0.9** GitHub issues / labels for `backend-tasks` (optional; mirror mobile board)

### 2.6 Backend schema & RLS (`supabase/migrations`)

- [x] **B2.1.1** `profiles` — `user_id` PK, `created_at`
- [x] **B2.1.2** `anonymous_id_links` — unique `anonymous_user_id`, FK `user_id`; reject insert if legacy id maps to different user
- [x] **B2.1.3** `pets` — include `source_local_pet_id` unique per `user_id`
- [x] **B2.1.4** `events` — unique `(user_id, source_local_event_id)`; `user_edited_caption`, `user_edited_event_type`, `sync_version`, `updated_at`, `caption_source` (minimal migration for uploads)
- [x] **B2.1.5** `event_media` — unique `(event_id, source_local_asset_id)`; storage paths
- [x] **B2.1.6** `ai_jobs` — `next_attempt_at`, `leased_until`, `input_snapshot`, status enum per spec
- [x] **B2.1.7** RLS: `auth.uid() = user_id` on all user-owned tables
- [x] **B2.1.8** RLS: `event_media` via join to `events` ownership
- [x] **B2.1.9** Indexes: `events(user_id, updated_at)`, unique `(user_id, source_local_event_id)`, `ai_jobs(status, next_attempt_at)`, `event_media(event_id)`
- [ ] **B2.1.10** SQL smoke: user A cannot read/write user B rows

### 2.7 Backend auth & upload APIs (`functions`, `backend-core`)

- [x] **B2.2.1** Private bucket `event-media`
- [x] **B2.2.2** Path layout per [upload spec](./architecture/phase-2-backend-mvp.md#upload-specification)
- [x] **B2.2.3** Storage policies: read/write only under `auth.uid()` prefix
- [x] **B2.2.4** Enforce JPEG only, 15 min signed URL TTL, 1–5 assets per request
- [x] **B2.2.5** Document max sizes: original <=3 MB post-compress, thumb <200 KB target
- [ ] **B2.4.0** Implement auth edge-case policy in `backend-core` + tests
- [x] **B2.4.1** Edge Function `link-anonymous-user` + unit tests
- [x] **B2.4.2** Edge Function `upsert-pet` + unit tests (idempotent `source_local_pet_id`)
- [x] **B2.3.4** `validateUploadRequest()` — pet ownership, 1–5 assets, duplicate asset ids rejected
- [x] **B2.3.4a** Unit tests: over limit, wrong pet, expired retry
- [x] **B2.4.3** `create-upload-urls` — returns paired URLs + paths + `expires_at`
- [ ] **B2.4.3a** Integration test: signed PUT with wrong `Content-Type` fails (if enforceable)

### 2.8 Backend sync & AI (`functions`, `packages/ai`)

- [x] **B2.3.5** `syncEvent()` — idempotent upsert; full media replace; increment `sync_version`
- [x] **B2.3.6** Merge matrix per [sync spec](./architecture/phase-2-backend-mvp.md#sync-specification) + unit tests
- [x] **B2.3.7** `createAiJob()` — rules from the AI spec
- [x] **B2.3.8** `applyAiResultToEvent()` — confidence threshold 0.5; respect `user_edited_*` flags
- [x] **B2.3.9** `getEventUpdates()` — cursor pagination, max 50
- [x] **B2.4.4** `sync-event` — enqueue AI; return `event_id`, `server_sync_version`, `ai_job`
- [x] **B2.4.5** `get-event-updates` — cursor in/out; include AI status
- [x] **B2.4.6** Shared handler: CORS, error codes (`401`, `409`, `422`), no tokens in logs
- [x] **B2.5.1** `process-ai-job` — lease + `pending` → `processing` → `done`/`failed`
- [ ] **B2.5.2** Vertex/GCP secrets in Supabase; prompt in `packages/ai` — see [supabase/GCP_VERTEX_SETUP.md](../supabase/GCP_VERTEX_SETUP.md) + `./scripts/set-gcp-vertex-secrets.sh`
- [x] **B2.5.3** Retry/backoff: 1m / 5m / 15m; max 3 attempts
- [x] **B2.5.4** Post-parse: caption max 280 chars; safety filter (no medical / “AI” phrasing)
- [x] **B2.5.5** Trigger: invoke from `sync-event` on enqueue (happy path)
- [ ] **B2.5.7** Server AI sweep — mobile poll is UX only, not the only guarantee:
  - Scheduled `process-ai-job` (Supabase cron / `pg_cron`, every **2–5 min**) to drain `pending` jobs and re-invoke after backoff
  - Lease recovery: if `status = 'processing'` and `leased_until < now()`, reset to `pending` so the next sweep can pick it up
- [x] **B2.5.6** Unit tests: low confidence → placeholder; user_edited → no overwrite
- [x] **B2.4.7** Deploy all functions to dev; document base URLs for mobile

### 2.10 Future — image-level pet validation (not MVP)

- [ ] **B2.10.1** Per-asset validation in `process-ai-job` (not only primary); drop failed `event_media` rows only
- [ ] **B2.10.2** Event stays on timeline when ≥1 asset passes; reassign `is_primary`
- [ ] **B2.10.3** Mobile merge: prune `selected_asset_ids` / scores per asset instead of `deletePromotedLocalEvent` on event-level `rejected`

**Current behavior (event-level):** Vertex sees the primary image only; if validation fails → delete all server media for the event, `pet_validation_status = rejected`, phone removes the whole local moment. See [FUTURE_FEATURES.md](./FUTURE_FEATURES.md#6-image-level-cloud-pet-validation).

### 2.9 Backend hardening & QA

- [ ] **B2.6.1** All functions reject missing/invalid JWT
- [ ] **B2.6.2** Upload URLs scoped to event paths; expired URL returns 403
- [ ] **B2.6.3** `npm audit` on function bundles
- [ ] **B2.6.4** Auth: fresh anonymous user; legacy link; duplicate legacy link → 409
- [ ] **B2.6.5** Upload: 1 asset; 5 assets; 6 assets → 422
- [ ] **B2.6.6** Sync: double `sync-event` idempotent; user caption survives AI job
- [ ] **B2.6.7** Sync: user_edited blocks AI overwrite on poll merge
- [ ] **B2.6.8** AI: failed job after 3 attempts; pending retry respects `next_attempt_at`
- [ ] **B2.6.9** Document session loss → new anonymous user as known limitation
- [ ] **B2.6.10** Staging project checklist (when ready); prod secrets separate

### Phase 2 — notes & decisions

- 2026-05-18: **2.3 / 2.4** — After upload batch completes, `runEventSyncForLocalEvent` posts `sync-event`; `useEventUpdatesPoll` + `useBackgroundSync` poll `get-event-updates` and merge without overwriting user-edited fields. Timeline captions use `resolveDisplayCaption` from `@tailo/ai`. Edge AI defaults to `AI_PROVIDER=stub` until GCP Vertex secrets are set.
- 2026-05-18: **2.1.3** — `linkLegacyAnonymousUserIfNeeded()` after auth bootstrap; Edge Function `link-anonymous-user`; migration `profiles` + `anonymous_id_links`; `resolveLinkAnonymousUser` in `@tailo/backend-core`. Deploy: `npx supabase db push` + `npx supabase functions deploy link-anonymous-user`.
- 2026-05-18: **Auth decouple** — `AuthProvider` + `authService` (`modules/auth/`); Supabase isolated in `providers/supabaseAuthProvider.ts`. Portability rules in [AGENTS.md](../AGENTS.md#backend-portability-phase-2).
- 2026-05-18: **2.1.2** — `bootstrapAuthSession()` on app launch (reuse persisted session or `signInAnonymously()`); skips when env unset; does not block local SQLite if auth fails.
- 2026-05-18: **B0 / 2.1.1** — Dev project `sgxtyxvithlmuuofkzlk`; `supabase/` scaffold + [SETUP.md](../supabase/SETUP.md); mobile `getSupabaseClient()` with SecureStore session (`apps/mobile/src/lib/supabase.ts`). Postgres URI is CLI-only; mobile uses API URL + anon key.
- 2026-05-18: Auth model — **Supabase `signInAnonymously()`** is canonical; Phase 1 SecureStore `anon_*` is legacy-only via `anonymous_id_links`. Permanent providers (Apple/Google/email) via identity linking later; same `user.id`. See [architecture/phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md#1-identity--auth).
- 2026-05-18: Upload/sync/AI numbers and merge rules live in phase-2 spec; backend tasks are tracked inline in this Phase 2 section with `B...` task IDs preserved.

---

## Phase 3 — Polish

**Goal:** First session feels simple, calm, and useful.

### 3.0 Navigation & app structure

- [ ] **3.0.1** Define main app pages: `Timeline`, `Pet profile`, `Settings`
- [ ] **3.0.2** Settings IA: user account settings, localisation, and app preferences
- [ ] **3.0.3** Replace the lightweight temporary stack with the long-term app navigation shell
- [ ] **3.0.4** Keep capture, capture preview, event detail, and future edit/share flows as secondary routes or modals under the main pages

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

**Phase 0 → task 0.7.1** — manual test matrix (full / limited / denied photo access; many vs few pet photos; duplicates).

When picking up work, reference the GitHub issue (e.g. _“Continue #25”_) or task ID in `docs/MOBILE_TASKS.md`.
