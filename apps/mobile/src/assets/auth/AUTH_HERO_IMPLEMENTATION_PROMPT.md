# Codex Prompt: Implement Tailo Printed-Photo Auth Hero

Fix the Tailo onboarding/login hero so it looks like a composed scrapbook page, not separate pasted images.

## Current problem

The wordmark and hero image look like separate rectangular assets. The Tailo logo has a visible image background/patch, and the hero photo looks like a flat banner.

## Goal

Create a reusable `AuthHeroCollage` component that renders the hero as real layered React Native UI.

## Use these assets

Place these files under:

`apps/mobile/src/assets/auth/`

Files:

- `tailo-wordmark-dark-transparent.png`
- `auth-photo-onboarding-main-beach.png`
- `auth-photo-login-main-clean.jpg`
- `auth-photo-mini-beach.jpg`
- `torn-paper-edge-ivory.png`

The source handoff included additional reference-only and alternate images. Those were removed after implementation so the app bundles only the layered assets it uses. Do not render any future reference composite directly as a flat hero banner.

## Component API

Create a reusable component similar to:

```tsx
<AuthHeroCollage
  variant="login"
  wordmarkSource={require('@/assets/auth/tailo-wordmark-dark-transparent.png')}
  heroSource={require('@/assets/auth/auth-photo-login-main-clean.jpg')}
  miniSource={require('@/assets/auth/auth-photo-mini-beach.jpg')}
  tornPaperSource={require('@/assets/auth/torn-paper-edge-ivory.png')}
/>
```

For onboarding, pass `auth-photo-onboarding-main-beach.png`.

## Visual requirements

- The Tailo wordmark must be transparent and sit directly on the warm paper background.
- No visible logo container, patch, or rectangular background.
- The main hero should look like a printed photo:
  - white/off-white paper border
  - slight rotation, around `-1.5deg`
  - soft shadow/elevation
  - `resizeMode="cover"`
- The small polaroid should overlap the lower-right of the main photo:
  - off-white border
  - slight rotation, around `7deg`
  - soft shadow/elevation
- The torn-paper edge should overlay the bottom of the main photo and blend into the page background.
- The screen background should remain warm ivory / paper-like.
- The layout should be responsive. Do not hardcode iPhone mockup dimensions.

## Implementation rules

- Preserve all existing auth logic and handlers.
- Only change visual layout/composition.
- Keep the login fields and buttons exactly wired to the existing logic.
- Use the existing Tailo theme and font system:
  - `useAppearance`
  - `useThemedStyles`
  - theme colors
  - `getFontFamily`
- Keep the screen scrollable for small devices.
- Keep accessibility labels for buttons and links.

## Files to inspect

- `apps/mobile/src/screens/LoginScreen.tsx`
- `apps/mobile/src/screens/OnboardingScreen.tsx`
- `apps/mobile/src/constants/theme.ts`
- `apps/mobile/src/constants/typography.ts`
- `apps/mobile/src/lib/appearance/AppearanceContext.tsx`

## Do not

- Do not use a flattened screenshot as the hero.
- Do not render the Tailo logo as a JPEG with a rectangular background.
- Do not introduce a new dark/star/mountain brand direction.
- Do not change the auth workflow.
- Do not use cold white/gray backgrounds.
- Do not make the photo a hard full-width rectangle.

## Suggested style details

```tsx
printedPhoto: {
  backgroundColor: '#FFFDF8',
  padding: 6,
  transform: [{ rotate: '-1.5deg' }],
  shadowColor: '#1C1C1A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 5,
}

polaroid: {
  backgroundColor: '#FFFDF8',
  padding: 7,
  transform: [{ rotate: '7deg' }],
  shadowColor: '#1C1C1A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.14,
  shadowRadius: 16,
  elevation: 6,
}
```

## Success criteria

After implementation, the header should feel like one integrated memory-book composition:
paper background + transparent wordmark + printed photo + torn paper + polaroid.

It should not look like separate pasted rectangles.
