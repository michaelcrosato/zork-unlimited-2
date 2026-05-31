import { describe, it, expect } from "vitest";
import { PureRand } from "../src/core/rng.js";

describe("PureRand PRNG", () => {
  it("should generate deterministic floats in [0, 1)", () => {
    const seed = 12345;
    const r1 = PureRand.next(seed);
    const r2 = PureRand.next(seed);

    // Identical seeds yield identical outputs
    expect(r1.value).toBe(r2.value);
    expect(r1.nextSeed).toBe(r2.nextSeed);

    // Outputs are valid floats in [0, 1)
    expect(r1.value).toBeGreaterThanOrEqual(0);
    expect(r1.value).toBeLessThan(1);

    // Successive calls produce different values
    const r3 = PureRand.next(r1.nextSeed);
    expect(r3.value).not.toBe(r1.value);
  });

  it("should generate deterministic integers in range", () => {
    const seed = 999;
    const min = 1;
    const max = 6;

    for (let i = 0; i < 50; i++) {
      const { value } = PureRand.nextInt(seed + i, min, max);
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("should choose elements from arrays deterministically", () => {
    const arr = ["apple", "banana", "cherry", "date"];
    const seed = 777;

    const r1 = PureRand.choose(seed, arr);
    const r2 = PureRand.choose(seed, arr);

    expect(r1.value).toBe(r2.value);
    expect(arr).toContain(r1.value);
  });
});
