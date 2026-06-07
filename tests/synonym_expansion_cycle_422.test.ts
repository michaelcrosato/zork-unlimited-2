import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("Parser & Traversal Safety (Cycle #422)", () => {
  const yamlContent = fs.readFileSync(path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"), "utf8");
  const rawPack = YAML.parse(yamlContent);
  const pack: ParserPack = ParserPackSchema.parse(rawPack);

  it("should allow climbing down from cliffside during storm/rain without boots to prevent soft-locks", () => {
    let state = createInitialState({ seed: 42, start: "cliffside" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };

    // Verify player does not have boots
    expect(state.inventory).not.toContain("leather_boots");

    // Move down (climbing down to clearing) should succeed
    const result = step(state, { type: "MOVE", direction: "down" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("clearing");
  });

  it("should still block climbing up to cliffside during storm/rain without boots", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "strong",
      lastUpdatedStep: 0,
    };

    // Verify player does not have boots
    expect(state.inventory).not.toContain("leather_boots");

    // Move up (climbing up to cliffside) should fail
    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("slick to climb in the rain");
  });
});
