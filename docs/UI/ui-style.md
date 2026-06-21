# Tailo Style Guide

## Product Identity

Tailo is a private, memory-first pet story app.

The UI should feel warm, calm, emotional, premium, and photo-first.

## Visual Direction

Inspired by the three selected UI sketches, Apple Photos Memories, Apple Journal, Airbnb editorial pages, Day One Journal, and premium printed photo books.

The visual language is:

- Warm ivory page backgrounds
- Ink primary text and selected states
- Quiet brown-gray secondary text
- Soft taupe dividers
- Rounded photo-led memory layouts
- Minimal chrome
- Large photography
- Editorial spacing

Avoid:

- Bright startup blue
- Default green/blue accent drift
- Dashboard cards everywhere
- Full-image transparent text covers on every memory image
- Dense metadata
- Veterinary or tracker aesthetics
- Generic AI-generated app UI

## Core Principles

- Show value before commitment
- Photos are the interface
- Story over database
- Fast path to first memory
- Private by default

## Color System

The neutral foundation is the brand. Accent should be subtle.

These tokens should match `apps/mobile/src/constants/theme.ts`.

### Light Theme

- Background: `#FBF7F1`
- Surface: `#FFFDF9`
- Primary text / ink: `#151412`
- Secondary text: `#6F665D`
- Accent / selected state: `#151412`
- Border: `#E7DDD2`
- Divider: `#D8CBBE`
- Tab bar border: `rgba(231, 221, 210, 0.52)`
- Destructive: `#9A3E32`
- Shadow: `#151412`

### Dark Theme

- Background: `#141413`
- Surface: `#1E1E1C`
- Primary text: `#F5F3EF`
- Secondary text: `#B5ACA2`
- Accent / selected state: `#F6EFE7`
- Border: `#332F2A`
- Divider: `#413A33`
- Tab bar border: `rgba(82, 74, 66, 0.58)`
- Destructive: `#DA8A7E`
- Shadow: `#000000`

### Accent Decision

The sketches now point toward ink/taupe as the default UI accent rather than green or blue.

Do not use green or blue as the default UI accent unless the design direction is intentionally revised.

Use `#5C7C6A` or `#5A738A` only as optional secondary accent candidates for specific branded moments, not as the default control color.

## Typography

Use editorial hierarchy. Avoid dense dashboard typography.

Recommended scale:

- Hero title: 34-40
- Screen title: 30-34
- Section title: 18-22
- Memory title: 20-28
- Body/story text: 15-17
- Metadata: 12-14

Use heavy weights sparingly. Prefer size, whitespace, and photo hierarchy.

## Spacing and Shape

- Horizontal screen padding: 20-24
- Vertical space between major sections: 28-40
- Image corner radius: 16-24
- Small control radius: 10-14
- Use cards only when grouping is necessary
- Prefer borderless photo groups over stacked dashboard cards
- Shadows should be soft and rare

## Navigation

Primary destinations:

1. Story
2. Pet
3. Settings

Use a floating Instagram-style glass navigation pill.

The center tab should represent the active pet identity where possible, for example the pet avatar/name.

Keep the tab bar visually light:

- Blur/glass background
- Low-opacity border
- Ink selected state
- Quiet inactive states

Current app state: Story still renders a 56x56 `CaptureFab` above the floating tab bar.

Sketch target: avoid a large persistent create FAB in the bottom navigation. Tailo is automatic-memory-first, not creation-first.

Manual creation can live in the Story header or contextual menus.

## Story Feed

The Story feed is the core product experience.

Users should understand a memory without opening a detail screen.

Each memory should usually show:

- Title
- Hero image
- Supporting images
- Story text
- Date
- Photo count
- Favorite/overflow actions

Hero photos should stay visually clean. Do not place a full transparent text cover over every memory image. Keep title/story text in the card body and metadata below.

Recommended structure:

```text
Life with Link
428 memories · 2 years together

This Week

Beach Adventure
[large hero image]
[small image] [small image] [small image]

Link couldn't stop running through the waves.

Jun 7 · 12 photos

June 2026

Lazy Sunday
[large hero image]
[small image] [small image]

After a busy week, Link slept all morning.

Jun 4 · 8 photos
```

Avoid:

- Date rails
- Compact database lists
- Filter-heavy layouts
- Event-log language
- Metadata-first cards

## Pet Profile

The pet profile is a character page, not a settings page.

Recommended structure:

- Large photo-led hero
- Pet name
- Compact identity details
- Story stats
- About
- Highlights
- Life timeline
- Edit profile entry point

Use the sketch language:

- Large photo-led hero
- Soft glass stat strip
- Ink selected segments
- Warm outline chips
- Minimal borders

Avoid overbuilding this screen. The profile should stay emotional and simple.

## Editing

Auto-save by default. No Save button.

Use simple save states:

- Saving...
- Saved
- Could not save. Tap to retry.

For pet profile editing:

- Debounce text fields
- Save picker/photo changes immediately
- Use optimistic UI
- Keep the form short

Suggested pet edit fields:

- Profile photo
- Name
- Breed/type
- Birthday
- Gender
- About
- Personality
- Favorite things

## Memory Detail

Memory detail is optional depth, not the default consumption path.

Use it for:

- Full gallery
- Editing
- Sharing
- Metadata
- Related memories
- Location
- Pet/person association

Do not require users to open detail screens to understand memories.
