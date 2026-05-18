# Phase 2 — Backend MVP

**Status:** Planned  
**Goal:** Add sync, upload, and AI interpretation to the local-first app without coupling core business logic to Supabase.  
**Builds on:** [phase-1-local-mvp.md](./phase-1-local-mvp.md)

---

## Design principles

1. **Local-first remains true**
   The phone still scans, detects pets, clusters moments, scores images, and builds the first useful timeline locally.

2. **Cloud is selective**
   Only promoted events and selected event media are uploaded. Never upload the full camera roll.

3. **Core logic must be portable**
   Domain logic, sync rules, AI orchestration rules, and schema validation live in shared TypeScript modules, not inside Supabase function handlers.

4. **Supabase is an adapter layer**
   Supabase provides auth, Postgres, storage, realtime, and function hosting. It should not become the only place where business rules exist.

5. **Async AI**
   AI enrichment is a background workflow. Event creation should not block on caption generation.

---

## Recommended stack

| Layer              | Choice                               | Why                                                     |
| ------------------ | ------------------------------------ | ------------------------------------------------------- |
| Language           | `TypeScript`                         | Matches mobile and shared package                       |
| Function runtime   | `Supabase Edge Functions` on `Deno`  | Small operational surface for MVP                       |
| Database           | `Supabase Postgres`                  | Relational model, RLS, migrations                       |
| Auth               | `Supabase Auth` (anonymous → linked) | Silent sign-in first; optional Apple/Google/email later |
| Object storage     | `Supabase Storage`                   | Easiest first integration for selected event media      |
| AI invocation      | `OpenAI` via Edge Functions          | Keeps secrets and prompt logic off the phone            |
| Shared contracts   | `packages/shared`                    | One schema source for mobile and backend                |
| Backend core logic | `packages/backend-core`              | Portable domain layer, testable outside Supabase        |

**Optional later:** swap storage to R2 or move handlers to another platform without rewriting core logic.

---

## Monorepo shape

```txt
apps/mobile/             Expo app, local pipeline, upload queue
packages/shared/         Shared types, zod schemas, constants
packages/backend-core/   Portable domain logic and use cases
supabase/
  migrations/            Postgres schema
  functions/             Thin Supabase adapter handlers
```

### `packages/backend-core` responsibilities

This package should hold code that can run in tests, in Supabase functions, or later in another backend runtime:

- request/response schemas
- idempotency rules
- sync merge logic
- upload authorization rules
- AI job state machine
- event creation and update use cases
- prompt input shaping and AI result parsing

### `supabase/functions` responsibilities

These handlers should stay thin:

- parse HTTP request
- read auth context from Supabase
- call `backend-core` use case
- use Supabase adapters for DB/storage/realtime
- return validated response

If we later move to another platform, we replace handlers and adapters, not domain logic.

---

## High-level backend flow

```txt
Phone builds local events
  → upload_queue selects event media only
  → request signed upload target
  → upload image + thumbnail
  → sync event payload
  → backend upserts event + media rows
  → backend creates ai_job
  → AI worker generates caption / event type
  → backend stores result
  → phone polls or subscribes and merges result into local timeline
```

The phone remains usable if the cloud is unavailable. Sync catches up later.

---

## Backend domains

### 1. Identity & auth

**Product rules (unchanged from Phase 1):**

- No registration, email, or OAuth on first launch.
- User gets timeline value while `is_anonymous` in the JWT.
- Optional “Save your memories” / sign-in later — never a hard gate on scan, capture, or timeline.

**Canonical owner id:** Supabase `auth.users.id` from **`signInAnonymously()`**, not the Phase 1 SecureStore string alone.

| Id                                                    | Role                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `auth.users.id`                                       | **Canonical** `user_id` on `pets`, `events`, RLS, storage paths          |
| Phase 1 `anonymous_user_id` (`anon_*` in SecureStore) | **Legacy device id** — one-time migration into `anonymous_id_links` only |
| After account upgrade                                 | **Same** `auth.users.id`; JWT `is_anonymous` becomes false               |

#### Mobile bootstrap (Phase 2.1)

```txt
App launch
  → init Supabase client (session in SecureStore)
  → if no session: signInAnonymously()
  → if legacy anon_* exists and not yet recorded: POST link-anonymous-user (idempotent)
  → upsert-pet from local pet profile
  → upload_queue / sync use session JWT (auth.uid())
```

- Do **not** generate new `anon_*` ids for new installs once Supabase is wired; session `user.id` is enough.
- Keep `getOrCreateAnonymousUserId()` only for **upgrading installs** that already shipped Phase 1.

#### Account upgrade (optional — not required for Phase 2 MVP sync)

When the user chooses to link a permanent identity (settings / soft prompt, not onboarding):

| Method | Client API                                                    | Notes                                            |
| ------ | ------------------------------------------------------------- | ------------------------------------------------ |
| Apple  | `linkIdentity({ provider: 'apple' })`                         | Requires dev client / EAS; URL scheme configured |
| Google | `linkIdentity({ provider: 'google' })`                        | Same                                             |
| Email  | `updateUser({ email })` + verify OTP; password optional later | Must verify before treating as permanent         |

Supabase keeps the **same user id** when linking — local SQLite and server rows keyed by `user_id` need no migration.

**Enable in Supabase dashboard:** Anonymous sign-ins; **Manual linking** (for `linkIdentity`); Apple/Google providers when upgrade UI ships.

**Defer to post–Phase 2:** Sign-in on a **second device** when the user already has a permanent account (merge / conflict policy); paywall tied to auth.

#### RLS

- All user-owned rows: `auth.uid() = user_id`.
- Anonymous users use the `authenticated` role; JWT includes `is_anonymous` if policies must restrict billing, sharing, or quotas until linked.
- Storage paths: `{user_id}/{pet_id}/…` — never device-local ids alone.

#### Legacy bridge: `anonymous_id_links`

Still useful for Phase 1 → Phase 2 upgrades, not for everyday auth:

- One row per legacy `anonymous_user_id` → `user_id` (Supabase).
- Idempotent: repeated link calls return the same mapping.
- New installs after Phase 2 may never write this table.

Core rules:

- Pet and event ownership always derive from **`auth.users.id`**.
- `link-anonymous-user` is idempotent and only needed for legacy id reconciliation (see API below).

### 2. Event sync

See **[Sync specification](#sync-specification)**.

### 3. Upload authorization

See **[Upload specification](#upload-specification)**.

### 4. AI enrichment

See **[AI job specification](#ai-job-specification)**.

---

## Auth edge-case policy

**Status:** Decided for MVP. Implement in `backend-core` + mobile session handling; revisit for Phase 2+ multi-device.

| Scenario                                           | MVP behavior                                                                   | User-visible outcome                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Fresh install (Phase 2+)**                       | `signInAnonymously()` only; do not create new `anon_*` SecureStore ids         | Works offline/local; sync when online                                 |
| **Upgrade from Phase 1**                           | `signInAnonymously()` then one `link-anonymous-user` if legacy `anon_*` exists | Same server user; local SQLite unchanged                              |
| **App reinstall / cleared app data**               | New `signInAnonymously()` → **new** `auth.users.id`                            | Prior cloud data stays on old user (orphaned). No auto-restore in MVP |
| **Session refresh fails**                          | Supabase client retries refresh; if hard failure, new `signInAnonymously()`    | Same as reinstall — **document as known limitation**                  |
| **Link Apple/Google/email on this device**         | `linkIdentity` / `updateUser`; **same `user.id`**                              | Data kept; JWT `is_anonymous` → false                                 |
| **`linkIdentity` target already linked elsewhere** | Supabase error; do not switch session                                          | Calm error: identity already in use; stay on current session          |
| **Sign in on second device (existing account)**    | **Not in MVP**                                                                 | Phase 2+: `signInWithOAuth` + optional merge UI                       |
| **Anonymous user: sync + AI captions**             | **Allowed**                                                                    | No paywall or permanent-auth gate for free tier                       |
| **Anonymous user: storage quotas**                 | Same limits as permanent unless RLS adds stricter `is_anonymous` rules later   | —                                                                     |
| **Logout (if exposed in settings later)**          | Clears session; next launch new anonymous user                                 | Treat like reinstall for MVP                                          |

**Implementation notes:**

- `link-anonymous-user` rejects mapping a legacy id already tied to a **different** `user_id` (409).
- All Edge Functions use `auth.uid()`; never trust `user_id` from request body.
- Mobile stores Supabase session in SecureStore; do not use Phase 1 `anon_*` as API identity after Phase 2.

---

## Upload specification

**Scope:** Selected event media only (2–5 images per event, matching mobile selection). Never camera-roll bulk upload.

### Client pipeline (mobile — see `MOBILE_TASKS` 2.2.x)

```txt
upload_queue row (pending)
  → compress original + generate thumbnail (on device)
  → create-upload-urls (metadata only)
  → PUT original + PUT thumbnail to signed URLs
  → sync-event (event + storage paths + local ids)
  → mark upload_queue done / store server event_id
```

### Compression & files (MVP defaults)

| Asset     | Max width                     | Format | Quality / size target                                    |
| --------- | ----------------------------- | ------ | -------------------------------------------------------- |
| Original  | **1280 px** (preserve aspect) | JPEG   | ~0.82 quality; reject if still **> 3 MB** after compress |
| Thumbnail | **400 px**                    | JPEG   | ~0.75 quality; **< 200 KB** target                       |

- Convert HEIC → JPEG on device before upload.
- Strip EXIF except orientation if needed for display (prefer strip GPS).
- **Max assets per `create-upload-urls` call:** 5 (one event batch).
- **Min assets:** 1 (primary required).

### Storage layout

```txt
event-media/{user_id}/{pet_id}/{event_id}/{source_local_asset_id}/original.jpg
event-media/{user_id}/{pet_id}/{event_id}/{source_local_asset_id}/thumb.jpg
```

- Bucket: private `event-media` (name TBD in migration).
- Signed URL **TTL: 15 minutes**.
- `Content-Type` must be `image/jpeg` for PUT; server rejects mismatch on finalize if detectable.

### `create-upload-urls` validation (`validateUploadRequest`)

- JWT required; `pet_id` belongs to `auth.uid()`.
- `source_local_event_id` + `pet_id` present.
- Each `source_local_asset_id` unique in request; count 1–5.
- Optional: event row must not exist yet **or** caller owns existing event (for re-upload / retry).
- Return paired URLs: `{ original, thumbnail }` per asset + `storage_path` keys for `sync-event`.

### Failure handling

| Failure                        | Mobile                                                  | Server                             |
| ------------------------------ | ------------------------------------------------------- | ---------------------------------- |
| URL expired                    | Re-request URLs                                         | Idempotent re-issue                |
| PUT 4xx/5xx                    | Retry with backoff; `upload_queue.last_error`           | —                                  |
| `sync-event` after partial PUT | Do not call sync until **all** assets in batch uploaded | Orphan objects GC later (Phase 2+) |

---

## Sync specification

### Idempotency

- Unique constraint: `(user_id, source_local_event_id)` on `events`.
- `sync-event` upserts by that key; repeated calls return same `event_id`.
- `event_media` upsert by `(event_id, source_local_asset_id)`.

### `sync_version` (monotonic)

- Server increments `events.sync_version` on every successful `sync-event` that changes mergeable fields or media set.
- Client may send `client_sync_version` (last seen); server returns `server_sync_version`.
- **MVP conflict rule:** if client sends stale `client_sync_version` on user-edited fields, **server still accepts client payload** for fields marked `user_edited` in request; otherwise apply merge table below.

### Field merge matrix

| Field            | First sync                                   | Client resync                            | Server → client poll                | Winner on conflict             |
| ---------------- | -------------------------------------------- | ---------------------------------------- | ----------------------------------- | ------------------------------ |
| `timestamp`      | From client                                  | Immutable                                | —                                   | Server (immutable)             |
| `source`         | From client                                  | Immutable                                | —                                   | Server                         |
| `event_type`     | From client if user-set; else `unknown`      | Client if `user_edited.event_type`       | AI only if local not user-edited    | **User > AI > unknown**        |
| `caption`        | From client if user-set                      | Client if `user_edited.caption`          | AI only if local not user-edited    | **User > AI > null**           |
| `caption_source` | `user` \| `ai` \| `placeholder`              | Updated with caption                     | From server                         | Follow caption winner          |
| `is_favorite`    | From client                                  | From client                              | From server if `sync_version` newer | **Higher `sync_version`**      |
| Media set        | Full replace of `event_media` rows for event | Full replace when client sends `media[]` | —                                   | **Client authoritative** (MVP) |

**Local flags on sync payload (mobile):**

```ts
user_edited?: { caption?: boolean; event_type?: boolean };
```

Persist on server as `events.user_edited_caption` / `events.user_edited_event_type` booleans (add columns in B2.1.4) **or** infer from `caption_source === 'user'` — prefer explicit booleans in migration.

### `sync-event` request (minimal shape)

```ts
{
  source_local_event_id: string;
  pet_id: string;
  timestamp: string;
  source: 'camera_roll' | 'in_app' | 'manual';
  event_type: EventType;
  caption: string | null;
  caption_source: 'user' | 'placeholder';
  is_favorite: boolean;
  client_sync_version?: number;
  user_edited?: { caption?: boolean; event_type?: boolean };
  media: Array<{
    source_local_asset_id: string;
    storage_path: string;
    thumbnail_path: string;
    width: number;
    height: number;
    is_primary: boolean;
    detected_pet_type?: 'dog' | 'cat' | null;
  }>;
}
```

### `sync-event` response

```ts
{
  event_id: string;
  server_sync_version: number;
  ai_job?: { ai_job_id: string; status: 'pending' | 'skipped' };
}
```

`ai_job.status: skipped` when caption already user-authored or job already done for unchanged media.

### `get-event-updates` (polling)

- **Input:** `cursor` opaque string encoding `updated_at` + `event_id` (or ISO timestamp + limit).
- **Output:** events for `auth.uid()` with `updated_at > cursor`, ordered ASC, max **50** rows; `next_cursor`.
- Include: `event_id`, `source_local_event_id`, mergeable fields, `sync_version`, `ai_job.status`.
- Mobile polls: every **30 s** while app foreground and any local event has pending AI; else on pull-to-refresh / app resume.

### Mobile merge (client rules)

1. Match rows by `source_local_event_id`.
2. Apply server caption/type only if local `user_edited` flags false for that field.
3. Update `local_events` + SQLite; bump local “last seen” `sync_version`.

---

## AI job specification

### When a job is created

`sync-event` enqueues **`caption_event`** job when **all** are true:

- At least one `event_media` row exists for the event.
- `caption_source` is not `user` (no user caption on server).
- No existing `ai_jobs` row for this `event_id` in `pending` \| `processing`.
- Re-enqueue only if primary `source_local_asset_id` changed vs last completed job input (Phase 2+ fine-tune; MVP: skip if `done` exists).

### State machine

```txt
pending → processing → done
                    ↘ failed (after max attempts)
```

| State        | Meaning                                   |
| ------------ | ----------------------------------------- |
| `pending`    | Queued; worker may pick up                |
| `processing` | Worker holds lease                        |
| `done`       | Result applied to `events`                |
| `failed`     | No more auto retries; visible in dev logs |

### Worker (`process-ai-job`)

- **Trigger:** Edge Function invoked by `sync-event` (fire-and-forget) **or** scheduled sweep every **2 min** for stuck `pending`.
- **Concurrency:** Process one job per invocation; use `UPDATE … WHERE status = 'pending' … RETURNING` lease pattern.
- **Max attempts:** **3** (`attempt_count`).
- **Backoff before retry:** 1 min → 5 min → 15 min (store `next_attempt_at`).

### Model input (MVP)

- **Primary image** signed read URL (short TTL).
- Optional: up to **2** non-primary thumbnails for context.
- Metadata: `pet.type`, `event.source`, `timestamp` (no PII).

### Output validation

```ts
{
  caption: string | null; // max 280 chars; null if low confidence
  eventType: EventType;
  confidence: number | null; // 0–1
}
```

| Condition                                | Applied result                                                        |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Parse/validation fails                   | `failed` job; event unchanged                                         |
| `confidence < 0.5`                       | `caption: null`, `event_type: unknown`, `caption_source: placeholder` |
| `confidence >= 0.5`                      | Set caption + type, `caption_source: ai`                              |
| User already edited field (server flags) | **Do not overwrite** that field                                       |

### Caption safety rules (prompt + post-check)

- No medical/diagnostic language.
- No “As an AI…” phrasing.
- Do not invent location, names, or people.
- Prefer short, calm memory tone (align with product guidelines).

---

## Proposed data model

These are MVP backend entities, not the final full product schema.

### `profiles`

Maps Supabase `auth.users.id` to app-level metadata (optional display name, preferences later).

| Column       | Notes                    |
| ------------ | ------------------------ |
| `user_id`    | PK, FK → `auth.users.id` |
| `created_at` | First server touch       |

Auth provider details live in Supabase Auth (`is_anonymous`, identities) — do not duplicate in `profiles` for MVP.

### `anonymous_id_links`

**Legacy only:** Phase 1 SecureStore `anonymous_user_id` → Supabase `user_id` after first `signInAnonymously()`.

| Column              | Notes                           |
| ------------------- | ------------------------------- |
| `anonymous_user_id` | Phase 1 `anon_*` string, unique |
| `user_id`           | Supabase `auth.users.id`        |
| `linked_at`         | Audit/debug                     |

### `pets`

One pet per MVP user in product UI, but schema should support more later.

| Column                | Notes                                  |
| --------------------- | -------------------------------------- |
| `pet_id`              | UUID                                   |
| `user_id`             | Owner                                  |
| `name`, `type`        | Dog/cat in MVP                         |
| `gender`              | Optional                               |
| `profile_media_id`    | Optional chosen image                  |
| `source_local_pet_id` | For idempotent local-to-remote mapping |

### `events`

Canonical synced event rows.

| Column                   | Notes                               |
| ------------------------ | ----------------------------------- |
| `event_id`               | UUID                                |
| `user_id`, `pet_id`      | Ownership                           |
| `source_local_event_id`  | Idempotent sync key from mobile     |
| `timestamp`              | Event anchor time                   |
| `source`                 | `camera_roll` or `in_app`           |
| `event_type`             | User or AI assigned                 |
| `caption`                | AI or user-authored                 |
| `caption_source`         | `user`, `ai`, or `placeholder`      |
| `user_edited_caption`    | bool — blocks AI overwrite          |
| `user_edited_event_type` | bool — blocks AI overwrite          |
| `is_favorite`            | Syncable user preference            |
| `sync_version`           | Monotonic; merge helper             |
| `updated_at`             | Poll cursor for `get-event-updates` |

### `event_media`

Selected uploaded assets only.

| Column                  | Notes                              |
| ----------------------- | ---------------------------------- |
| `event_media_id`        | UUID                               |
| `event_id`              | Parent event                       |
| `source_local_asset_id` | Mobile idempotency key             |
| `storage_path`          | Original compressed image          |
| `thumbnail_path`        | Smaller derivative                 |
| `width`, `height`       | Post-compression dimensions        |
| `is_primary`            | Timeline thumbnail candidate       |
| `detected_pet_type`     | Dog/cat hint from local processing |

### `ai_jobs`

Tracks asynchronous enrichment work.

| Column            | Notes                                     |
| ----------------- | ----------------------------------------- |
| `ai_job_id`       | UUID                                      |
| `event_id`        | One job per event for MVP                 |
| `job_type`        | `caption_event`                           |
| `status`          | `pending`, `processing`, `done`, `failed` |
| `attempt_count`   | Retry tracking (max 3)                    |
| `next_attempt_at` | Backoff schedule                          |
| `leased_until`    | Worker lease (optional)                   |
| `last_error`      | Debugging                                 |
| `input_snapshot`  | Primary asset id used (re-enqueue guard)  |
| `result_json`     | Validated structured AI output            |

---

## API surface for MVP

Use a small set of backend functions.

### `link-anonymous-user`

**When:** First launch after Phase 2 on a device that already has a Phase 1 `anonymous_user_id` in SecureStore.

**Not when:** Greenfield install — client only calls `signInAnonymously()`; no legacy id to record.

Input:

- legacy `anonymous_user_id` (optional body)
- caller authenticated via Supabase JWT (`auth.uid()`)

Output:

- canonical `user_id` (same as JWT subject)
- whether `anonymous_id_links` row was newly created

### `upsert-pet`

Input:

- local pet profile
- local pet id

Output:

- canonical `pet_id`

### `create-upload-urls`

Input:

- `pet_id`, `source_local_event_id`
- `assets[]`: `{ source_local_asset_id, content_length?, width?, height? }` (1–5 items)

Output:

- Per asset: `{ source_local_asset_id, original_upload_url, thumbnail_upload_url, storage_path, thumbnail_path, expires_at }`

### `sync-event`

Input:

- local event payload
- uploaded media descriptors

Output:

- canonical `event_id`
- sync metadata
- AI job status if created

### `get-event-updates`

Input:

- last known sync cursor or timestamp

Output:

- remote event changes to merge locally

### `process-ai-job`

Triggered by:

- cron or explicit enqueue/worker flow

Output:

- updated `events` + `ai_jobs`

---

## Portability boundary

This is the most important design rule for MVP portability.

### Keep in `backend-core`

- `linkAnonymousUser()`
- `upsertPetProfile()`
- `syncEvent()`
- `validateUploadRequest()`
- `createAiJob()`
- `applyAiResultToEvent()`
- zod schemas for all public contracts
- conflict resolution rules

### Keep in Supabase adapters

- reading authenticated user from request context
- issuing storage signed URLs
- SQL queries / repository implementations
- realtime notifications
- scheduled function wiring

### Dependency direction

```txt
Supabase function handler
  → backend-core use case
    → repository/storage/ai interfaces
      → Supabase/OpenAI adapter implementations
```

`backend-core` must not import Supabase SDK types directly.

---

## Suggested package structure

```txt
packages/backend-core/
  src/
    contracts/
    domain/
    usecases/
    repositories/
    storage/
    ai/
    mappers/
    errors/
```

Interface examples:

- `EventRepository`
- `PetRepository`
- `AnonymousLinkRepository`
- `MediaStorageSigner`
- `AiCaptionService`
- `JobQueue`

This lets us swap Supabase adapters for another platform later.

---

## Sync and merge rules (summary)

Full detail: [Sync specification](#sync-specification).

1. Idempotency: `(user_id, source_local_event_id)`.
2. User edits win over AI for caption and event type.
3. AI fills only non-user-edited fields.
4. Never accept full-library uploads.
5. Media set on sync: client full replace (MVP).

---

## AI contract (summary)

Full detail: [AI job specification](#ai-job-specification). Result shape in `packages/shared` zod schema:

```ts
{
  caption: string | null;
  eventType: EventType;
  confidence: number | null;
}
```

---

## Security model

- RLS on all user-owned tables (`auth.uid() = user_id`)
- Optional policies using JWT `is_anonymous` (e.g. rate limits before account link)
- Storage paths namespaced by `user_id` and `pet_id`
- Signed upload URLs with short expiry
- No direct client access to privileged AI or admin flows
- Edge Functions verify ownership before mutating rows
- Mobile stores session refresh token in SecureStore; never log JWT or keys

---

## MVP delivery order

1. Supabase project: enable **Anonymous** auth; schema + RLS (`auth.uid()`)
2. `packages/backend-core` scaffolding + shared zod contracts
3. **Mobile:** Supabase client, `signInAnonymously()`, session persistence
4. `link-anonymous-user` (legacy Phase 1 id only) + `upsert-pet`
5. Signed upload function + storage bucket layout
6. `sync-event` + `upload_queue` worker on mobile
7. `ai_jobs` table + worker + `get-event-updates` (polling)
8. Mobile merge path for remote captions/types
9. **Later (not blocking MVP sync):** account upgrade UI (Apple/Google/email via `linkIdentity` / `updateUser`)

---

## Open questions

| Topic                                    | MVP default                                                        | Revisit when          |
| ---------------------------------------- | ------------------------------------------------------------------ | --------------------- |
| Object storage                           | **Supabase Storage**                                               | Scale / R2 migration  |
| Orphan storage objects after failed sync | Manual GC / Phase 2+ sweeper                                       | Production traffic    |
| Realtime vs poll                         | **Poll** `get-event-updates` every 30s when pending AI             | UX need               |
| Multi-device account sign-in             | **Deferred** — see [Auth edge-case policy](#auth-edge-case-policy) | Phase 2+              |
| Session loss → new anonymous user        | Accept orphan cloud data for MVP                                   | Account recovery flow |

## Change log

| Date       | Change                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-18 | Document Supabase Auth anonymous-first + optional Apple/Google/email upgrade; clarify legacy `anonymous_id_links`; align AI `eventType` with `@tailo/shared`; MVP delivery order + open questions |
| 2026-05-18 | Add auth edge-case policy, upload/sync/AI specifications, schema fields for merge + AI lease/retry                                                                                                |
