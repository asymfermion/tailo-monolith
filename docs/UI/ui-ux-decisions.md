# Tailo UX Decisions

## Navigation

Tailo has three primary destinations:

1. Story
2. Pet
3. Settings

Use a floating glass navigation pill. The center tab should represent the active pet where possible.

Do not add a large persistent FAB to the bottom navigation.

## Onboarding

The first-run flow should be short.

1. Welcome screen
2. Native photo permission
3. Discovery
4. Story feed

### Welcome Screen

Primary CTA:

> Start with My Photos

Secondary actions:

- Continue with Apple
- Continue with Google
- Sign In

Privacy copy belongs on the welcome screen:

> Your photos stay on your device until you choose to save memories.

### Native Permission

Use the native photo permission popup.

Do not insert a custom permission page unless recovering from denied access.

### Discovery

Discovery should feel magical and emotional, not technical.

Show messages like:

- Adventures found
- Beach photos found
- Sleep moments found
- Creating first memories

Avoid pipeline language and raw processing counts as the main UI.

### Story Feed Entry

After discovery, go directly into Story.

Pet selection and naming should happen inline in the Story feed when needed, not through extra onboarding screens.

## Story Feed

Users should understand a memory without opening details.

Each memory should include:

- Hero image
- Title
- Supporting images
- Story text
- Date
- Photo count

Hero photos should stay visually clean. Do not place a full transparent text cover over every memory image. Keep story/title text in the card body and metadata below.

Visual styling should follow the selected sketch references:

- Warm ivory background
- Ink primary and selected states
- Soft taupe dividers
- Rounded photo-led cards
- Quiet brown-gray secondary text
- Minimal chrome

Green and blue should not be used as the default UI accent.

## Memory Detail

Memory detail is optional.

Use it for:

- Full gallery
- Editing
- Sharing
- Metadata
- Related memories
- Location

Do not require users to open details to enjoy the feed.

## Pet Profile

Keep pet profile simple and emotional.

Recommended sections:

- Hero photo
- Story stats
- About
- Highlights
- Life timeline

Avoid turning the profile into a long settings page.

## Edit Profile

Auto-save by default.

No Save button.

Show lightweight save state:

- Saving...
- Saved
- Retry

Use debounced auto-save for text fields and immediate save for pickers/photos.

Keep the edit surface small:

- Profile photo
- Name
- Breed/type
- Birthday
- Gender
- About
- Personality
- Favorite things

## Account Prompt

Account creation should be delayed until after the user has seen value.

Use contextual copy like:

> Keep Link's story safe forever.

Avoid blocking the first-run flow with account creation.
