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

### Light Theme

- Background: `#F7F5F2`
- Surface: `#FFFFFF`
- Primary text / ink: `#1C1C1A`
- Secondary text: `#6B6B66`
- Warm muted text option: `#746D63`
- Border: `#E8E4DE`
- Divider: `#D8D2C8`
- Soft chip background: `#F1ECE5`
- Destructive: `#8A3A2B`

### Dark Theme

- Background: `#141413`
- Surface: `#1E1E1C`
- Primary text: `#F5F3EF`
- Secondary text: `#A8A6A0`
- Border: `#2E2E2B`
- Divider: `#3A3834`
- Destructive: `#D48478`

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

Avoid a large persistent create FAB in the bottom navigation. Tailo is automatic-memory-first, not creation-first.

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
