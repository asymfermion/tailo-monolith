# Phase 0 — Local Technical Spike

**Status:** Complete (spike); superseded for timeline reads by [phase-1-local-mvp.md](./phase-1-local-mvp.md)  
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
  → timeline reads scored event candidates
  → [background] scan older pages + re-run pipeline
```

All processing is **on-device**. Nothing leaves the phone in Phase 0.

> **Phase 1+:** After selection, candidates are promoted to `local_events`; see [phase-1-local-mvp.md](./phase-1-local-mvp.md).

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

**Timeline (Phase 0):** `useTimelineEvents` → `getTimelineEvents` — queried `local_event_candidates` with `candidate_status IN ('scored', 'ready')`. **Current app:** reads promoted `local_events` (Phase 1.2).

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

SQLite database: `tailo.db` (Phase 0 ended at schema version **2**; later migrations in Phase 1).

### `local_assets`

Scanned camera-roll items.

| Column                                                    | Notes                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `local_asset_id`                                          | Stable ID from media library                                         |
| `uri`, `created_at`, `width`, `height`, `media_type`      | From `expo-media-library`                                            |
| `processing_status`                                       | `pending` → `processing` → `processed` / `failed`                    |
| `is_pet_candidate`, `pet_confidence`, `detected_pet_type` | Set by detection pass (`detected_pet_type`: `dog`, `cat`, or `NULL`) |

### `local_event_candidates`

Grouped moments before promotion (Phase 1.2).

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

- iOS native module: `TailoPetClassifier` local Expo module (requires Expo **dev client**, not Expo Go)
- Native path loads bundled `TailoPetClassifier.mlmodelc` when present
- Otherwise uses Apple Vision **`VNRecognizeAnimalsRequest`** (dog/cat only)
- Minimum confidence **0.35** on native results (JS + Swift); low-confidence labels are not pet candidates
- Heuristic fallback does **not** mark pets (`is_pet_candidate = 0`) — avoids fake timelines when native is unavailable
- Candidate assets receive `detected_pet_type: 'dog' | 'cat'`; non-candidates remain `NULL`
- Batched via `processPendingPetCandidates` (one photo at a time, 12s timeout per photo)
- **Redetect pets** on Home resets processed assets and re-runs detection

**Device validation (0.3a.6):** Validated on a real iPhone photo library with a dev client build. Optional follow-up: custom `TailoPetClassifier.mlmodel` for higher accuracy without changing the SQLite shape.

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

### 5. Timeline presentation (Phase 0)

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

- Pet detection requires an Expo **dev client**; Expo Go does not load `TailoPetClassifier` (heuristic fallback does not create pet candidates)
- Initial scan window is **28 days** (+ limited older pages); very old pet photos may be missing until background scan completes
- No incremental timeline refresh subscription — refresh tied to scan lifecycle on Home
- No `upload_queue` / `sync_state` tables yet (Phase 1.5.1)
- Event types and captions are placeholders until backend AI (Phase 2)
- Android supported by Expo but **iOS-first** validation

---

## Phase 0 → Phase 1 handoff

Continued in **[phase-1-local-mvp.md](./phase-1-local-mvp.md)**:

- `anonymous_user_id` (SecureStore) — done (1.1)
- Pet profile + onboarding screens — done (1.1)
- Promoted `local_events` + processing state — done (1.2)
- `upload_queue` / `sync_state` schema (local only until Phase 2) — planned (1.5)
- In-app capture (`source: in_app`) — planned (1.4)
- Event detail + edit (caption, type, favorite) — planned (1.3)

---

## Change log

| Date       | Change                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-17 | Initial Phase 0 architecture doc (reflects implemented pipeline 0.1–0.6)                                                      |
| 2026-05-17 | Added dog/cat detection contract, `detected_pet_type` schema v2, and native detector fallback note                            |
| 2026-05-17 | Added `TailoPetClassifier` local Expo module for iOS Vision/Core ML classification with built-in Vision fallback              |
| 2026-05-18 | Pet detection: `VNRecognizeAnimalsRequest`, confidence floor 0.35, non-pet heuristic fallback; 0.3a.6 device validation noted |
| 2026-05-18 | Moved Phase 1.1+ content to [phase-1-local-mvp.md](./phase-1-local-mvp.md); restored Phase 0 scope in this doc                |
