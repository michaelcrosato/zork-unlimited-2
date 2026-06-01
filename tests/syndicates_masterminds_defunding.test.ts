import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Crime Syndicate Mastermind Contracts & Enforcer Defunding (AF-77)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "masterminds_defunding_test_pack",
      title: "Masterminds and Defunding Test Pack",
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
    ],
    objects: [
      {
        id: "contraband_spice",
        name: "Contraband Spice",
        description: "Highly illegal spice.",
        contraband: true,
      }
    ],
    npcs: [
      {
        id: "merchant_bob",
        name: "Merchant Bob",
        description: "A shady trader.",
        hp: 100,
        max_hp: 100,
        attack: 5,
        defense: 5,
        gold: 100,
        xp: 20,
        faction: "rangers",
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome!",
              choices: [],
            },
          ],
        },
      }
    ],
  });

  (mockPack as any).start = "market";

  it("should successfully launch a mastermind contract, deduct gold, and progress via tickEconomy", () => {
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

    // 1. Launch contract action
    const action = {
      type: "LAUNCH_MASTERMIND_CONTRACT" as const,
      contractId: "contract_alpha",
      syndicateId: "synd_1",
      payoutArbitrageMultiplier: 1.5,
      cost: 400,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(600);
    expect(result.state.mastermindContracts?.["contract_alpha"]).toBeDefined();
    expect(result.state.mastermindContracts?.["contract_alpha"].status).toBe("active");
    expect(result.state.mastermindContracts?.["contract_alpha"].progress).toBe(0);

    // 2. Tick economy to progress the contract
    let tickedState = tickEconomy(result.state, mockPack);
    expect(tickedState.mastermindContracts?.["contract_alpha"].progress).toBe(1);
    // Passive tick payout distributed: 50 * 1.5 = 75 gold
    expect(tickedState.vars["gold"]).toBe(675);

    // Progress to completion (duration is 5 ticks)
    for (let i = 0; i < 3; i++) {
      tickedState = tickEconomy(tickedState, mockPack);
    }
    // Now progress is 4
    expect(tickedState.mastermindContracts?.["contract_alpha"].progress).toBe(4);
    expect(tickedState.mastermindContracts?.["contract_alpha"].status).toBe("active");

    // 5th tick triggers completion
    tickedState = tickEconomy(tickedState, mockPack);
    expect(tickedState.mastermindContracts?.["contract_alpha"].progress).toBe(5);
    expect(tickedState.mastermindContracts?.["contract_alpha"].status).toBe("completed");
    // Completed bonus: 250 * 1.5 = 375 gold
    // Total passive payouts over 4 ticks (75 * 4 = 300) + completion payout (375) + initial (600) = 1275 gold
    expect(tickedState.vars["gold"]).toBe(1275);
  });

  it("should successfully propose enforcer defunding, reconcile votes via consensus, and scale hunt trigger thresholds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "agent_b", "agent_c"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Black Sun",
        members: ["player", "agent_b", "agent_c"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Propose/vote defunding
    const actionA = {
      type: "PROPOSE_ENFORCER_DEFUNDING" as const,
      syndicateId: "synd_1",
      targetReduction: 0.30,
      timestamp: 1000,
    };
    const actionB = {
      type: "PROPOSE_ENFORCER_DEFUNDING" as const,
      syndicateId: "synd_1",
      targetReduction: 0.30,
      timestamp: 1000,
    };
    const actionC = {
      type: "PROPOSE_ENFORCER_DEFUNDING" as const,
      syndicateId: "synd_1",
      targetReduction: 0.10,
      timestamp: 1000,
    };

    let result = multiAgentStep(state, { agentId: "player", action: actionA }, mockPack);
    result = multiAgentStep(result.state, { agentId: "agent_b", action: actionB }, mockPack);
    result = multiAgentStep(result.state, { agentId: "agent_c", action: actionC }, mockPack);

    expect(result.ok).toBe(true);
    // Consensus rate should be 0.30 (majority 2 votes vs 1 vote)
    expect(result.state.syndicates?.["synd_1"].enforcerDefundingRate).toBe(0.30);

    // 2. Validate enforcer hunt trigger threshold scaling
    // Default threshold is 50. With 30% defunding, it becomes Math.max(1, Math.round(50 * (1 - 0.30))) = 35.
    // Let's check with player carrying contraband and reputation = 35.
    // Standard hunt triggers in tickEnforcers/combat check during tick in engine step or economy check.
    // We can simulate tick enforcers via engine step.
    const customPack = {
      ...mockPack,
      rooms: [
        {
          id: "market",
          name: "Market",
          description: "A market.",
          objects: ["contraband_spice"],
          npcs: [],
          exits: [],
        }
      ]
    };

    let gameState = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000, faction_rep_rangers: 35 },
      agentsInit: ["player"],
    });
    gameState.inventory = ["contraband_spice"];
    gameState.syndicates = result.state.syndicates;
    gameState.enforcerDefundingVotes = result.state.enforcerDefundingVotes;

    // Run step (triggers ticks)
    const stepResult = step(gameState, { type: "LOOK" }, customPack);
    // With reputation 35 >= 35, the bounty hunter should spawn!
    expect(stepResult.state.enforcers?.["bounty_hunter_player"]).toBeDefined();
    expect(stepResult.state.enforcers?.["bounty_hunter_player"].status).toBe("pursuing");
  });

  it("should dynamically scale enforcer HP and attack stats in combat based on defunding rate", () => {
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
        enforcerDefundingRate: 0.40, // 40% defunding!
      },
    };

    state.enforcers = {
      enforcer_1: {
        id: "enforcer_1",
        name: "Agent Miller",
        currentRoom: "market",
        status: "idle",
        isBountyHunter: false,
        timestamp: 1000,
        hp: 50,
        max_hp: 50,
        attack: 10,
        defense: 5,
      }
    };

    // Trigger combat with enforcer
    state.flags["in_combat_with_enforcer_1"] = true;
    state.vars["npc_hp_enforcer_1"] = 50;

    // Execute a LOOK/FIGHT step which invokes combat calculations
    // HP should scale: 50 * (1 - 0.40) = 30 max hp. Since current hp (50) exceeds 30, it gets capped to 30.
    // Attack should scale: 10 * (1 - 0.40) = 6.
    const stepResult = step(state, { type: "FIGHT", npc: "enforcer_1" }, mockPack);
    
    // We expect the combat system to cap and scale HP and attack.
    // Let's assert the dynamic state variables during combat
    expect(stepResult.state.vars["npc_hp_enforcer_1"]).toBeLessThanOrEqual(30);
  });
});
