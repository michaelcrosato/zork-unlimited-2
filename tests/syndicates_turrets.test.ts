import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { tickEconomy } from "../src/core/economy.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Syndicate Turf Guard Heavy Armored Defense Outposts & Tactical Defense Turrets (AF-57)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_turrets_test_pack",
      title: "Syndicate Turrets Test Pack",
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

  it("should validate and execute constructing outposts and turrets with proper rules", () => {
    let state = createInitialState({
      seed: 12345,
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

    // Establishing control
    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    // 1. Cannot construct turret if no outpost established
    const noOutpostRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_TURRET",
          roomId: "market",
          syndicateId: "shadow_cartel",
          turretId: "turret_alpha",
          turretType: "heavy_armored",
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(noOutpostRes.ok).toBe(false);
    expect(noOutpostRes.rejectionReason).toContain("does not have an established turf guard outpost");

    // Establish outpost first
    const outpostRes = multiAgentStep(
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
    expect(outpostRes.ok).toBe(true);
    state = outpostRes.state;

    // 2. Reject if agent has insufficient gold (cost of heavy_armored is 150)
    state.vars["gold"] = 100; // not enough
    const lowGoldRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_TURRET",
          roomId: "market",
          syndicateId: "shadow_cartel",
          turretId: "turret_alpha",
          turretType: "heavy_armored",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(lowGoldRes.ok).toBe(false);
    expect(lowGoldRes.rejectionReason).toContain("Insufficient gold");

    // Restore gold
    state.vars["gold"] = 1000;

    // 3. Reject if not syndicate member
    const nonMemberRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "CONSTRUCT_TURRET",
          roomId: "market",
          syndicateId: "shadow_cartel",
          turretId: "turret_alpha",
          turretType: "heavy_armored",
          timestamp: 1010,
        } as any,
      },
      mockPack
    );
    expect(nonMemberRes.ok).toBe(false);
    expect(nonMemberRes.rejectionReason).toContain("not a member of syndicate");

    // 4. Construct heavy_armored turret successfully (defaults cost to 150)
    const turretRes1 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_TURRET",
          roomId: "market",
          syndicateId: "shadow_cartel",
          turretId: "turret_alpha",
          turretType: "heavy_armored",
          timestamp: 1015,
        } as any,
      },
      mockPack
    );
    expect(turretRes1.ok).toBe(true);
    state = turretRes1.state;
    expect(state.vars["gold"]).toBe(850); // 1000 - 150
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_alpha"]).toBeDefined();
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_alpha"].type).toBe("heavy_armored");
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_alpha"].firepower).toBe(20);
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_alpha"].armor).toBe(40);
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_alpha"].premiumRate).toBe(0.1);

    // 5. Construct tactical_defense turret successfully with custom cost 300
    const turretRes2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CONSTRUCT_TURRET",
          roomId: "market",
          syndicateId: "shadow_cartel",
          turretId: "turret_beta",
          turretType: "tactical_defense",
          cost: 300,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );
    expect(turretRes2.ok).toBe(true);
    state = turretRes2.state;
    expect(state.vars["gold"]).toBe(550); // 850 - 300
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_beta"]).toBeDefined();
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_beta"].type).toBe("tactical_defense");
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_beta"].firepower).toBe(50);
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_beta"].armor).toBe(10);
    expect(state.turfGuardOutposts?.["market"]?.turrets?.["turret_beta"].premiumRate).toBe(0.2);
  });

  it("should mitigate sweep damage and repel sweeps in tickEconomy using turrets", () => {
    let state = createInitialState({
      seed: 54321,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    // Make step a multiple of 5 to trigger front business economic events
    state.step = 5;

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
      market: "shadow_cartel",
    };

    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 1,
        timestamp: 1005,
        turrets: {
          heavy_alpha: {
            id: "heavy_alpha",
            type: "heavy_armored",
            firepower: 20,
            armor: 40,
            premiumRate: 0.1,
            timestamp: 1010,
          },
        },
      },
    };

    // Add a front business with clean and dirty gold to trigger a sweep
    state.frontBusinesses = {
      merchant_timmy: {
        id: "merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 200,
        cleanGold: 300, // cleanGold >= 150 triggers dynamic events
        launderingCapacity: 100,
        launderingRate: 20,
        timestamp: 1008,
      },
    };

    // Add enforcer heat to trigger sweep (heat >= 25)
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 30,
        timestamp: 1009,
      },
    };

    // Run tickEconomy
    let finalState = tickEconomy(state, mockPack);
    expect(finalState.frontBusinesses?.["merchant_timmy"]).toBeDefined();

    const front = finalState.frontBusinesses?.["merchant_timmy"]!;
    const isRepelled = finalState.journal.some(line => line.includes("successfully repelled"));
    const isMitigated = finalState.journal.some(line => line.includes("mitigating sweep losses"));

    expect(isRepelled || isMitigated).toBe(true);

    if (isMitigated) {
      expect(front.dirtyGold).toBe(120); // 200 * 0.6
    }
  });

  it("should collect dynamic security premiums and distribute them to members in tickEconomy", () => {
    let state = createInitialState({
      seed: 98765,
      start: "market",
      varsInit: { gold: 100 },
      agentsInit: ["player", "bob"],
    });

    // Make step a multiple of 5
    state.step = 5;

    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player", "bob"],
        definedBy: "player",
        timestamp: 1000,
      },
    };

    state.syndicateTurf = {
      market: "shadow_cartel",
    };

    // Outpost with a high premium rate turret (tactical_defense = 0.2 premium rate)
    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 1,
        timestamp: 1005,
        turrets: {
          turret_tactical: {
            id: "turret_tactical",
            type: "tactical_defense",
            firepower: 50,
            armor: 10,
            premiumRate: 0.2,
            timestamp: 1010,
          },
        },
      },
    };

    // Active front business (no high heat to avoid sweep)
    state.frontBusinesses = {
      merchant_timmy: {
        id: "merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 50,
        cleanGold: 100, // cleanGold is positive so premiums are collected
        launderingCapacity: 100,
        launderingRate: 20,
        timestamp: 1008,
      },
    };

    // Run tickEconomy
    let finalState = tickEconomy(state, mockPack);

    expect(finalState.vars["totalSecurityPremiumsCollected"]).toBe(24);
    expect(finalState.vars["gold"]).toBe(122); // Player's gold (100 + 10 from laundering + 12 premium)
    expect(finalState.vars["gold_bob"]).toBe(22); // Bob's gold (0 + 10 from laundering + 12 premium)
    expect(finalState.frontBusinesses?.["merchant_timmy"]?.cleanGold).toBe(96); // 120 - 24
  });

  it("should successfully repel lab raids in tickProductionLabs using turret defense scores", () => {
    let state = createInitialState({
      seed: 121212,
      start: "market",
      varsInit: { gold: 1000 },
      agentsInit: ["player"],
    });

    // Make step >= cooldownSteps (5) to trigger production and potential raid
    state.step = 5;

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
      market: "shadow_cartel",
    };

    // Establish outpost with heavy defense turrets
    state.turfGuardOutposts = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        securityLevel: 1,
        timestamp: 1005,
        turrets: {
          turret_heavy: {
            id: "turret_heavy",
            type: "heavy_armored",
            firepower: 20,
            armor: 40,
            premiumRate: 0.1,
            timestamp: 1010,
          },
        },
      },
    };

    // Lab in the market room
    state.productionLabs = {
      market: {
        id: "lab_market",
        roomId: "market",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 50,
        storedContraband: 5,
        lastProducedStep: 0,
        cooldownSteps: 5,
        timestamp: 1008,
        defense: 10,
      }
    };

    let count = 0;
    let raidFound = false;
    let nextState = state;
    while (count < 20 && !raidFound) {
      const events: any[] = [];
      nextState = tickProductionLabs(nextState, events, mockPack);
      if (events.some(e => e.text && e.text.includes("successfully repelled the enforcement raid"))) {
        raidFound = true;
        const event = events.find(e => e.text && e.text.includes("successfully repelled the enforcement raid"));
        expect(event.text).toContain("with 1 tactical turrets successfully repelled");
      }
      nextState.step += 5; // make sure the next tick also produces
      count++;
    }

    expect(raidFound).toBe(true);
  });

  it("should synchronize outposts and turrets across GossipNodes and converge perfectly", () => {
    // Node A
    const nodeA = new GossipNode("nodeA", mockPack, 1111);
    const nodeB = new GossipNode("nodeB", mockPack, 2222);

    nodeA.connect(nodeB);

    const claim = {
      roomId: "market",
      syndicateId: "shadow_cartel",
      timestamp: 1000,
      dominance: 50,
    };
    nodeA.localState.syndicateTurfClaims = { market: claim };
    nodeB.localState.syndicateTurfClaims = { market: claim };
    nodeA.localState.syndicateTurf = { market: "shadow_cartel" };
    nodeB.localState.syndicateTurf = { market: "shadow_cartel" };

    // Node A creates syndicate (registered in transaction history for convergence)
    const createSynRes = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["nodeA", "nodeB"],
      timestamp: 1000,
    } as any);
    expect(createSynRes.ok).toBe(true);

    // Node A establishes outpost
    const outpostRes = nodeA.executeLocalAction({
      type: "ESTABLISH_OUTPOST",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 100,
      timestamp: 1005,
    } as any);
    expect(outpostRes.ok).toBe(true);

    // Node A constructs a heavy_armored turret
    const turretResA = nodeA.executeLocalAction({
      type: "CONSTRUCT_TURRET",
      roomId: "market",
      syndicateId: "shadow_cartel",
      turretId: "turret_A",
      turretType: "heavy_armored",
      timestamp: 1010,
    } as any);
    expect(turretResA.ok).toBe(true);

    // Sync Node A to Node B so Node B has the syndicate and the outpost
    nodeA.gossip();

    // Node B establishes outpost too at same timestamp (upgrades securityLevel)
    const outpostResB = nodeB.executeLocalAction({
      type: "ESTABLISH_OUTPOST",
      roomId: "market",
      syndicateId: "shadow_cartel",
      cost: 100,
      timestamp: 1005,
    } as any);
    expect(outpostResB.ok).toBe(true);

    // Node B constructs a tactical_defense turret
    const turretResB = nodeB.executeLocalAction({
      type: "CONSTRUCT_TURRET",
      roomId: "market",
      syndicateId: "shadow_cartel",
      turretId: "turret_B",
      turretType: "tactical_defense",
      timestamp: 1015,
    } as any);
    expect(turretResB.ok).toBe(true);

    // Merge Node B back to Node A
    nodeB.gossip();

    console.log("FINAL Node A outposts:", JSON.stringify(nodeA.localState.turfGuardOutposts, null, 2));
    console.log("FINAL Node B outposts:", JSON.stringify(nodeB.localState.turfGuardOutposts, null, 2));
    expect(nodeA.localState.turfGuardOutposts?.["market"]?.turrets?.["turret_A"]).toBeDefined();
    expect(nodeA.localState.turfGuardOutposts?.["market"]?.turrets?.["turret_B"]).toBeDefined();

    expect(nodeB.localState.turfGuardOutposts?.["market"]?.turrets?.["turret_A"]).toBeDefined();
    expect(nodeB.localState.turfGuardOutposts?.["market"]?.turrets?.["turret_B"]).toBeDefined();
  });
});
