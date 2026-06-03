import { describe, it, expect } from "vitest";
import {
  createInitialState,
  cloneMerchantInventories,
  cloneObjectState,
  cloneAgents,
  cloneStateWithoutHistory,
} from "../src/core/state.js";

describe("State and Object Cloning Optimizations", () => {
  it("should correctly clone merchant inventories without shared references", () => {
    const inventories = {
      merchant_bob: ["iron_sword", "wooden_shield"],
      merchant_alice: ["gold_ring"],
    };

    const cloned = cloneMerchantInventories(inventories);
    expect(cloned).toEqual(inventories);
    expect(cloned).not.toBe(inventories);
    expect(cloned?.["merchant_bob"]).not.toBe(inventories.merchant_bob);

    // Assert mutating clone doesn't mutate original
    cloned?.["merchant_bob"].push("health_potion");
    expect(inventories.merchant_bob).not.toContain("health_potion");
  });

  it("should return undefined for empty or missing merchant inventories", () => {
    expect(cloneMerchantInventories(undefined)).toBeUndefined();
  });

  it("should correctly clone object state including nested contents arrays", () => {
    const objectState = {
      wooden_chest: {
        open: false,
        locked: true,
        contents: ["royal_gem", "gold_coins"],
      },
      iron_sword: {
        takenBy: "world" as const,
      },
    };

    const cloned = cloneObjectState(objectState);
    expect(cloned).toEqual(objectState);
    expect(cloned).not.toBe(objectState);
    expect(cloned["wooden_chest"]).not.toBe(objectState.wooden_chest);
    expect(cloned["wooden_chest"].contents).not.toBe(objectState.wooden_chest.contents);

    // Mutating chest contents in clone shouldn't change the original
    cloned["wooden_chest"].contents?.push("rusted_key");
    expect(objectState.wooden_chest.contents).not.toContain("rusted_key");
  });

  it("should return empty object for missing object state", () => {
    expect(cloneObjectState(undefined)).toEqual({});
  });

  it("should correctly clone agent states and inventories", () => {
    const agents = {
      alice: {
        id: "alice",
        current: "forest_clearing",
        inventory: ["health_potion"],
      },
    };

    const cloned = cloneAgents(agents);
    expect(cloned).toEqual(agents);
    expect(cloned).not.toBe(agents);
    expect(cloned?.["alice"]).not.toBe(agents.alice);
    expect(cloned?.["alice"].inventory).not.toBe(agents.alice.inventory);

    // Mutating agent inventory shouldn't change the original
    cloned?.["alice"].inventory.push("silver_key");
    expect(agents.alice.inventory).not.toContain("silver_key");
  });

  it("should return undefined for missing agent state", () => {
    expect(cloneAgents(undefined)).toBeUndefined();
  });

  it("should successfully clone GameState while stripping history and preserving properties", () => {
    const state = createInitialState({
      seed: 12345,
      start: "start_room",
      varsInit: { gold: 50 },
      flagsInit: ["has_key"],
      agentsInit: ["player_1"],
    });

    state.stateHistory = [{ step: 0, current: "start_room" }];

    const cloned = cloneStateWithoutHistory(state);

    // stateHistory must be stripped or undefined on the cloned object
    expect(cloned.stateHistory).toBeUndefined();

    // All other properties must be deeply/correctly cloned
    expect(cloned.seed).toBe(state.seed);
    expect(cloned.current).toBe(state.current);
    expect(cloned.vars.gold).toBe(50);
    expect(cloned.flags["has_key"]).toBe(true);

    // Verify mutations do not leak
    cloned.inventory.push("gold_ore");
    expect(state.inventory).not.toContain("gold_ore");

    cloned.vars.gold = 100;
    expect(state.vars.gold).toBe(50);
  });
});
