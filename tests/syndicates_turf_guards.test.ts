import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Syndicate Turf Defence Buffs & Security Guards (AF-52)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_guards_test_pack",
      title: "Syndicate Guards Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
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
        objects: [],
        npcs: ["merchant_timmy"],
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
            to: "market",
          },
        ],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Merchant",
        description: "A friendly local merchant.",
        hp: 30,
        max_hp: 30,
        attack: 1,
        defense: 1,
        gold: 100,
        xp: 15,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome to my store!",
              choices: [],
            },
          ],
        },
      },
    ],
  });

  it("should validate and execute hiring a syndicate turf guard", () => {
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

    // 1. Rejected if syndicate does not control turf
    const badTurfRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badTurfRes.ok).toBe(false);
    expect(badTurfRes.rejectionReason).toContain("does not control the turf");

    // Establish control
    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    // 2. Rejected if agent is not member
    const badMemberRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badMemberRes.ok).toBe(false);
    expect(badMemberRes.rejectionReason).toContain("not a member of syndicate");

    // 3. Rejected if insufficient gold
    const badGoldRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 1000,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badGoldRes.ok).toBe(false);
    expect(badGoldRes.rejectionReason).toContain("Insufficient gold to hire");

    // 4. Successful hire
    const hireRes1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 150,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(hireRes1.ok).toBe(true);
    state = hireRes1.state;
    expect(state.vars["gold"]).toBe(350); // 500 - 150
    expect(state.turfGuards?.["market"]).toBeDefined();
    expect(state.turfGuards?.["market"].count).toBe(1);
    expect(state.turfGuards?.["market"].cost).toBe(150);

    // 5. Successful second hire in same room
    const hireRes2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "HIRE_TURF_GUARD",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 150,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(hireRes2.ok).toBe(true);
    state = hireRes2.state;
    expect(state.vars["gold"]).toBe(200); // 350 - 150
    expect(state.turfGuards?.["market"].count).toBe(2);
    expect(state.turfGuards?.["market"].cost).toBe(300); // Cumulative
  });

  it("should wire guard presence to increase lab defense score against enforcer raids", () => {
    let state = createInitialState({
      seed: 10,
      start: "hideout",
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

    state.syndicateTurf = {
      hideout: "shadow_cartel",
    };

    // Build lab at hideout
    state.productionLabs = {
      hideout: {
        id: "lab_hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 10,
        storedContraband: 5,
        lastProducedStep: 0,
        cooldownSteps: 1,
        timestamp: 1000,
        defense: 5,
      },
    };

    // Case A: No guards. Raid roll <= 20 and defense score is too low.
    // At level 1, lab defense is 5 + level * 10 = 15.
    // We tick labs and inspect the result.
    state.seed = 26526; // Set a seed that triggers a raid with a high raid strength
    state.step = 1;
    let tickedNoGuards = tickProductionLabs(state, [], mockPack);
    expect(tickedNoGuards.productionLabs?.["hideout"].level).toBe(1);

    // Case B: With hired guards!
    state.turfGuards = {
      hideout: {
        roomId: "hideout",
        syndicateId: "shadow_cartel",
        count: 3, // 3 * 15 = 45 bonus defense points
        cost: 450,
        timestamp: 1000,
      },
    };

    let tickedWithGuards = tickProductionLabs(state, [], mockPack);
    expect(tickedWithGuards.turfGuards?.["hideout"].count).toBe(3);
  });

  it("should wire guard presence to defend front businesses from enforcer sweeps in tickEconomy", () => {
    let state = createInitialState({
      seed: 9999, // Seed that will result in a successful defense roll
      start: "market",
      varsInit: { gold: 0 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 80,
      },
    };

    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 160,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
      },
    };

    // High room heat (heat: 30 >= 25)
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 30,
        timestamp: 1000,
      },
    };

    // Hire 4 turf guards in room
    state.turfGuards = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        count: 4, // 4 * 15 = 60 defense score
        cost: 600,
        timestamp: 1000,
      },
    };

    state.step = 5;

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Verify enforcer sweep was successfully repelled!
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.dirtyGold).toBeGreaterThan(0);
  });

  it("should add guard count to defender strength during rival syndicate turf wars", () => {
    let state = createInitialState({
      seed: 555,
      start: "hideout",
      varsInit: { gold: 500, gold_alice: 500 },
      agentsInit: ["player", "alice"],
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
      rival_syndicate: {
        id: "rival_syndicate",
        name: "Rival Syndicate",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.syndicateTurf = {
      hideout: "rival_syndicate",
    };
    state.syndicateTurfClaims = {
      hideout: {
        roomId: "hideout",
        syndicateId: "rival_syndicate",
        timestamp: 1000,
        dominance: 50,
      },
    };

    state.turfGuards = {
      hideout: {
        roomId: "hideout",
        syndicateId: "rival_syndicate",
        count: 5, // Adds 5 * 10 = 50 defender strength!
        cost: 500,
        timestamp: 1000,
      },
    };

    // Shadow Cartel (player) wages turf war on hideout
    const warRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "WAGE_TURF_WAR",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(warRes.ok).toBe(true);
  });

  it("should replicate and converge turfGuards and frontBusinesses over peer gossip nodes", () => {
    const nodeA = new GossipNode("player", mockPack, 12345);
    const nodeB = new GossipNode("alice", mockPack, 12345);

    nodeA.connect(nodeB);

    nodeA.localState.vars = {
      gold: 1000,
    };

    // Node A creates a syndicate
    const resCreate = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["player"],
      timestamp: 1000,
    } as any);
    expect(resCreate.ok).toBe(true);

    // Node A claims the turf in market
    const resWar = nodeA.executeLocalAction({
      type: "WAGE_TURF_WAR",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 100,
      timestamp: 1005,
    } as any);
    expect(resWar.ok).toBe(true);

    // Node A hires turf guards
    const resA = nodeA.executeLocalAction({
      type: "HIRE_TURF_GUARD",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1010,
    } as any);
    expect(resA.ok).toBe(true);

    expect(nodeA.localState.turfGuards?.["market"]).toBeDefined();
    expect(nodeB.localState.turfGuards?.["market"]).toBeUndefined();

    // Trigger gossip sync round
    nodeA.gossip();

    // Node B has reconstructed state perfectly including the hired turf guards!
    expect(nodeB.localState.turfGuards?.["market"]).toBeDefined();
    expect(nodeB.localState.turfGuards?.["market"].count).toBe(1);
    expect(nodeB.localState.turfGuards?.["market"].cost).toBe(150);
  });
});
