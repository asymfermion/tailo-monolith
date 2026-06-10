type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToNotificationChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitNotificationChange(): void {
  for (const listener of listeners) {
    listener();
  }
}
