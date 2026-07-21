import { createInitialPrototypeState } from "./fixtures";
import type { PrototypeStoreState } from "./types";

/**
 * Isolated persistence for the prototype store.
 *
 * This is the ONLY module that touches browser storage for the prototype. It
 * uses a versioned sessionStorage namespace so data survives navigation and
 * reload within a session, and is discarded when the session ends. It never
 * reads or writes any live/Supabase key.
 */

export const PROTOTYPE_STORAGE_KEY = "zamblak.forms-prototype.v1";
const CURRENT_VERSION = 1 as const;

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isValidState(value: unknown): value is PrototypeStoreState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PrototypeStoreState>;
  return (
    candidate.version === CURRENT_VERSION &&
    Array.isArray(candidate.companies) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.participants) &&
    Array.isArray(candidate.participations) &&
    Array.isArray(candidate.forms) &&
    Array.isArray(candidate.collections)
  );
}

/**
 * Loads the persisted prototype state, or seeds a fresh deterministic baseline
 * when no compatible versioned snapshot exists. Corrupt or version-mismatched
 * data is discarded safely.
 */
export function loadPrototypeState(): PrototypeStoreState {
  const storage = getSessionStorage();
  if (!storage) {
    return createInitialPrototypeState();
  }

  const raw = storage.getItem(PROTOTYPE_STORAGE_KEY);
  if (!raw) {
    return createInitialPrototypeState();
  }

  try {
    const parsed = JSON.parse(raw);
    if (isValidState(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to a clean baseline
  }

  return createInitialPrototypeState();
}

/** Persists the prototype state to the versioned sessionStorage namespace. */
export function savePrototypeState(state: PrototypeStoreState): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PROTOTYPE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or unavailable; the in-memory store still works.
  }
}

/** Clears only the prototype namespace, leaving all other storage untouched. */
export function clearPrototypeState(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(PROTOTYPE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
