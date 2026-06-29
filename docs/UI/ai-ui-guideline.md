# Tailo AI Coding Guidelines: UI/UX

These guidelines define how AI coding agents should design, implement, and review Tailo UI changes.

Tailo is a private pet memory app. The product should feel like a warm personal memory book, not a dashboard, tracker, SaaS product, veterinary app, or social network.

## 1. Core Product Feeling

Tailo should feel like:

- Apple Photos Memories
- Apple Journal
- a premium printed photo book
- a private family album
- a quiet place for remembering a pet’s life

Tailo should not feel like:

- a pet tracker
- a social media feed
- a productivity dashboard
- a generic AI photo app
- a veterinary record system
- a SaaS onboarding flow
- a form-heavy account portal

The app should prioritize emotion, memory, photography, and trust.

## 2. Product Principles

### Memory first

The core unit of Tailo is a memory/story, not an event log.

Use product language like:

- Story
- Memory
- Moment
- Highlight
- Recap
- Life with [Pet Name]
- Pet’s story

Avoid user-facing language like:

- Event
- Record
- Activity
- Tracker
- Log
- Detection
- AI output

Internal technical names can remain if already established, but user-facing copy should stay warm and human.

### Content over chrome

The pet photos and stories should be the hero. UI should support the memory, not compete with it.

Prefer:

- large photography
- quiet controls
- subtle transitions
- editorial typography
- minimal navigation

Avoid:

- dense cards
- visible dashboards
- excessive borders
- many buttons on one screen
- generic empty states

### One screen at a time

Do not redesign multiple major screens in one pass.

Preferred workflow:

1. Update one screen.
2. Run the app.
3. Compare screenshot against the design direction.
4. Fix spacing, typography, and visual hierarchy.
5. Only then move to the next screen.

## 3. Visual Style

### Overall direction

Tailo uses a warm, editorial, printed-memory style.

The UI should feel:

- warm
- premium
- quiet
- emotional
- tactile
- personal
- photo-book-like

It should not feel:

- clinical
- cold
- playful in a childish way
- overly flat
- neon
- corporate
- gamified

### Colors

Use a warm paper palette.

Recommended color roles:

- Background: warm ivory / paper
- Primary text: ink black / near black
- Secondary text: warm gray / taupe gray
- Borders: soft taupe
- Primary CTA: ink black
- Primary CTA text: ivory / white
- Card surfaces: ivory, paper, soft cream
- Shadows: soft, warm, subtle

Avoid introducing bright green or blue as Tailo brand accents unless explicitly requested.

Google’s official multi-color icon is allowed as a brand exception. Do not use Google colors as Tailo UI accents.

### Texture and depth

Subtle paper texture is welcome.

Use:

- printed-photo borders
- soft shadows
- torn-paper edges
- slight photo rotation
- layered polaroids
- warm paper backgrounds

Avoid:

- heavy drop shadows
- glossy gradients
- glassmorphism everywhere
- hard rectangular hero banners
- flat screenshot-like hero images

## 4. Typography

Tailo typography should feel editorial and refined.

### Headline typography

Major emotional headlines should use the app’s elegant/editorial serif style.

Examples:

- `Every pet has a story.`
- `Welcome back.`
- `Life with Mochi`

Use Playfair/Lora/elegant serif styles where available.

Avoid heavy sans-serif headlines for emotional or onboarding screens. Heavy sans-serif makes Tailo feel like a generic startup app.

### Body typography

Body copy should be simple, clear, and quiet.

Use shorter sentences. Avoid marketing fluff.

Good:

- `Tailo finds the little moments already waiting in your photos.`
- `Sign in to continue your pet’s story.`
- `Choose the photos Tailo can use.`

Avoid:

- `Unlock powerful AI-driven pet memory intelligence.`
- `Track and manage your pet activity history.`
- `Generate events from your camera roll.`

### Font weight

Use restraint.

- Headlines: elegant, medium editorial weight
- Body: regular
- Buttons: semibold
- Labels: medium or semibold
- Legal copy: small regular text

Avoid making every label bold.

## 5. Layout and Spacing

### General layout

Use generous but controlled spacing.

The layout should breathe, but it should not waste space.

Common problems to avoid:

- hero section pushing content off-screen
- large blank space after legal copy
- overlapping absolute-positioned hero layers
- fixed iPhone-only dimensions
- cramped bottom safe area
- decorative elements covering text

### Responsive layout

All screens must work across common iOS and Android sizes.

Use:

- `useWindowDimensions`
- safe area insets
- responsive spacing buckets
- min/max size bounds
- `ScrollView` fallback for small screens

Avoid:

- hardcoded Dynamic Island offsets
- fixed full-screen heights
- negative margins that only work on one simulator
- absolute-positioned content outside reserved containers

Recommended responsive buckets:

- Short screens: compact hero, smaller headline, tighter gaps, scroll allowed
- Normal screens: fit without scroll where practical
- Tall screens: distribute extra space into hero and section spacing, not bottom padding

### Hero sections

Hero sections may use internal absolute positioning, but the parent container must reserve enough height for all layers.

The hero must not cover:

- headline
- form fields
- buttons
- legal copy

A hero collage should reserve space for:

- main photo
- photo border
- torn-paper edge
- polaroid
- botanical element
- shadow

## 6. Auth and Onboarding

### First onboarding screen

The first screen should immediately communicate Tailo’s value.

Current preferred copy:

```text
Every pet has a story.

Tailo finds the little moments already waiting in your photos.
```

Button order:

1. `Start with my photos`
2. `Continue with Apple`
3. `Continue with Google`
4. `Register with Email`
5. `Already have an account? Sign in`
6. legal copy

Do not add `Private by default.` to the main hero copy unless explicitly requested. Privacy can be communicated in legal copy, permission screens, and settings.

### Legal copy

Use centered text only.

Preferred:

```text
By continuing, you agree to our Terms of Service and Privacy Policy.
```

Do not add a lock icon beside legal copy.

Terms and Privacy should be underlined/clickable.

### Sign-in screen

The sign-in screen should feel like the next page in the same memory book, not a separate login template.

It should share:

- warm paper background
- Tailo wordmark
- printed-photo hero style
- torn-paper edge
- polaroid detail
- editorial headline typography
- centered legal copy

Preferred sign-in copy:

```text
Welcome back.

Sign in to continue your pet’s story.
```

Keep auth logic unchanged unless the task explicitly requires auth behavior changes.

## 7. Printed Photo Hero System

Use a shared `AuthHeroCollage` or equivalent component for auth-related hero sections.

The hero should be built from layers, not rendered as one flattened screenshot.

Recommended layers:

1. warm paper background
2. transparent Tailo wordmark
3. main printed photo
4. torn-paper edge
5. small overlapping polaroid
6. optional dried flower / botanical detail

Rules:

- Use transparent wordmark asset or text rendering with no rectangular background.
- Main photo should look like a printed photo, not a generic banner.
- Use subtle white paper border.
- Use almost-square corners, around 0–4px.
- Use slight rotation only where it improves the printed-photo feeling.
- Keep shadows soft.
- Keep the polaroid inside the reserved hero container.
- Do not let decorative layers overlap readable content.

## 8. Navigation

### Main app navigation

The primary navigation should be simple and memory-first.

Preferred main tabs:

- Story
- Pet
- Settings

The navigation should not dominate the screen.

Preferred direction:

- floating Instagram-style glass/soft pill navigation
- minimal labels
- pet identity/avatar can act as the center tab
- no large persistent FAB unless a screen explicitly needs it

Avoid:

- dashboard-like tab bars
- too many primary destinations
- large action buttons floating over memories
- navigation that competes with photos

### Back navigation

Back buttons should be simple and quiet.

Back controls should not visually overpower the Tailo wordmark or screen title.

## 9. Story Feed

The Story feed is the core product surface.

A user should be able to understand and emotionally consume a memory directly from the feed.

Each story/memory should emphasize:

- hero photo
- supporting photos
- short generated story
- date or approximate time
- photo count if useful

Avoid making the feed only a list of small cards that require tapping into detail.

The feed should feel closer to Apple Photos Memories than Instagram or a database list.

## 10. Pet Profile

The Pet profile should feel like a character page, not a settings page.

It can include:

- hero pet photo
- pet name
- short personality/about section
- favorite memories
- life timeline
- simple stats
- gentle editing

Avoid:

- medical-record layout
- dense metadata
- database-style fields
- overly technical pet identity controls

Editing should feel lightweight. Prefer auto-save where reasonable. Avoid unnecessary Save buttons unless the interaction requires explicit confirmation.

## 11. Forms and Inputs

Forms should be calm, soft, and premium.

Use:

- warm ivory input backgrounds
- taupe borders
- rounded but not cartoonish corners
- clear labels
- accessible focus states
- readable error messages

Avoid:

- harsh gray forms
- bright blue focus rings
- dense form layouts
- form-first screens where memory/photo content should lead

## 12. Buttons

### Primary buttons

Primary actions should use an ink-black pill.

Examples:

- `Start with my photos`
- `Sign in`
- `Continue`

Primary button text should be white or warm ivory.

### Secondary buttons

Secondary buttons should be warm outlined rounded rectangles.

Use taupe borders, not cold gray.

### Social buttons

On onboarding:

- Apple and Google can be full-width outlined buttons with text.

On sign-in:

- Apple and Google can be circular icon-only buttons.

Rules:

- Apple uses the official black Apple mark.
- Google uses the official multi-color Google `G`.
- Do not recolor brand icons.
- Do not redraw brand icons.
- Keep icon optical sizes balanced.
- Keep accessibility labels.

### Icon alignment

All button icons should use a consistent icon slot.

Use:

- consistent icon box, usually 24x24 or 28x28
- optical centering
- consistent left inset
- balanced text alignment

Avoid letting icon intrinsic sizes shift button labels.

## 13. Icons and Assets

Use icons deliberately.

Non-brand UI icons should share:

- same icon family
- same stroke weight
- same color
- same optical size

Preferred non-brand icon color:

- Tailo ink on light surfaces
- white/ivory on black CTA

For the photo CTA, use a photo-library or photo-stack icon, not an upload icon.

For email, use a simple outline envelope.

For Google and Apple, use official/pre-approved brand assets.

## 14. Copywriting

Tailo copy should be warm, clear, and restrained.

Good Tailo copy sounds like:

- a private memory book
- a caring product
- a quiet assistant
- a human companion for pet memories

Avoid:

- hype
- technical AI language
- over-explaining
- corporate tone
- tracker/log language

Preferred words:

- find
- remember
- story
- moments
- memories
- life
- little moments
- already waiting in your photos

Avoid user-facing words:

- detect
- classify
- event
- pipeline
- scan result
- cluster
- entity
- record

## 15. Privacy and Trust

Tailo should feel private and trustworthy without making every screen feel legal-heavy.

Use privacy messaging where it helps decision-making:

- photo permission screen
- settings
- account/sync screens
- onboarding legal copy

Avoid overloading the hero area with privacy claims unless the screen is specifically about permission or trust.

Be specific and honest. Do not make claims the app does not technically support.

## 16. Accessibility

All UI changes must preserve accessibility.

Requirements:

- Buttons have clear accessibility labels.
- Icon-only buttons include labels.
- Text has sufficient contrast.
- Tap targets are large enough.
- Dynamic text should not break layout.
- Scroll fallback should exist for small screens and large text.
- Decorative images should not be announced as meaningful content unless they are meaningful.

Avoid building layouts that only work at one font size.

## 17. Cross-Platform Requirements

Tailo should work on iOS and Android.

Do not assume:

- Dynamic Island
- iPhone-only safe areas
- exact iOS status bar height
- one specific simulator size

Use platform-safe layout patterns.

Test or reason through:

- compact iPhone
- standard iPhone
- tall iPhone
- common Android phone
- large font size
- small screen height

## 18. Implementation Guidelines for AI Coding Agents

### Preserve behavior

Unless explicitly requested, do not change:

- auth logic
- navigation flow
- API calls
- data models
- storage behavior
- permission logic

For UI tasks, change only layout, styling, copy, and component structure.

### Prefer shared components

When two screens share a visual language, extract shared components.

Good candidates:

- `AuthHeroCollage`
- `AuthWordmark`
- `AuthActionButton`
- `SocialIconButton`
- `LegalCopy`
- `PrintedPhoto`
- `PolaroidPhoto`

Do not duplicate slightly different implementations across onboarding and sign-in.

### Avoid one-off magic numbers

Prefer named responsive tokens:

- `heroHeight`
- `heroToContentGap`
- `copyToButtonsGap`
- `buttonGap`
- `legalTopGap`
- `horizontalPadding`

Use min/max bounds for responsive values.

### Keep decorative layers contained

Absolute positioning is acceptable inside a component, but the parent must reserve enough space.

Do not use negative margins or z-index hacks that allow decoration to overlap content unpredictably.

### Small, reviewable changes

For each UI task:

1. Identify the target screen.
2. Inspect existing components and theme.
3. Reuse existing tokens.
4. Make the smallest change that achieves the design goal.
5. Preserve behavior.
6. Run/check the screen.
7. Compare screenshot to the intended visual style.

## 19. Common Anti-Patterns

Avoid these patterns:

- generic rounded image banner
- cold white/gray SaaS form
- blue or green accent drift
- heavy sans-serif emotional headlines
- dense dashboard cards
- too many CTAs
- decorative layers covering text
- hardcoded iPhone-specific values
- legal copy with extra icons
- flattened hero screenshots
- AI/technical jargon in user copy
- social-network-first UI
- pet-tracker terminology

## 20. Review Checklist

Before considering a UI change done, check:

- Does it feel like Tailo, not a generic app?
- Is the pet memory/photo content the hero?
- Is the screen warm, quiet, and premium?
- Does the typography match the screen’s emotional role?
- Does the layout work on small, normal, and tall devices?
- Does anything overlap or clip?
- Is there unnecessary bottom space?
- Are icons aligned and consistent?
- Are brand icons used correctly?
- Are auth/navigation/data behaviors unchanged?
- Is the copy human and memory-focused?
- Does the screen preserve accessibility?
- Does it avoid blue/green accent drift?
- Does it feel like a printed memory page or private family album?

## 21. One-Line Direction

Tailo UI should feel like a refined printed memory book for a pet’s life, not a dashboard, tracker, or generic login form.
