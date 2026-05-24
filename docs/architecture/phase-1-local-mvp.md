# Phase 1 — Local MVP

**Status:** In progress  
**Goal:** Local-first product shell — identity, onboarding, promoted events, timeline polish — **still no backend**  
**Builds on:** [phase-0-local-spike.md](./phase-0-local-spike.md)

---

## Scope

| In scope (Phase 1)                            | Out of scope                         |
| --------------------------------------------- | ------------------------------------ |
| Anonymous session id (SecureStore)            | Supabase auth / sync                 |
| Onboarding + local pet profile                | AI captions (Phase 2)                |
| Promoted `local_events` + processing state    | Multi-pet UI                         |
| `last_scan_timestamp` for incremental rescans | Full upload pipeline (Phase 1.5 / 2) |
| Event detail + edit (1.3 — planned)           | Paywall / login                      |
| In-app capture (1.4 — planned)                |                                      |

---

## High-level flow (extends Phase 0)

```txt
App launch
  → SQLite migrate (current schema version 4)
  → [if onboarding incomplete] onboarding screens
  → [if allowed] Phase 0 pipeline: scan → detect → cluster → score/select
  → promote scored candidates → local_events
  → timeline reads local_events (processing_state = processed)
  → last_scan_timestamp updated after each successful scan batch
```

**Pipeline driver:** still `usePhotoAccess` — adds step 5 after image selection:

5. `promoteScoredCandidatesToLocalEvents` — upsert `local_events`, mark candidates `processing_state = processed`

---

## 1.1 Identity & onboarding (done)

| Piece               | Storage      | Key module / file                 |
| ------------------- | ------------ | --------------------------------- |
| Anonymous user id   | SecureStore  | `modules/auth/identity.ts`        |
| Onboarding progress | SecureStore  | `modules/auth/onboardingState.ts` |
| Pet profile         | SecureStore  | `modules/pets/petProfile.ts`      |
| Profile photo hint  | SQLite query | `db/profilePhotoSuggestion.ts`    |

Onboarding gates the app before the main timeline. One pet in UI; `pet_id` on events uses `resolveLocalPetId()` (`local_pet_default` until profile id is assigned).

---

## 1.2 Event model & processing state (done)

### Schema migrations

| Version | Change                                                                 |
| ------- | ---------------------------------------------------------------------- |
| **3**   | Optional `detection_source`, `detection_debug_label` on `local_assets` |
| **4**   | `local_events` table; `processing_state` on `local_event_candidates`   |

### `local_event_candidates` (additions)

| Column             | Notes                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `processing_state` | `pending` → `processing` → `processed` / `failed` (promotion lifecycle) |

`candidate_status` still tracks clustering/scoring (`pending` → `scored`). Promotion runs when `candidate_status = 'scored'` and `processing_state = 'pending'`.

### `local_events`

Promoted timeline rows — stable `local_event_id` matches the originating candidate.

| Column                                      | Notes                                       |
| ------------------------------------------- | ------------------------------------------- |
| `local_event_id`                            | Same ID as cluster/candidate                |
| `pet_id`                                    | From `resolveLocalPetId()`                  |
| `timestamp`, `source`                       | Copied from candidate                       |
| `event_type`                                | Default `unknown` until edit / AI (Phase 2) |
| `caption`, `confidence`, `caption_language` | Nullable placeholders                       |
| `is_favorite`                               | Local toggle (Phase 1.3 edit UI)            |
| `processing_state`                          | `processed` when shown on timeline          |
| `selected_asset_ids`                        | JSON array of 2–5 asset IDs                 |

Migration v4 **backfills** existing scored candidates into `local_events`.

### Promotion

**Module:** `modules/eventBuilder/eventPromotion.ts` — `promoteScoredCandidatesToLocalEvents`

1. Load promotable candidates (`getPromotableEventCandidates`)
2. `markEventCandidatesProcessing`
3. `upsertLocalEvents` with resolved `pet_id`
4. `markEventCandidatesProcessed`

### Pet validation (cloud, not on-device)

End-to-end sync diagrams (upload, poll, merge, AI): [phase-2-backend-mvp.md § Data syncing workflow](./phase-2-backend-mvp.md#data-syncing-workflow).

On-device pet detection is used only to **find candidates** during scan. **Authoritative validation** for promoted moments happens in **`process-ai-job`** (Vertex): the model returns `profilePetValid`, `visiblePetType`, and `petValidationConfidence` alongside caption JSON.

If validation fails (checked on the **primary** image only), the server sets `pet_validation_status = rejected`, **`deleted_at`**, and deletes **all** `event_media`. Poll delivers `deleted_at` to the phone; the local row is **hidden** (`local_events.deleted_at`) but media stays on device until a future user delete (B2.11). Per-image rejection is not implemented yet — see [FUTURE_FEATURES.md](../FUTURE_FEATURES.md#6-image-level-cloud-pet-validation).

**DB:** `db/localEvents.ts`, `db/localEventCandidates.ts` (processing state helpers)

### Shared contract

`lib/eventMapper.ts` — `mapLocalEventToSharedEvent` → `@tailo/shared` `Event`

### Timeline query

`getTimelineEvents` reads **`local_events`** where `processing_state = 'processed'`, not raw candidates.

### Incremental rescans

- `last_scan_timestamp` in SecureStore, set after each successful scan batch (`scanner.ts`).
- On app open / foreground (`usePhotoAccess` + `autoResumeOnMount`): delta scan uses `createdAfter` = max(newest promoted `local_events.timestamp`, `last_scan_timestamp`); first launch still uses the 28-day window when the library is empty.
- Interrupted scans persist `scan.created_after_ms` in `sync_state` so resume keeps the same cutoff.
- Passive camera-roll detection is intentionally quiet: onboarding and incremental scans promote at most **one auto-detected moment per UTC day per detected pet type**. When multiple clusters qualify for the same day/pet, the highest-confidence cluster wins, then larger cluster, then latest timestamp. Explicit in-app capture is not capped by this passive rule.

### Module additions (Phase 1.2)

| Module / path                    | Role                           |
| -------------------------------- | ------------------------------ |
| `db/localEvents.ts`              | Upsert/query promoted events   |
| `lib/eventMapper.ts`             | Local row → shared `Event`     |
| `pets/resolveLocalPetId.ts`      | Stable `pet_id` for promotions |
| `eventBuilder/eventPromotion.ts` | Candidate → event promotion    |

`clearLocalEventPipeline` also clears `local_events` (e.g. redetect flow).

---

## 1.3 Timeline & event detail (done)

### Navigation

- `EventDetail` route on the lightweight stack (`navigation/routes.ts`, `NavigationContext.tsx`)
- Home moment cards push detail with `localEventId`
- Current navigation is intentionally lightweight for Phase 1. In Phase 3, promote `Timeline`, `Pet profile`, and `Settings` to the main app pages, with capture/detail flows presented as secondary routes or modals.

### Event detail screen

`screens/EventDetailScreen.tsx` — larger vertical gallery, timestamp, type chips, caption field, favorite toggle. Edits persist via `updateLocalEvent` in `db/localEvents.ts`; reload through `useEventDetail`.

### Timeline UX

- `TimelineMomentCard` — tappable rows with ★ when favorited
- Favorites filter chip on Home (`getTimelineEvents({ favoritesOnly: true })`)
- `PetProfileHeader` — pet name/type/photo + **Ask Tailo** shell (expandable card, no AI)

### Shared formatters

`lib/formatMoment.ts` — `formatTimestamp`, `formatEventType`, `formatPetType`

### Localisation

- UI strings live under `src/i18n/`
- English remains the default locale
- Settings can switch the app to **Simplified Chinese** on-device
- Locale choice is stored locally and applied across the app shell

---

## 1.4 Active capture (done)

### Flow

```txt
Home (+ FAB) → Capture (expo-camera) → CapturePreview → confirm
  → persistCaptureImage (app documents/captures/)
  → createInAppCaptureEvent (asset + media score + local_events, source: in_app)
  → popToRoot Home (timeline refresh via captureCompletedNonce)
```

Camera permission is **separate** from photo library — capture works when library access is denied.

### Modules

| File                                  | Role                                       |
| ------------------------------------- | ------------------------------------------ |
| `capture/persistCaptureImage.ts`      | Copy temp capture to durable `file://` URI |
| `capture/buildInAppCaptureRecords.ts` | Pure record builder (tested)               |
| `capture/createInAppCaptureEvent.ts`  | SQLite writes + `detection_source: in_app` |
| `screens/CaptureScreen.tsx`           | Camera UI + permission gate                |
| `screens/CapturePreviewScreen.tsx`    | Retake / Add to timeline                   |
| `timeline/components/CaptureFab.tsx`  | Floating + entry on Home                   |

---

## 1.5 Local data hardening (done)

### Schema (v5)

**`upload_queue`** — one row per event media item awaiting cloud upload (Phase 2 worker). Status: `pending` | `uploading` | `done` | `failed`. Enqueued when events are promoted or captured in-app.

**`sync_state`** — key/value store for pipeline coordination (`pipeline.phase`, scan cursor `scan.after`, `scan.has_next`, etc.).

### Offline behavior (1.5.2)

- Timeline, capture, and local SQLite work without network.
- Upload rows are queued locally only; no upload worker until Phase 2.
- `enqueueEventMediaUploads` in `modules/sync/` called from promotion + in-app capture.

### Resume on restart (1.5.3)

- `getPipelineResumePlan` inspects DB for interrupted scan cursor, pending detection, scorable/promotable candidates.
- On launch: **resume** incomplete work, or **initial scan** only when the library is empty — no full re-scan every app open.
- `runLocalPipeline` / `resumeLocalPipeline` in `modules/mediaScanner/`.

---

## Planned (not yet documented in depth)

- **1.6** Phase 1 QA wrap-up

---

## Change log

| Date       | Change                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-19 | Incremental photo scan on app open/foreground: `createdAfter` from newest timeline moment + `last_scan_timestamp`; initial empty library still uses 28-day window |
| 2026-05-24 | Passive onboarding/incremental detection now promotes at most one auto-detected moment per UTC day per detected pet type; future paid tiers may relax this limit  |
| 2026-05-20 | Added on-device locale switching: English default + Simplified Chinese option in Settings, backed by `src/i18n/` and local persisted app locale                   |
| 2026-05-19 | Cloud pet validation in `process-ai-job`; rejected events omitted from `get-event-updates` (local moments kept on pull)                                           |
| 2026-05-18 | Phase 1 architecture doc created; documents 1.1 onboarding/identity and 1.2 `local_events`, processing state, promotion, shared mapper, scan timestamp            |
| 2026-05-18 | 1.3: Event detail screen, local event edits, favorites filter, pet profile header, Ask Tailo shell, `EventDetail` navigation                                      |
| 2026-05-18 | 1.4: In-app camera capture, preview confirm, `source: in_app` events, FAB without photo library                                                                   |
| 2026-05-18 | 1.5: `upload_queue` + `sync_state` (v5), offline enqueue, pipeline resume on app restart                                                                          |
