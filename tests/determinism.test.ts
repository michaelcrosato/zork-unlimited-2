import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createInitialState, GameState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { computeStateHash } from "../src/core/hash.js";
import { PureRand } from "../src/core/rng.js";
import { Action, CYOAObservation } from "../src/api/types.js";
import { CYOAPack } from "../src/cyoa/schema.js";

describe("Engine Determinism & Purity Contract", () => {
  // Load the test watchtower pack
  const packPath = fileURLToPath(new URL("../content/cyoa/pack/watchtower.yaml", import.meta.url));
  const packData = parseYaml(readFileSync(packPath, "utf-8")) as CYOAPack;

  it("Property A: Random play runs are 100% deterministic", () => {
    // Generate and run 20 different playthroughs with random choices
    for (let run = 0; run < 20; run++) {
      const seed = 555 + run;
      let rngState = seed;

      // First run
      let state1 = createInitialState({
        seed,
        start: packData.meta.start,
        varsInit: packData.meta.vars_init,
        flagsInit: packData.meta.flags_init,
      });

      const actionsRun1: Action[] = [];
      const hashHistory1: string[] = [computeStateHash(state1)];

      while (!state1.ended && state1.step < 100) {
        const obs = buildObservation(state1, packData) as CYOAObservation;
        if (obs.available_actions.length === 0) break;

        // Choose randomly
        const { value: selectedChoice, nextSeed } = PureRand.choose(rngState, obs.available_actions);
        rngState = nextSeed;

        const action: Action = { type: "CHOOSE", choiceId: selectedChoice.id };
        actionsRun1.push(action);

        const result = step(state1, action, packData);
        expect(result.ok).toBe(true);
        state1 = result.state;
        hashHistory1.push(computeStateHash(state1));
      }

      // Second run: Execute the exact same actions starting from the same initial state
      let state2 = createInitialState({
        seed,
        start: packData.meta.start,
        varsInit: packData.meta.vars_init,
        flagsInit: packData.meta.flags_init,
      });
      const hashHistory2: string[] = [computeStateHash(state2)];

      for (const action of actionsRun1) {
        const result = step(state2, action, packData);
        expect(result.ok).toBe(true);
        state2 = result.state;
        hashHistory2.push(computeStateHash(state2));
      }

      // Check byte-identical hashes step-by-step
      expect(hashHistory1).toEqual(hashHistory2);
      expect(state1).toEqual(state2);
    }
  });

  it("Property B: The step function is completely pure and never mutates its input state", () => {
    const seed = 42;
    const stateInput = createInitialState({
      seed,
      start: packData.meta.start,
      varsInit: packData.meta.vars_init,
      flagsInit: packData.meta.flags_init,
    });

    const deepCopyBefore = JSON.parse(JSON.stringify(stateInput));

    const action: Action = { type: "CHOOSE", choiceId: "inspect_ground" };
    const result = step(stateInput, action, packData);

    expect(result.ok).toBe(true);

    // Assert input state was NOT modified
    expect(stateInput).toEqual(deepCopyBefore);
  });
});
