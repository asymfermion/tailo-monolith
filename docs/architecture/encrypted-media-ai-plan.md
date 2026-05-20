# Encrypted Media Plan

**Status:** Planned  
**Scope:** Future privacy enhancement for uploaded event media  
**Goal:** Keep uploaded images encrypted at rest and decrypt them only for short-lived AI processing.

---

## Summary

Tailo can add a stronger privacy model for cloud-synced media by encrypting event images on-device before upload, storing only ciphertext in object storage, and decrypting images only inside the backend AI pipeline when captioning or event interpretation is required.

This is **not** end-to-end encryption. The backend remains a trusted decryptor for AI work. The benefit is reduced exposure from storage leaks, operator mistakes, and overly broad media access paths.

---

## Why this model

This design is the practical middle ground between:

- plain uploaded media that the backend and storage platform can always read
- full end-to-end encryption, which would block current server-side AI workflows

Tailo’s current product shape still needs server-side AI in Phase 2+, so the backend must be able to decrypt when AI runs. The privacy win is:

- encrypted media at rest in object storage
- encrypted media in transit between device and storage
- plaintext only during short-lived AI processing

---

## Non-goals

- Full zero-knowledge storage
- End-to-end encryption where Tailo servers can never decrypt media
- Encrypting the user’s entire camera roll
- Replacing local on-device pet detection

Tailo still uploads **selected event media only**, never the full library.

---

## Threat model

This design helps against:

- object storage bucket exposure
- accidental broad storage reads
- leaked storage paths or object URLs
- developers or services reading stored blobs without access to keys

This design does **not** fully protect against:

- a compromised backend with decrypt capability
- a malicious or compromised AI provider after plaintext is sent
- a compromised client device that already holds user data and keys

---

## High-level design

```txt
Phone selects event media
  → compress image + thumbnail
  → encrypt both on device
  → upload ciphertext blobs
  → sync event + encrypted media metadata
  → create AI job
  → AI worker requests decrypt capability
  → worker decrypts media temporarily
  → worker sends plaintext image to AI provider
  → worker discards plaintext immediately
  → event stores caption / event type only
```

---

## Recommended key model

Use envelope encryption.

### Keys

- **DEK**: data encryption key
  - used to encrypt image bytes
  - scoped per pet or per event batch
- **KEK**: key encryption key
  - used to wrap the DEK
  - held by backend key service or KMS-backed adapter

### Recommendation

For Tailo, start with **one DEK per pet**.

Why:

- simpler than per-image keys
- easier multi-image event processing
- aligns with current one-pet MVP
- can later expand to multi-pet by maintaining one DEK per pet

Store:

- encrypted image blob in storage
- wrapped DEK in database
- encryption metadata with each media row

---

## Proposed storage/data changes

### `event_media`

Add fields such as:

- `storage_cipher_path`
- `thumbnail_cipher_path`
- `encryption_version`
- `encryption_alg`
- `key_id`
- `iv`
- `thumb_iv`
- `is_encrypted`

Do **not** store raw plaintext paths once encrypted upload becomes standard.

### `pets` or a new key table

Prefer a dedicated key metadata table, for example `pet_media_keys`:

- `key_id`
- `pet_id`
- `wrapped_dek`
- `wrap_provider`
- `created_at`
- `rotated_at`
- `status`

This keeps key lifecycle separate from the pet profile row.

---

## Encryption algorithm

Use a standard authenticated encryption algorithm:

- `AES-256-GCM`

For each encrypted file:

- generate a fresh IV/nonce
- encrypt original bytes
- encrypt thumbnail bytes separately
- store IVs alongside metadata

Do not invent a custom crypto format.

---

## Upload flow changes

### Current flow

```txt
compress
  → upload JPEG
  → sync storage_path
```

### Future encrypted flow

```txt
compress
  → encrypt JPEG bytes
  → upload ciphertext
  → sync cipher storage path + encryption metadata
```

### Mobile responsibilities

- compress original and thumbnail
- encrypt both blobs before upload
- request upload URLs for encrypted objects
- send encryption metadata in `sync-event`
- never upload plaintext if encrypted mode is enabled

### Backend responsibilities

- issue upload URLs for ciphertext objects
- validate encryption metadata
- store wrapped-key references and media encryption descriptors

---

## AI decrypt flow

The backend should decrypt only inside the AI worker.

### Worker flow

1. Load event + encrypted media metadata
2. Resolve wrapped DEK for the pet
3. Unwrap DEK through key service
4. Download ciphertext object
5. Decrypt into memory or a short-lived temp file
6. Send plaintext image to AI provider
7. Delete plaintext immediately after response
8. Persist only structured AI result, not decrypted media

### Rules

- Prefer in-memory buffers where practical
- If temp files are required, store them in ephemeral runtime storage only
- Never write decrypted media back to object storage
- Never log plaintext paths, bytes, or decrypt keys

---

## Key service boundary

To keep the system portable, key handling should not be buried inside Supabase functions.

### Put in `packages/backend-core`

- encryption metadata validation
- “can this job decrypt this asset?” policy
- key lookup/use-case interfaces
- media decrypt workflow orchestration

### Put in adapters

- Supabase database reads/writes
- KMS or secret-store integration
- object storage fetch
- temp file handling

### Suggested interfaces

```txt
MediaKeyRepository
KeyEncryptionService
EncryptedMediaStorage
MediaDecryptService
AiCaptionService
```

This keeps the design portable if storage, hosting, or KMS changes later.

---

## Where keys should live

Avoid storing usable raw media keys directly in the mobile app forever or directly in plain database columns.

### Recommended path

- Device generates or receives DEK
- Backend stores **wrapped** DEK only
- KEK lives in a secrets manager / KMS-style adapter

### Acceptable first implementation

If KMS is not available yet:

- store wrapped DEKs using a backend-held master key from server secrets
- clearly document that this is an interim step before managed KMS

That is still better than storing plaintext keys in Postgres.

---

## Privacy modes

This design works well with future privacy tiers.

### Default cloud-sync mode

- encrypted storage
- decrypt for AI allowed
- sync and captions enabled

### Private mode

- no cloud upload
- local-only timeline
- no server-side AI

This gives users a clear privacy choice later without changing the local pipeline.

---

## Rollout strategy

Implement behind an internal feature flag first.

### Phase A

- Add schema fields for encryption metadata
- Keep plaintext upload path as fallback
- Add encrypted upload path under feature flag

### Phase B

- Enable encrypted uploads for dev/staging
- Update AI worker to decrypt before caption generation
- Verify no plaintext is written to storage

### Phase C

- Make encrypted upload the default for new uploads
- Keep migration path for older plaintext media rows

### Phase D

- Add key rotation and re-encryption tooling if needed

---

## Privacy tiers

This feature set fits naturally into product tiers, but basic security should never be paywalled.

### Baseline for all users

- HTTPS in transit
- provider-managed encryption at rest
- selective event-media upload only
- EXIF/GPS stripping before upload

### Paid privacy tier

- encrypted uploaded media at rest
- decrypt only for short-lived AI processing
- stronger storage and backend handling guarantees

### Premium private mode

- no cloud media upload
- local-first or local-only experience
- reduced or no server-side AI features

This keeps baseline security universal while letting advanced privacy and its operational cost live in a paid plan.

---

## Migration strategy

Older media will likely exist in plaintext first.

Support mixed state:

- `is_encrypted = false` for legacy rows
- `is_encrypted = true` for new rows

AI worker and read paths should branch safely on that flag until full migration is complete.

Do not block Phase 2 launch on backfilling all older media.

---

## Operational cautions

- Decryption failures must fail the AI job cleanly without breaking the event row
- Retry logic must not leave long-lived plaintext temp files behind
- Key rotation needs versioned metadata
- Device restore / reinstall flows need a clear strategy if user-owned encryption becomes stricter later

---

## Suggested implementation order

1. Finalize encryption metadata schema
2. Add `packages/backend-core` interfaces for keys and encrypted media
3. Add mobile encrypted upload helper
4. Extend `create-upload-urls` and `sync-event` contracts
5. Add backend wrapped-key storage
6. Add AI worker decrypt path
7. Add staging verification and operational logging review
8. Add optional private mode design later

---

## Recommendation

Do **not** make this a hard prerequisite for Phase 2 MVP unless strong media privacy is a launch-critical promise.

Recommended order:

- Ship selective upload, EXIF stripping, and server-side AI first
- Add encrypted-at-rest uploaded media as the next privacy upgrade
- Consider full private mode later for users who do not want cloud AI at all

This keeps Tailo practical while still moving meaningfully toward stronger privacy.
