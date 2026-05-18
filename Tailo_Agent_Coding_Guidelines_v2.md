# Tailo Agent Coding Guidelines

## 1. Project Goal

Tailo is a **passive pet memory system**.

The app should:

- scan the user’s recent photos
- detect pet-related moments
- group photos into meaningful events
- show a calm, beautiful timeline
- use AI quietly to caption and classify events
- avoid feeling like a generic AI app, tracker, or dashboard

Core product rule:

> Tailo should feel like it remembers the pet’s life automatically.

---

## 2. Recommended Tech Stack

### Mobile

Use:

```txt
React Native + Expo
```

Primary Expo modules:

```txt
expo-media-library
expo-camera
expo-image
expo-file-system
expo-secure-store
expo-sqlite
expo-notifications later
```

Use React Native because Tailo is:

- iOS-first
- Android-ready later
- photo-heavy
- UI-heavy
- likely to need native modules later

---

### Local Storage

Use:

```txt
SQLite + MMKV or SecureStore
```

SQLite stores:

```txt
local_assets
local_event_candidates
processing_state
upload_queue
cached_events
```

SecureStore/MMKV stores:

```txt
anonymous_user_id
onboarding_state
last_scan_timestamp
feature_flags
```

Rule:

> Tailo must work before registration and partially offline.

---

### Backend

Use:

```txt
Supabase
```

Supabase is responsible for:

```txt
anonymous user identity
Postgres database
pet profile
events
media metadata
AI job state
Edge Functions
future search/vector support
```

Do not use direct AWS/GCP services for MVP unless absolutely necessary.

---

### Image Storage

Use:

```txt
Cloudflare R2
```

Store:

```txt
selected event images
compressed images
thumbnails
future short videos
future receipts
```

Do **not** upload the full camera roll.

Only upload selected event media.

---

### AI

Use:

```txt
OpenAI vision/text models
```

Use AI for:

```txt
event captions
event classification
future Ask/Search
future recaps
future receipt extraction
```

Do not position the app as an “AI pet assistant.”

AI should be invisible.

---

### On-device ML

Use platform-native processing:

```txt
iOS: Vision + Core ML
Android: ML Kit + TensorFlow Lite
```

Use on-device ML for:

```txt
pet detection
image filtering
time clustering
duplicate detection
best-image selection
upload decision
```

---

## 3. High-Level Architecture

```txt
React Native + Expo app
  ↓
Photo permission
  ↓
Local camera-roll scan
  ↓
On-device pet detection
  ↓
Temporal clustering
  ↓
Best image selection
  ↓
Local timeline preview
  ↓
Upload selected event media to R2
  ↓
Store metadata in Supabase
  ↓
Supabase Edge Function calls OpenAI
  ↓
Caption + event type saved
  ↓
Timeline updates
```

Core architectural rule:

> The phone filters and compresses. The cloud interprets and narrates.

---

## 4. MVP Build Order

### Phase 0 — Local Technical Spike

Build this first before backend work:

```txt
1. Create Expo app
2. Request photo permission
3. Scan recent camera roll photos
4. Detect likely pet photos
5. Cluster photos by timestamp
6. Select best images
7. Render local timeline
```

No backend required.

Success condition:

> The app can generate a believable local pet timeline from real photos.

---

### Phase 1 — Local MVP Foundation

Build:

```txt
anonymous user ID
one-pet profile
local event model
local processing state
local timeline
active photo capture
event detail screen
basic event editing
```

Goal:

> User gets value without registering.

---

### Phase 2 — Backend Integration

Build:

```txt
Supabase project
Postgres schema
R2 storage integration
media upload queue
event sync
AI jobs table
OpenAI caption pipeline
```

Goal:

> Selected event media syncs safely and captions are generated.

---

### Phase 3 — Polish

Build:

```txt
onboarding flow
permission fallbacks
timeline polish
event detail polish
loading states
retry handling
basic analytics
privacy copy
```

Goal:

> First session feels simple, calm, and useful.

---

## 5. Core Product Rules for Agents

### 5.1 Passive-first

Always prefer passive capture over manual input.

Good:

```txt
scan camera roll
detect pet photos automatically
group moments automatically
suggest profile photo automatically
```

Bad:

```txt
require manual tagging
force users to fill forms
make users log every event
```

---

### 5.2 Events over files

The primary object is an `Event`.

Photos are supporting media.

Correct hierarchy:

```txt
Pet
  → Event
      → MediaAsset
      → Metadata
      → Notes
```

Do not build the main experience as a raw photo grid.

---

### 5.3 No registration required for free users

Do not block onboarding behind sign-up.

On first launch:

```txt
generate anonymous_user_id
store locally
use it for local and backend ownership
```

Later account creation should link to the existing anonymous user.

---

### 5.4 One pet in MVP, multi-pet-ready backend

MVP UI supports one pet only.

Backend must still include:

```txt
pet_id
```

on:

```txt
events
media_assets
event_metadata
pet_memberships
```

Do not create event records that only belong to a user.

---

### 5.5 AI should be natural, not promotional

Do not use UI copy like:

```txt
AI-powered pet assistant
Ask our AI anything
AI knows your pet
```

Use language like:

```txt
moments
memories
timeline
story
history
highlights
Ask Tailo
```

AI should quietly improve structure and recall.

---

### 5.6 GitHub issue & project workflow

Track work in GitHub Issues (and the repo [project board](https://github.com/users/asymfermion/projects/2)), not only in markdown checkboxes.

**Issues** = one task, PR links, open/closed. **Project** = planning view (status, priority, what’s next). Do not create duplicate work items on the project—add or use existing issues, then manage them on the board.

**Plan** — Before starting non-trivial work, ensure there is an issue on the [Tailo mobile project](https://github.com/users/asymfermion/projects/2):

- Pick an existing open issue from [docs/MOBILE_TASKS.md](./docs/MOBILE_TASKS.md) (each task maps to an issue in `asymfermion/tailo-monolith`, label `mobile-tasks`).
- If the task is new or missing, **create a GitHub issue first**: title `task-id: short description`, body with phase/section, labels (`mobile-tasks` + phase label), link to `MOBILE_TASKS.md`. Add it to project **#2** and add a matching row to `MOBILE_TASKS.md` if it is a new planned task.

**Start** — Do not begin implementation without an issue number. Move the issue to **In progress** (or equivalent) on the project board. Say which issue you are working on (e.g. “Working on #25 / task 0.3a.6”). Branch names and PR titles should reference the issue when possible.

**Finish** — When the task is done and verified (tests, docs per Definition of Done):

1. Close the GitHub issue (`state: closed`, `state_reason: completed`) and move it to **Done** on the project board.
2. Check off the task in `docs/MOBILE_TASKS.md` (`[x]`).
3. Note the issue or PR in the phase “notes & decisions” section when useful.

Do not leave issues open for merged or abandoned work. If scope is dropped, close with `state_reason: not_planned`, update the project board, and note why.

---

## 6. Database Schema Guidelines

Use Supabase Postgres.

Minimum tables:

```txt
users
pets
pet_memberships
events
media_assets
event_metadata
ai_jobs
```

---

### 6.1 users

```sql
users
- id uuid primary key
- anonymous_id text
- auth_provider text nullable
- created_at timestamptz
- updated_at timestamptz
```

Notes:

- anonymous users are real users
- later login should link to existing anonymous data

---

### 6.2 pets

```sql
pets
- id uuid primary key
- name text
- type text -- dog | cat
- gender text nullable
- profile_photo_media_id uuid nullable
- created_at timestamptz
- updated_at timestamptz
```

MVP supports one pet per user, but do not hardcode that in the schema.

---

### 6.3 pet_memberships

```sql
pet_memberships
- id uuid primary key
- pet_id uuid references pets(id)
- user_id uuid references users(id)
- role text -- owner | editor | viewer
- created_at timestamptz
```

MVP only uses:

```txt
owner
```

but the table enables shared accounts later.

---

### 6.4 events

```sql
events
- id uuid primary key
- pet_id uuid references pets(id)
- created_by_user_id uuid references users(id)
- timestamp timestamptz
- event_type text
- caption text nullable
- caption_language text nullable
- confidence numeric nullable
- source text -- camera_roll | in_app | manual
- is_favorite boolean default false
- created_at timestamptz
- updated_at timestamptz
```

Allowed MVP event types:

```txt
walk
play
rest
eating
unknown
```

---

### 6.5 media_assets

```sql
media_assets
- id uuid primary key
- event_id uuid references events(id)
- pet_id uuid references pets(id)
- type text -- image | video | receipt | audio
- local_asset_id text nullable
- storage_key text nullable
- thumbnail_key text nullable
- width integer nullable
- height integer nullable
- duration numeric nullable
- file_size integer nullable
- is_primary boolean default false
- score numeric nullable
- created_at timestamptz
```

MVP supports:

```txt
image
```

But schema must be ready for:

```txt
video
receipt
audio
```

---

### 6.6 event_metadata

```sql
event_metadata
- id uuid primary key
- event_id uuid references events(id)
- key text
- value_json jsonb
- created_at timestamptz
```

Future metadata examples:

```txt
amount
merchant
vet_clinic
symptom_tag
medication_name
```

---

### 6.7 ai_jobs

```sql
ai_jobs
- id uuid primary key
- event_id uuid references events(id)
- status text -- pending | processing | completed | failed
- job_type text -- caption | classify | summary | receipt_extract
- input_json jsonb
- output_json jsonb nullable
- error text nullable
- created_at timestamptz
- updated_at timestamptz
```

All AI jobs must be idempotent.

---

## 7. Local Data Guidelines

Local SQLite tables should mirror the processing pipeline.

Recommended local tables:

```txt
local_assets
local_event_candidates
local_media_scores
upload_queue
sync_state
```

---

### 7.1 local_assets

Track scanned camera-roll items.

```txt
local_asset_id
uri
created_at
width
height
media_type
processed_at
is_pet_candidate
pet_confidence
```

---

### 7.2 local_event_candidates

Generated before cloud sync.

```txt
local_event_id
timestamp
source
candidate_status
selected_asset_ids
created_at
```

---

### 7.3 upload_queue

For reliable background sync.

```txt
id
local_event_id
local_asset_id
status
retry_count
last_error
created_at
updated_at
```

Rule:

> Local event generation should not depend on network availability.

---

## 8. Photo Processing Guidelines

### 8.1 Never upload everything

Hard rule:

> Tailo must never upload the full camera roll.

Allowed pipeline:

```txt
scan locally
filter locally
cluster locally
select locally
upload selected event media only
```

---

### 8.2 Scan newest first

For onboarding, process:

```txt
last 2–4 weeks first
then continue toward 3 months
```

Show partial results quickly.

Do not wait for all photos to process before showing the timeline.

---

### 8.3 Permission states

Support:

```txt
full access
limited access
denied access
```

If denied:

```txt
allow manual capture
show helpful explanation
do not block app
```

If limited:

```txt
process available photos
allow user to grant more later
```

---

### 8.4 Event clustering

MVP heuristic:

```txt
same day + within 10–30 minutes + pet detected = same event candidate
```

Start with a simple deterministic algorithm.

Improve later with visual similarity.

---

### 8.5 Best image selection

Select only:

```txt
2–5 images per event
```

Scoring factors:

```txt
sharpness
brightness
subject visibility
uniqueness
duplicate distance
```

Do not show every similar photo in the timeline.

---

## 9. AI Guidelines

### 9.1 AI call granularity

Call AI per event, not per image.

Correct:

```txt
event candidate with 2–5 selected images
→ one AI request
```

Incorrect:

```txt
each photo
→ separate AI request
```

---

### 9.2 Caption output contract

AI should return structured JSON:

```json
{
  "caption": "Evening walk at the park",
  "event_type": "walk",
  "confidence": 0.86,
  "language": "en"
}
```

---

### 9.3 Caption style

Good captions:

```txt
Evening walk at the park
Relaxing by the window
First beach trip
```

Bad captions:

```txt
A dog standing outdoors
AI detected a pet in this image
The dog may be sad
```

Captions must be:

```txt
short
natural
warm
non-clinical
non-diagnostic
```

---

### 9.4 Low-confidence behavior

If confidence is low, use safe captions:

```txt
Quiet moment at home
Afternoon moment
A moment with Max
```

Do not invent precise context.

---

### 9.5 Health boundary

Never generate:

```txt
diagnosis
treatment advice
risk level
medical conclusion
personality disorder
emotional state certainty
```

Allowed:

```txt
observational summaries
timeline recall
neutral pattern statements
consult-a-vet reminder for concerns
```

---

## 10. Storage Guidelines

### 10.1 R2 object structure

Use predictable object keys:

```txt
/users/{user_id}/pets/{pet_id}/events/{event_id}/images/{media_id}.webp
/users/{user_id}/pets/{pet_id}/events/{event_id}/thumbs/{media_id}.webp
```

Future:

```txt
/users/{user_id}/pets/{pet_id}/events/{event_id}/videos/{media_id}.mp4
/users/{user_id}/pets/{pet_id}/events/{event_id}/receipts/{media_id}.jpg
```

---

### 10.2 Image compression

Before upload:

```txt
resize max width to around 1280px
compress
prefer webp/jpeg
generate thumbnail
```

Store originals only if explicitly required later.

For MVP, compressed event images are enough.

---

### 10.3 Signed access

Media should not be public by default.

Use signed URLs or protected access patterns.

---

## 11. API / Edge Function Guidelines

Use Supabase Edge Functions for backend operations.

Recommended functions:

```txt
create-event
upload-media-token
process-event-ai
get-timeline
update-event
sync-events
```

---

### 11.1 create-event

Input:

```json
{
  "pet_id": "uuid",
  "timestamp": "2026-05-17T10:00:00Z",
  "source": "camera_roll",
  "local_event_id": "string"
}
```

Must be idempotent.

---

### 11.2 process-event-ai

Input:

```json
{
  "event_id": "uuid"
}
```

Behavior:

```txt
load selected media
call OpenAI once for the event
save caption/type/confidence
mark ai_job completed
```

---

### 11.3 update-event

Allow:

```txt
caption edit
event type edit
favorite toggle
note later
```

Do not allow unsafe or unrelated updates.

---

## 12. UI Coding Guidelines

### 12.1 Timeline-first

The home screen is the timeline.

Recommended layout:

```txt
Top: Pet profile / Ask
Main: Timeline
Floating: +
```

Avoid many tabs in MVP.

---

### 12.2 Visual design

Use:

```txt
off-white background
large rounded photos
generous spacing
subtle typography
single accent color
minimal icons
```

Avoid:

```txt
heavy cards
bright colors
dense dashboard panels
too many buttons
AI-themed UI
```

---

### 12.3 Timeline event item

Each event should show:

```txt
caption
image grid
timestamp
event type
```

Do not show internal processing details unless needed.

---

### 12.4 Loading states

During first scan:

```txt
Finding moments...
Building your timeline...
```

Avoid technical copy:

```txt
Running AI model...
Processing embeddings...
Uploading assets...
```

---

## 13. Onboarding Guidelines

Preferred flow:

```txt
welcome
photo permission
scan begins
partial timeline appears
ask pet name
ask pet type
ask optional gender
suggest profile photo
continue background processing
```

Do not force:

```txt
registration
subscription
full profile
manual upload
```

---

## 14. Future-Readiness Guidelines

### 14.1 Multiple pets later

Do not build pet switcher yet.

But do:

```txt
include pet_id everywhere
avoid hardcoding only one pet in database
```

---

### 14.2 Shared accounts later

Do not build invite UI yet.

But do:

```txt
use pet_memberships
use roles
do not assume pet owner is the only viewer forever
```

---

### 14.3 Multi-language later

Do:

```txt
externalize UI strings
store caption_language
avoid hardcoded English assumptions
```

---

### 14.4 Video later

Do not support video in MVP.

But schema should support:

```txt
type = video
thumbnail_key
duration
```

Initial future video rule:

```txt
1 video per event
10–30 seconds
key-frame AI only
```

---

### 14.5 Receipts later

Receipts are event enrichment, not finance tracking.

Good:

```txt
Vet visit — $120
```

Bad:

```txt
Pet expense dashboard as main product
```

---

## 15. Performance Guidelines

### 15.1 First-session target

The user should see useful events within about:

```txt
60 seconds
```

Use:

```txt
progressive processing
newest-first scan
local timeline preview
background continuation
```

---

### 15.2 Do not block UI

Photo scanning, detection, compression, and upload must not freeze the interface.

Use:

```txt
batching
background tasks where possible
queues
progress states
```

---

### 15.3 Offline tolerance

The app should still support:

```txt
local scan
local event candidate creation
manual capture queue
timeline cache
```

Sync when the network returns.

---

## 16. Cost Control Guidelines

Never:

```txt
upload all photos
call LLM per image
reprocess unchanged media
store unnecessary originals
```

Always:

```txt
filter on-device
cluster before upload
compress media
cache AI results
deduplicate uploads
process per event
```

---

## 17. Code Organization

Recommended structure:

```txt
/src
  /modules
    /auth
    /pets
    /mediaScanner
    /eventBuilder
    /timeline
    /capture
    /storage
    /ai
    /sync
    /settings
  /components
  /screens
  /lib
  /db
  /types
  /constants
```

---

### 17.1 Module responsibilities

#### auth

```txt
anonymous user ID
future sign-in linking
secure local identity
```

#### mediaScanner

```txt
photo permission
camera roll pagination
local asset extraction
```

#### eventBuilder

```txt
pet detection results
time clustering
image scoring
event candidate creation
```

#### timeline

```txt
timeline query
event rendering
local/cache state
```

#### capture

```txt
in-app camera
manual event creation
preview/save flow
```

#### storage

```txt
compression
thumbnail generation
R2 upload
signed URL handling
```

#### ai

```txt
AI job creation
caption parsing
classification result validation
```

#### sync

```txt
upload queue
retry logic
remote/local reconciliation
```

---

## 18. Testing Guidelines

Test at minimum:

```txt
first launch without account
photo permission full access
photo permission limited access
photo permission denied
no pet photos found
many pet photos found
duplicate photos
offline mode
failed upload retry
AI job failure
event edit persistence
```

---

## 19. Definition of Done for MVP

The MVP is done when:

```txt
1. User installs without registration.
2. User grants photo access.
3. Tailo scans recent photos locally.
4. Tailo identifies likely pet moments.
5. Tailo groups photos into events.
6. Tailo selects best images.
7. Tailo renders a clean timeline.
8. User can create a photo event manually.
9. User can edit caption/type/favorite.
10. Only selected media is uploaded.
11. AI captions are generated per event.
12. App handles limited/denied photo permissions.
13. UI feels simple, modern, and calm.
```

---

---

## 21. Repository Strategy

Use **one repository** for the MVP.

Tailo should start as a **monorepo** because the mobile app, backend functions, database schema, shared types, AI contracts, and product documentation will change together frequently.

Do not split into separate frontend/backend repositories during MVP unless there is a strong operational reason.

---

### 21.1 Recommended repository structure

```txt
tailo/
  apps/
    mobile/                 # React Native + Expo app

  supabase/
    migrations/             # Postgres migrations
    functions/              # Supabase Edge Functions
      process-event-ai/
      create-event/
      update-event/
      get-timeline/
      sync-events/

  packages/
    shared/                 # shared TypeScript types, constants, schemas
    ai/                     # prompt templates, AI response schemas
    config/                 # shared config if needed

  docs/
    Tailo_Project_Summary_MVP_Plan.md
    Tailo_Agent_Coding_Guidelines.md

  scripts/
    seed scripts, local dev helpers, test utilities

  package.json
  README.md
```

Optional later:

```txt
turbo.json
pnpm-workspace.yaml
```

Use these only when workspace complexity justifies them.

---

### 21.2 Why one repo

Use one repo because these parts will evolve together:

```txt
event schema
mobile TypeScript types
Supabase migrations
Edge Function payloads
AI output schemas
timeline rendering logic
```

A single repo gives:

```txt
one source of truth
simpler coding-agent context
easier refactoring
shared TypeScript contracts
simpler local setup
less process overhead
```

---

### 21.3 Boundary rules inside the monorepo

Even though the code lives in one repo, maintain clear module boundaries.

Rules:

```txt
apps/mobile must not depend on backend internals
packages/shared defines API contracts and common types
supabase/functions consumes shared schemas
AI prompts and output schemas live in packages/ai
database migrations live only in supabase/migrations
```

Do not duplicate event types or AI response contracts across folders.

If a type is used by both mobile and backend, put it in:

```txt
packages/shared
```

If a prompt or AI schema is reused, put it in:

```txt
packages/ai
```

---

### 21.4 When to split later

Only consider splitting into separate repositories when one of these becomes true:

```txt
separate backend team
independent backend deployment lifecycle
public API or SDK
multiple client apps consuming the same backend
security/compliance requirement
large-scale CI/CD bottlenecks
```

Until then, keep one monorepo.

---

### 21.5 Agent instruction

When adding new code, place it in the correct monorepo boundary.

Do not create a second repository for backend, AI, or docs during MVP.

Default structure:

```txt
mobile code → apps/mobile
database migrations → supabase/migrations
Edge Functions → supabase/functions
shared types → packages/shared
AI prompts/contracts → packages/ai
documentation → docs
```

Core rule:

> Start simple with one monorepo. Keep boundaries clean. Split only when the project truly outgrows it.

## 22. Final Agent Instruction

When implementing Tailo, optimize for this order:

```txt
1. Trust
2. Simplicity
3. Speed to first value
4. Privacy
5. Cost control
6. Future flexibility
```

For every task: **plan with a GitHub issue (on the project board) → implement against that issue → close the issue when done** (see §5.6).

Do not add features that make users work harder.

Build systems that make their pet’s life easier to remember.
