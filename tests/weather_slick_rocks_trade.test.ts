import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("Procedural Weather and Trading Integration", () => {
  // Load the pack directly from the YAML file
  const yamlContent = fs.readFileSync(path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"), "utf8");
  const rawPack = YAML.parse(yamlContent);
  const pack: ParserPack = ParserPackSchema.parse(rawPack);

  it("under clear weather, the player can move up from the clearing room to cliffside", () => {
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "clear",
      temperature: "mild",
      wind: "calm",
      lastUpdatedStep: 0,
    };

    const result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("cliffside");
  });

  it("under rain weather, the player's movement up is locked unless they possess the leather_boots item", () => {
    // 1. Without leather_boots
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "rain",
      temperature: "cold",
      wind: "breezy",
      lastUpdatedStep: 0,
    };

    let result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);

    // 2. With leather_boots
    state.inventory.push("leather_boots");
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("cliffside");
  });

  it("under storm weather, the player's movement up is locked unless they possess BOTH leather_boots and climbing_harness", () => {
    // 1. Without either
    let state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "gale",
      lastUpdatedStep: 0,
    };

    let result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);

    // 2. With only leather_boots
    state.inventory.push("leather_boots");
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);

    // 3. With only climbing_harness
    state = createInitialState({ seed: 42, start: "clearing" });
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "gale",
      lastUpdatedStep: 0,
    };
    state.inventory.push("climbing_harness");
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);

    // 4. With both
    state.inventory.push("leather_boots");
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("cliffside");
  });

  it("verify that the player can buy leather_boots from goblin_merchant (deep_forest) and climbing_harness from elven_ranger (clearing) via dialogue trade steps, which then successfully opens the locked exit", () => {
    let state = createInitialState({ seed: 9, start: "clearing" });
    state.vars["gold"] = 50;

    // Set weather to storm
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "gale",
      lastUpdatedStep: 0,
    };

    // Exit should be locked under storm
    let result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(false);

    // 1. Move to deep_forest to talk to goblin_merchant and buy leather_boots
    result = step(state, { type: "MOVE", direction: "west" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.current).toBe("deep_forest");

    // Start dialogue with goblin_merchant
    result = step(state, { type: "TALK", npc: "goblin_merchant" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // Buy leather boots (costs 20 gold)
    result = step(state, { type: "ASK", npc: "goblin_merchant", topic: "buy_boots" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.inventory).toContain("leather_boots");
    expect(state.vars["gold"]).toBe(30); // 50 - 20 = 30

    // End dialogue with goblin_merchant
    result = step(state, { type: "ASK", npc: "goblin_merchant", topic: "leave" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // 2. Move back to clearing to talk to elven_ranger and buy climbing_harness
    result = step(state, { type: "MOVE", direction: "east" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.current).toBe("clearing");

    // Start dialogue with elven_ranger
    result = step(state, { type: "TALK", npc: "elven_ranger" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // Buy climbing harness (costs 30 gold in YAML)
    result = step(state, { type: "ASK", npc: "elven_ranger", topic: "buy_harness" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.inventory).toContain("climbing_harness");
    expect(state.vars["gold"]).toBe(0); // 30 - 30 = 0

    // End dialogue with elven_ranger
    result = step(state, { type: "ASK", npc: "elven_ranger", topic: "leave" }, pack);
    expect(result.ok).toBe(true);
    state = result.state;

    // 3. Verify exit up is now unlocked and we can move to cliffside
    result = step(state, { type: "MOVE", direction: "up" }, pack);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("cliffside");
  });
});
