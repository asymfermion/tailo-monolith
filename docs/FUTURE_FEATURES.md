# Tailo — Future Features

Ideas to explore after the MVP is stable. This is not a delivery order; it is a holding document for product directions we want to keep visible.

## Post-MVP feature list

### 1. Photo editing

Allow users to refine event images inside the app.

Editing should grow from a strong image-viewing foundation inside moment detail.

- Add filters
- Crop images
- Keep edited versions tied to the original local/server media records
- Prefer original + derived edited version over destructive overwrite

### 1a. Maximized moment image viewer

Let users open any moment image into a focused full-screen viewer from the moment detail screen.

- Tap image in moment detail to open a maximized viewer
- Swipe between images in the same moment
- Pinch / zoom / pan
- Choose the primary image for the moment
- Add a future `Edit` entry point from this viewer

This is useful on its own and also prepares the natural surface for later image-editing tools.

### 1b. Editing rollout

Suggested order for image editing features:

1. full-screen image viewer
2. crop
3. filters
4. later visual adjustments / richer editing

Crop is the most natural first editing tool because it is broadly useful and easier to keep predictable than a full filter system.

### 2. Share moments to social media

Let users export a moment as a polished share image with text.

- Render selected moment photos into a shareable composition
- Include caption or custom text
- Export as an image for social posting

### 3. Family account

Support multiple people contributing to and viewing the same pet memories.

- Shared access to pets and timeline events
- Permissions/roles kept simple for MVP+1
- Sync and ownership rules designed for collaborative use

### 4. Multi-pet support

Expand beyond the current one-pet product model.

- More than one pet profile per account
- Per-pet onboarding and profile setup
- Per-pet filtering and editing

### 5. Multi-pet timeline

Allow multiple pets to appear in the same timeline experience.

- Events can reference one or more pets
- Timeline can show mixed-pet moments
- Filters can switch between all pets and individual pets

### 6. Image-level cloud pet validation

Today, Vertex validates only the **primary** image, but a failed check **rejects the whole event** (all `event_media` rows deleted; local timeline row removed).

Future behavior:

- Validate each asset in an event (or at least primary + alternates)
- Remove only assets that fail (`profilePetValid` / type mismatch)
- Keep the event if any valid pet photos remain; re-pick primary thumbnail
- Sync rejected assets back to the phone (`selected_asset_ids` / scores), not only `pet_validation_status` on the event

### 7. Pet identity validation (cloud)

Today cloud validation only checks **species** (dog/cat) and “a pet is visible,” not **this user’s pet**. Another golden retriever should be rejected.

**Goal:** Reject events whose primary image is not the same individual as the pet profile, using:

- Profile photo (required anchor once set)
- **Confirmed references** from past events (`pet_validation_status = valid`, not user-deleted)
- Optional stored **appearance features** (embeddings), not full re-detection on device

**Recommended approach (low token / low cost):**

1. **Reference gallery (small, fixed)** — At most ~5–8 images per pet: profile photo + recent validated primaries. No “send whole timeline” to the model.
2. **Embedding gate (default path)** — When an event is validated or profile photo is set, compute one **multimodal embedding** per reference image (Vertex embedding API or equivalent). Store in Postgres (`pgvector`) keyed by `pet_id`. For each new primary image: one embedding + cosine similarity vs pet **centroid** (mean of refs) or best-of refs. Below threshold → `rejected` **without** a multi-image caption call.
3. **Optional LLM fallback** — Only when embedding score is borderline (e.g. 0.45–0.55): single Gemini call with **one** candidate + **one** reference image and a tiny JSON `sameIndividual: boolean` (low `maxOutputTokens`). Avoid sending 5 images on every event.
4. **Caption after identity pass** — Keep current caption + `eventType` job separate or same job only after gate passes (saves tokens on rejects).
5. **Cold start** — First events: profile photo only (or type-only until profile exists). Return `insufficient_refs` instead of aggressive reject if no gallery yet.

**Do not:** Re-run on-device detection for identity; do not pass the entire camera roll to Vertex.

See [architecture/phase-2-backend-mvp.md](./architecture/phase-2-backend-mvp.md#future-pet-identity-validation-cloud) and MOBILE_TASKS **B2.12**.

### 8. User delete moment

Let users remove a moment from the timeline; deletion should be **complete on device and in the cloud** (not local-only like today).

- Delete UI on timeline / event detail
- `delete-event` API: remove `events`, `event_media`, and Storage objects for that moment
- Tombstone + sync lock so poll/AI cannot revive the row
- **Excluded from auto-detect:** photos in a user-deleted moment must **not** re-enter passive scan, clustering, or Redetect
- Those photos may only return via **manual selection** (picker / in-app capture), not background pipeline

### 10. User edit moment (capabilities)

Harden **what the user can do to each timeline moment** and how those actions interact with local state, cloud sync, and AI.

**Today (partial):**

- Edit caption, event type, favorite on event detail (local + `sync-event`)
- `user_edited_caption` / `user_edited_event_type` block naive AI/poll overwrite (recent server merge fix)
- `sync_lock_owner = user` while editing (timeline wipe / Redetect clears locks)

**Not yet decided:**

| Action                       | Open questions                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Edit caption / type          | Can user revert to automatic caption? Does AI ever refresh after explicit user edit? |
| Change photos                | Add/remove/replace images in an existing moment, or only at create time?             |
| Favorite                     | Always user-owned field; conflict rules with stale `client_sync_version`             |
| Delete                       | See [§8 User delete moment](#8-user-delete-moment)                                   |
| Dismiss / “not a pet moment” | Per-moment vs per-asset; link to scan exclusion (B2.11)                              |
| Edit while AI pending        | Show placeholder vs lock fields until validation/caption completes                   |

**Deliverable:** A single **moment actions matrix** (states × actions × sync outcome) in the phase-2 sync spec, then UI + tests aligned to it. Tracked as MOBILE_TASKS **B2.13**.

### 9. Privacy tiers

Offer stronger privacy modes beyond the MVP baseline.

- Baseline security for all users: selective upload only, transport encryption, provider encryption at rest, EXIF/GPS stripping
- Paid privacy tier: encrypted uploaded media at rest with decrypt-only-for-AI processing
- Premium private mode: local-only or reduced-cloud mode with no server-side image AI

See [encrypted-media-ai-plan.md](./architecture/encrypted-media-ai-plan.md) for the design direction.

---

## Notes

- The current MVP stays focused on one pet, local-first processing, and a calm timeline.
- Multi-pet support and family sharing will require backend and permission model changes.
- Photo editing and social sharing can likely ship earlier than family and multi-pet features.
