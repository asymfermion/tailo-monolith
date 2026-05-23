/**
 * Live Edge Function QA (B2.6). Requires apps/mobile/.env.local and latest deploy:
 *   npm run deploy:supabase && npm run test:supabase:qa
 */
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll } from 'vitest';

import {
  isCreateUploadUrlsResponse,
  isSyncEventResponse,
  UPLOAD_MAX_ASSETS_PER_EVENT,
} from '@tailo/shared';

import { INVALID_JWT, MINIMAL_JPEG, USER_API_FUNCTIONS } from './fixtures.ts';
import {
  invokeEdgeFunction,
  invokeTailoApi,
  readStringField,
  signInAnonymously,
} from './functionTestClient.ts';
import { loadSupabaseIntegrationEnv } from './loadIntegrationEnv.ts';

const integrationEnv = loadSupabaseIntegrationEnv(import.meta.url);
const describeIntegration = integrationEnv ? describe : describe.skip;

async function putSignedUrl(
  signedUrl: string,
  contentType: string,
): Promise<number> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: MINIMAL_JPEG,
  });

  return response.status;
}

describeIntegration('B2.6 Backend hardening & QA (integration)', () => {
  const env = integrationEnv!;

  describe('B2.6.1 JWT on Edge Functions', () => {
    it.each(USER_API_FUNCTIONS)(
      '%s returns 401 without Authorization',
      async (functionName) => {
        const result = await invokeEdgeFunction(env, functionName, {
          accessToken: null,
          body: {},
        });

        expect(result.status).toBe(401);
      },
    );

    it.each(USER_API_FUNCTIONS)(
      '%s returns 401 with invalid JWT',
      async (functionName) => {
        const result = await invokeEdgeFunction(env, functionName, {
          accessToken: INVALID_JWT,
          body: {},
        });

        expect(result.status).toBe(401);
      },
    );

    it('process-ai-job returns 401 without service role or user JWT', async () => {
      const result = await invokeEdgeFunction(env, 'process-ai-job', {
        accessToken: null,
      });

      expect(result.status).toBe(401);
    });
  });

  describe('B2.6.2 Upload URL scoping', () => {
    let signedUrl = '';
    let appUserId = '';

    beforeAll(async () => {
      const session = await signInAnonymously(env);
      const ensured = await invokeTailoApi(env, 'ensure-current-user', {
        accessToken: session.accessToken,
        body: {},
      });
      expect(ensured.status).toBe(200);
      appUserId = readStringField(ensured.body, 'app_user_id') ?? '';
      expect(appUserId).toBeTruthy();
      const suffix = Date.now();

      const pet = await invokeTailoApi(env, 'upsert-pet', {
        accessToken: session.accessToken,
        body: {
          source_local_pet_id: `local_pet_scope_${suffix}`,
          name: 'Scope',
          type: 'dog',
        },
      });
      const petId = readStringField(pet.body, 'pet_id');
      expect(petId).toBeTruthy();

      const urls = await invokeTailoApi(env, 'create-upload-urls', {
        accessToken: session.accessToken,
        body: {
          pet_id: petId,
          source_local_event_id: `local_event_scope_${suffix}`,
          assets: [{ source_local_asset_id: `local_asset_scope_${suffix}` }],
        },
      });

      expect(urls.status).toBe(200);
      expect(isCreateUploadUrlsResponse(urls.body)).toBe(true);

      if (isCreateUploadUrlsResponse(urls.body)) {
        signedUrl = urls.body.assets[0]?.original_upload_url ?? '';
      }
    });

    it('accepts PUT on the signed path with image/jpeg', async () => {
      expect(signedUrl).toContain(appUserId);
      expect(
        await putSignedUrl(signedUrl, 'image/jpeg'),
      ).toBeGreaterThanOrEqual(200);
      expect(await putSignedUrl(signedUrl, 'image/jpeg')).toBeLessThan(300);
    });

    it('rejects PUT when the signed token is tampered (expired/invalid)', async () => {
      const tampered = signedUrl.replace(/token=[^&]+/, 'token=invalid-token');

      expect(await putSignedUrl(tampered, 'image/jpeg')).toBeGreaterThanOrEqual(
        400,
      );
    });

    it('rejects PUT to a different object path than signed', async () => {
      const wrongPath = signedUrl.replace(
        /\/original\.jpg/,
        '/other-user/original.jpg',
      );

      expect(
        await putSignedUrl(wrongPath, 'image/jpeg'),
      ).toBeGreaterThanOrEqual(400);
    });
  });

  describe('B2.6.4 Auth: anonymous + legacy link', () => {
    it('ensures a stable app_user_id for an anonymous session', async () => {
      const session = await signInAnonymously(env);

      const ensured = await invokeTailoApi(env, 'ensure-current-user', {
        accessToken: session.accessToken,
        body: {},
      });

      expect(ensured.status).toBe(200);
      const appUserId = readStringField(ensured.body, 'app_user_id');
      expect(appUserId).toBeTruthy();
      expect(readStringField(ensured.body, 'user_id')).toBe(session.userId);

      const repeat = await invokeTailoApi(env, 'ensure-current-user', {
        accessToken: session.accessToken,
        body: {},
      });

      expect(repeat.status).toBe(200);
      expect(readStringField(repeat.body, 'app_user_id')).toBe(appUserId);
      expect(Reflect.get(repeat.body, 'created_app_user')).toBe(false);
    });

    it('links a fresh anonymous user to a legacy id', async () => {
      const session = await signInAnonymously(env);
      const legacyId = `anon_${Date.now()}`;

      const first = await invokeTailoApi(env, 'link-anonymous-user', {
        accessToken: session.accessToken,
        body: { anonymous_user_id: legacyId },
      });

      expect(first.status).toBe(200);
      expect(readStringField(first.body, 'user_id')).toBe(session.userId);
      expect(readStringField(first.body, 'app_user_id')).toBeTruthy();
      expect(Reflect.get(first.body, 'created')).toBe(true);

      const second = await invokeTailoApi(env, 'link-anonymous-user', {
        accessToken: session.accessToken,
        body: { anonymous_user_id: legacyId },
      });

      expect(second.status).toBe(200);
      expect(Reflect.get(second.body, 'created')).toBe(false);
    });

    it('returns 409 when legacy id is linked to another user', async () => {
      const userA = await signInAnonymously(env);
      const userB = await signInAnonymously(env);
      const legacyId = `anon_conflict_${Date.now()}`;

      const first = await invokeTailoApi(env, 'link-anonymous-user', {
        accessToken: userA.accessToken,
        body: { anonymous_user_id: legacyId },
      });

      expect(first.status).toBe(200);

      const conflict = await invokeTailoApi(env, 'link-anonymous-user', {
        accessToken: userB.accessToken,
        body: { anonymous_user_id: legacyId },
      });

      expect(conflict.status).toBe(409);
      expect(readStringField(conflict.body, 'code')).toBe('conflict');
    });
  });

  describe('B2.6.5 Upload asset limits', () => {
    let accessToken = '';
    let petId = '';

    beforeAll(async () => {
      const session = await signInAnonymously(env);
      accessToken = session.accessToken;
      const suffix = Date.now();

      const pet = await invokeTailoApi(env, 'upsert-pet', {
        accessToken,
        body: {
          source_local_pet_id: `local_pet_limits_${suffix}`,
          name: 'Limits',
          type: 'cat',
        },
      });

      petId = readStringField(pet.body, 'pet_id') ?? '';
    });

    function assetIds(count: number): { source_local_asset_id: string }[] {
      return Array.from({ length: count }, (_, index) => ({
        source_local_asset_id: `local_asset_limit_${index}`,
      }));
    }

    it('accepts 1 asset', async () => {
      const result = await invokeTailoApi(env, 'create-upload-urls', {
        accessToken,
        body: {
          pet_id: petId,
          source_local_event_id: `local_event_limit_1_${Date.now()}`,
          assets: assetIds(1),
        },
      });

      expect(result.status).toBe(200);
    });

    it(`accepts ${UPLOAD_MAX_ASSETS_PER_EVENT} assets`, async () => {
      const result = await invokeTailoApi(env, 'create-upload-urls', {
        accessToken,
        body: {
          pet_id: petId,
          source_local_event_id: `local_event_limit_5_${Date.now()}`,
          assets: assetIds(UPLOAD_MAX_ASSETS_PER_EVENT),
        },
      });

      expect(result.status).toBe(200);
      if (isCreateUploadUrlsResponse(result.body)) {
        expect(result.body.assets).toHaveLength(UPLOAD_MAX_ASSETS_PER_EVENT);
      }
    });

    it('returns 422 for 6 assets', async () => {
      const result = await invokeTailoApi(env, 'create-upload-urls', {
        accessToken,
        body: {
          pet_id: petId,
          source_local_event_id: `local_event_limit_6_${Date.now()}`,
          assets: assetIds(6),
        },
      });

      expect(result.status).toBe(422);
    });
  });

  describe('B2.6.6 Sync idempotency and user caption', () => {
    it('double sync-event is idempotent and preserves user-edited caption', async () => {
      const session = await signInAnonymously(env);
      const suffix = Date.now();
      const sourceLocalEventId = `local_event_sync_${suffix}`;
      const sourceLocalAssetId = `local_asset_sync_${suffix}`;

      const pet = await invokeTailoApi(env, 'upsert-pet', {
        accessToken: session.accessToken,
        body: {
          source_local_pet_id: `local_pet_sync_${suffix}`,
          name: 'Sync',
          type: 'dog',
        },
      });
      const petId = readStringField(pet.body, 'pet_id');
      expect(petId).toBeTruthy();

      const urls = await invokeTailoApi(env, 'create-upload-urls', {
        accessToken: session.accessToken,
        body: {
          pet_id: petId,
          source_local_event_id: sourceLocalEventId,
          assets: [{ source_local_asset_id: sourceLocalAssetId }],
        },
      });

      expect(isCreateUploadUrlsResponse(urls.body)).toBe(true);

      if (!isCreateUploadUrlsResponse(urls.body)) {
        return;
      }

      const asset = urls.body.assets[0]!;
      expect(
        await putSignedUrl(asset.original_upload_url, 'image/jpeg'),
      ).toBeLessThan(300);
      expect(
        await putSignedUrl(asset.thumbnail_upload_url, 'image/jpeg'),
      ).toBeLessThan(300);

      const syncBody = {
        source_local_event_id: sourceLocalEventId,
        pet_id: petId,
        timestamp: new Date().toISOString(),
        source: 'camera_roll' as const,
        event_type: 'unknown' as const,
        caption: 'User keeps this',
        caption_source: 'user' as const,
        is_favorite: false,
        user_edited: { caption: true },
        media: [
          {
            source_local_asset_id: sourceLocalAssetId,
            storage_path: asset.storage_path,
            thumbnail_path: asset.thumbnail_path,
            width: 100,
            height: 100,
            is_primary: true,
          },
        ],
      };

      const first = await invokeTailoApi(env, 'sync-event', {
        accessToken: session.accessToken,
        body: syncBody,
      });

      expect(first.status).toBe(200);
      expect(isSyncEventResponse(first.body)).toBe(true);

      if (!isSyncEventResponse(first.body)) {
        return;
      }

      const eventId = first.body.event_id;
      const versionAfterFirst = first.body.server_sync_version;

      const hostileResync = await invokeTailoApi(env, 'sync-event', {
        accessToken: session.accessToken,
        body: {
          ...syncBody,
          caption: 'AI should not win',
          caption_source: 'placeholder',
          user_edited: undefined,
        },
      });

      expect(hostileResync.status).toBe(200);
      expect(isSyncEventResponse(hostileResync.body)).toBe(true);

      if (!isSyncEventResponse(hostileResync.body)) {
        return;
      }

      expect(hostileResync.body.event_id).toBe(eventId);
      expect(hostileResync.body.server_sync_version).toBe(
        versionAfterFirst + 1,
      );

      const poll = await invokeTailoApi(env, 'get-event-updates', {
        accessToken: session.accessToken,
        body: {},
      });

      expect(poll.status).toBe(200);

      const events =
        poll.body && typeof poll.body === 'object'
          ? Reflect.get(poll.body, 'events')
          : null;

      expect(Array.isArray(events)).toBe(true);

      const row = (events as unknown[]).find(
        (item) =>
          item &&
          typeof item === 'object' &&
          Reflect.get(item, 'event_id') === eventId,
      );

      expect(row).toBeTruthy();
      expect(Reflect.get(row as object, 'caption')).toBe('User keeps this');
      expect(Reflect.get(row as object, 'user_edited_caption')).toBe(true);
    });
  });

  describe('B2.6.8 AI job retry scheduling', () => {
    it.skipIf(!env.serviceRoleKey)(
      'does not lease a job before next_attempt_at',
      async () => {
        const session = await signInAnonymously(env);
        const suffix = Date.now();
        const sourceLocalEventId = `local_event_ai_retry_${suffix}`;

        const pet = await invokeTailoApi(env, 'upsert-pet', {
          accessToken: session.accessToken,
          body: {
            source_local_pet_id: `local_pet_ai_retry_${suffix}`,
            name: 'Retry',
            type: 'dog',
          },
        });
        const petId = readStringField(pet.body, 'pet_id');
        expect(petId).toBeTruthy();

        const admin = createClient(env.supabaseUrl, env.serviceRoleKey);
        const eventId = crypto.randomUUID();
        const future = new Date(Date.now() + 60 * 60_000).toISOString();

        await admin.from('events').insert({
          event_id: eventId,
          user_id: session.userId,
          pet_id: petId,
          source_local_event_id: sourceLocalEventId,
          timestamp: new Date().toISOString(),
          source: 'camera_roll',
          event_type: 'unknown',
          updated_at: new Date().toISOString(),
        });

        const aiJobId = crypto.randomUUID();

        await admin.from('ai_jobs').insert({
          ai_job_id: aiJobId,
          event_id: eventId,
          job_type: 'caption_event',
          status: 'pending',
          attempt_count: 1,
          next_attempt_at: future,
          updated_at: new Date().toISOString(),
        });

        const sweep = await invokeEdgeFunction(env, 'process-ai-job', {
          serviceRole: true,
          body: { sweep: true, max_jobs: 5 },
        });

        expect(sweep.status).toBe(200);

        const { data: row } = await admin
          .from('ai_jobs')
          .select('status, attempt_count')
          .eq('ai_job_id', aiJobId)
          .single();

        expect(row?.status).toBe('pending');
        expect(row?.attempt_count).toBe(1);
      },
    );
  });
});
