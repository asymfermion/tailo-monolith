# Database Schema Ledger

Last updated: 2026-05-25

This ledger records the Tailo-owned Supabase database surface and every migration in `supabase/migrations/`. It is the quick reference for what exists now, what was historical, and where each table or policy came from.

System-owned Supabase tables such as `auth.users`, `storage.objects`, `storage.buckets`, `cron.*`, and `net.*` are referenced only where Tailo migrations depend on them.

## Current App Tables

| Table                       | Status        | Purpose                                                                | Owner key                | Notes                                                                                                                           |
| --------------------------- | ------------- | ---------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `public.app_users`          | Active        | Canonical Tailo user identity, independent of the auth vendor.         | `app_user_id`            | Created by `ensure_app_user_for_auth`; all durable ownership should point here.                                                 |
| `public.user_identities`    | Active        | Maps provider identities to one Tailo app user.                        | `app_user_id`            | Providers: `supabase_auth`, `email`, `apple`, `google`. Unique `(provider, provider_subject)`.                                  |
| `public.account_profiles`   | Active        | Editable account preferences and profile display fields.               | `app_user_id`            | Stores display name, locale, theme, and font style.                                                                             |
| `public.anonymous_id_links` | Legacy active | Bridges old Phase 1 `anon_*` local ids to app users.                   | `user_id`, `app_user_id` | Keep for upgrade compatibility. New installs should not depend on this table.                                                   |
| `public.pets`               | Active        | Cloud pet profiles. Product UI is one pet for MVP; schema allows more. | `app_user_id`            | Unique `(app_user_id, source_local_pet_id)`.                                                                                    |
| `public.events`             | Active        | Cloud timeline moments.                                                | `app_user_id`, `pet_id`  | Unique `(app_user_id, source_local_event_id)`. Includes sync, AI, validation, generation, and soft-delete state.                |
| `public.event_media`        | Active        | Media rows for each cloud event.                                       | `event_id`               | Unique `(event_id, source_local_asset_id)`. Storage paths point into the private `event-media` bucket.                          |
| `public.ai_jobs`            | Active        | Server-side AI caption / classification job queue.                     | `event_id`               | Readable by event owner; workers use service role.                                                                              |
| `public.profiles`           | Dropped       | Former Supabase-auth profile mirror.                                   | `user_id`                | Replaced by `app_users`, `user_identities`, and `account_profiles`; dropped by `20260525120200_drop_legacy_profiles_table.sql`. |

## Current Table Details

### `public.app_users`

| Column        | Type          | Notes                                     |
| ------------- | ------------- | ----------------------------------------- |
| `app_user_id` | `uuid`        | Primary key, default `gen_random_uuid()`. |
| `created_at`  | `timestamptz` | First server touch.                       |

RLS: enabled. Authenticated users can select their own row via `public.current_app_user_id()`.

### `public.user_identities`

| Column             | Type          | Notes                                               |
| ------------------ | ------------- | --------------------------------------------------- |
| `identity_id`      | `uuid`        | Primary key, default `gen_random_uuid()`.           |
| `app_user_id`      | `uuid`        | FK to `app_users`, cascade delete.                  |
| `provider`         | `text`        | Check: `supabase_auth`, `email`, `apple`, `google`. |
| `provider_subject` | `text`        | Stable provider subject or normalized email.        |
| `provider_email`   | `text`        | Optional verified email snapshot.                   |
| `created_at`       | `timestamptz` | Audit timestamp.                                    |
| `last_seen_at`     | `timestamptz` | Updated during ensure/sign-in flows.                |

Indexes and constraints:

- Unique `(provider, provider_subject)`.
- Unique `provider_subject` where `provider = 'supabase_auth'`.
- Index on `app_user_id`.

RLS: enabled. Authenticated users can select identities for their own `app_user_id`.

### `public.account_profiles`

| Column                     | Type          | Notes                                                           |
| -------------------------- | ------------- | --------------------------------------------------------------- |
| `app_user_id`              | `uuid`        | Primary key, FK to `app_users`, cascade delete.                 |
| `display_name`             | `text`        | Optional display name.                                          |
| `preferred_locale`         | `text`        | Optional locale preference.                                     |
| `preferred_theme`          | `text`        | Optional; `light` or `dark`.                                    |
| `preferred_font_style`     | `text`        | Optional; `system`, `serif`, `rounded`, `modern`, or `elegant`. |
| `notification_preferences` | `text`        | Optional; JSON-encoded `NotificationPreferences` object.        |
| `created_at`               | `timestamptz` | Creation timestamp.                                             |
| `updated_at`               | `timestamptz` | Last update timestamp.                                          |

RLS: enabled. Authenticated users can select and update their own profile.

### `public.anonymous_id_links`

| Column              | Type          | Notes                                                                          |
| ------------------- | ------------- | ------------------------------------------------------------------------------ |
| `anonymous_user_id` | `text`        | Primary key. Phase 1 `anon_*` id.                                              |
| `user_id`           | `uuid`        | FK to `auth.users`, cascade delete. Legacy Supabase subject link.              |
| `app_user_id`       | `uuid`        | FK to `app_users`, cascade delete. Added during identity portability refactor. |
| `linked_at`         | `timestamptz` | Link timestamp.                                                                |

Indexes: `user_id`, `app_user_id`.

RLS: enabled. Authenticated users can select/insert rows where `auth.uid() = user_id`.

### `public.pets`

| Column                         | Type          | Notes                                                           |
| ------------------------------ | ------------- | --------------------------------------------------------------- |
| `pet_id`                       | `uuid`        | Primary key, default `gen_random_uuid()`.                       |
| `app_user_id`                  | `uuid`        | FK to `app_users`, cascade delete. Required.                    |
| `source_local_pet_id`          | `text`        | Local idempotency key.                                          |
| `name`                         | `text`        | Required.                                                       |
| `type`                         | `text`        | Check: `dog`, `cat`.                                            |
| `gender`                       | `text`        | Optional; `male`, `female`, `unknown`.                          |
| `birthday`                     | `date`        | Optional calendar birthday.                                     |
| `profile_media_id`             | `uuid`        | Optional chosen profile media reference.                        |
| `profile_photo_local_asset_id` | `text`        | Optional local asset ID of the profile photo.                   |
| `portrait_url`                 | `text`        | Optional public URL of the cropped portrait in `pet-portraits`. |
| `created_at`                   | `timestamptz` | Creation timestamp.                                             |
| `updated_at`                   | `timestamptz` | Last update timestamp.                                          |

Indexes and constraints:

- Unique `(app_user_id, source_local_pet_id)`.
- Index on `app_user_id`.

RLS: enabled. Authenticated users can select, insert, and update their own pets via `public.current_app_user_id()`.

### `public.events`

| Column                       | Type          | Notes                                           |
| ---------------------------- | ------------- | ----------------------------------------------- |
| `event_id`                   | `uuid`        | Primary key, default `gen_random_uuid()`.       |
| `app_user_id`                | `uuid`        | FK to `app_users`, cascade delete. Required.    |
| `pet_id`                     | `uuid`        | FK to `pets`, cascade delete. Required.         |
| `source_local_event_id`      | `text`        | Local idempotency key.                          |
| `timestamp`                  | `timestamptz` | Moment timestamp.                               |
| `source`                     | `text`        | `camera_roll`, `in_app`, or `manual`.           |
| `event_type`                 | `text`        | `walk`, `play`, `rest`, `eating`, or `unknown`. |
| `caption`                    | `text`        | Optional user/AI caption.                       |
| `caption_source`             | `text`        | `user`, `ai`, or `placeholder`.                 |
| `is_favorite`                | `boolean`     | Favorite flag.                                  |
| `user_edited_caption`        | `boolean`     | Prevents AI/cloud overwrite of user caption.    |
| `user_edited_event_type`     | `boolean`     | Prevents AI/cloud overwrite of user event type. |
| `sync_version`               | `integer`     | Monotonic server merge/version marker.          |
| `pet_validation_status`      | `text`        | `pending`, `valid`, or `rejected`.              |
| `client_timeline_generation` | `integer`     | Local wipe/redetect generation marker.          |
| `deleted_at`                 | `timestamptz` | Soft-delete / cloud-reject marker.              |
| `created_at`                 | `timestamptz` | Creation timestamp.                             |
| `updated_at`                 | `timestamptz` | Last update timestamp.                          |

Indexes and constraints:

- Unique `(app_user_id, source_local_event_id)`.
- Index `(app_user_id, updated_at desc)`.
- Partial index `(app_user_id, updated_at asc) where deleted_at is null`.
- Partial index on rejected `pet_validation_status`.

RLS: enabled. Authenticated users can select, insert, and update their own events via `public.current_app_user_id()`.

### `public.event_media`

| Column                  | Type          | Notes                                             |
| ----------------------- | ------------- | ------------------------------------------------- |
| `event_media_id`        | `uuid`        | Primary key, default `gen_random_uuid()`.         |
| `event_id`              | `uuid`        | FK to `events`, cascade delete.                   |
| `source_local_asset_id` | `text`        | Local idempotency key.                            |
| `storage_path`          | `text`        | Original image object path.                       |
| `thumbnail_path`        | `text`        | Thumbnail object path.                            |
| `width`                 | `integer`     | Must be positive.                                 |
| `height`                | `integer`     | Must be positive.                                 |
| `is_primary`            | `boolean`     | Primary media flag.                               |
| `detected_pet_type`     | `text`        | Optional; `dog` or `cat`.                         |
| `detected_breed`        | `text`        | Optional breed label from VNClassifyImageRequest. |
| `media_fingerprint`     | `text`        | Optional media hash (currently `md5:*`).          |
| `created_at`            | `timestamptz` | Creation timestamp.                               |

Indexes and constraints:

- Unique `(event_id, source_local_asset_id)`.
- Index on `event_id`.
- Partial index on `media_fingerprint` where not null.

RLS: enabled. Authenticated users can select, insert, update, and delete media rows through the owning event.

### `public.ai_jobs`

| Column            | Type          | Notes                                         |
| ----------------- | ------------- | --------------------------------------------- |
| `ai_job_id`       | `uuid`        | Primary key, default `gen_random_uuid()`.     |
| `event_id`        | `uuid`        | FK to `events`, cascade delete.               |
| `job_type`        | `text`        | `caption_event`.                              |
| `status`          | `text`        | `pending`, `processing`, `done`, or `failed`. |
| `attempt_count`   | `integer`     | Retry counter, non-negative.                  |
| `next_attempt_at` | `timestamptz` | Earliest retry time.                          |
| `leased_until`    | `timestamptz` | Worker lease expiry.                          |
| `last_error`      | `text`        | Last worker error.                            |
| `input_snapshot`  | `jsonb`       | Captured AI input metadata.                   |
| `result_json`     | `jsonb`       | Captured AI result.                           |
| `created_at`      | `timestamptz` | Creation timestamp.                           |
| `updated_at`      | `timestamptz` | Last update timestamp.                        |

Indexes: `(status, next_attempt_at)`, `event_id`.

RLS: enabled. Authenticated users can select jobs through the owning event.

## Storage, Extensions, And Functions

| Object                                                          | Status | Notes                                                                                                                |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Storage bucket `event-media`                                    | Active | Private bucket, JPEG-only, 3 MB file limit. Paths use `{app_user_id}/...` prefix after the ownership migration.      |
| Storage object policies                                         | Active | Authenticated users can select/insert/update objects whose first path folder matches `public.current_app_user_id()`. |
| Extension `pg_cron`                                             | Active | Enables scheduled job setup for AI worker sweeps.                                                                    |
| Extension `pg_net`                                              | Active | Enables HTTP invokes from scheduled jobs.                                                                            |
| Function `public.current_app_user_id()`                         | Active | Resolves `auth.uid()` to canonical `app_user_id`; `security definer` to avoid RLS recursion.                         |
| Function `public.ensure_app_user_for_auth(uuid, text, boolean)` | Active | Service-role RPC that creates/resolves `app_users`, `user_identities`, and `account_profiles`.                       |

## Migration Ledger

| Migration                                                             | Recorded effect                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260518120000_phase2_auth_tables.sql`                               | Created legacy `profiles` and `anonymous_id_links`; enabled RLS and authenticated grants. `profiles` is now dropped; `anonymous_id_links` remains for legacy upgrades.                                        |
| `20260518130000_phase2_pets.sql`                                      | Created `pets` keyed by `auth.users.id`, with local pet id uniqueness, RLS, and authenticated select/insert/update grants. Later migrated to `app_user_id`.                                                   |
| `20260518140000_phase2_events_storage.sql`                            | Created `events` keyed by `auth.users.id`; created private `event-media` storage bucket and initial auth-user storage policies. Later migrated to `app_user_id`.                                              |
| `20260518150000_phase2_event_media_ai_jobs.sql`                       | Created `event_media` and `ai_jobs`; added event-join RLS policies and authenticated grants. Later event ownership checks moved to `app_user_id`.                                                             |
| `20260519120000_events_pet_validation_status.sql`                     | Added `events.pet_validation_status` and partial rejected-status index.                                                                                                                                       |
| `20260519230000_events_client_timeline_generation.sql`                | Added `events.client_timeline_generation` for local wipe/redetect generation tracking.                                                                                                                        |
| `20260520010000_enable_pg_cron_pg_net.sql`                            | Enabled `pg_cron` and `pg_net`; granted schema/table privileges for scheduled AI job invokes.                                                                                                                 |
| `20260520120000_events_soft_delete.sql`                               | Added `events.deleted_at`; added initial active-events partial index on `(user_id, updated_at asc)`. Later replaced by app-user active index.                                                                 |
| `20260523120000_phase1_app_users_identities.sql`                      | Created canonical `app_users`, `user_identities`, and `account_profiles`; added `anonymous_id_links.app_user_id`; created `current_app_user_id()` and `ensure_app_user_for_auth()`; backfilled identity rows. |
| `20260524120000_phase2_app_user_ownership.sql`                        | Migrated `pets` and `events` from `user_id` to `app_user_id`; replaced constraints, indexes, table RLS policies, and storage object policies; dropped old `user_id` columns from `pets` and `events`.         |
| `20260524130000_fix_ensure_app_user_for_auth.sql`                     | Replaced `ensure_app_user_for_auth()` to avoid ambiguous `app_user_id` references from `RETURNS TABLE` vs table columns.                                                                                      |
| `20260525120000_account_profile_appearance_prefs.sql`                 | Added `account_profiles.preferred_theme` and `preferred_font_style` with checks.                                                                                                                              |
| `20260525120100_pets_birthday.sql`                                    | Added optional `pets.birthday` date column and comment.                                                                                                                                                       |
| `20260525120200_drop_legacy_profiles_table.sql`                       | Dropped legacy `public.profiles`; account ownership now lives in `app_users` / `user_identities`, editable fields in `account_profiles`.                                                                      |
| `20260525120300_fix_current_app_user_id_rls_recursion.sql`            | Replaced `current_app_user_id()` as `security definer` and granted execute to authenticated users, fixing RLS recursion on `user_identities`.                                                                 |
| `20260525120400_event_media_fingerprint_dedupe.sql`                   | Added `event_media.media_fingerprint` with partial index for cross-device duplicate-image detection and merge matching.                                                                                       |
| `20260626120000_add_notification_preferences_to_account_profiles.sql` | Added `account_profiles.notification_preferences` (text, nullable) to store JSON-encoded user notification preferences in the cloud.                                                                          |
| `20260627120000_add_detected_breed_to_event_media.sql`                | Added `event_media.detected_breed` (text, nullable) to store the breed label detected by VNClassifyImageRequest during local pet detection.                                                                   |
| `20260629120000_add_pet_portrait_cloud.sql`                           | Added `pets.portrait_url` (text, nullable) and created the public `pet-portraits` Storage bucket with RLS upload policies for authenticated users.                                                            |

## Maintenance Rules

- Add every new migration to the Migration Ledger in filename order.
- Update Current App Tables when a table is created, dropped, or repurposed.
- Update Current Table Details when columns, constraints, indexes, or RLS behavior change.
- Keep historical migrations in the ledger even when their objects are later dropped; mark the current status clearly.
- Use `npx supabase migration new <name>` for new migration files, then ensure its timestamp is after the latest migration already applied remotely before `supabase db push`.
