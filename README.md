# Tailo

Tailo is a **passive pet memory system**. It scans your recent photos, finds pet-related moments, groups them into events, and shows a calm timeline — without feeling like a tracker or generic AI app.

This repository is a **monorepo** for the mobile app, shared types, and (later) backend services.

## What's here

| Path               | Purpose                               |
| ------------------ | ------------------------------------- |
| `apps/mobile/`     | React Native + Expo app (iOS-first)   |
| `packages/shared/` | Shared TypeScript types and constants |
| `supabase/`        | Backend — planned for Phase 2         |

## Documentation

- **[AGENTS.md](AGENTS.md)** — instructions for AI coding agents (includes unit test requirements)
- **[Architecture](docs/ARCHITECTURE.md)** — phase design docs (update when implementing new work)
- **[Mobile tasks](docs/MOBILE_TASKS.md)** — phased development checklist (start here for implementation)
- **[Developer guide](docs/DEVELOPER.md)** — setup, run commands, repo layout
- **[Agent coding guidelines](Tailo_Agent_Coding_Guidelines_v2.md)** — architecture, product rules, MVP phases

## Status

Mobile dev environment is scaffolded. Backend integration has not started.
