export { getAiJobBackoffIso as getBackoffIso } from '../../../packages/backend-core/src/usecases/aiJobFailure.ts';

export async function getVertexAccessToken(
  serviceAccountJson: string,
): Promise<string | null> {
  try {
    const account = JSON.parse(serviceAccountJson) as {
      client_email: string;
      private_key: string;
      token_uri?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: account.client_email,
      sub: account.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      iat: now,
      exp: now + 3600,
    };

    const encode = (value: Record<string, unknown>) =>
      btoa(JSON.stringify(value))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const unsignedToken = `${encode(header)}.${encode(claim)}`;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(account.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsignedToken),
    );
    const signedToken = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedToken,
      }),
    });

    if (!tokenResponse.ok) {
      return null;
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
    };
    return tokenPayload.access_token ?? null;
  } catch {
    return null;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
