export type EventUpdateCursor = {
  updatedAt: string;
  eventId: string;
};

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeEventUpdateCursor(cursor: EventUpdateCursor): string {
  return encodeBase64Url(JSON.stringify(cursor));
}

export function decodeEventUpdateCursor(
  value: string | null | undefined,
): EventUpdateCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(value)) as EventUpdateCursor;

    if (
      typeof parsed.updatedAt === 'string' &&
      typeof parsed.eventId === 'string'
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
