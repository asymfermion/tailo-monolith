# Supabase dev project setup

| Field         | Value                                      |
| ------------- | ------------------------------------------ |
| Project ref   | `sgxtyxvithlmuuofkzlk`                     |
| API URL       | `https://sgxtyxvithlmuuofkzlk.supabase.co` |
| Database host | `db.sgxtyxvithlmuuofkzlk.supabase.co`      |
| Database port | `5432`                                     |
| Database name | `postgres`                                 |
| Database user | `postgres`                                 |

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
npx supabase login   # or: supabase login (after npm ci — CLI is a root devDependency)
npx supabase link --project-ref sgxtyxvithlmuuofkzlk
```

GitHub Actions installs **Supabase CLI 2.100.0** via `supabase/setup-cli`; the deploy script uses that binary on `PATH` (not a second copy via `npx`), so you should not see spurious “new version available” lines in CI logs.

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

**Monorepo note:** Each function has its own `deno.json` (maps `@tailo/shared` → `packages/shared`, `@supabase/supabase-js` → `npm:@supabase/supabase-js@2.105.4`). Do not use `esm.sh` for Supabase client — it fails intermittently in CI (522). Shared sources under `packages/shared` use `.ts` extensions on relative imports for Deno.

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
# Internal AI worker — must disable gateway JWT (service role invoke from sync-event):
npx supabase functions deploy process-ai-job --no-verify-jwt
```

**`process-ai-job` 401:**

| Symptom                                              | Cause                                                                    | Fix                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `{"error":"Unauthorized"}` **and** logs in Dashboard | Wrong key (anon instead of **service_role**), or function not redeployed | Copy **service_role** from Settings → API; redeploy `--no-verify-jwt` |
| 401 **with no logs**                                 | Gateway JWT check                                                        | `npx supabase functions deploy process-ai-job --no-verify-jwt`        |

Confirm the key: paste into [jwt.io](https://jwt.io) — payload must show `"role":"service_role"` and `"ref":"sgxtyxvithlmuuofkzlk"`.

Service invokes must send both headers:

```bash
curl -s -X POST \
  "https://sgxtyxvithlmuuofkzlk.supabase.co/functions/v1/process-ai-job" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sweep":true}'
```

After deploy, logs appear under **Edge Functions → process-ai-job → Logs** (JSON lines: `invoked`, `auth_ok`, `job_leased`, …).

Upgraded devices (Phase 1 `anon_*` in SecureStore) call `link-anonymous-user` once on launch after anonymous sign-in.

## How AI captions return to the app

After you see rows in **`events`** / **`event_media`**, captions are filled **asynchronously** on the server and **polled** back to the phone (no push in MVP).

```mermaid
sequenceDiagram
  participant App as Mobile app
  participant Upload as create-upload-urls + Storage
  participant Sync as sync-event
  participant AI as process-ai-job
  participant DB as Postgres events / ai_jobs
  participant Poll as get-event-updates

  App->>Upload: Upload photos for a moment
  App->>Sync: Event payload + storage paths
  Sync->>DB: Upsert events + event_media
  Sync->>DB: Insert ai_jobs (pending)
  Sync-->>App: event_id, pending AI
  Sync->>AI: Fire-and-forget (service role)
  AI->>DB: Read image, run caption model
  AI->>DB: Update events.caption / event_type
  AI->>DB: ai_jobs → done
  App->>Poll: Poll with cursor (while pending_ai)
  Poll->>DB: Events updated since cursor
  Poll-->>App: caption, type, ai_job_status
  App->>App: Merge into SQLite, refresh timeline
```

| What you see                                   | Meaning                                           |
| ---------------------------------------------- | ------------------------------------------------- |
| `events` populated after sync                  | Upload + `sync-event` succeeded                   |
| `ai_jobs.status = pending`                     | Waiting for `process-ai-job`                      |
| `ai_jobs.status = done` + `events.caption` set | AI finished; app should pick this up on next poll |
| App Home, sync chip active                     | Uploads or local `pending_ai` still in flight     |
| Caption on timeline updates                    | `get-event-updates` merged into SQLite            |

**Default AI:** `AI_PROVIDER=stub` (no GCP) — you still get caption updates to prove the loop. For Gemini, see [GCP_VERTEX_SETUP.md](./GCP_VERTEX_SETUP.md) (production captions use **`gemini-2.5-flash`**; [model versions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions) to override).

**Stuck on `pending`?** Trigger the worker (service role, never in the app):

```bash
curl -s -X POST \
  "https://sgxtyxvithlmuuofkzlk.supabase.co/functions/v1/process-ai-job" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Full spec (merge rules, polling intervals, schema): [docs/architecture/phase-2-backend-mvp.md § Sync and AI loop](../docs/architecture/phase-2-backend-mvp.md#sync-and-ai-loop-end-to-end).

## Vertex AI (GCP) captions

Default AI is **stub** (no GCP). For real Gemini captions on uploaded moments, see **[GCP_VERTEX_SETUP.md](./GCP_VERTEX_SETUP.md)** and run:

```bash
./scripts/set-gcp-vertex-secrets.sh
```

## CI/CD (GitHub Actions)

Pushes to **`main`** that touch `supabase/`, shared packages, `apps/mobile/`, root `package*.json`, or the deploy script run [`.github/workflows/deploy-supabase.yml`](../.github/workflows/deploy-supabase.yml):

> **Note:** Mobile-only commits did not trigger this workflow before `apps/mobile/**` was added to the path filter. Use **Actions → Deploy Supabase → Run workflow** to run manually any time.

1. Unit tests (`npm test`)
2. `supabase db push` + deploy all Edge Functions

**Add these repository secrets** ([Settings → Secrets and variables → Actions](https://github.com/settings/secrets)):

| Secret                  | Where to get it                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) — create one named e.g. `github-actions` |
| `SUPABASE_DB_PASSWORD`  | Supabase → Project Settings → Database → database password                                               |

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
