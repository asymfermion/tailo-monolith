# Tailo — UI & Screen Code Guidelines for AI Agents

Companion to **[AGENTS.md](../AGENTS.md)**. Read that first for project-wide rules. This doc covers UI-specific implementation for the Expo mobile app — screens, components, styling, layout, and navigation. Do not duplicate rules from AGENTS.md here.

---

## When this doc applies

Read this doc when working on:

- Screen-level components under `apps/mobile/src/screens/`
- Shared UI components under `apps/mobile/src/components/`
- Feature UI under `apps/mobile/src/modules/<feature>/components/`
- Navigation structure under `apps/mobile/src/navigation/`
- Style constants or tokens in `apps/mobile/src/constants/theme.ts`
- Layout helpers in `apps/mobile/src/lib/responsive.ts` or `apps/mobile/src/lib/appearance/`

---

## Product feel

Tailo is a moment-first pet app. The UI should feel warm, calm, and photo-first — closer to Apple Journal or a printed photo book than a SaaS dashboard or tracker.

Before adding any UI element, ask: does this serve the photo/moment hierarchy, or does it add chrome?

The product hierarchy is:

1. Photos
2. Moments
3. Metadata
4. Settings

UI that inverts this order (surfacing metadata above photos, dense data rows over imagery) contradicts the product direction.

---

## File placement

| What you are building                          | Where it goes                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Full screen (routable)                         | `apps/mobile/src/screens/<Name>Screen.tsx`                                    |
| Component used across multiple features        | `apps/mobile/src/components/<Name>.tsx`                                       |
| Component used in one feature only             | `apps/mobile/src/modules/<feature>/components/<Name>.tsx`                     |
| Styles for a single file                       | Bottom of the same `.tsx` file                                                |
| Styles extracted when the file is hard to scan | `<ScreenName>.styles.ts` or `<ComponentName>.styles.ts` next to the component |
| Theme tokens (colors, spacing)                 | `apps/mobile/src/constants/theme.ts`                                          |
| Layout math helpers                            | `apps/mobile/src/lib/responsive.ts`                                           |

---

## StyleSheet rules

The app uses React Native `StyleSheet` exclusively. There are no CSS files, CSS modules, Tailwind classes, or `styled-components`.

Rules:

1. **Co-locate styles at the bottom of the component file** with `const styles = StyleSheet.create({…})`. Extract to a separate `*.styles.ts` only when the style block makes the component file hard to scan.
2. **No inline style objects for static values.** Inline objects re-create on every render and skip `StyleSheet` optimization. Use `StyleSheet.create` for static layout, inline only for values that change at runtime (e.g. dynamic widths, computed colors).
3. **No magic numbers.** Use tokens from `theme.ts` for all colors and spacing. Use `responsive.ts` helpers for computed layout values.

```typescript
// WRONG — inline static style, magic number, hardcoded color
<View style={{ padding: 20, backgroundColor: '#FBF7F1' }} />

// CORRECT — StyleSheet + tokens
import { useThemeColors } from '@/lib/appearance';
import { spacing } from '@/constants/theme';

const colors = useThemeColors();
const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background },
});
```

---

## Theme and color

Never hardcode colors. All colors must come from `theme.ts` via `useThemeColors()`.

```typescript
import { useThemeColors } from '@/lib/appearance';

function MyComponent() {
  const colors = useThemeColors();
  // use colors.background, colors.text, colors.textMuted, colors.border, etc.
}
```

`useThemeColors()` returns the correct palette for the current light/dark mode automatically.

`colors` (the old named export from `theme.ts`) is deprecated — do not use it.

Token reference (matches `theme.ts`):

| Token             | Light     | Dark      | Use for                          |
| ----------------- | --------- | --------- | -------------------------------- |
| `background`      | `#FBF7F1` | `#141413` | Screen and scroll backgrounds    |
| `surface`         | `#FFFDF9` | `#1E1E1C` | Cards, sheets, elevated surfaces |
| `text`            | `#151412` | `#F5F3EF` | Primary text, ink                |
| `textMuted`       | `#6F665D` | `#B5ACA2` | Secondary text, captions         |
| `accent`          | `#151412` | `#F6EFE7` | Selected states, active icons    |
| `border`          | `#E7DDD2` | `#332F2A` | Input borders, separators        |
| `timelineDivider` | `#D8CBBE` | `#413A33` | Moment feed section dividers     |
| `destructive`     | `#9A3E32` | `#DA8A7E` | Delete and destructive actions   |

Do not use green or blue as the default UI accent. The accent is ink (`text`), not a chromatic color.

---

## Typography

Use `spacing` tokens and the editorial scale from `ui-style.md`.

Recommended font sizes:

| Role           | Size  |
| -------------- | ----- |
| Hero title     | 34–40 |
| Screen title   | 30–34 |
| Section header | 18–22 |
| Moment title   | 20–28 |
| Body           | 15–17 |
| Metadata       | 12–14 |

Use font weight sparingly. Prefer size, whitespace, and photo hierarchy over bold weight to create emphasis.

---

## Layout and responsive helpers

Use helpers rather than raw `Dimensions.get('window')` calls.

| Helper                                | Import                          | Use for                                  |
| ------------------------------------- | ------------------------------- | ---------------------------------------- |
| `useDialogMaxWidth()`                 | `@/lib/responsive`              | Max width of dialogs and sheets          |
| `useContentWidth()`                   | `@/lib/responsive`              | Content column width (inset from screen) |
| `isCompactWidth(screenWidth)`         | `@/lib/responsive`              | Narrow vs. wide layout branching         |
| `MIN_TOUCH_TARGET` (44)               | `@/lib/responsive`              | Minimum tap target height                |
| `getTabScreenTopPadding(safeAreaTop)` | `@/navigation/modalHeaderInset` | Top padding for tab-rooted screens       |
| `getModalHeaderHeight(safeAreaTop)`   | `@/navigation/modalHeaderInset` | Height of modal navigation headers       |
| `useTabBarContentInset()`             | `@/navigation/useTabBarInsets`  | Bottom inset to avoid floating tab bar   |
| `useTabBarBottomOffset()`             | `@/navigation/useTabBarInsets`  | Raw tab bar bottom height                |

Before finishing a screen, check that the layout works on:

- Compact iPhone (e.g. SE, 375pt)
- Standard iPhone (e.g. 14, 390pt)
- Large iPhone (e.g. 14 Plus, 430pt)
- iPad (768pt+)

---

## Navigation patterns

The app uses three primary tabs: Moments, Pet, Settings. The tab bar is a floating glass pill.

Rules:

1. **Do not add extra top-level tabs** without explicit product approval.
2. **Screens pushed within a tab** use modal or stack presentation from `ModalShell` or the existing stack navigators.
3. **Apply `getTabScreenTopPadding`** to the top of tab-root screens so content clears the status bar correctly.
4. **Apply `useTabBarContentInset`** to scroll content bottom so it clears the floating tab bar.
5. **Do not add a persistent FAB to the bottom navigation.** Tailo is passive-moment-first; prominent manual creation CTAs contradict the product feel. Manual actions belong in screen headers or contextual menus.

---

## Editing and forms

Rules:

1. **Auto-save by default.** Do not add Save buttons to editing screens unless the action is irreversible.
2. **Debounce text field saves** (300–500 ms). Save picker and photo changes immediately.
3. **Use optimistic UI.** Show saved state inline; surface errors inline as a retry prompt — not as a blocking alert.
4. Save state indicators: `Saving…` → `Saved` → `Could not save. Tap to retry.`
5. **Disable primary actions until required fields are valid.** Validate on submit too.

---

## Moment cards and photo display

Rules:

1. **Hero photos stay visually clean.** Do not place a full transparent text overlay over every moment image. Moment text and titles belong in the card body below the image.
2. **Image corner radius:** 16–24pt.
3. **Do not build metadata-first cards.** Lead with the photo, follow with title and moment text, put date/count at the bottom.
4. **Do not use compact database list rows** for moments. The feed is editorial, not tabular.

---

## User-facing language

Use moment-first language. Match the product vocabulary.

| Use                              | Avoid                       |
| -------------------------------- | --------------------------- |
| Moment, Moments                  | Timeline Event, Record, Log |
| Life with [pet name], Highlights | Dashboard, Summary          |
| Keep [pet]'s moments safe        | Sign up to unlock           |

Internal type names (`TimelineEvent`, `LocalPetProfile`) may stay as-is until a refactor is explicitly requested. This rule is about user-visible strings.

---

## What not to add

Do not add the following without explicit product approval:

- A fourth top-level tab
- A persistent large FAB in the bottom navigation area
- Full transparent text covers over hero moment images
- Dashboard-style metric cards or stat grids
- Dense metadata rows as the primary content pattern
- Green or blue as the default UI accent color
- A Save button on editing screens that support auto-save
- Extra onboarding screens to explain privacy — put privacy copy contextually

---

## Testing UI changes

Type checking and tests verify logic, not visual correctness. Before marking a UI task complete:

- [ ] Check layout at compact width (375pt) and large width (430pt).
- [ ] Confirm bottom content is not obscured by the floating tab bar (use `useTabBarContentInset`).
- [ ] Confirm top content is not obscured by the status bar (use `getTabScreenTopPadding` for tab screens, `getModalHeaderHeight` for modals).
- [ ] Check dark mode if the change touches colors.
- [ ] Confirm minimum touch targets (44pt) on all interactive elements.
- [ ] Run typecheck and lint after changes.

```bash
npm run mobile:typecheck
npm run lint
npm run format:check
```

---

## Common mistakes to check before finishing

- [ ] No hardcoded hex colors — use `useThemeColors()`.
- [ ] No inline static style objects — use `StyleSheet.create`.
- [ ] No `colors` (deprecated export) — use `useThemeColors()`.
- [ ] No magic spacing numbers — use `spacing.*` from `theme.ts`.
- [ ] No `Dimensions.get('window')` for layout math when a helper exists.
- [ ] No full transparent text overlay covering hero moment images.
- [ ] No Save button on forms that should auto-save.
- [ ] No green or blue as the default accent color.
- [ ] No new top-level tab without product approval.
- [ ] No persistent FAB placed above the bottom tab bar.
- [ ] Bottom scroll content uses `useTabBarContentInset` to clear the floating tab bar.
- [ ] Tab-root screens use `getTabScreenTopPadding` for top inset.
- [ ] User-facing strings use moment-first language (Moment, Moments — not Story, Memory, Event, Log, Record).
- [ ] Layout checked at compact width (375pt) and large width (430pt+).
