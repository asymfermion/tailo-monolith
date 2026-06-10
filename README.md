# Tailo

Tailo is a **passive pet memory system**. It scans your recent photos, finds pet-related moments, groups them into events, and shows a calm timeline — without feeling like a tracker or generic AI app.

This repository is a **monorepo** for the mobile app, landing page website, shared types, and (later) backend services.

## What's here

| Path               | Purpose                               |
| ------------------ | ------------------------------------- |
| `apps/mobile/`     | React Native + Expo app (iOS-first)   |
| `apps/landing/`    | Public marketing / website landing    |
| `packages/shared/` | Shared TypeScript types and constants |
| `supabase/`        | Backend — planned for Phase 2         |

## Documentation

- **[AGENTS.md](AGENTS.md)** — instructions for AI coding agents (includes unit test requirements)
- **[Architecture](docs/ARCHITECTURE.md)** — phase design docs (update when implementing new work)
- **[Mobile tasks](docs/MOBILE_TASKS.md)** — phased development checklist (start here for implementation)
- **[Developer guide](docs/DEVELOPER.md)** — setup, run commands, repo layout
- **[Future features](docs/FUTURE_FEATURES.md)** — post-MVP product ideas
- **[Landing page deploy](docs/DEVELOPER.md#landing-page-deploy)** — website build and deploy notes

## Status

Mobile, landing page, backend integration, and release work are all in progress.
