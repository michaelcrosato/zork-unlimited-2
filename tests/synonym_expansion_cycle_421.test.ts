import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("Parser Synonym Expansion (Cycle #421 / Compound Mappings & Chaotic Weather)", () => {
  const actions = [
    { id: "move-up", command: "go up", action: { type: "MOVE" as const, direction: "up" } },
    { id: "take-shovel", command: "take rusty shovel", action: { type: "TAKE" as const, item: "shovel" } },
    {
      id: "use-shovel",
      command: "use rusty shovel on earthen mound",
      action: { type: "USE" as const, item: "shovel", target: "mound" },
    },
    {
      id: "dialogue_attack",
      command: "ask about attack him",
      action: { type: "ASK" as const, npc: "goblin_thief", topic: "attack_thief" },
    },
  ];

  it("should map dig dirt with spade to USE shovel on mound", () => {
    expect(mapCommand("dig dirt with spade", actions).action).toEqual({
      type: "USE",
      item: "shovel",
      target: "mound",
    });
  });

  it("should map grab spade and retrieve spade to TAKE shovel", () => {
    expect(mapCommand("grab spade", actions).action).toEqual({
      type: "TAKE",
      item: "shovel",
    });
    expect(mapCommand("retrieve spade", actions).action).toEqual({
      type: "TAKE",
      item: "shovel",
    });
  });

  it("should map scale rocks and ascend cliffside to MOVE direction up", () => {
    expect(mapCommand("scale rocks", actions).action).toEqual({
      type: "MOVE",
      direction: "up",
    });
    expect(mapCommand("ascend cliffside", actions).action).toEqual({
      type: "MOVE",
      direction: "up",
    });
  });

  it("should map attack thief during fight dialogue to the attack topic", () => {
    expect(mapCommand("attack thief", actions).action).toEqual({
      type: "ASK",
      npc: "goblin_thief",
      topic: "attack_thief",
    });
  });

  describe("Live Unlimited Forest Pack - Storm Traversal Tests", () => {
    const yamlContent = fs.readFileSync(
      path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"),
      "utf8"
    );
    const rawPack = YAML.parse(yamlContent);
    const pack: ParserPack = ParserPackSchema.parse(rawPack);

    it("should block up movement in a storm if player lacks boots and harness, or has only one", () => {
      let state = createInitialState({ seed: 42, start: "clearing" });
      state.environment = {
        weather: "storm",
        temperature: "cold",
        wind: "strong",
        lastUpdatedStep: 0,
      };

      // Case A: No boots, no harness
      let result = step(state, { type: "MOVE", direction: "up" }, pack);
      expect(result.ok).toBe(false);
      expect(result.rejectionReason).toContain("slick to climb in the rain");

      // Case B: Only boots
      state.inventory.push("leather_boots");
      result = step(state, { type: "MOVE", direction: "up" }, pack);
      expect(result.ok).toBe(false);

      // Case C: Only harness (clear boots, add harness)
      state.inventory = ["climbing_harness"];
      result = step(state, { type: "MOVE", direction: "up" }, pack);
      expect(result.ok).toBe(false);
    });

    it("should allow up movement in a storm when player has both boots and climbing harness", () => {
      let state = createInitialState({ seed: 42, start: "clearing" });
      state.environment = {
        weather: "storm",
        temperature: "cold",
        wind: "strong",
        lastUpdatedStep: 0,
      };

      state.inventory.push("leather_boots");
      state.inventory.push("climbing_harness");

      const result = step(state, { type: "MOVE", direction: "up" }, pack);
      expect(result.ok).toBe(true);
      expect(result.state.current).toBe("cliffside");
    });
  });
});
