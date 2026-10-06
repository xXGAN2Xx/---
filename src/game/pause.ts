let paused = false;

const listeners = new Set<() => void>();

export function setGamePaused(value: boolean): void {
  paused = value;
  listeners.forEach((listener) => listener());
}

export function isGamePaused(): boolean {
  return paused;
}

export function subscribeGamePause(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
