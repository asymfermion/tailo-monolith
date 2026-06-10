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

## Google OAuth setup (dev + prod runbook)

Use this when enabling Google sign-in/link now or later in a new GCP account.

### 1) Google Cloud Console

1. Open **Google Cloud Console** and select/create a project.
2. Configure **OAuth consent screen**:
   - App name + support email
   - Add test users while app is not published
3. Create OAuth credentials:
   - **Web application** client
     - Authorized redirect URI:
       - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - **iOS** client
     - Bundle ID must match app config (`ios.bundleIdentifier`)
4. Save and record:
   - Web client ID + secret
   - iOS client ID

### 2) Supabase Auth provider

1. Dashboard → **Authentication → Providers → Google**
2. Enable Google
3. Paste:
   - Client ID = **Web client ID**
   - Client Secret = **Web client secret**
4. Save
5. Confirm **Authentication → URL Configuration** is correct for your environment.

### 3) Local app config

1. Ensure `apps/mobile/.env.local` has Supabase URL + anon key.
2. Ensure `app.json`/Expo config uses the correct iOS bundle ID.
3. If native config changes, rebuild dev client (`pod install` + iOS rebuild).

### 4) Environment checklist (recommended)

- Keep separate Google OAuth projects/clients for **dev** and **prod**.
- Keep Supabase project/provider config aligned per environment.
- Record all client IDs in your team secrets manager (not git).

## Google OAuth client/account changes and user impact

### Do we need to migrate users when moving to a new GCP account?

Usually **no direct data migration** is needed in Tailo/Supabase tables. Users remain in the same Supabase project (`auth.users`, `app_users`, `user_identities`).

### Lowest-risk approach

Prefer keeping the **same OAuth client IDs** and just changing project ownership/access in GCP (add new account as owner/editor), so identity subjects stay stable.

### If you rotate to brand-new OAuth client IDs

- Existing Tailo data is still present.
- Login/link behavior can change depending on provider identity subject matching.
- Treat this as an auth cutover and run a staged test matrix before prod:
  - Existing Google user sign-in
  - Anonymous → Google link
  - Existing email-linked user adding Google
  - Cross-device sign-in restore

If any identity mismatch appears, keep email sign-in available as recovery and link Google from inside an already-signed-in account.

## Apple Sign in with Apple setup (dev + prod runbook)

Tailo uses **native iOS** `signInWithIdToken` (not web OAuth). OAuth secret rotation is only needed if you later add web/Android Apple sign-in.

### 1) Apple Developer Console

1. Open [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Confirm App ID `com.mtxforge.tailo` exists and **Sign in with Apple** is enabled.
3. Leave **Server-to-Server notification** endpoints blank (Supabase Auth does not use them).
4. If testing in **Expo Go**, no extra App ID is required — register `host.exp.Exponent` in Supabase (see below).

Optional (web/Android OAuth only — not required for native iOS MVP):

- Create a **Services ID** (e.g. `com.mtxforge.tailo.web`)
- Add domain `sgxtyxvithlmuuofkzlk.supabase.co` and return URL `https://sgxtyxvithlmuuofkzlk.supabase.co/auth/v1/callback`
- Create a **Sign in with Apple** key (`.p8`), then generate the client secret via [Supabase Apple secret generator](https://supabase.com/docs/guides/auth/social-login/auth-apple)

### 2) Supabase Auth provider

**Dev project (`sgxtyxvithlmuuofkzlk`)** — already configured via `supabase/config.toml` + `npx supabase config push`:

| Field | Value |
| ----- | ----- |
| Enabled | `true` |
| Client IDs | `com.mtxforge.tailo,host.exp.Exponent` |
| Secret | Empty for native-only |
| Skip nonce check | `true` for native iOS (GoTrue hex vs Apple base64url mismatch; see [supabase/auth#2378](https://github.com/supabase/auth/issues/2378)) |

To push after editing `config.toml`:

```bash
# From repo root — templates symlink required by CLI (see scripts/lib/supabase-monorepo-cli.sh)
ln -sf supabase/templates templates
npx supabase config push --yes
rm -f templates
```

Dashboard check: **Authentication → Providers → Apple**.

**Prod / staging** — repeat with that project's ref and bundle IDs. Keep dev and prod provider config separate.

### 3) Local app config

1. `apps/mobile/app.json` — `ios.usesAppleSignIn: true`, `expo-apple-authentication` plugin, bundle ID `com.mtxforge.tailo`.
2. Rebuild the iOS dev client after native auth changes (`npx expo prebuild --platform ios` + device build). Metro reload is not enough.
3. Test on a **physical iPhone** — Sign in with Apple is unreliable in Simulator.

### 4) Environment checklist

- [ ] Dev Supabase Apple provider enabled with `com.mtxforge.tailo` (+ `host.exp.Exponent` if using Expo Go)
- [ ] Prod/staging Supabase Apple provider enabled with production bundle ID(s)
- [ ] Apple Developer App ID capability enabled for each bundle ID
- [ ] iOS dev client / EAS build rebuilt with Sign in with Apple entitlement
- [ ] Manual QA on device — see [DEVELOPER.md § Apple Sign in](../docs/DEVELOPER.md#apple-sign-in-qa)

## Auth email templates (OTP)

Tailo’s mobile app expects **8-digit codes** in email, not link-only messages. Full templates, dashboard mapping, and QA steps:

**[supabase/templates/README.md](./templates/README.md)**

Quick reference:

| App flow                                    | Paste this file into dashboard template                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Save memories / Create account (email link) | [email_change.html](./templates/email_change.html) → **Change email address**                       |
| Sign in with code                           | [magic_link.html](./templates/magic_link.html) → **Magic Link**                                     |
| Forgot password                             | [recovery.html](./templates/recovery.html) → **Reset password**                                     |
| Direct signup (future)                      | [confirmation.html](./templates/confirmation.html) → **Confirm signup**                             |
| Admin invite (optional)                     | [invite.html](./templates/invite.html) → **Invite user**                                            |
| Reauthentication (optional)                 | [reauthentication.html](./templates/reauthentication.html) → **Reauthentication**                   |
| Password changed notice                     | [password_changed_notification.html](./templates/password_changed_notification.html) → notification |

- **Local stack:** all paths and subjects are in [config.toml](./config.toml) (`otp_length = 8`).
- **Hosted:** `npm run push:supabase:email-templates` (linked CLI) or paste HTML into **Authentication → Email Templates** for each row above.
- **Verify repo templates:** `npm run verify:supabase:email-templates`

If a hosted template still sends only a magic link, the in-app code screen will not match the email.

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
npm run test:supabase:rls -- --linked   # RLS smoke: user A vs user B (B2.1.10)
npm run test:supabase:upload          # Signed PUT rejects non-JPEG Content-Type (B2.4.3a)
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

- `api-auth` — `ensure-current-user`, `link-anonymous-user`
- `api-pet` — `upsert-pet`
- `api-account` — `upsert-account-profile`, `get-account-profile`
- `api-events` — `create-upload-urls`, `sync-event`, `get-event-updates`, `delete-event`
- `process-ai-job` — internal AI worker (cron + service invoke from `sync-event`)

Each user API accepts `POST` with body `{ "action": "<name>", ...payload }`.

Manual deploy (single function):

```bash
npx supabase db push
npx supabase functions deploy api-events
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
  -d '{"sweep":true,"max_jobs":5}'
```

After deploy, logs appear under **Edge Functions → process-ai-job → Logs** (JSON lines: `invoked`, `auth_ok`, `job_leased`, …).

Upgraded devices (Phase 1 `anon_*` in SecureStore) call `link-anonymous-user` once on launch after anonymous sign-in.

## Email auth templates (OTP)

Mobile email flows use **8-digit codes** (`verifyOtp`), not magic links. In the Supabase Dashboard (**Authentication → Email Templates**), align templates for `dev` and `prod`:

| Template                 | Used for                                                         | Body must include             |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------- |
| **Confirm sign up**      | Direct create account (`signInWithOtp` / signup OTP)             | `{{ .Token }}` (8-digit code) |
| **Change email address** | Anonymous upgrade + email change (`updateUser` + `email_change`) | `{{ .Token }}`                |
| **Reset password**       | Forgot password (`resetPasswordForEmail` + `recovery`)           | `{{ .Token }}`                |

For anonymous email linking, keep **Secure email change / double confirm email changes** disabled. Tailo links the first real email onto an anonymous session, so the OTP should go only to the new email address.

Turn **Confirm email** **on** (`auth.email.enable_confirmations = true` in [config.toml](./config.toml)) so Supabase does not auto-confirm addresses without an OTP. Push config + templates: `npm run push:supabase:email-templates`. See [templates/README.md](./templates/README.md).

Disable link-only templates if they conflict with in-app code entry. After changes, smoke-test: create account, link email from Settings, forgot password — user must enter the code before the app finishes linking.

## Known limitation: session loss (B2.6.9)

If the Supabase refresh token is cleared (app reinstall, SecureStore wipe, or hard auth failure), the app signs in **anonymously again** and receives a **new** `auth.users.id`. Cloud pets/events from the previous anonymous user remain on the old account; the MVP does **not** auto-merge or restore them. Permanent account linking (email / Apple / Google) is the path to keep data on one user id. See [Auth edge-case policy](../docs/architecture/phase-2-backend-mvp.md#auth-edge-case-policy).

## Backend QA scripts (B2.6)

| Script                                  | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `npm run test:supabase:rls -- --linked` | RLS cross-user smoke                            |
| `npm run test:supabase:upload`          | Signed PUT `Content-Type` enforcement           |
| `npm run test:supabase:qa`              | Edge Function hardening integration tests       |
| `npm run audit:supabase`                | `npm audit` for function-related workspace deps |

Staging/prod promotion: **[STAGING_CHECKLIST.md](./STAGING_CHECKLIST.md)**.

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

## Scheduled AI worker (B2.5.7)

Mobile poll is UX-only. The server also drains `ai_jobs` on a schedule:

1. Apply migrations: `npm run deploy:supabase` (enables `pg_cron` + `pg_net`).
2. Deploy `process-ai-job` (includes lease recovery + sweep).
3. One-time cron setup (requires `DATABASE_URL` + service role in env):

```bash
# 1. Link CLI (recommended — avoids DATABASE_URL / password encoding issues):
npx supabase login
npx supabase link --project-ref sgxtyxvithlmuuofkzlk

# 2. In supabase/.env.local add only (service_role — never commit):
#    SUPABASE_URL=https://sgxtyxvithlmuuofkzlk.supabase.co
#    SUPABASE_SERVICE_ROLE_KEY=...

npm run setup:ai-job-cron
```

Without `supabase link`, you must set `DATABASE_URL` to the **exact** URI from Dashboard → Connect (encoded password). If you see “multiple @ characters”, the password was pasted raw — use the dashboard URI or link the CLI instead.

**`line N: No such file or directory` when sourcing `.env.local`:** the script no longer uses `source`. Passwords with `&`, `!`, or `@` must use the **Dashboard URI** (URL-encoded), wrapped in single quotes: `DATABASE_URL='postgresql://...'`.

**`psql not found`:** the script falls back to `npx supabase db query` (no separate install). Optional: `brew install libpq` then `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"` for `psql`.

**`invalid URL escape` / `multiple @` / `failed to parse connection string`:** the password in `DATABASE_URL` is not URL-encoded. Open **Dashboard → Connect → URI**, copy the entire string, replace `DATABASE_URL` in `supabase/.env.local` (single quotes). Example: raw password `p@ss%word` becomes `p%40ss%25word` in the URI — never paste the raw password after `postgres:`.

Runs every **3 minutes**, processes up to **5** pending jobs per tick, and resets stuck `processing` leases before each run.

Verify:

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'tailo-process-ai-job-sweep';
```

**Stuck on `pending`?** Trigger the worker manually (service role, never in the app):

```bash
curl -s -X POST \
  "https://sgxtyxvithlmuuofkzlk.supabase.co/functions/v1/process-ai-job" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Full spec (workflow diagrams, merge rules, polling): [docs/architecture/phase-2-backend-mvp.md § Data syncing workflow](../docs/architecture/phase-2-backend-mvp.md#data-syncing-workflow).

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
