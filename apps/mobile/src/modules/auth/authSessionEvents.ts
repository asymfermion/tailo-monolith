import { logAuth } from './authLogger';

type AuthSessionListener = () => void;

const listeners = new Set<AuthSessionListener>();

export function subscribeAuthSessionChanged(
  listener: AuthSessionListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyAuthSessionChanged(): void {
  logAuth('Notifying auth session listeners', {
    listenerCount: listeners.size,
  });

  for (const listener of listeners) {
    listener();
  }
}
