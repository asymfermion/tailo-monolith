# Phase 0 — Local Technical Spike

**Status:** In progress (wrap-up: device QA, performance)  
**Goal:** Believable local pet timeline from real photos — **no network, no account**  
**Success:** Photo access granted → grouped moments on timeline within ~60s of partial results

---

## Scope

| In scope                                                                                              | Out of scope                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Photo permission (full / limited / denied)                                                            | Supabase, R2, Edge Functions                     |
| Camera-roll scan (newest first)                                                                       | User registration / login                        |
| Pet detection pass 1 (dog/cat-aware detector contract + iOS Vision/Core ML path + heuristic fallback) | Device accuracy tuning and custom model training |
| Time-based event clustering                                                                           | AI captions                                      |
| Best-image selection (2–5 per event)                                                                  | Cloud upload                                     |
| Local SQLite + timeline UI                                                                            | Multi-pet UI                                     |

---

## High-level flow

```txt
App launch
  → SQLite migrate (WAL, foreign keys)
  → Check photo permission
  → [if allowed] scan recent photos (28-day window, paginated)
  → detect pet candidates + dog/cat type (batched detector)
  → cluster into event candidates
  → score + select 2–5 images per event
  → timeline reads ready/scored events
  → [background] scan older pages + re-run pipeline
```

All processing is **on-device**. Nothing leaves the phone in Phase 0.

---

## Runtime orchestration

**Entry:** `App.tsx` → `getDatabase()` → `AppShell` → `HomeScreen`

**Pipeline driver:** `usePhotoAccess` (`modules/mediaScanner/usePhotoAccess.ts`)

On permission grant (or “Look again”), runs sequentially:

1. `scanRecentPhotos` — persist to `local_assets`
2. `processPendingPetCandidates` — update `is_pet_candidate`, `pet_confidence`
3. `clusterLocalPetEvents` — write `local_event_candidates`
4. `selectBestEventImages` — write `local_media_scores`, set `candidate_status` + `selected_asset_ids`
5. `continueOlderPhotoPipeline` (fire-and-forget) — `scanOlderPhotos` + steps 2–4

UI progress flags: `isScanning`, `isDetectingPets`, `isClusteringEvents`, `isSelectingImages`.

**Timeline:** `useTimelineEvents` → `getTimelineEvents` — refreshes when pipeline completes (via parent refresh key / re-mount patterns on `HomeScreen`).

---

## Module map

| Module                    | Responsibility                                | Key files                                                                                                                               |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `mediaScanner`            | Permission, roll pagination, asset ingest     | `permissions.ts`, `scanner.ts`, `assetMapper.ts`, `usePhotoAccess.ts`                                                                   |
| `eventBuilder`            | Pet detection, clustering, scoring, selection | `petDetector/`, `petHeuristic.ts`, `petDetection.ts`, `clustering.ts`, `eventClustering.ts`, `mediaScoring.ts`, `bestImageSelection.ts` |
| `timeline`                | Load events for UI                            | `useTimelineEvents.ts`                                                                                                                  |
| `db`                      | SQLite access, migrations, queries            | `index.ts`, `migrations.ts`, `localAssets.ts`, `localEventCandidates.ts`, `localMediaScores.ts`, `timelineEvents.ts`                    |
| `navigation`              | Minimal stack (Home only)                     | `AppShell.tsx`, `stack.ts`, `routes.ts`                                                                                                 |
| `sync` / `storage` / `ai` | Stubs                                         | Phase 2                                                                                                                                 |

---

## Local data model

SQLite database: `tailo.db` (schema version **2**).

### `local_assets`

Scanned camera-roll items.

| Column                                                    | Notes                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `local_asset_id`                                          | Stable ID from media library                                         |
| `uri`, `created_at`, `width`, `height`, `media_type`      | From `expo-media-library`                                            |
| `processing_status`                                       | `pending` → `processing` → `processed` / `failed`                    |
| `is_pet_candidate`, `pet_confidence`, `detected_pet_type` | Set by detection pass (`detected_pet_type`: `dog`, `cat`, or `NULL`) |

### `local_event_candidates`

Grouped moments before any cloud sync.

| Column               | Notes                                |
| -------------------- | ------------------------------------ |
| `local_event_id`     | Generated per cluster                |
| `timestamp`          | Anchor time (first asset in cluster) |
| `source`             | `camera_roll` in Phase 0             |
| `candidate_status`   | `pending` → … → `scored` / `ready`   |
| `selected_asset_ids` | JSON array of 2–5 asset IDs          |

### `local_media_scores`

Per-asset scores within an event.

| Column                                                                         | Notes                   |
| ------------------------------------------------------------------------------ | ----------------------- |
| `sharpness`, `brightness`, `subject_visibility`, `uniqueness`, `overall_score` | 0–1 normalized          |
| `is_primary`                                                                   | One thumbnail per event |

**Domain types:** `apps/mobile/src/types/` — `LocalAsset`, `LocalEventCandidate`, `TimelineEvent`, etc.

---

## Pipeline details

### 1. Media scan (`mediaScanner`)

- **Window:** last **28 days** first (`INITIAL_SCAN_WINDOW_DAYS`)
- **Page size:** 50 photos, **newest first** (`SortBy.creationTime` desc)
- **Older pass:** up to **4** additional pages beyond window (`scanOlderPhotos`)
- **Persist:** `upsertLocalAssets` — idempotent by `local_asset_id`

### 2. Pet detection — pass 1 (`eventBuilder`)

**Current implementation:** native-preferred dog/cat detection behind the `PetDetector` contract (`eventBuilder/petDetector/`).

- iOS native module: `TailoPetClassifier` local Expo module
- Native path loads bundled `TailoPetClassifier.mlmodelc` when present
- If no bundled model is present, native path uses Apple Vision's built-in `VNClassifyImageRequest`
- JS fallback path uses hash + aspect-ratio score → `pet_confidence`
- JS fallback threshold: **0.68** → `is_pet_candidate`
- Candidate assets receive `detected_pet_type: 'dog' | 'cat'`; non-candidates remain `NULL`
- Batched via `processPendingPetCandidates` (non-blocking UI between batches)
- If the native module or model is unavailable, `createFallbackPetDetector` falls back to the heuristic detector

**Follow-up:** Rebuild an Expo dev client and validate `dog | cat | other` classification on real iPhone photo libraries. A custom trained `TailoPetClassifier.mlmodel` can be added later without changing the JS pipeline or SQLite shape.

### 3. Clustering (`eventBuilder/clustering.ts`)

- Input: pet-candidate assets only
- **Dedupe:** same second + same dimensions → keep one
- **Cluster rule:** same UTC day + within **20 minutes** → one event
- Output: `NewLocalEventCandidate[]`, newest events first

### 4. Best image selection (`eventBuilder`)

- Score each asset in cluster (`mediaScoring.ts`)
- Select **2–5** highest `overall_score`
- Mark **one** `is_primary` for timeline thumbnail
- Set `candidate_status` to `scored` / `ready` for timeline query

### 5. Timeline presentation

- Query: `candidate_status IN ('scored', 'ready')`, `ORDER BY timestamp DESC`
- **Placeholder:** `eventType: 'unknown'`, `caption: null` (Phase 2 AI)
- UI: calm copy, image grid, loading / empty states per permission and scan phase

---

## UI & navigation

- **Single route:** `Home` (`navigation/routes.ts`)
- **Stack:** lightweight reducer in `navigation/stack.ts` (ready for Event detail later)
- **Theme:** `constants/theme.ts` — off-white background, muted text, single accent
- **Copy:** on-device framing only (see AGENTS.md privacy rules)

---

## Testing strategy

| Layer       | Tool                           | Focus                                                       |
| ----------- | ------------------------------ | ----------------------------------------------------------- |
| Pure logic  | Jest                           | clustering, detector fallback, heuristics, scoring, mappers |
| DB helpers  | Jest + mocked `SQLiteDatabase` | upserts, timeline query                                     |
| Permissions | Jest                           | normalize permission states                                 |
| UI          | Manual on device               | full / limited / denied, performance                        |

No real photo library in CI.

---

## Known limitations (Phase 0)

- Pet detection has an iOS native classifier path, but real-device accuracy has not been validated in this environment; Expo Go still falls back to the JS heuristic because local native modules require a dev client
- No incremental timeline refresh subscription — refresh tied to scan lifecycle on Home
- No `upload_queue` / `sync_state` tables yet (Phase 1.5.1)
- Event types and captions are placeholders until backend AI (Phase 2)
- Android supported by Expo but **iOS-first** validation

---

## Phase 0 → Phase 1 handoff

Phase 1 will add without breaking Phase 0 tables:

- `anonymous_user_id` (SecureStore)
- Pet profile + onboarding screens
- `upload_queue` / `sync_state` schema (local only until Phase 2)
- In-app capture (`source: in_app`)
- Event detail + edit (caption, type, favorite)

---

## Change log

| Date       | Change                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 2026-05-17 | Initial Phase 0 architecture doc (reflects implemented pipeline 0.1–0.6)                                         |
| 2026-05-17 | Added dog/cat detection contract, `detected_pet_type` schema v2, and native detector fallback note               |
| 2026-05-17 | Added `TailoPetClassifier` local Expo module for iOS Vision/Core ML classification with built-in Vision fallback |
