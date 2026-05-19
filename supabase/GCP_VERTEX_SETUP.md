# GCP Vertex AI setup (Tailo captions)

Tailo runs caption generation in the **`process-ai-job`** Edge Function. The mobile app never talks to GCP directly.

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `AI_PROVIDER` | yes | `stub` | Set to `vertex` to use Gemini |
| `GCP_PROJECT_ID` | yes | — | Google Cloud project ID |
| `GCP_VERTEX_REGION` | no | `us-central1` | Vertex region (must support your model) |
| `GCP_VERTEX_MODEL` | no | `gemini-2.0-flash-001` | Gemini model ID |
| `GCP_SERVICE_ACCOUNT_JSON` | yes | — | Full service account key JSON (one line) |

Until `AI_PROVIDER=vertex` and the GCP secrets are set, captions use the **stub** provider (safe placeholder text).

---

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one) and note the **Project ID** (not the display name).
3. **Billing** must be enabled on the project.

---

## 2. Enable APIs

In **APIs & Services → Library**, enable:

- **Vertex AI API** (`aiplatform.googleapis.com`)

Or with gcloud (optional):

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

---

## 3. Service account

1. **IAM & Admin → Service accounts → Create service account**
   - Name: e.g. `tailo-vertex-edge`
   - No end-user access needed
2. **Grant this role** on the project:
   - **Vertex AI User** (`roles/aiplatform.user`)
3. **Keys → Add key → Create new key → JSON** — download the file.
4. Store the JSON somewhere safe (password manager / secrets vault). **Do not commit it to git.**

---

## 4. Supabase secrets

Link the CLI to the dev project (if not already):

```bash
npx supabase login
npx supabase link --project-ref sgxtyxvithlmuuofkzlk
```

### Option A — helper script (recommended)

From the repo root:

```bash
./scripts/set-gcp-vertex-secrets.sh
```

It will prompt for project ID, region, model, and the path to your JSON key file, then set all secrets.

### Option B — manual

```bash
export GCP_KEY_FILE="$HOME/Downloads/tailo-vertex-edge-xxxxx.json"

npx supabase secrets set AI_PROVIDER=vertex
npx supabase secrets set GCP_PROJECT_ID=YOUR_PROJECT_ID
npx supabase secrets set GCP_VERTEX_REGION=us-central1
npx supabase secrets set GCP_VERTEX_MODEL=gemini-2.0-flash-001
npx supabase secrets set GCP_SERVICE_ACCOUNT_JSON="$(jq -c . < "$GCP_KEY_FILE")"
```

List secrets (names only):

```bash
npx supabase secrets list
```

---

## 5. Redeploy the AI function

Secrets are injected at runtime; redeploy so the function bundle is current:

```bash
npx supabase functions deploy process-ai-job
```

Or deploy everything:

```bash
npm run deploy:supabase
```

---

## 6. Test end-to-end

1. Run the mobile app against the **same** Supabase project (`EXPO_PUBLIC_SUPABASE_URL`).
2. Create or promote a moment so media **uploads** and **`sync-event`** runs.
3. In Supabase **Edge Functions → process-ai-job → Logs**, look for:
   - `status: done` — success
   - `Vertex request failed (403)` — IAM/API not enabled
   - `Could not obtain GCP access token` — bad or malformed JSON key
   - `Vertex response could not be parsed` — model returned non-JSON (retry or adjust prompt)
4. On device: within ~30s (poll) the timeline caption should update to a Gemini-generated line (calm, no “AI” wording).
5. Edit the caption in event detail → wait for another poll → caption must **not** change.

### Quick DB checks (SQL editor)

```sql
SELECT ai_job_id, status, attempt_count, last_error, updated_at
FROM ai_jobs
ORDER BY updated_at DESC
LIMIT 5;

SELECT event_id, caption, caption_source, sync_version, updated_at
FROM events
ORDER BY updated_at DESC
LIMIT 5;
```

---

## 7. Troubleshooting

| Symptom | Likely fix |
| ------- | ---------- |
| Still stub captions | `AI_PROVIDER` not `vertex`, or secrets on wrong project |
| `403` from Vertex | Enable Vertex AI API; confirm `roles/aiplatform.user` on the service account |
| `404` model | Use a model available in your region; try `gemini-2.0-flash-001` in `us-central1` |
| Token error | Re-download key; ensure `GCP_SERVICE_ACCOUNT_JSON` is minified JSON (use `jq -c`) |
| Job stuck `pending` | Invoke `process-ai-job` manually (see below); check `last_error` on `ai_jobs` |
| `Could not read primary image` | Upload/sync incomplete; confirm `event_media` row and Storage object exist |

### Manually run one AI job (service role)

From **Project Settings → API → service_role** (local only, never in the app):

```bash
curl -s -X POST \
  "https://sgxtyxvithlmuuofkzlk.supabase.co/functions/v1/process-ai-job" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## 8. Do I need to save anything locally?

**No**, for day-to-day development:

- Caption AI credentials live as **Supabase Edge Function secrets** (`AI_PROVIDER`, `GCP_*`).
- The mobile app only needs `EXPO_PUBLIC_SUPABASE_*` in `apps/mobile/.env.local`.

**Optional:** keep a copy of the service account JSON in a password manager in case you need to rotate or re-run `set-gcp-vertex-secrets.sh`. Do not commit it to git.

If you created a key at `/tmp/tailo-vertex-edge-key.json` during setup, you can delete it after secrets are set:

```bash
rm -f /tmp/tailo-vertex-edge-key.json
```

**GitHub Actions** does not need GCP secrets — only `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` (see [SETUP.md](./SETUP.md#cicd-github-actions)).

---

## 9. Cost & safety

- You pay Google for Vertex usage (image + tokens per caption). Start with dev traffic only.
- One primary image per event is sent to Gemini (not the full camera roll).
- Captions are filtered in `packages/shared` (max length, no medical / “AI” phrasing in UI).
- Rotate or delete the service account key if it is ever exposed.

---

## Related docs

- [supabase/SETUP.md](./SETUP.md) — link project, deploy functions
- [docs/DEVELOPER.md](../docs/DEVELOPER.md) — mobile env vars
- Prompt: `packages/ai/src/prompts/captionEvent.ts`
