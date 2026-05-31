import { createHash } from "crypto";
import { GameState } from "./state.js";

/**
 * Recursively converts any value to a canonical JSON string where all object keys
 * are sorted alphabetically. This ensures identical states produce identical strings.
 */
export function canonicalStringify(val: unknown): string {
  if (val === null) {
    return "null";
  }
  if (val === undefined) {
    return "undefined";
  }
  if (Array.isArray(val)) {
    return "[" + val.map(canonicalStringify).join(",") + "]";
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map(
      (key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`
    );
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(val);
}

/**
 * Computes the SHA-256 hash of a string.
 */
export function computeSha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Computes a stable cryptographic hash for the given GameState.
 * Returns the full 64-character hex string.
 */
export function computeStateHash(state: GameState): string {
  const canonical = canonicalStringify(state);
  return computeSha256(canonical);
}

/**
 * Returns a short 8-character hex prefix of the state hash, suitable for logs.
 */
export function computeStateHashShort(state: GameState): string {
  return computeStateHash(state).substring(0, 8);
}
