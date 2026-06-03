import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs, tickSmugglingConvoys } from "../src/core/engine.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { PureRand } from "../src/core/rng.js";

describe("Crime Syndicate Legendary Hitmen & Decoy Smuggling Convoys (AF-76)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "hitmen_decoys_test_pack",
      title: "Hitmen and Decoys Test Pack",
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
    objects: [],
    npcs: [],
  });

  (mockPack as any).start = "market";

  it("should successfully hire a legendary hitman and deduct gold", () => {
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
        dominance: 50,
      },
    };

    const action = {
      type: "HIRE_LEGENDARY_HITMAN" as const,
      hitmanId: "agent_47",
      syndicateId: "shadow_cartel",
      cost: 300,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(200);
    expect(result.state.legendaryHitmen?.["agent_47"]).toBeDefined();
    expect(result.state.legendaryHitmen?.["agent_47"].status).toBe("active");
    expect(result.state.legendaryHitmen?.["agent_47"].syndicateId).toBe("shadow_cartel");
  });

  it("should successfully launch a decoy convoy and deduct gold", () => {
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
        dominance: 50,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        factionId: "rangers",
        rooms: ["market", "border", "hideout"],
        taxShare: 10,
        definedBy: "player",
        timestamp: 1000,
      },
    };

    const action = {
      type: "LAUNCH_DECOY_CONVOY" as const,
      decoyId: "decoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cost: 150,
      timestamp: 1000,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);
    expect(result.state.vars["gold"]).toBe(350);
    expect(result.state.decoyConvoys?.["decoy_1"]).toBeDefined();
    expect(result.state.decoyConvoys?.["decoy_1"].status).toBe("en_route");
    expect(result.state.decoyConvoys?.["decoy_1"].currentRoomIndex).toBe(0);
  });

  it("should allow a legendary hitman to preemptively ambush active enforcer bounty hunters", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.legendaryHitmen = {
      agent_47: {
        id: "agent_47",
        name: "Hitman agent_47",
        syndicateId: "shadow_cartel",
        status: "active",
        timestamp: 1000,
      },
    };

    state.enforcers = {
      bounty_hunter_player: {
        id: "bounty_hunter_player",
        name: "Hunter player",
        currentRoom: "border",
        status: "pursuing",
        isBountyHunter: true,
        targetId: "player",
        timestamp: 1000,
      },
    };

    state.bounties = {
      player: {
        targetId: "player",
        amount: 250,
        active: true,
        timestamp: 1000,
      },
    };

    const nextState = tickEconomy(state, mockPack);

    // Bounty hunter should be defeated preemptively
    expect(nextState.enforcers?.["bounty_hunter_player"].status).toBe("defeated");
    // Bounty should be marked inactive
    expect(nextState.bounties?.["player"].active).toBe(false);
    expect(nextState.journal.some(j => j.includes("neutralized active bounty hunter Hunter player"))).toBe(true);
  });

  it("should allow legendary hitmen to place a counter-bounty on other active enforcer agents", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.legendaryHitmen = {
      agent_47: {
        id: "agent_47",
        name: "Hitman agent_47",
        syndicateId: "shadow_cartel",
        status: "active",
        timestamp: 1000,
      },
    };

    // An enforcer agency agent who is active but not a bounty hunter
    state.enforcers = {
      patrol_agent: {
        id: "patrol_agent",
        name: "Patrol Agent",
        currentRoom: "border",
        status: "idle",
        isBountyHunter: false,
        timestamp: 1000,
      },
    };

    const nextState = tickEconomy(state, mockPack);

    // Counter-bounty should be placed on this enforcer
    expect(nextState.bounties?.["patrol_agent"]).toBeDefined();
    expect(nextState.bounties?.["patrol_agent"].active).toBe(true);
    expect(nextState.bounties?.["patrol_agent"].amount).toBe(200);
    expect(nextState.journal.some(j => j.includes("placed a 200 gold counter-bounty"))).toBe(true);
  });

  it("should progress decoy convoys step-by-step and reduce heat in owned turf", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        rooms: ["market", "border"],
        factionId: "rangers",
        taxShare: 10,
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.decoyConvoys = {
      decoy_1: {
        id: "decoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        status: "en_route",
        timestamp: 1000,
      },
    };

    state.syndicateTurf = {
      market: "shadow_cartel",
      border: "shadow_cartel",
    };

    state.enforcementHeat = {
      market: { roomId: "market", heat: 30, timestamp: 1000 },
      border: { roomId: "border", heat: 50, timestamp: 1000 },
    };

    let nextState = tickSmugglingConvoys(state, [], mockPack);

    // Decoy convoy should progress to index 1 (border)
    expect(nextState.decoyConvoys?.["decoy_1"].currentRoomIndex).toBe(1);
    expect(nextState.decoyConvoys?.["decoy_1"].status).toBe("en_route");

    // Heat in owned rooms should be reduced by 10
    expect(nextState.enforcementHeat?.["market"].heat).toBe(20);
    expect(nextState.enforcementHeat?.["border"].heat).toBe(40);

    // Now progress to index 2 (completed)
    nextState = tickSmugglingConvoys(nextState, [], mockPack);
    expect(nextState.decoyConvoys?.["decoy_1"].currentRoomIndex).toBe(1);
    expect(nextState.decoyConvoys?.["decoy_1"].status).toBe("completed");
  });

  it("should divert enforcer sweeps on highly active front businesses using active decoy convoys", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.step = 5;

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.frontBusinesses = {
      front_1: {
        id: "front_1",
        merchantId: "merchant_timmy",
        syndicateId: "shadow_cartel",
        roomId: "market",
        level: 1,
        dirtyGold: 200,
        cleanGold: 200, // cleanGold >= 150 triggers sweep if heat >= 25
        launderingCapacity: 500,
        launderingRate: 50,
        activeAudit: false,
        timestamp: 1000,
      },
    };

    state.enforcementHeat = {
      market: { roomId: "market", heat: 30, timestamp: 1000 },
    };

    state.decoyConvoys = {
      decoy_1: {
        id: "decoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        status: "en_route",
        timestamp: 1000,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        rooms: ["market", "border"],
        factionId: "rangers",
        taxShare: 10,
        definedBy: "player",
        timestamp: 1000,
      },
    };

    const nextState = tickEconomy(state, mockPack);

    // Decoy convoy should be diverted
    expect(nextState.decoyConvoys?.["decoy_1"].status).toBe("diverted");
    // Front business sweep should be defended/diverted (no dirty/clean gold should be confiscated)
    const nextFront = nextState.frontBusinesses?.["front_1"];
    expect(nextFront?.cleanGold).toBe(250);
    expect(nextFront?.dirtyGold).toBe(150);
    expect(nextState.journal.some(j => j.includes("successfully diverted by decoy convoy decoy_1"))).toBe(true);
  });

  it("should divert enforcer raids on labs using active decoy convoys", () => {
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
        dominance: 50,
      },
    };

    state.productionLabs = {
      market: {
        id: "lab_1",
        roomId: "market",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 100,
        storedContraband: 10,
        cooldownSteps: 1,
        lastProducedStep: -5,
        defense: 0,
        timestamp: 1000,
      },
    };

    state.decoyConvoys = {
      decoy_1: {
        id: "decoy_1",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 0,
        status: "en_route",
        timestamp: 1000,
      },
    };

    state.tradeRoutes = {
      route_1: {
        id: "route_1",
        rooms: ["market", "border"],
        factionId: "rangers",
        taxShare: 10,
        definedBy: "player",
        timestamp: 1000,
      },
    };

    // Programmatically find a seed where raidRoll <= 20
    let targetSeed = 1;
    for (let s = 1; s < 1000; s++) {
      const { value } = PureRand.nextInt(s, 1, 100);
      if (value <= 20) {
        targetSeed = s;
        break;
      }
    }
    state.seed = targetSeed;

    const nextState = tickProductionLabs(state, [], mockPack);

    // If decoy was en_route, it should be marked diverted and raid bypassed
    expect(nextState.decoyConvoys?.["decoy_1"].status).toBe("diverted");
    expect(nextState.productionLabs?.["market"].storedContraband).toBeGreaterThanOrEqual(10);
  });

  it("should divert sweeps and raids by paying turf bribe cost from syndicate war chest", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    state.step = 5;

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 50,
        warChest: 500,
        turfBribeCost: 100, // consensus bribe cost
      },
    };

    state.frontBusinesses = {
      front_1: {
        id: "front_1",
        merchantId: "merchant_timmy",
        syndicateId: "shadow_cartel",
        roomId: "market",
        level: 1,
        dirtyGold: 200,
        cleanGold: 200,
        launderingCapacity: 500,
        launderingRate: 50,
        activeAudit: false,
        timestamp: 1000,
      },
    };

    state.enforcementHeat = {
      market: { roomId: "market", heat: 30, timestamp: 1000 },
    };

    const nextState = tickEconomy(state, mockPack);

    // Bribe should be paid, war chest reduced by 100
    expect(nextState.syndicates?.["shadow_cartel"].warChest).toBe(400);
    expect(nextState.journal.some(j => j.includes("successfully diverted by paying a turf bribe of 100 gold"))).toBe(true);
  });

  it("should reconcile legendaryHitmen and decoyConvoys across gossip nodes", () => {
    const nodeA = new GossipNode("nodeA", mockPack);
    const nodeB = new GossipNode("nodeB", mockPack);

    nodeA.connect(nodeB);

    // NodeA creates the syndicate first so it replicates and replays successfully
    const createRes = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["player", "nodeA", "nodeB"],
      timestamp: 500,
    });
    expect(createRes.ok).toBe(true);

    // NodeA hires agent_47 at step 1
    nodeA.localState.vars["gold_nodeA"] = 500;
    const hireRes = nodeA.executeLocalAction({
      type: "HIRE_LEGENDARY_HITMAN",
      hitmanId: "agent_47",
      syndicateId: "shadow_cartel",
      cost: 300,
      timestamp: 1000,
    });
    expect(hireRes.ok).toBe(true);

    // Gossip
    nodeA.gossip();

    expect(nodeB.localState.legendaryHitmen?.["agent_47"]).toBeDefined();
    expect(nodeB.localState.legendaryHitmen?.["agent_47"].status).toBe("active");
  });
});
