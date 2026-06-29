# Tailo — Backend & Non-UI Code Guidelines for AI Agents

Companion to **[AGENTS.md](../AGENTS.md)**. Read that first for project-wide rules. This doc covers backend (Supabase Edge Functions, migrations, `packages/`) and mobile non-UI code (SQLite, sync workers, background tasks). Do not duplicate rules from AGENTS.md here.

---

## When this doc applies

Read this doc when working on:

- Supabase Edge Functions under `supabase/functions/`
- Database migrations under `supabase/migrations/`
- Shared business logic in `packages/backend-core/` or `packages/shared/`
- AI contracts in `packages/ai/`
- Mobile SQLite layer under `apps/mobile/src/db/`
- Mobile sync, upload, or background workers under `apps/mobile/src/modules/sync/`
- Any mobile module that has no React component involvement

---

## Code placement

Put code in the right place before writing anything new.

| What you are writing                    | Where it goes                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared types / Zod contracts            | `packages/shared/src/contracts/`                                                                                                                                                 |
| Shared constants (limits, enums, keys)  | `packages/shared/src/constants/`                                                                                                                                                 |
| Pure business logic used by both sides  | `packages/backend-core/src/usecases/`                                                                                                                                            |
| AI prompt builders and response schemas | `packages/ai/src/`                                                                                                                                                               |
| Edge Function request handling          | `supabase/functions/_shared/handlers/<domain>.ts`                                                                                                                                |
| New Edge Function entrypoint            | `supabase/functions/<name>/index.ts` — only when a clear runtime boundary exists (see [AGENTS.md § Local-first identity](../AGENTS.md#local-first-identity-and-sync-boundaries)) |
| Mobile SQLite queries                   | `apps/mobile/src/db/<tableName>.ts`                                                                                                                                              |
| Mobile business logic (no React)        | `apps/mobile/src/modules/<feature>/`                                                                                                                                             |
| Mobile-only shared helpers              | `apps/mobile/src/lib/`                                                                                                                                                           |

Before writing new code, grep `packages/shared`, `packages/backend-core`, and the relevant `modules/` directory. The helper you need probably already exists.

---

## Edge Function handler anatomy

Every handler follows the same structure. Match it exactly.

```
supabase/functions/
  _shared/
    handlers/        One file per domain action (syncEvent.ts, upsertPet.ts, …)
    http.ts          getServiceRoleClient, jsonResponse, invokeServiceFunction
    logger.ts        FunctionLogger type
    resolveAppUser.ts resolveCallerAppUserId, lookupCallerAppUserId
  api-auth/          Auth domain router
  api-account/       Account domain router
  api-events/        Events domain router
  api-pet/           Pet domain router
  process-ai-job/    Background AI worker (separate entrypoint — different runtime boundary)
```

Handler rules:

1. Handlers export a single `ApiHandler` function. Import the type from `./types.ts`.
2. Parse and validate the request body first, return 422/400 immediately on failure.
3. Resolve the caller's `appUserId` via `resolveCallerAppUserId` (creates if needed) or `lookupCallerAppUserId` (read-only). Never trust `user.id` as the app-layer identity.
4. Business decisions belong in `packages/backend-core/usecases/`. The handler calls the usecase, maps the result, and calls `jsonResponse`. It does not contain business logic itself.
5. Log meaningful events with `log.info` / `log.warn` / `log.error`. Include IDs, not PII.
6. Return `jsonResponse({…}, statusCode)` for every code path — never fall through.

---

## Database safety

### Atomic operations

Supabase JS has no explicit transaction API. Follow these patterns to avoid partial-write windows.

**Replace a dependent set (e.g. event media):**

Do not delete-then-insert. The window between the two operations leaves the parent row with no children if the insert fails.

```
// WRONG — leaves event with no media if insert fails
await client.from('event_media').delete().eq('event_id', id);
await client.from('event_media').insert(rows);  // ← if this fails, media is gone

// CORRECT — upsert first (old rows intact on failure), prune stale rows after
await client.from('event_media').upsert(rows, { onConflict: 'event_id,source_local_asset_id' });
await client.from('event_media').delete().eq('event_id', id).not('source_local_asset_id', 'in', `(${newIds.join(',')})`);
```

**Exclusive job lease (worker pattern):**

Do not SELECT-then-UPDATE. Two concurrent workers can both SELECT the same pending row before either UPDATE fires.

```
// WRONG — two workers can both select the same job
const job = await client.from('ai_jobs').select(…).eq('status', 'pending').limit(1).maybeSingle();
await client.from('ai_jobs').update({ status: 'processing' }).eq('ai_job_id', job.id);

// CORRECT — single atomic UPDATE … RETURNING; second worker gets null
const job = await client.from('ai_jobs')
  .update({ status: 'processing', leased_until: leaseUntil })
  .eq('status', 'pending')
  .lte('next_attempt_at', nowIso)
  .order('next_attempt_at', { ascending: true })
  .limit(1)
  .select('ai_job_id, event_id, attempt_count, input_snapshot')
  .maybeSingle();
```

When true atomicity is required and the above patterns are insufficient, use a Postgres RPC (add a migration and call `adminClient.rpc(…)`).

### TOCTOU on inserts (read-then-insert races)

When a handler reads a row, decides it does not exist, then inserts it, a concurrent request can insert between the read and the write. The second insert hits a unique constraint and returns a DB error.

Handle the unique violation explicitly rather than returning 500:

```typescript
const { error } = await adminClient.from('events').insert({ event_id: newId, … });

if (error) {
  if (error.code === '23505') {
    // Race: re-read the row the concurrent request just created.
    const { data: existing } = await adminClient.from('events')
      .select('event_id').eq('app_user_id', appUserId).eq('source_local_event_id', localId).maybeSingle();
    if (existing) { /* proceed with existing.event_id */ }
    else { return jsonResponse({ error: error.message }, 500); }
  } else {
    return jsonResponse({ error: error.message }, 500);
  }
}
```

Postgres error codes to know:

| Code  | Meaning               | Typical cause                                  |
| ----- | --------------------- | ---------------------------------------------- |
| 23505 | unique_violation      | Concurrent insert on a unique / PK column      |
| 23503 | foreign_key_violation | Insert/update referencing a deleted parent row |
| 40001 | serialization_failure | Retry the transaction                          |

### Batch over serial for read-only storage calls

Never sign URLs or read storage one item at a time in a loop.

```
// WRONG — N sequential round-trips
for (const item of mediaRows) {
  const url = await client.storage.from('bucket').createSignedUrl(item.path, ttl);
}

// CORRECT — one batch call
const paths = mediaRows.map(m => m.thumbnail_path);
const { data: urls } = await client.storage.from('bucket').createSignedUrls(paths, ttl);
const byPath = new Map(urls?.map(u => [u.path, u.signedUrl]) ?? []);
```

---

## Migration rules

Every database change must have a migration.

1. **File naming:** `YYYYMMDDHHMMSS_description.sql` — use the current date, underscore-separated description, all lowercase.
2. **One concern per file:** Do not mix unrelated table changes in one migration.
3. **Idempotent DDL:** Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` so re-runs are safe.
4. **Always update the ledger:** Any add, rename, or remove under `supabase/migrations/` requires an update to `docs/architecture/database-schema-ledger.md` in the same change. Include table name, changed columns/indexes/constraints, and migration filename.
5. **RLS on every new table:** `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` and at minimum a self-select policy.
6. **Index every FK:** Add an index when adding a foreign key column that will be used in queries.
7. **No data mutations in schema migrations:** Move data backfills to a separate file or a one-off script.
8. **Test the rollback mentally:** If this migration cannot be easily reversed, note it at the top of the file.

---

## Mobile SQLite layer

Files live in `apps/mobile/src/db/<tableName>.ts`. One file per table or tightly related group.

Rules:

1. Export named query functions, not raw SQL strings. SQL strings should be module-level `const` named `*_SQL`, not inlined in functions.
2. Accept `SQLiteDatabase` as the first argument. Never import or call `getDatabase()` inside a db module — that is the caller's job.
3. Use parameterized queries (`?`) for all values. Never string-interpolate user data into SQL.
4. Return typed results. Map raw rows to typed objects before returning.
5. Keep queries single-purpose. Do not add optional behavior via flags — write two functions.
6. Test with a real in-memory SQLite database (jest-expo supports this). Avoid mocking SQLite.

---

## Mobile sync and background workers

Files live in `apps/mobile/src/modules/sync/`.

Rules:

1. **Every fire-and-forget call needs a `.catch()`.**

   ```typescript
   // WRONG
   void runUploadQueueWorker();

   // CORRECT
   void runUploadQueueWorker().catch((e: unknown) => {
     logTailo('Upload', 'Worker failed', {
       message: e instanceof Error ? e.message : 'Unknown.',
     });
   });
   ```

2. **Workers must be re-entrant safe.** A worker that is already running should detect that state (via DB status or a module-level flag) and exit early without corrupting in-progress work.

3. **Resolve `getDatabase()` close to execution time.** Long-lived workers that cache a DB handle can hold a stale handle after a reinstall or DB reset. Always call `getDatabase()` at the start of each worker pass.

4. **Separate the decision from the side-effect.** Extract pure functions that decide what to sync, upload, or apply. Call them from the worker. This makes the logic unit-testable without mocking the worker harness.

5. **Sync workers must be resilient.** A single item failure must not abort the rest of the batch. Catch errors per-item, log them, and continue.

6. **Queue workers check auth before doing work.** Return early with a `skippedReason` if `!isRemoteAuthConfigured()` or no session is available.

---

## Local data and cloud sync

When adding a new persistent field to a local model (SQLite table, SecureStore value, or local file), ask before finishing:

1. **Does this data need to survive reinstall or be available on other devices?** If yes, implement cloud sync in the same change — do not leave it as a follow-up.
2. **Sync means three things:** upload path (device → cloud), restore path (cloud → device on first launch / new device), and a local flag to track sync state (e.g. `portraitCloudUrl`, `syncedAt`).
3. **If cloud sync is genuinely out of scope** for the current task (Phase 0/1 local-only work), add a `// TODO: sync to cloud` comment at the persistence site and call it out explicitly in the summary.

Do not ship a local-only implementation of something that clearly needs cross-device availability without explicitly flagging the gap.

---

## Auth and identity in backend code

1. **Always resolve `appUserId` from the JWT.** The Supabase JWT `user.id` is the auth identity, not the app identity. Call `resolveCallerAppUserId(user, adminClient)` (creates if needed) or `lookupCallerAppUserId(user, adminClient)` (returns null if missing). Never use `user.id` as an `app_user_id` in DB queries.

2. **Use the service-role client for all server-side mutations.** The anon client is for RLS-controlled reads by authenticated users. The service-role client is for handlers and workers that need to write on behalf of users.

3. **Never expose the service-role key on the client.** Do not import `getServiceRoleClient` from mobile code.

4. **Check resource ownership before mutating.** Verify `petRow.app_user_id === appUser.appUserId`, `eventRow.app_user_id === appUser.appUserId`, etc. Return 403 on mismatch.

5. **Delete order matters.** When deleting a user account, delete app-layer data before auth-layer data. Deleting `app_users` cascades to all child rows. The cascade ensures the user ends up with no orphaned app data even if the auth delete fails.

---

## Logging

Use structured logging consistently.

**Mobile:**

```typescript
import { logTailo } from '@/lib/tailoLogger';
logTailo('Sync', 'Upload worker started', { batchSize: 5 });

import { logAuth } from '@/modules/auth/authLogger';
logAuth('session_refreshed', { userId });
```

**Edge Functions:**

```typescript
log.info('event_synced', { eventId, syncVersion });
log.warn('storage_delete_failed', { appUserId, message: error.message });
log.error('db_query_failed', { message: error.message });
```

Rules:

- Use `log.info` for expected outcomes, `log.warn` for recoverable problems, `log.error` for unexpected failures.
- Include entity IDs in every log event. Do not log email addresses, names, or other PII.
- Do not log `undefined` values — check before including in the payload.

---

## Testing backend and non-UI code

Test frameworks:

- **`apps/mobile`** — `jest-expo` (runs via `npm test` from root)
- **`packages/shared`, `packages/backend-core`, `packages/ai`** — Vitest with node environment

What to test:

| Type                            | How                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| Usecase / decision function     | Unit test pure function with representative inputs           |
| Zod contract / parser           | Pass valid and invalid payloads, check schema rejection      |
| SQLite query helper             | Use in-memory SQLite; do not mock the DB                     |
| Sync merge logic                | Unit test with local/remote snapshots                        |
| Worker pass (extract the logic) | Extract decision logic; unit test without the worker harness |
| Conflict resolution             | Include concurrent-call scenarios in tests                   |

Do not test:

- Handler wiring (routing to the right handler)
- `jsonResponse` format
- DB driver internals

Before finishing, run:

```bash
npm run mobile:typecheck   # TypeScript — catches type errors in mobile code
npm run lint               # ESLint
npm test                   # All tests (jest-expo + Vitest)
npm run format:check       # Prettier — run npm run format first if needed
```

---

## Common mistakes to check before finishing

Before marking any backend or non-UI task complete, verify:

- [ ] No delete-then-insert on a child table — use upsert-then-delete-stale instead.
- [ ] No SELECT-then-UPDATE for exclusive ownership — use UPDATE … RETURNING.
- [ ] No uncaught `23505` unique violations on concurrent insert paths — handle or re-read.
- [ ] No serial storage URL signing in a loop — use `createSignedUrls` batch.
- [ ] No `void task()` without a `.catch()` on the result.
- [ ] No business logic inside an Edge Function handler body — belongs in `packages/backend-core`.
- [ ] No ad-hoc types for API request/response shapes — belongs in `packages/shared/contracts`.
- [ ] No new migration without a `docs/architecture/database-schema-ledger.md` update.
- [ ] No new table without RLS enabled and at least a self-select policy.
- [ ] No `user.id` used directly as `app_user_id` in DB queries.
- [ ] No service-role client imported from mobile app code.
- [ ] No secrets or keys committed or logged.
- [ ] Unit tests added for any new pure logic functions.
- [ ] Any new persistent local field that needs cross-device availability has an upload path, restore path, and local sync-state flag — or a `// TODO: sync to cloud` comment if intentionally deferred.
