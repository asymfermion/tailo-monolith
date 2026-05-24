import type { ModalRoute } from './routes';

export function shouldAnimateModalEntry(
  routeKey: string,
  seenKeys: ReadonlySet<string>,
): boolean {
  return !seenKeys.has(routeKey);
}

export function pruneSeenModalKeys(
  modalStack: readonly ModalRoute[],
  seenKeys: ReadonlySet<string>,
): Set<string> {
  const activeKeys = new Set(modalStack.map((route) => route.key));
  const nextSeenKeys = new Set<string>();

  for (const key of seenKeys) {
    if (activeKeys.has(key)) {
      nextSeenKeys.add(key);
    }
  }

  return nextSeenKeys;
}
