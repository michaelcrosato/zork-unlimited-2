import { describe, it, expect } from "vitest";
import { saveGame, loadGame } from "../src/persist/save_load.js";
import { createInitialState } from "../src/core/state.js";
import { computeSha256, canonicalStringify } from "../src/core/hash.js";

describe("saveGame / loadGame round-trip", () => {
  const state = createInitialState({ seed: 42, start: "entrance" });
  const packId = "test-pack";
  const contentHash = computeSha256("test-content");

  it("serializes and deserializes a GameState with matching metadata", () => {
    const saved = saveGame(state, packId, contentHash);
    const loaded = loadGame(saved, packId, contentHash);

    expect(loaded.current).toBe("entrance");
    expect(loaded.seed).toBe(42);
    expect(loaded.step).toBe(0);
  });

  it("includes timestamp and engineVersion in save data", () => {
    const saved = saveGame(state, packId, contentHash);
    const parsed = JSON.parse(saved);

    expect(parsed.timestamp).toBeDefined();
    expect(parsed.engineVersion).toBe("1.0.0");
    expect(parsed.packId).toBe(packId);
    expect(parsed.contentHash).toBe(contentHash);
  });

  it("throws on pack ID mismatch", () => {
    const saved = saveGame(state, packId, contentHash);
    expect(() => loadGame(saved, "wrong-pack", contentHash)).toThrow("pack");
  });

  it("throws on content hash mismatch", () => {
    const saved = saveGame(state, packId, contentHash);
    expect(() => loadGame(saved, packId, "wrong-hash")).toThrow("hash mismatch");
  });

  it("throws on invalid JSON input", () => {
    expect(() => loadGame("not json", packId, contentHash)).toThrow("parse");
  });

  it("throws on missing required fields", () => {
    const incomplete = JSON.stringify({ state: null, packId: null });
    expect(() => loadGame(incomplete, packId, contentHash)).toThrow();
  });
});
