# Supabase dev project setup

| Field | Value |
| ----- | ----- |
| Project ref | `sgxtyxvithlmuuofkzlk` |
| API URL | `https://sgxtyxvithlmuuofkzlk.supabase.co` |
| Database host | `db.sgxtyxvithlmuuofkzlk.supabase.co` |
| Database port | `5432` |
| Database name | `postgres` |
| Database user | `postgres` |

## Before you code

1. **Dashboard → Authentication → Providers** — enable **Anonymous** sign-ins (task B0.2).
2. **Dashboard → Authentication → Providers** — enable **Manual linking** (B0.3) and **Email** (for “Save your memories” account upgrade in app settings).
3. **Dashboard → Project Settings → API** — copy the **anon** `publishable` key into `apps/mobile/.env.local`.
4. **Never** put the database password or `service_role` key in the mobile app.

## Local secrets (gitignored)

```bash
# Mobile (Expo)
cp apps/mobile/.env.example apps/mobile/.env.local
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# CLI / migrations
cp supabase/env.example supabase/.env.local
# Fill DATABASE_URL (use Session pooler URI if your network is IPv4-only)
```

## Link CLI to the remote project

```bash
npx supabase login
npx supabase link --project-ref sgxtyxvithlmuuofkzlk
```

## Common commands

```bash
npx supabase db push          # apply migrations to linked remote
npx supabase functions serve  # local edge functions
npx supabase start            # optional local stack
```

See [docs/DEVELOPER.md](../docs/DEVELOPER.md#backend-phase-2) for the full monorepo workflow.

## Deploy migrations + Edge Functions (one command)

From the repo root (after `supabase login` and `supabase link`):

```bash
npm run deploy:supabase
```

This runs `supabase db push` and deploys every function under `supabase/functions/` (skips `_shared`).

**Monorepo note:** Edge Functions import `packages/shared` and `packages/backend-core` via relative paths. Deno resolves workspace imports through `supabase/functions/import_map.json` (maps `@tailo/shared` → `packages/shared`). If deploy fails with “Relative import path @tailo/shared not prefixed”, ensure that file exists and shared sources use `.ts` extensions on relative imports.

Functions deployed:

- `link-anonymous-user`
- `upsert-pet`
- `create-upload-urls`
- `sync-event`
- `get-event-updates`
- `process-ai-job`

Manual deploy (single function):

```bash
npx supabase db push
npx supabase functions deploy sync-event
```

Upgraded devices (Phase 1 `anon_*` in SecureStore) call `link-anonymous-user` once on launch after anonymous sign-in.

## Vertex AI (GCP) captions

Default AI is **stub** (no GCP). For real Gemini captions on uploaded moments, see **[GCP_VERTEX_SETUP.md](./GCP_VERTEX_SETUP.md)** and run:

```bash
./scripts/set-gcp-vertex-secrets.sh
```

## CI/CD (GitHub Actions)

Pushes to **`main`** that touch `supabase/`, shared packages, or the deploy script run [`.github/workflows/deploy-supabase.yml`](../.github/workflows/deploy-supabase.yml):

1. Unit tests (`npm test`)
2. `supabase db push` + deploy all Edge Functions

**Add these repository secrets** ([Settings → Secrets and variables → Actions](https://github.com/settings/secrets)):

| Secret | Where to get it |
| ------ | ---------------- |
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) — create one named e.g. `github-actions` |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database → database password |

**Not stored in GitHub** (already on the Supabase project):

- `AI_PROVIDER`, `GCP_*` — set once via `./scripts/set-gcp-vertex-secrets.sh`; deploy does not change them.

Manual run: **Actions → Deploy Supabase → Run workflow**.

## Verify setup

From the repo root:

```bash
npm run verify:supabase
```

Manual checks:

```bash
npx supabase projects list    # Tailo row should show ● linked
```

Restart Metro after editing `apps/mobile/.env.local`, then the app can call `getSupabaseClient()` when Phase 2 auth is wired up.
