import { useEffect, useState } from "react";

/**
 * Hook to persist state in localStorage so data remains available offline and between sessions.
 * Starts with the default value on SSR then loads stored data after mounting to avoid hydration mismatch.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string>("");

  // Load initial value
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      } else {
        setValue(initial);
      }
    } catch (e) {
      console.error(`Error reading localStorage key "${key}":`, e);
    }
    setHydrated(true);
    setLoadedKey(key);
  }, [key]);

  // Persist value and dispatch event
  useEffect(() => {
    if (!hydrated || loadedKey !== key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      // Dispatch custom event for real-time synchronization across UI components
      window.dispatchEvent(new CustomEvent("ps1-storage-update", {
        detail: { key, value }
      }));
    } catch (e) {
      console.error(`Error writing localStorage key "${key}":`, e);
    }
  }, [key, value, hydrated, loadedKey]);

  // Listen to synchronizing events
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: any }>;
      if (customEvent.detail && customEvent.detail.key === key) {
        // Only update if value is actually different to avoid cycles
        const newValueStr = JSON.stringify(customEvent.detail.value);
        if (JSON.stringify(value) !== newValueStr) {
          setValue(customEvent.detail.value);
        }
      }
    };
    window.addEventListener("ps1-storage-update", handleSync);
    return () => {
      window.removeEventListener("ps1-storage-update", handleSync);
    };
  }, [key, value]);

  return [value, setValue] as const;
}
