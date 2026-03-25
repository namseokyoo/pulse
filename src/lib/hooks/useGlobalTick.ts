import { useSyncExternalStore } from "react";

let tick = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && !intervalId) {
    intervalId = setInterval(() => {
      tick++;
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() { return tick; }
function getServerSnapshot() { return 0; }

export function useGlobalTick() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
