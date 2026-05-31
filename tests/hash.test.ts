import { describe, it, expect } from "vitest";
import { canonicalStringify, computeStateHash } from "../src/core/hash.js";
import { GameState } from "../src/core/state.js";

describe("State Hashing & Canonical Stringify", () => {
  it("should stringify objects canonically ignoring key declaration order", () => {
    const objA = { z: 1, a: "hello", b: [1, { y: 2, x: 1 }] };
    const objB = { a: "hello", z: 1, b: [1, { x: 1, y: 2 }] };

    const strA = canonicalStringify(objA);
    const strB = canonicalStringify(objB);

    expect(strA).toBe(strB);
    expect(strA).toBe('{"a":"hello","b":[1,{"x":1,"y":2}],"z":1}');
  });

  it("should compute identical hashes for identical game states", () => {
    const state1: GameState = {
      seed: 42,
      step: 3,
      current: "room_a",
      visited: { room_a: true, room_b: false },
      flags: { flag_x: true, flag_y: false },
      vars: { health: 100, gold: 50 },
      inventory: ["sword", "shield"],
      objectState: { chest: { open: true, locked: false } },
      journal: ["You woke up.", "You took a sword."],
      questStage: {},
      ended: false,
      endingId: null,
    };

    // Scramble map and key declaration orders in copy
    const state2: GameState = {
      ended: false,
      vars: { gold: 50, health: 100 },
      seed: 42,
      visited: { room_b: false, room_a: true },
      step: 3,
      current: "room_a",
      flags: { flag_y: false, flag_x: true },
      inventory: ["sword", "shield"],
      objectState: { chest: { locked: false, open: true } },
      journal: ["You woke up.", "You took a sword."],
      questStage: {},
      endingId: null,
    };

    const hash1 = computeStateHash(state1);
    const hash2 = computeStateHash(state2);

    expect(hash1).toBe(hash2);
  });
});
