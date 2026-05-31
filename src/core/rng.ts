/**
 * Mulberry32 is a fast, high-quality 32-bit generator with a 32-bit state.
 * To ensure absolute engine purity, we provide static pure transitions.
 */
export class PureRand {
  /**
   * Generates a pseudo-random float in the range [0, 1) and returns it alongside the next seed state.
   * @param seed The current 32-bit integer seed.
   */
  static next(seed: number): { value: number; nextSeed: number } {
    const nextSeed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return { value, nextSeed };
  }

  /**
   * Generates a pseudo-random integer in the range [min, max] (inclusive).
   */
  static nextInt(seed: number, min: number, max: number): { value: number; nextSeed: number } {
    const { value, nextSeed } = PureRand.next(seed);
    const range = max - min + 1;
    const intVal = Math.floor(value * range) + min;
    return { value: intVal, nextSeed };
  }

  /**
   * Selects a random element from an array.
   */
  static choose<T>(seed: number, arr: T[]): { value: T; nextSeed: number } {
    if (arr.length === 0) {
      throw new Error("Cannot choose from an empty array");
    }
    const { value: index, nextSeed } = PureRand.nextInt(seed, 0, arr.length - 1);
    return { value: arr[index], nextSeed };
  }
}
