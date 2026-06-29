"use client";

import { SCHEMA_VERSION, STORAGE_KEYS } from "@/lib/constants";
import {
  StorageEnvelopeSchema,
  DiagramSchema,
  type Diagram,
  type StorageEnvelope,
} from "@/lib/types";

/* ============================================================================
 * SSR guard
 * All functions check `typeof window !== 'undefined'` before touching
 * localStorage so they are safe to import in Server Components.
 * ========================================================================== */

/**
 * Persist the currently open diagram to localStorage, wrapped in a versioned
 * StorageEnvelope. Errors (e.g. QuotaExceededError) are swallowed silently.
 */
export function saveDiagram(diagram: Diagram): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: StorageEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      diagram,
    };
    localStorage.setItem(
      STORAGE_KEYS.currentDiagram,
      JSON.stringify(envelope),
    );
  } catch {
    // Storage quota exceeded or access denied — ignore
  }
}

/**
 * Load the currently open diagram from localStorage.
 * Returns `null` if nothing is stored, the payload is corrupt, or the schema
 * version has changed (stale payload from an older build).
 */
export function loadDiagram(): Diagram | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentDiagram);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = StorageEnvelopeSchema.safeParse(parsed);
    if (!result.success) return null;
    // Reject payloads saved by a different schema version
    if (result.data.schemaVersion !== SCHEMA_VERSION) return null;
    return result.data.diagram;
  } catch {
    return null;
  }
}

/** Remove the currently open diagram from localStorage. */
export function clearDiagram(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.currentDiagram);
}

/**
 * Serialise a diagram to a JSON string suitable for file export.
 * Uses 2-space indentation so the output is human-readable.
 */
export function exportDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

/**
 * Parse and validate a JSON string produced by `exportDiagram`.
 * Throws a `ZodError` if the payload does not conform to `DiagramSchema`.
 */
export function importDiagram(json: string): Diagram {
  const parsed: unknown = JSON.parse(json);
  return DiagramSchema.parse(parsed);
}

/**
 * Save a named diagram to its own localStorage key and keep the diagram index
 * up to date. The index entry is updated in-place if the id already exists.
 * Errors are swallowed silently.
 */
export function saveNamedDiagram(diagram: Diagram): void {
  if (typeof window === "undefined") return;
  try {
    // Persist the full diagram under its own key
    const key = STORAGE_KEYS.diagramPrefix + diagram.id;
    localStorage.setItem(key, JSON.stringify(diagram));

    // Update the index, replacing any existing entry for this id
    const index = listSavedDiagrams();
    const existingIdx = index.findIndex((entry) => entry.id === diagram.id);
    const indexEntry = {
      id: diagram.id,
      name: diagram.name,
      updatedAt: diagram.updatedAt,
    };
    if (existingIdx >= 0) {
      index[existingIdx] = indexEntry;
    } else {
      index.push(indexEntry);
    }
    localStorage.setItem(STORAGE_KEYS.diagramIndex, JSON.stringify(index));
  } catch {
    // Storage quota exceeded or access denied — ignore
  }
}

/**
 * Load a named diagram by id. Returns `null` if not found or the payload is
 * invalid.
 */
export function loadNamedDiagram(id: string): Diagram | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.diagramPrefix + id);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = DiagramSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Return the index of all locally saved diagrams, sorted by `updatedAt`
 * descending (most recently saved first).
 */
export function listSavedDiagrams(): Array<{
  id: string;
  name: string;
  updatedAt: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.diagramIndex);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const index = parsed as Array<{
      id: string;
      name: string;
      updatedAt: string;
    }>;
    return index.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/**
 * Remove a named diagram from localStorage and drop it from the index.
 * Errors are swallowed silently.
 */
export function deleteNamedDiagram(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.diagramPrefix + id);
    const updated = listSavedDiagrams().filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEYS.diagramIndex, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded or access denied — ignore
  }
}
