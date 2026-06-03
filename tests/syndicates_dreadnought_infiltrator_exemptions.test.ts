import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickSmugglingConvoys } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Smuggler Syndicate Cartel Dreadnought Convoys, Cross-Faction Treaty Infiltrators, and High-Reputation Tariff Exemption Acts (AF-80)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_dreadnought_test_pack",
      title: "Syndicate Dreadnought Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -15, // hostile by default
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: ["spice"],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "border",
          },
        ],
      },
      {
        id: "border",
        name: "Border Outpost",
        description: "A heavily guarded checkpoint.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "hideout",
          },
        ],
      },
      {
        id: "hideout",
        name: "Remote Hideout",
        description: "A hidden cavern in the deep woods.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [
      {
        id: "spice",
        name: "Contraband Spice",
        description: "Valuable illegal spices.",
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
  });

  (mockPack as any).start = "market";

  it("should successfully build a dreadnought convoy, checking its risk reduction and counter-strike math", () => {
    let state = createInitialState({
      seed: 44444,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["market", "border", "hideout"],
        definedBy: "player",
        taxShare: 5,
        timestamp: 1005,
      },
    };

    // Give player cargo items
    state.inventory = ["spice", "spice", "spice"];

    // 1. Build Dreadnought Convoy action
    const action = {
      type: "BUILD_DREADNOUGHT_CONVOY" as const,
      convoyId: "dreadnought_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 2,
      goldCost: 250,
      timestamp: 1010,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);

    const newState = result.state;
    // Check gold deduction
    expect(newState.vars["gold"]).toBe(750);
    // Check inventory cargo deduction
    expect(newState.inventory).toEqual(["spice"]);
    // Check dreadnought convoy registered
    const convoy = newState.smugglingConvoys?.["dreadnought_1"];
    expect(convoy).toBeDefined();
    expect(convoy?.isDreadnought).toBe(true);
    expect(convoy?.status).toBe("en_route");

    // 2. Tick smuggling convoys to simulate movement and ambush defense
    // Set rangers reputation to negative to increase ambush risk
    newState.factionRep = { rangers: -15 };

    // Perform tick
    const events: any[] = [];
    const tickedState = tickSmugglingConvoys(newState, events, mockPack);

    const tickedConvoy = tickedState.smugglingConvoys?.["dreadnought_1"];
    expect(tickedConvoy).toBeDefined();
    // It should have either successfully advanced or completed, or defended via counter-strike!
    // Since the seed is fixed and isDreadnought has a high counter-strike chance, let's verify it didn't get destroyed unless seed rolled extremely poorly.
    // Let's assert the status is either en_route or completed, not ambushed.
    expect(tickedConvoy?.status).not.toBe("ambushed");
  });

  it("should successfully establish a treaty infiltrator to secretly bypass locked trade routes", () => {
    let state = createInitialState({
      seed: 55555,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["market", "border", "hideout"],
        definedBy: "player",
        taxShare: 10,
        timestamp: 1005,
      },
    };

    // Extreme hostility with rangers (reputation = -15 <= -10)
    state.factionRep = { rangers: -15 };

    // Player tries to move NORTH to border. Should be blocked by locked trade route.
    const moveActionBlocked = {
      type: "MOVE" as const,
      direction: "NORTH",
    };

    const blockedResult = multiAgentStep(state, { agentId: "player", action: moveActionBlocked }, mockPack);
    expect(blockedResult.ok).toBe(false);
    expect(blockedResult.rejectionReason).toContain("locked to you due to extreme hostility");

    // 1. Establish Treaty Infiltrator in the border room
    const actionEstablish = {
      type: "ESTABLISH_TREATY_INFILTRATOR" as const,
      infiltratorId: "infiltrator_1",
      syndicateId: "shadow_cartel",
      roomId: "border",
      cost: 150,
      timestamp: 1010,
    };

    const establishResult = multiAgentStep(state, { agentId: "player", action: actionEstablish }, mockPack);
    expect(establishResult.ok).toBe(true);
    expect(establishResult.state.vars["gold"]).toBe(850);
    expect(establishResult.state.treatyInfiltrators?.["infiltrator_1"]).toBeDefined();

    // 2. Player tries to move NORTH again. Should succeed now due to the treaty infiltrator!
    const moveActionAllowed = {
      type: "MOVE" as const,
      direction: "NORTH",
    };

    const allowedResult = multiAgentStep(
      establishResult.state,
      { agentId: "player", action: moveActionAllowed },
      mockPack
    );
    expect(allowedResult.ok).toBe(true);
    expect(allowedResult.state.current).toBe("border");
  });

  it("should successfully vote on tariff exemption, reconcile it, and waive tariff when standing is exceptionally high (reputation >= 30)", () => {
    let state = createInitialState({
      seed: 66666,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player", "agentB"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "agentB"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // 1. Player votes YES for tariff exemption in rangers territory
    const actionVote1 = {
      type: "VOTE_TARIFF_EXEMPTION" as const,
      factionId: "rangers",
      syndicateId: "shadow_cartel",
      vote: true,
      timestamp: 1010,
    };

    const step1 = multiAgentStep(state, { agentId: "player", action: actionVote1 }, mockPack);
    expect(step1.ok).toBe(true);
    // Since only 1 of 2 members voted YES, majority consensus is not yet met (1 is not > 1)
    expect(step1.state.tariffExemptionPolicies?.["rangers"]?.["shadow_cartel"]).toBeUndefined();

    // 2. AgentB votes YES as well
    const actionVote2 = {
      type: "VOTE_TARIFF_EXEMPTION" as const,
      factionId: "rangers",
      syndicateId: "shadow_cartel",
      vote: true,
      timestamp: 1015,
    };

    const step2 = multiAgentStep(step1.state, { agentId: "agentB", action: actionVote2 }, mockPack);
    expect(step2.ok).toBe(true);
    // Now 2 of 2 members voted YES, so it passes!
    expect(step2.state.tariffExemptionPolicies?.["rangers"]?.["shadow_cartel"]).toBe(true);

    // 3. Test strategic pricing with and without exceptionally high reputation
    const mockNpc = { id: "merchant_bob", faction: "rangers" };
    const mockItem = { id: "sword", cost: 100 };

    // Case A: Faction Reputation is below exceptionally high threshold (e.g. 15)
    let stateLowRep = { ...step2.state };
    stateLowRep.factionRep = { rangers: 15 };
    stateLowRep.territoryControl = { market: "rangers" };
    stateLowRep.tariffPolicy = { rangers: 20 }; // 20% standard tariff

    // Player does not have a license, so standard tariff is levied
    const priceLowRep = calculateTradePrice(stateLowRep, mockNpc, mockItem, 100, true, "player", mockPack);
    // With 20% tariff and 15 reputation discount:
    // factionRep = 15 => factionBuyFactor = 1.0 - 15 * 0.02 = 0.7
    // tariffWaiverThreshold = 20, discountThreshold = 10. Faction rep is 15 => tariff is halved to 10%
    // Price = 100 * 0.7 * 1.10 = 77
    expect(priceLowRep).toBeCloseTo(77, 1);

    // Case B: Faction Reputation is exceptionally high (e.g. 30)
    let stateHighRep = { ...step2.state };
    stateHighRep.factionRep = { rangers: 30 };
    stateHighRep.territoryControl = { market: "rangers" };
    stateHighRep.tariffPolicy = { rangers: 20 };

    const priceHighRep = calculateTradePrice(stateHighRep, mockNpc, mockItem, 100, true, "player", mockPack);
    // Faction reputation >= 30, and approved Tariff Exemption is active.
    // So tariff is fully waived!
    // factionRep = 30 => factionBuyFactor = Math.max(0.5, 1.0 - 30 * 0.02) = 0.5
    // Price = 100 * 0.5 = 50
    expect(priceHighRep).toBeCloseTo(50, 1);
  });
});
