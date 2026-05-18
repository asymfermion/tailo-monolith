# Mobile app

See the repo root **[AGENTS.md](../../AGENTS.md)** for Tailo-wide agent instructions (including required unit tests and **styling rules**).

Expo SDK 54 docs: https://docs.expo.dev/versions/v54.0.0/

## Styling

React Native **`StyleSheet` only** — no `.css` files. Tokens live in [`src/constants/theme.ts`](./src/constants/theme.ts). Co-locate `styles` at the bottom of each screen/component `.tsx`; extract `*.styles.ts` only when a file becomes unwieldy. Full rules: [AGENTS.md § Styling (mobile)](../../AGENTS.md#styling-mobile).
