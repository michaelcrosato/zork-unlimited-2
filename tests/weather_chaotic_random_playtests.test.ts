import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("Chaotic and Non-Deterministic Weather Playtests", () => {
  // Load the pack directly from the YAML file
  const yamlContent = fs.readFileSync(path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"), "utf8");
  const rawPack = YAML.parse(yamlContent);
  const pack: ParserPack = ParserPackSchema.parse(rawPack);

  it("should block outdoor movement to deep forest in fog without lantern, and allow it once lantern is acquired", () => {
    let state = createInitialState({ seed: 777, start: "clearing" });
    state.environment = {
      weather: "fog",
      temperature: "cold",
      wind: "calm",
      lastUpdatedStep: 0,
    };

    // 1. Moving west to deep_forest in fog should fail since we don't have the lantern yet
    let result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(false);
    expect(result.rejectionReason).toContain("obscures all paths");

    // 2. Add the lantern to inventory and verify that we can now traverse in fog
    state.inventory.push("lantern");
    result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("deep_forest");
  });

  it("should resolve fog traversal dynamically by waiting for weather to clear, moving to buy the lantern, and then being immune to fog", () => {
    let state = createInitialState({ seed: 101, start: "clearing" });
    state.vars["gold"] = 15;
    state.environment = {
      weather: "fog",
      temperature: "cold",
      wind: "calm",
      lastUpdatedStep: 0,
    };

    // Attempting to go west to deep_forest in fog fails
    let result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(false);

    // Instead of moving, we 'wait' (increment step count/take action in clearing)
    // until the weather shifts away from fog.
    let maxWaitSteps = 25;
    while (state.environment.weather === "fog" && maxWaitSteps > 0) {
      result = step(state, { type: "LOOK" }, pack);
      expect(result.ok).toBe(true);
      state = result.state;
      maxWaitSteps--;
    }

    // Check if the weather has successfully shifted away from fog
    expect(state.environment.weather).not.toBe("fog");

    // We can now move west to deep_forest!
    result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.current).toBe("deep_forest");

    // Start dialogue and buy the lantern from the merchant
    result = step(state, { type: "TALK", npc: "goblin_merchant" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    result = step(state, { type: "ASK", npc: "goblin_merchant", topic: "buy_lantern" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.inventory).toContain("lantern");
    expect(state.vars["gold"]).toBe(0);

    // Say goodbye to the merchant
    result = step(state, { type: "ASK", npc: "goblin_merchant", topic: "leave" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // Move back to clearing
    result = step(state, { type: "MOVE", direction: "east" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // Set weather back to fog manually to test immunity
    state.environment = {
      weather: "fog",
      temperature: "cold",
      wind: "calm",
      lastUpdatedStep: state.step,
    };

    // Moving west again to deep_forest under fog should succeed now because we possess the lantern!
    result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("deep_forest");
  });
});
