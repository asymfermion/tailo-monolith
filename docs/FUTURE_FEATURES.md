# Tailo — Future Features

Ideas to explore after the MVP is stable. This is not a delivery order; it is a holding document for product directions we want to keep visible.

## Post-MVP feature list

### 1. Photo editing

Allow users to refine event images inside the app.

- Add filters
- Crop images
- Keep edited versions tied to the original local/server media records

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

---

## Notes

- The current MVP stays focused on one pet, local-first processing, and a calm timeline.
- Multi-pet support and family sharing will require backend and permission model changes.
- Photo editing and social sharing can likely ship earlier than family and multi-pet features.
