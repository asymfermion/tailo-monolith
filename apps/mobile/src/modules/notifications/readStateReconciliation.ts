function parseIsoMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function resolveNotificationReadAt(
  localReadAt: string | null,
  remoteReadAt: string | null,
): string | null {
  const localMs = parseIsoMs(localReadAt);
  const remoteMs = parseIsoMs(remoteReadAt);

  if (localMs === null) {
    return remoteReadAt;
  }

  if (remoteMs === null) {
    return localReadAt;
  }

  return remoteMs >= localMs ? remoteReadAt : localReadAt;
}
