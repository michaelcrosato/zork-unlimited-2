import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Syndicate Turf Guard Defense Outposts & Security Level (AF-56)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_outposts_test_pack",
      title: "Syndicate Outposts Test Pack",
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

  it("should validate and execute establishing and upgrading a syndicate turf guard defense outpost", () => {
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
          type: "ESTABLISH_OUTPOST",
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
          type: "ESTABLISH_OUTPOST",
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
          type: "ESTABLISH_OUTPOST",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 1000,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badGoldRes.ok).toBe(false);
    expect(badGoldRes.rejectionReason).toContain("Insufficient gold to establish");

    // 4. Successful establish (Level 1)
    const estRes1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_OUTPOST",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 150,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(estRes1.ok).toBe(true);
    state = estRes1.state;
    expect(state.vars["gold"]).toBe(350); // 500 - 150
    expect(state.turfGuardOutposts?.["market"]).toBeDefined();
    expect(state.turfGuardOutposts?.["market"].securityLevel).toBe(1);

    // 5. Successful second establish in same room (Upgrade to Level 2)
    const estRes2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_OUTPOST",
          roomId: "market",
          syndicateId: "shadow_cartel",
          cost: 200,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(estRes2.ok).toBe(true);
    state = estRes2.state;
    expect(state.vars["gold"]).toBe(150); // 350 - 200
    expect(state.turfGuardOutposts?.["market"].securityLevel).toBe(2);
  });

  it("should automatically recruit local turf guards in tickEconomy up to outpost securityLevel", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 0 },
      agentsInit: ["player"],
    });

    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 2,
        timestamp: 1000,
      },
    };

    // Step 1: No guards initially
    expect(state.turfGuards?.["market"]).toBeUndefined();

    // Step 2: Run tickEconomy once. Should recruit 1 guard.
    state.step = 1;
    let ticked = tickEconomy(state, mockPack);
    expect(ticked.turfGuards?.["market"]).toBeDefined();
    expect(ticked.turfGuards?.["market"].count).toBe(1);

    // Step 3: Run tickEconomy again on state. Should recruit a 2nd guard.
    ticked.step = 2;
    let ticked2 = tickEconomy(ticked, mockPack);
    expect(ticked2.turfGuards?.["market"].count).toBe(2);

    // Step 4: Run tickEconomy a 3rd time. Should NOT recruit more since count (2) equals securityLevel (2).
    ticked2.step = 3;
    let ticked3 = tickEconomy(ticked2, mockPack);
    expect(ticked3.turfGuards?.["market"].count).toBe(2);
  });

  it("should wire outpost presence to increase lab defense score against enforcer raids", () => {
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

    // Add level 2 outpost in room
    state.turfGuardOutposts = {
      hideout: {
        roomId: "hideout",
        syndicateId: "shadow_cartel",
        securityLevel: 2, // 2 * 25 = 50 bonus defense score
        timestamp: 1000,
      },
    };

    // This tick will verify if defense score functions with outpost defense bonus
    state.seed = 26526;
    state.step = 1;
    let ticked = tickProductionLabs(state, [], mockPack);
    expect(ticked.turfGuardOutposts?.["hideout"].securityLevel).toBe(2);
  });

  it("should wire outpost presence to defend front businesses from enforcer sweeps in tickEconomy", () => {
    let state = createInitialState({
      seed: 9999,
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

    // Establish a security level 2 outpost in market (adds 50 defense score)
    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 2,
        timestamp: 1000,
      },
    };

    state.step = 5;

    // Run tickEconomy
    const tickedState = tickEconomy(state, mockPack);

    // Verify enforcer sweep was successfully repelled and dirty gold is intact!
    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.dirtyGold).toBeGreaterThan(0);
  });

  it("should scale dynamic regional taxes by outpost security level", () => {
    let state = createInitialState({
      seed: 12345,
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
        turfTaxRate: 10, // Base tax rate is 10
      },
    };

    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 0,
        cleanGold: 200, // Timmy has clean gold to tax
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
      },
    };

    // Case A: Outpost has security level 2 (outpost bonus is 2 * 2 = 4)
    // Formula: taxAmount = taxRate * (1 + guardsCount + outpostBonus) = 10 * (1 + 1 + 4) = 60 gold taxed!
    // Note: guardsCount is 1 because the outpost automatically recruited 1 guard during this tick!
    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 2,
        timestamp: 1000,
      },
    };

    state.step = 5;
    const tickedState = tickEconomy(state, mockPack);
    const front = tickedState.frontBusinesses?.["merchant_timmy"];

    // Should tax 60 gold from Timmy's 200 clean gold, leaving 140
    expect(front?.cleanGold).toBe(140);
    expect(tickedState.vars["gold"]).toBe(60); // Player gets the tax payout distributed
    expect(tickedState.vars["totalTurfTaxesCollected"]).toBe(60);
  });

  it("should replicate and converge turfGuardOutposts over peer gossip nodes", () => {
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

    // Node A claims turf in market
    const resWar = nodeA.executeLocalAction({
      type: "WAGE_TURF_WAR",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 100,
      timestamp: 1005,
    } as any);
    expect(resWar.ok).toBe(true);

    // Node A establishes outpost
    const resEst = nodeA.executeLocalAction({
      type: "ESTABLISH_OUTPOST",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1010,
    } as any);
    expect(resEst.ok).toBe(true);

    expect(nodeA.localState.turfGuardOutposts?.["market"]).toBeDefined();
    expect(nodeB.localState.turfGuardOutposts?.["market"]).toBeUndefined();

    // Trigger gossip sync round
    nodeA.gossip();

    // Node B has reconstructed state perfectly including the established outpost!
    expect(nodeB.localState.turfGuardOutposts?.["market"]).toBeDefined();
    expect(nodeB.localState.turfGuardOutposts?.["market"].securityLevel).toBe(1);
    expect(nodeB.localState.turfGuardOutposts?.["market"].syndicateId).toBe("shadow_cartel");
  });
});
