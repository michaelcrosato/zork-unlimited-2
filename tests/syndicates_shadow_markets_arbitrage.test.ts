import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Crime Syndicate Shadow Markets, Arbitrage & Underwriter Sabotage (AF-78)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "shadow_markets_test_pack",
      title: "Shadow Markets and Arbitrage Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: 10,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: [],
        npcs: [],
        exits: [],
      },
      {
        id: "forest",
        name: "Deep Forest",
        description: "A dark deep forest.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [
      {
        id: "contraband_spice",
        name: "Contraband Spice",
        description: "Highly illegal spice.",
        contraband: true,
      }
    ],
    npcs: [],
  });

  (mockPack as any).start = "market";

  it("should successfully establish a shadow market, deduct gold, and generate premium spread profit inside tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Black Sun",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Establish Shadow Market action
    const action = {
      type: "ESTABLISH_SHADOW_MARKET" as const,
      shadowMarketId: "market_alpha",
      roomId: "market",
      syndicateId: "synd_1",
      cost: 500,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(500);
    expect(result.state.shadowMarkets?.["market_alpha"]).toBeDefined();
    expect(result.state.shadowMarkets?.["market_alpha"].roomId).toBe("market");

    // 2. Tick economy to generate passive premium spread profit: 40 gold distributed to members
    const tickedState = tickEconomy(result.state, mockPack);
    expect(tickedState.vars["gold"]).toBe(540);
  });

  it("should successfully launch an arbitrage contract, deduct gold, progress duration, and distribute passive and completion payouts", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Black Sun",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Launch Arbitrage Contract action
    const action = {
      type: "LAUNCH_ARBITRAGE_CONTRACT" as const,
      contractId: "arbitrage_alpha",
      syndicateId: "synd_1",
      startRoomId: "market",
      endRoomId: "forest",
      profitSpread: 2.0,
      cost: 300,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(700);
    expect(result.state.arbitrageContracts?.["arbitrage_alpha"]).toBeDefined();
    expect(result.state.arbitrageContracts?.["arbitrage_alpha"].status).toBe("active");
    expect(result.state.arbitrageContracts?.["arbitrage_alpha"].progress).toBe(0);

    // 2. Tick economy once: progresses to progress 1, distributes Math.round(30 * 2.0) = 60 gold payout
    let tickedState = tickEconomy(result.state, mockPack);
    expect(tickedState.arbitrageContracts?.["arbitrage_alpha"].progress).toBe(1);
    expect(tickedState.vars["gold"]).toBe(760);

    // Tick economy twice more (duration is 3 ticks total)
    tickedState = tickEconomy(tickedState, mockPack); // Progress 2: +60 gold -> 820
    expect(tickedState.vars["gold"]).toBe(820);

    tickedState = tickEconomy(tickedState, mockPack); // Progress 3: completed, completion bonus Math.round(150 * 2.0) = 300 gold
    expect(tickedState.arbitrageContracts?.["arbitrage_alpha"].status).toBe("completed");
    expect(tickedState.vars["gold"]).toBe(1120);
  });

  it("should successfully execute underwriter sabotage, deduct gold, and dynamically disable active sweeps/audits defense policies", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Black Sun",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
      synd_rival: {
        id: "synd_rival",
        name: "Rival Cartel",
        members: ["npc_rival"],
        definedBy: "npc_rival",
        timestamp: 1000,
        dominance: 30,
      }
    };

    // Set up active defense policies in room 'market' belonging to synd_rival
    state.syndicateBribes = {
      market: {
        roomId: "market",
        syndicateId: "synd_rival",
        amount: 200,
        timestamp: 1000,
        active: true,
      }
    };

    state.deflectionPolicies = {
      market: {
        roomId: "market",
        syndicateId: "synd_rival",
        cost: 300,
        timestamp: 1000,
        active: true,
      }
    };

    state.smugglingInsurance = {
      market: {
        id: "ins_market",
        roomId: "market",
        syndicateId: "synd_rival",
        active: true,
        timestamp: 1000,
      } as any
    };

    // 1. Sabotage Underwriter action
    const action = {
      type: "SABOTAGE_UNDERWRITER" as const,
      roomId: "market",
      targetSyndicateId: "synd_rival",
      cost: 300,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(700);

    // Verify enforcer defense policies are now disabled
    expect(result.state.syndicateBribes?.["market"]?.active).toBe(false);
    expect(result.state.deflectionPolicies?.["market"]?.active).toBe(false);
    expect(result.state.smugglingInsurance?.["market"]?.active).toBe(false);
    expect(result.state.underwriterSabotages?.["sabotage_market_synd_rival"]?.active).toBe(true);
  });
});
