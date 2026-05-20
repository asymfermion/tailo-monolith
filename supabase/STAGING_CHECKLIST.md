# Supabase staging & production checklist (B2.6.10)

Use when creating a **staging** project or promoting beyond the dev project (`sgxtyxvithlmuuofkzlk`).

## Separate projects and secrets

- [ ] **Staging** Supabase project with its own ref, URL, anon key, and **service_role** (never in the mobile app).
- [ ] **Production** project separate from staging; no shared service role keys across environments.
- [ ] `apps/mobile/.env.local` / EAS secrets point at the correct project per build flavor.
- [ ] `supabase/.env.local` and CI secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) are **environment-specific**.
- [ ] GCP Vertex / `AI_PROVIDER` secrets set per project: `npx supabase secrets set --project-ref <ref> …`

## Auth (dashboard)

- [ ] **Anonymous** sign-ins enabled (B0.2).
- [ ] **Manual linking** enabled for future Apple/Google/email (B0.3).
- [ ] Email provider configured if testing account upgrade.

## Database

- [ ] `npx supabase link --project-ref <staging-ref>`
- [ ] `npx supabase db push` — all migrations applied.
- [ ] `npm run test:supabase:rls -- --linked` passes.
- [ ] RLS smoke: user A cannot access user B (`supabase/tests/rls_cross_user_smoke.sql`).

## Edge Functions

- [ ] `npm run deploy:supabase` (or CI deploy workflow) on staging.
- [ ] `process-ai-job` deployed with `--no-verify-jwt`; cron: `npm run setup:ai-job-cron`.
- [ ] `npm run test:supabase:qa` passes against staging (mobile `.env.local` aimed at staging URL/anon key).

## Storage

- [ ] Private bucket `event-media` with `allowed_mime_types: image/jpeg`.
- [ ] Storage policies: objects only under `{auth.uid()}/…` prefix.

## Security hygiene

- [ ] `npm run audit:supabase` — no unmitigated **high/critical** issues.
- [ ] Service role and database password only in operator/CI stores, not git.
- [ ] Network restrictions reviewed if exposing DB outside pooler.

## Smoke test (manual)

- [ ] Anonymous sign-in on device → `upsert-pet` → upload → `sync-event` → poll caption.
- [ ] Account email link flow (if enabled) on staging test user.

## Known MVP limitations (document, do not “fix” in staging without product sign-off)

- Session loss / reinstall → new anonymous user; prior cloud data orphaned ([phase-2 auth policy](../docs/architecture/phase-2-backend-mvp.md#auth-edge-case-policy)).
- Multi-device sign-in to one account: deferred.
