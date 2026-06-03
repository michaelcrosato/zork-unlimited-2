import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs, tickSmugglingConvoys } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Crime Syndicate Black Market Cargo Fleets & Contraband Smuggling Convoy Networks (AF-58)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_convoys_test_pack",
      title: "Syndicate Convoys Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, gold_nodeA: 1000, gold_nodeB: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    factions: [
      {
        id: "rangers",
        name: "Forest Rangers",
        description: "Guardians of the forest.",
        initial_rep: -5,
      },
    ],
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling village market.",
        objects: ["spice", "relic"],
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
        exits: [
          {
            direction: "SOUTH",
            to: "border",
          },
        ],
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
      {
        id: "relic",
        name: "Contraband Relic",
        description: "Illegal ancient relic.",
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
  });

  // Inject start property to bypass Zod stripping and allow GossipNode to resolve the start room correctly
  (mockPack as any).start = "market";

  it("should successfully organize a smuggling convoy costing gold and cargo", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
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

    // Define a trade route
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

    // Give player some spice contraband items
    state.inventory = ["spice", "spice", "spice", "potion"];

    // Organize convoy
    const action = {
      type: "ORGANIZE_CONVOY" as const,
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 2,
      goldCost: 150,
      timestamp: 1010,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);

    const newState = result.state;
    // Check gold deduction
    expect(newState.vars["gold"]).toBe(350);
    // Check cargo (spice) deduction from player inventory (should leave 1 spice and 1 potion)
    expect(newState.inventory).toEqual(["spice", "potion"]);
    // Check convoy addition to state
    const convoy = newState.smugglingConvoys?.["convoy_1"];
    expect(convoy).toBeDefined();
    expect(convoy?.status).toBe("en_route");
    expect(convoy?.cargo).toBe(2);
    expect(convoy?.currentRoomIndex).toBe(0);
  });

  it("should validate and reject if resources are insufficient", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 50 }, // Insufficient gold (cost is 100)
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

    state.inventory = ["spice", "relic"];

    // Test insufficient gold
    const actionInsGold = {
      type: "ORGANIZE_CONVOY" as const,
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 1,
      goldCost: 100,
      timestamp: 1010,
    };

    const res1 = multiAgentStep(state, { agentId: "player", action: actionInsGold }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("Insufficient gold");

    // Test insufficient cargo
    state.vars["gold"] = 500; // Give enough gold
    state.inventory = []; // No cargo spice!

    const actionInsCargo = {
      type: "ORGANIZE_CONVOY" as const,
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 2,
      goldCost: 100,
      timestamp: 1010,
    };

    const res2 = multiAgentStep(state, { agentId: "player", action: actionInsCargo }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("Insufficient cargo resources");
  });

  it("should advance convoy along the route rooms and distribute payouts upon completion", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100 },
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

    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        cargo: 2,
        goldCost: 100,
        status: "en_route",
        definedBy: "player",
        timestamp: 1010,
      },
    };

    // First tick: Move from index 0 ("market") to index 1 ("border")
    const events1: any[] = [];
    let stateAfterTick1 = tickSmugglingConvoys(state, events1, mockPack);
    expect(stateAfterTick1.smugglingConvoys?.["convoy_1"]?.currentRoomIndex).toBe(1);
    expect(stateAfterTick1.smugglingConvoys?.["convoy_1"]?.status).toBe("en_route");

    // Second tick: Move to index 2 ("hideout")
    const events2: any[] = [];
    let stateAfterTick2 = tickSmugglingConvoys(stateAfterTick1, events2, mockPack);
    expect(stateAfterTick2.smugglingConvoys?.["convoy_1"]?.currentRoomIndex).toBe(2);
    expect(stateAfterTick2.smugglingConvoys?.["convoy_1"]?.status).toBe("en_route");

    // Third tick: Reaches end of route! Completes and triggers payout.
    // Base value is 150 gold per cargo, plus dominance bonus (1.5 * dominance = 0)
    // Total payout = 2 * 150 = 300 gold, fully distributed to player
    const events3: any[] = [];
    let stateAfterTick3 = tickSmugglingConvoys(stateAfterTick2, events3, mockPack);
    expect(stateAfterTick3.smugglingConvoys?.["convoy_1"]?.status).toBe("completed");
    expect(stateAfterTick3.vars["gold"]).toBe(400); // 100 + 300 payout
    expect(stateAfterTick3.vars["totalConvoyPayouts"]).toBe(300);
  });

  it("should calculate faction tolls, scale by alliance, and apply active black market premiums", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 20, // 20 dominance adds 30 gold bonus (20 * 1.5)
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

    // Faction rangers controls "border" room
    state.territoryControl = {
      border: "rangers",
    };
    state.factionRep = {
      rangers: -5, // Poor reputation, base travel tax is 20
    };

    // Player does not have merchant license with rangers, so unlicensed tariff +15 is applied.
    // Total tax per cargo unit: 20 (rep) + 15 (unlicensed) = 35 gold.
    // For 2 cargo: total toll = 70 gold!

    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        cargo: 2,
        goldCost: 100,
        status: "en_route",
        definedBy: "player",
        timestamp: 1010,
      },
    };

    // Enter border room - pays faction toll
    const events1: any[] = [];
    let stateAfterTick1 = tickSmugglingConvoys(state, events1, mockPack);
    expect(stateAfterTick1.vars["gold"]).toBe(30); // 100 gold - 70 toll

    // Let's add a black market at destination "hideout"
    stateAfterTick1.blackMarkets = {
      hideout: {
        id: "bm_hideout",
        roomId: "hideout",
        syndicateId: "shadow_cartel",
        inventory: [],
        timestamp: 1020,
      },
    };

    // Move to hideout
    let stateAfterTick2 = tickSmugglingConvoys(stateAfterTick1, [], mockPack);
    // Completes route.
    // Since there's an active black market, the base value is 200 gold per cargo.
    // Plus dominance bonus: 20 * 1.5 = 30 gold.
    // Total payout: 2 * 200 + 30 = 430 gold!
    let stateAfterTick3 = tickSmugglingConvoys(stateAfterTick2, [], mockPack);
    expect(stateAfterTick3.smugglingConvoys?.["convoy_1"]?.status).toBe("completed");
    expect(stateAfterTick3.vars["gold"]).toBe(460); // 30 gold + 430 payout
  });

  it("should calculate ambush risks, support ambush destruction and mitigation via tactical turrets", () => {
    // Setup state
    let state = createInitialState({
      seed: 555, // Seed that will trigger ambush roll
      start: "market",
      varsInit: { gold: 100 },
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

    // Let's set enforcer heat high in border room to guarantee/maximize ambush
    state.enforcementHeat = {
      border: {
        roomId: "border",
        heat: 30, // Adds 60% to ambush risk
        timestamp: 1000,
      },
    };

    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        cargo: 2,
        goldCost: 100,
        status: "en_route",
        definedBy: "player",
        timestamp: 1010,
      },
    };

    // Let's tick and see if convoy gets ambushed (high chance due to high heat)
    const events1: any[] = [];
    let stateAfterTick1 = tickSmugglingConvoys(state, events1, mockPack);
    expect(stateAfterTick1.smugglingConvoys?.["convoy_1"]?.status).toBe("ambushed");
    const ambushEvent = events1.find((e) => e.type === "smuggling_convoy_ambushed");
    expect(ambushEvent).toBeDefined();

    // Reset and establish turf guard outposts with tactical turrets
    state.smugglingConvoys = {
      convoy_1: {
        id: "convoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        cargo: 2,
        goldCost: 100,
        status: "en_route",
        definedBy: "player",
        timestamp: 1010,
      },
    };

    state.turfGuardOutposts = {
      border: {
        roomId: "border",
        syndicateId: "shadow_cartel",
        securityLevel: 1,
        timestamp: 1015,
        turrets: {
          turret_1: {
            id: "turret_1",
            type: "tactical_defense",
            firepower: 50,
            armor: 10,
            premiumRate: 0.2,
            timestamp: 1016,
          },
        },
      },
    };

    // Tick again - should deflect ambush successfully due to turrets!
    const events2: any[] = [];
    let stateAfterTick2 = tickSmugglingConvoys(state, events2, mockPack);
    expect(stateAfterTick2.smugglingConvoys?.["convoy_1"]?.status).toBe("en_route");
    expect(stateAfterTick2.smugglingConvoys?.["convoy_1"]?.currentRoomIndex).toBe(1);
    const deflectionJournal = stateAfterTick2.journal.some((j) =>
      j.includes("tactical turrets struck down the ambushers")
    );
    expect(deflectionJournal).toBe(true);
  });

  it("should synchronize convoy states across GossipNodes and converge perfectly", () => {
    const nodeA = new GossipNode("nodeA", mockPack, 1111);
    const nodeB = new GossipNode("nodeB", mockPack, 2222);

    nodeA.connect(nodeB);

    // Node A creates syndicate
    const createSynRes = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["nodeA", "nodeB"],
      timestamp: 1000,
    } as any);
    expect(createSynRes.ok).toBe(true);

    // Node A defines trade route
    const createRouteRes = nodeA.executeLocalAction({
      type: "DEFINE_TRADE_ROUTE",
      routeId: "route_1",
      factionId: "rangers",
      rooms: ["market", "border", "hideout"],
      taxShare: 10,
      timestamp: 1005,
    } as any);
    expect(createRouteRes.ok).toBe(true);

    // Node A populates gold
    nodeA.localState.vars["gold_nodeA"] = 500;

    // Node A picks up spice contraband from the room (through standard transactions!)
    const takeSpice = nodeA.executeLocalAction({
      type: "TAKE",
      item: "spice",
    });
    expect(takeSpice.ok).toBe(true);

    const takeRelic = nodeA.executeLocalAction({
      type: "TAKE",
      item: "relic",
    });
    expect(takeRelic.ok).toBe(true);

    // Node A organizes convoy
    const organizeRes = nodeA.executeLocalAction({
      type: "ORGANIZE_CONVOY",
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 2,
      goldCost: 100,
      timestamp: 1010,
    } as any);
    expect(organizeRes.ok).toBe(true);

    // Node B does not know about the convoy yet
    expect(nodeB.localState.smugglingConvoys?.["convoy_1"]).toBeUndefined();

    // Gossip Node A to Node B
    nodeA.gossip();

    // Node B should now perfectly replicate convoy_1 state!
    const convoyOnB = nodeB.localState.smugglingConvoys?.["convoy_1"];
    expect(convoyOnB).toBeDefined();
    expect(convoyOnB?.status).toBe("en_route");
    expect(convoyOnB?.cargo).toBe(2);
  });
});
