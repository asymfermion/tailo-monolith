import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, beforeAll } from 'vitest';

import {
  isCreateUploadUrlsResponse,
  type CreateUploadUrlsResponse,
} from '@tailo/shared';

import { loadSupabaseIntegrationEnv } from './loadIntegrationEnv.ts';

/** Minimal valid JPEG (1×1) for Storage PUT smoke tests. */
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64',
);

const integrationEnv = loadSupabaseIntegrationEnv(import.meta.url);

const describeIntegration = integrationEnv ? describe : describe.skip;

async function putToSignedUrl(
  signedUrl: string,
  contentType: string,
): Promise<{ status: number; body: string }> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: MINIMAL_JPEG,
  });

  return {
    status: response.status,
    body: await response.text().catch(() => ''),
  };
}

describeIntegration('B2.4.3a signed upload Content-Type (integration)', () => {
  let accessToken = '';
  let petId = '';
  let uploadUrls: CreateUploadUrlsResponse;

  beforeAll(async () => {
    if (!integrationEnv) {
      return;
    }

    const client = createClient(
      integrationEnv.supabaseUrl,
      integrationEnv.anonKey,
    );
    const { data, error } = await client.auth.signInAnonymously();

    if (error || !data.session) {
      throw new Error(
        `Anonymous sign-in failed: ${error?.message ?? 'no session'}`,
      );
    }

    accessToken = data.session.access_token;
    const suffix = Date.now();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      apikey: integrationEnv.anonKey,
      'Content-Type': 'application/json',
    };

    const petResponse = await fetch(
      `${integrationEnv.supabaseUrl}/functions/v1/upsert-pet`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_local_pet_id: `local_pet_upload_smoke_${suffix}`,
          name: 'Upload smoke',
          type: 'dog',
        }),
      },
    );

    const petPayload: unknown = await petResponse.json().catch(() => null);
    const remotePetId =
      petPayload &&
      typeof petPayload === 'object' &&
      typeof Reflect.get(petPayload, 'pet_id') === 'string'
        ? String(Reflect.get(petPayload, 'pet_id'))
        : null;

    if (!petResponse.ok || !remotePetId) {
      throw new Error(
        `upsert-pet failed (${petResponse.status}): ${JSON.stringify(petPayload)}`,
      );
    }

    petId = remotePetId;

    const urlsResponse = await fetch(
      `${integrationEnv.supabaseUrl}/functions/v1/create-upload-urls`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pet_id: petId,
          source_local_event_id: `local_event_upload_smoke_${suffix}`,
          assets: [
            { source_local_asset_id: `local_asset_upload_smoke_${suffix}` },
          ],
        }),
      },
    );

    const urlsPayload: unknown = await urlsResponse.json().catch(() => null);

    if (!urlsResponse.ok || !isCreateUploadUrlsResponse(urlsPayload)) {
      throw new Error(
        `create-upload-urls failed (${urlsResponse.status}): ${JSON.stringify(urlsPayload)}`,
      );
    }

    uploadUrls = urlsPayload;
  });

  it('accepts PUT with Content-Type image/jpeg', async () => {
    const signedUrl = uploadUrls.assets[0]?.original_upload_url;

    expect(signedUrl).toBeTruthy();

    const result = await putToSignedUrl(signedUrl!, 'image/jpeg');

    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
  });

  it('rejects PUT with Content-Type text/plain (bucket allowed_mime_types)', async () => {
    const signedUrl = uploadUrls.assets[0]?.original_upload_url;

    expect(signedUrl).toBeTruthy();

    const result = await putToSignedUrl(signedUrl!, 'text/plain');

    expect(result.status).toBe(400);
    expect(result.body).toContain('invalid_mime_type');
    expect(result.body).toContain('text/plain');
  });

  it('rejects PUT with Content-Type application/pdf', async () => {
    const signedUrl = uploadUrls.assets[0]?.original_upload_url;

    expect(signedUrl).toBeTruthy();

    const result = await putToSignedUrl(signedUrl!, 'application/pdf');

    expect(result.status).toBe(400);
    expect(result.body).toContain('invalid_mime_type');
    expect(result.body).toContain('application/pdf');
  });
});
