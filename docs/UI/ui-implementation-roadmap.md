# Tailo UI Implementation Roadmap

## Goal

Implement the selected memory-first Tailo design while preserving the working MVP architecture.

Prioritize surgical visual and UX changes over deep rewrites.

## Existing Architecture To Keep

Keep:

- Timeline screen
- Pet profile screen
- Settings screen
- Event detail modal
- Floating main tab bar
- Modal stack
- Existing media scanning pipeline
- Existing local-first / anonymous-first behavior

The current architecture already fits the desired UX. Most changes should be visual and component-level.

## Phase 1: Documentation Cleanup

Recommended docs under `docs/UI/`:

```text
docs/UI/ui-product-principles.md
docs/UI/ui-style.md
docs/UI/ui-ux-decisions.md
docs/UI/ui-implementation-roadmap.md
```

The first three are the core source of truth.

Optional: update root `AGENTS.md` to tell coding agents to read these before UI changes.

## Phase 2: Story Feed Redesign

Target files likely include:

- `apps/mobile/src/screens/TimelineScreen.tsx`
- `apps/mobile/src/modules/timeline/components/TimelineMomentCard.tsx`
- `apps/mobile/src/modules/timeline/components/TimelineTopBar.tsx`
- `apps/mobile/src/modules/timeline/components/TimelineAnonymousUpgradeCard.tsx`

Changes:

- Treat Timeline as Story in user-facing copy
- Replace compact event cards with rich multi-photo memory cards
- Show story text directly in feed
- Keep hero photos clean, without full-image transparent text covers
- Use warm ivory/taupe/ink visual language
- Keep detail screen optional
- Keep existing list virtualization and data hooks

## Phase 3: Bottom Navigation Refinement

Target files likely include:

- `apps/mobile/src/navigation/components/MainTabBar.tsx`
- `apps/mobile/src/navigation/tabBarLayout.ts`

Changes:

- Keep floating glass pill
- Use Story / Pet / Settings mental model
- Consider pet avatar/name for center tab
- Use ink selected state
- Keep labels minimal
- Current app still renders `CaptureFab` on Story; sketch target is to move manual creation into the Story header or contextual menus instead of a large persistent FAB.

## Phase 4: Pet Profile Redesign

Target file likely includes:

- `apps/mobile/src/screens/PetProfileScreen.tsx`

Changes:

- Large photo-led hero
- Pet identity block
- Story stats
- About
- Highlights
- Life timeline
- Simple edit entry point

Avoid overbuilding the pet profile.

## Phase 5: Edit Pet Profile Auto-Save

Implement auto-save.

Behavior:

- No Save button
- Debounced text saves
- Immediate picker/photo saves
- Optimistic UI
- Clear save state: Saving..., Saved, Retry

## Phase 6: Onboarding Simplification

Changes:

- Welcome/auth screen with Start with My Photos as primary CTA
- Apple/Google/Sign In secondary
- Privacy copy on welcome screen
- Native photo permission
- Discovery screen
- Enter Story feed quickly
- Inline pet confirmation/naming inside Story feed

## Phase 7: Memory Detail Refresh

Target file likely includes:

- `apps/mobile/src/screens/EventDetailScreen.tsx`

Changes:

- Full-bleed or large hero photo
- Story-first layout
- Gallery
- Metadata lower on page
- Edit/share actions available but not dominant

## What Not To Do Yet

- Do not rename database models from Event to Memory yet.
- Do not rewrite navigation from scratch.
- Do not add many onboarding screens.
- Do not add complex pet-profile forms.
- Do not make account creation mandatory.
- Do not make green or blue the default accent without a deliberate brand decision.
