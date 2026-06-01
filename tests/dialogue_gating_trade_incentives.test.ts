import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { checkReputationTrade, calculateTradePrice } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";

describe("Cycle 47 Integration Tests: Dialogue Gating & Strategic Trade Incentives", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "dialogue_gating_pack",
      title: "Gating and Incentives Test Pack",
      start_room: "market",
      vars_init: { gold: 100 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Grand Market",
        description: "A busy market square.",
        objects: ["contraband_spice"],
        npcs: ["merchant_npc"],
        exits: [],
      },
    ],
    objects: [
      {
        id: "contraband_spice",
        name: "Contraband Spice",
        description: "Illegal space spice.",
        cost: 100,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [
      {
        id: "merchant_npc",
        name: "Sly Garrett",
        description: "A shady merchant.",
        faction: "rangers",
        min_rep: 10,
        max_heat: 30,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hey.",
              topics: [],
            },
          ],
        },
      },
      {
        id: "normal_merchant",
        name: "Honest Joe",
        description: "A regular merchant.",
        dialogue: {
          root: "root",
          nodes: [{ id: "root", npc_text: "Welcome", topics: [] }],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  });

  it("should evaluate alliance_is conditions correctly", () => {
    let state = createInitialState({ seed: 42, start: "market" });
    
    // Default relationship is neutral
    const condAllied = {
      alliance_is: {
        faction_a: "rangers",
        faction_b: "rebels",
        relationship: "allied" as const,
      },
    };
    expect(evaluateCondition(state, condAllied)).toBe(false);

    // Set allied relationship
    state.alliances = {
      rangers: {
        rebels: "allied",
      },
    };
    expect(evaluateCondition(state, condAllied)).toBe(true);

    // Check hostile relationship
    const condHostile = {
      alliance_is: {
        faction_a: "rangers",
        faction_b: "rebels",
        relationship: "hostile" as const,
      },
    };
    expect(evaluateCondition(state, condHostile)).toBe(false);

    state.alliances.rangers.rebels = "hostile";
    expect(evaluateCondition(state, condHostile)).toBe(true);
  });

  it("should evaluate enforcer_heat_gte and enforcer_heat_lte conditions correctly", () => {
    let state = createInitialState({ seed: 42, start: "market" });

    // Default heat is 0
    const condHeatGte = {
      enforcer_heat_gte: {
        room: "market",
        value: 20,
      },
    };
    const condHeatLte = {
      enforcer_heat_lte: {
        room: "market",
        value: 10,
      },
    };

    expect(evaluateCondition(state, condHeatGte)).toBe(false);
    expect(evaluateCondition(state, condHeatLte)).toBe(true);

    // Set heat to 25
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 25,
        timestamp: 1,
      },
    };

    expect(evaluateCondition(state, condHeatGte)).toBe(true);
    expect(evaluateCondition(state, condHeatLte)).toBe(false);

    // If room is omitted, it should default to state.current ('market')
    const condHeatOmittedGte = {
      enforcer_heat_gte: {
        value: 20,
      },
    };
    expect(evaluateCondition(state, condHeatOmittedGte)).toBe(true);
  });

  it("should enforce enforcer heat limits and block trade when too high", () => {
    let state = createInitialState({ seed: 42, start: "market" });
    const npc = mockPack.npcs.find((n) => n.id === "merchant_npc")!;
    state.npcRep = { merchant_npc: 15 };

    // Case 1: Heat is 0 (below max_heat of 30) -> allowed
    let check = checkReputationTrade(state, npc);
    // Note: Faction standing check is ignored since factionRep or min_rep is not met. Let's set faction reputation to meet the requirement.
    state.factionRep = { rangers: 15 };
    check = checkReputationTrade(state, npc);
    expect(check.allowed).toBe(true);

    // Case 2: Heat is 40 (above max_heat of 30) -> blocked
    state.enforcementHeat = {
      market: { roomId: "market", heat: 40, timestamp: 1 },
    };
    check = checkReputationTrade(state, npc);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("too spooked to trade");

    // Case 3: Normal NPC has no max_heat set (defaults to 50).
    const normalNpc = mockPack.npcs.find((n) => n.id === "normal_merchant")!;
    state.enforcementHeat.market.heat = 40; // below 50
    expect(checkReputationTrade(state, normalNpc).allowed).toBe(true);

    state.enforcementHeat.market.heat = 60; // above 50
    expect(checkReputationTrade(state, normalNpc).allowed).toBe(false);
  });

  it("should enforce faction reputation limits when defined", () => {
    let state = createInitialState({ seed: 42, start: "market" });
    const npc = mockPack.npcs.find((n) => n.id === "merchant_npc")!;
    state.npcRep = { merchant_npc: 15 };

    // Sly Garrett (merchant_npc) requires 10 rangers faction reputation.
    // Case 1: Rangers reputation is 5 (below 10) -> blocked
    state.factionRep = { rangers: 5 };
    let check = checkReputationTrade(state, npc);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("poor standing with their faction");

    // Case 2: Rangers reputation is 15 (above 10) -> allowed
    state.factionRep = { rangers: 15 };
    check = checkReputationTrade(state, npc);
    expect(check.allowed).toBe(true);
  });

  it("should apply allied syndicate contraband pricing incentives", () => {
    let state = createInitialState({ seed: 42, start: "market" });
    const npc = mockPack.npcs.find((n) => n.id === "merchant_npc")!;
    const item = mockPack.objects.find((o) => o.id === "contraband_spice")!;

    // Player and merchant belong to the same syndicate 'shadow_riders'
    state.syndicates = {
      shadow_riders: {
        id: "shadow_riders",
        name: "Shadow Riders",
        members: ["player", "merchant_npc"],
        definedBy: "alice",
        timestamp: 1,
        dominance: 50,
      },
    };

    // Base trade price with no syndicate alliances
    let normalState = createInitialState({ seed: 42, start: "market" });
    const normalPriceBuy = calculateTradePrice(normalState, npc, item, 100, true, "player", mockPack);
    const normalPriceSell = calculateTradePrice(normalState, npc, item, 100, false, "player", mockPack);

    // Allied syndicate member trade price
    const alliedPriceBuy = calculateTradePrice(state, npc, item, 100, true, "player", mockPack);
    const alliedPriceSell = calculateTradePrice(state, npc, item, 100, false, "player", mockPack);

    // Buying should get a discount (20% lower than normal)
    expect(alliedPriceBuy).toBeLessThan(normalPriceBuy);
    expect(alliedPriceBuy).toBe(Math.round(normalPriceBuy * 0.8));

    // Selling should get a premium (20% higher than normal)
    expect(alliedPriceSell).toBeGreaterThan(normalPriceSell);
    expect(alliedPriceSell).toBe(Math.round(normalPriceSell * 1.2));
  });
});
