import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("Parser & Weather Travel safety (Cycle #423)", () => {
  const yamlContent = fs.readFileSync(path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"), "utf8");
  const rawPack = YAML.parse(yamlContent);
  const pack: ParserPack = ParserPackSchema.parse(rawPack);

  it("should block climbing up to cliffside during storm without leather boots or climbing harness", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };

    // Attempting to climb up without boots and harness should fail
    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("slick to climb in the rain");
  });

  it("should block climbing up to cliffside during storm with boots but no climbing harness", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };
    state.inventory.push("leather_boots");

    // Attempting to climb up with only boots should fail
    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("slick to climb in the rain");
  });

  it("should block climbing up to cliffside during storm with harness but no leather boots", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };
    state.inventory.push("climbing_harness");

    // Attempting to climb up with only harness should fail
    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("slick to climb in the rain");
  });

  it("should allow climbing up to cliffside during storm with both boots and harness", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };
    state.inventory.push("leather_boots");
    state.inventory.push("climbing_harness");

    // Attempting to climb up with both boots and harness should succeed
    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("cliffside");
  });
});
