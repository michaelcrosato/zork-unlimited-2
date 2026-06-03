import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickEconomy } from "../src/core/economy.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { step } from "../src/core/engine.js";

describe("Crime Syndicate Black Ops Safehouses, Shadow Alliances & Infiltration Sweeps (AF-79)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "black_ops_test_pack",
      title: "Black Ops and Shadow Alliances Test Pack",
      start_room: "market",
      vars_init: { gold: 2000, hp: 20, max_hp: 20 },
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
        faction: "rangers",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "forest",
          },
        ],
      },
      {
        id: "forest",
        name: "Deep Forest",
        description: "A dark deep forest.",
        faction: "rangers",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "south",
            to: "market",
          },
        ],
      },
    ],
    objects: [],
    npcs: [],
  });

  (mockPack as any).start = "market";

  it("should successfully establish a black ops safehouse, deduct gold, and recruit guards and deflections automatically via tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 2000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // 1. Establish Black Ops Safehouse
    const action = {
      type: "ESTABLISH_BLACK_OPS_SAFEHOUSE" as const,
      safehouseId: "safehouse_alpha",
      roomId: "market",
      syndicateId: "synd_1",
      cost: 1000,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(1000);
    expect(result.state.blackOpsSafehouses?.["safehouse_alpha"]).toBeDefined();
    expect(result.state.blackOpsSafehouses?.["safehouse_alpha"].roomId).toBe("market");

    // 2. The safehouse already ticked once during multiAgentStep, so count is 1, and deflection policy is active
    expect(result.state.turfGuards?.["market"]).toBeDefined();
    expect(result.state.turfGuards?.["market"].count).toBe(1);
    expect(result.state.deflectionPolicies?.["market"]).toBeDefined();
    expect(result.state.deflectionPolicies?.["market"].active).toBe(true);

    // 3. Tick economy 4 more times to hit guard cap of 5
    let tickedState = result.state;
    for (let i = 0; i < 4; i++) {
      tickedState = tickEconomy(tickedState, mockPack);
    }
    expect(tickedState.turfGuards?.["market"].count).toBe(5);
  });

  it("should support shadow alliance voting consensus and strategic travel tax modifications", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "agent_b"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Shadow Cartel",
        members: ["player", "agent_b"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Place player and forest controlled by rangers
    state.territoryControl = {
      forest: "rangers",
    };
    state.factionRep = {
      rangers: -10, // low rep -> base travel tax = 10
    };

    // Set gold to 5 so we can't afford base tax of 10
    state.vars["gold"] = 5;

    // Check tax before shadow alliance (no shadow alliance relation exist)
    // Moving from market north to forest
    const moveAction = { type: "MOVE" as const, direction: "north" };
    const initialEngineResult = step(state, moveAction, mockPack, "player");
    expect(initialEngineResult.ok).toBe(false); // Rejected: cannot afford base tax of 10 (has 5)
    expect(initialEngineResult.rejectionReason).toContain("faction tax");

    // 1. Propose shadow alliance: player votes allied
    const actionVoteAllied = {
      type: "PROPOSE_SHADOW_ALLIANCE" as const,
      syndicateId: "synd_1",
      factionId: "rangers",
      targetState: "allied" as const,
      timestamp: 1000,
    };

    const res1 = multiAgentStep(state, { agentId: "player", action: actionVoteAllied }, mockPack);
    expect(res1.ok).toBe(true);
    expect(res1.state.shadowAlliances?.["synd_1"]?.["rangers"]).toBe("allied");

    // Allied shadow alliance waives travel tax! Player can travel now even with 5 gold
    const stepAlliedResult = step(res1.state, moveAction, mockPack, "player");
    expect(stepAlliedResult.ok).toBe(true);
    expect(stepAlliedResult.state.current).toBe("forest");
    expect(stepAlliedResult.state.vars["gold"]).toBe(5); // 0 tax deducted!

    // 2. Add an agent_b vote for hostile to test consensus and double-taxing
    const actionVoteHostile = {
      type: "PROPOSE_SHADOW_ALLIANCE" as const,
      syndicateId: "synd_1",
      factionId: "rangers",
      targetState: "hostile" as const,
      timestamp: 1010,
    };

    // Both votes exist: player (allied) vs agent_b (hostile).
    // Allied has priority in the tie-breaker ("allied" > "hostile" > "neutral"), so it's still allied
    let res2 = multiAgentStep(res1.state, { agentId: "agent_b", action: actionVoteHostile }, mockPack);
    expect(res2.ok).toBe(true);
    expect(res2.state.shadowAlliances?.["synd_1"]?.["rangers"]).toBe("allied");

    // Change player vote to hostile so it becomes hostile consensus
    const playerHostileVote = {
      type: "PROPOSE_SHADOW_ALLIANCE" as const,
      syndicateId: "synd_1",
      factionId: "rangers",
      targetState: "hostile" as const,
      timestamp: 1020,
    };
    let res3 = multiAgentStep(res2.state, { agentId: "player", action: playerHostileVote }, mockPack);
    expect(res3.ok).toBe(true);
    expect(res3.state.shadowAlliances?.["synd_1"]?.["rangers"]).toBe("hostile");

    // Hostile shadow alliance double-taxes! Base 10 becomes 20 tax.
    res3.state.vars["gold"] = 15; // Cannot afford 20
    const stepHostileReject = step(res3.state, moveAction, mockPack, "player");
    expect(stepHostileReject.ok).toBe(false);

    res3.state.vars["gold"] = 30; // Can afford 20
    const stepHostileAccept = step(res3.state, moveAction, mockPack, "player");
    expect(stepHostileAccept.ok).toBe(true);
    expect(stepHostileAccept.state.vars["gold"]).toBe(10); // 30 - 20 = 10
  });

  it("should successfully execute INFILTRATE_ENFORCER_SWEEP to locate and dismantle active undercover agents", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      synd_1: {
        id: "synd_1",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    // Register active undercover agents in the state
    state.undercoverAgents = {
      agent_x: {
        id: "agent_x",
        syndicateId: "synd_1",
        name: "Mole X",
        intelAccumulated: 10,
        status: "active" as const,
        timestamp: 1000,
      },
      agent_y: {
        id: "agent_y",
        syndicateId: "synd_2", // Different syndicate, shouldn't be affected
        name: "Mole Y",
        intelAccumulated: 5,
        status: "active" as const,
        timestamp: 1000,
      },
    };

    // Execute infiltration sweep
    const sweepAction = {
      type: "INFILTRATE_ENFORCER_SWEEP" as const,
      syndicateId: "synd_1",
      cost: 200,
      timestamp: 1050,
    };

    const res = multiAgentStep(state, { agentId: "player", action: sweepAction }, mockPack);
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(800); // 1000 - 200 = 800

    // Agent X should be dismantled/rooted_out
    expect(res.state.undercoverAgents?.["agent_x"].status).toBe("rooted_out");
    expect(res.state.undercoverAgents?.["agent_x"].timestamp).toBe(1050);

    // Agent Y (in other syndicate) remains active
    expect(res.state.undercoverAgents?.["agent_y"].status).toBe("active");
  });
});
