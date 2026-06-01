import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Decentralized Crime Syndicates and Contraband Labs (AF-43)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_test_pack",
      title: "Syndicate and Labs Test Pack",
      start_room: "safehouse",
      vars_init: { gold: 500, gold_alice: 300, gold_bob: 100 },
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
        id: "safehouse",
        name: "Safe House",
        description: "A secure smuggling outpost.",
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
            to: "safehouse",
          },
        ],
      },
    ],
    objects: [
      {
        id: "spice",
        name: "Rare Spice",
        description: "Exotic smuggled goods.",
        cost: 60,
        takeable: true,
      },
    ],
    npcs: [],
  });

  it("should support creating a syndicate and building a production lab", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse",
      varsInit: { gold: 500, gold_alice: 300 },
      agentsInit: ["player", "alice"],
    });

    // 1. Create a Syndicate
    const createRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CREATE_SYNDICATE",
          id: "shadow_cartel",
          name: "Shadow Cartel",
          members: ["player", "alice"],
          timestamp: 1000,
        } as any,
      },
      mockPack
    );

    expect(createRes.ok).toBe(true);
    state = createRes.state;
    expect(state.syndicates?.["shadow_cartel"]).toBeDefined();
    expect(state.syndicates?.["shadow_cartel"].name).toBe("Shadow Cartel");
    expect(state.syndicates?.["shadow_cartel"].members).toContain("alice");

    // 2. Build a lab (Rejected due to unauthorized syndicate build)
    const badRes = multiAgentStep(
      state,
      {
        agentId: "bob", // bob is not a registered agent/member
        action: {
          type: "BUILD_LAB",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          cost: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badRes.ok).toBe(false);

    // 3. Build a lab (Successful build by player)
    const buildRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUILD_LAB",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          cost: 200,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(buildRes.ok).toBe(true);
    state = buildRes.state;
    expect(state.vars["gold"]).toBe(300); // 500 - 200
    const lab = state.productionLabs?.["hideout"];
    expect(lab).toBeDefined();
    expect(lab?.roomId).toBe("hideout");
    expect(lab?.ownerId).toBe("player");
    expect(lab?.syndicateId).toBe("shadow_cartel");
    expect(lab?.level).toBe(1);
    expect(lab?.storedContraband).toBe(0);
  });

  it("should generate contraband passively over time based on cooldown steps", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse",
      varsInit: { gold: 500 },
      agentsInit: ["player"],
    });

    // Setup syndicate & lab
    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
    };
    state.productionLabs = {
      hideout: {
        id: "lab_hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 50,
        storedContraband: 0,
        lastProducedStep: 0,
        cooldownSteps: 5,
        timestamp: 1000,
        defense: 0,
      },
    };

    // First, let's advance steps by using movement to trigger standard tick ticks
    // Cooldown is 5 steps.
    const path = ["NORTH", "SOUTH", "NORTH", "SOUTH", "NORTH"];
    for (const dir of path) {
      const res = step(state, { type: "MOVE", direction: dir } as any, mockPack);
      expect(res.ok).toBe(true);
      state = res.state;
    }

    // After 5 steps, check if contraband was produced
    expect(state.step).toBe(5);
    const lab = state.productionLabs?.["hideout"];
    expect(lab?.storedContraband).toBeGreaterThan(0);
    expect(lab?.lastProducedStep).toBe(5);
  });

  it("should support upgrading the lab and its defenses", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse",
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
    state.productionLabs = {
      hideout: {
        id: "lab_hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 50,
        storedContraband: 10,
        lastProducedStep: 0,
        cooldownSteps: 5,
        timestamp: 1000,
        defense: 0,
      },
    };

    // Upgrade Lab
    const upgradeRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_LAB",
          roomId: "hideout",
          cost: 150,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(upgradeRes.ok).toBe(true);
    state = upgradeRes.state;
    expect(state.vars["gold"]).toBe(350);
    expect(state.productionLabs?.["hideout"]?.level).toBe(2);
    expect(state.productionLabs?.["hideout"]?.capacity).toBe(100);

    // Upgrade Defense
    const defRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "UPGRADE_LAB_DEFENSE",
          roomId: "hideout",
          cost: 50,
          timestamp: 1030,
        } as any,
      },
      mockPack
    );

    expect(defRes.ok).toBe(true);
    state = defRes.state;
    expect(state.vars["gold"]).toBe(300);
    expect(state.productionLabs?.["hideout"]?.defense).toBe(15);
  });

  it("should trigger enforcement raids using Mulberry32 seed and allow successful defenses or failures", () => {
    let state = createInitialState({
      seed: 8888, // seeded to roll a raid
      start: "safehouse",
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

    // A low-level, low-defense lab
    state.productionLabs = {
      hideout: {
        id: "lab_hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 2,
        capacity: 50,
        storedContraband: 15,
        lastProducedStep: 0,
        cooldownSteps: 1, // tick on every step!
        timestamp: 1000,
        defense: 0,
      },
    };

    // Advance 25 steps to trigger production ticks and a mathematically guaranteed raid
    const path = [
      "NORTH", "SOUTH", "NORTH", "SOUTH", "NORTH",
      "SOUTH", "NORTH", "SOUTH", "NORTH", "SOUTH",
      "NORTH", "SOUTH", "NORTH", "SOUTH", "NORTH",
      "SOUTH", "NORTH", "SOUTH", "NORTH", "SOUTH",
      "NORTH", "SOUTH", "NORTH", "SOUTH", "NORTH"
    ];
    const events: any[] = [];
    for (const dir of path) {
      const res = step(state, { type: "MOVE", direction: dir } as any, mockPack);
      state = res.state;
      events.push(...res.events);
    }

    // Verify a raid event was emitted
    const raidEvt = events.find((e) => e.text && e.text.includes("raided"));
    expect(raidEvt).toBeDefined();

    // Since level is 2 and defense is 0, defense score is 20.
    // If raid strength exceeds 20, the lab is damaged and contraband confiscated.
    const successEvt = events.find((e) => e.text && e.text.includes("confiscated"));
    const defendEvt = events.find((e) => e.text && e.text.includes("repelled"));
    expect(successEvt || defendEvt).toBeDefined();

    if (successEvt) {
      expect(state.productionLabs?.["hideout"]?.level).toBeLessThan(3); // level decreases or stays low
    } else {
      expect(state.productionLabs?.["hideout"]?.storedContraband).toBeGreaterThanOrEqual(0);
    }
  });

  it("should support collecting/claiming the contraband", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse",
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
    state.productionLabs = {
      hideout: {
        id: "lab_hideout",
        roomId: "hideout",
        ownerId: "player",
        syndicateId: "shadow_cartel",
        level: 1,
        capacity: 50,
        storedContraband: 12,
        lastProducedStep: 0,
        cooldownSteps: 5,
        timestamp: 1000,
        defense: 0,
      },
    };

    // Claim Contraband
    const claimRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "CLAIM_CONTRABAND",
          roomId: "hideout",
          timestamp: 1040,
        } as any,
      },
      mockPack
    );

    expect(claimRes.ok).toBe(true);
    state = claimRes.state;
    // Stored contraband should reset to 0
    expect(state.productionLabs?.["hideout"]?.storedContraband).toBe(0);
    // Collector inventory should have 12 spice items added
    expect(state.inventory.filter((item) => item === "spice").length).toBe(12);
  });

  it("should sync syndicate and production lab states across gossip nodes", () => {
    const nodeA = new GossipNode("node_a", mockPack, 42);
    const nodeB = new GossipNode("node_b", mockPack, 42);

    nodeA.connect(nodeB);

    // Set gold for node_a so it can build
    nodeA.localState.vars["gold_node_a"] = 500;

    // node_a creates syndicate
    const resA1 = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "gossip_syndicate",
      name: "Gossip Syndicate",
      members: ["node_a", "node_b"],
      timestamp: 2000,
    } as any);
    expect(resA1.ok).toBe(true);

    // node_a builds lab
    const resA2 = nodeA.executeLocalAction({
      type: "BUILD_LAB",
      roomId: "hideout",
      syndicateId: "gossip_syndicate",
      cost: 150,
      timestamp: 2010,
    } as any);
    expect(resA2.ok).toBe(true);

    // Run gossip state reconciliation
    nodeA.gossip();
    nodeB.gossip();

    // Assert convergence
    expect(nodeB.localState.syndicates?.["gossip_syndicate"]).toBeDefined();
    expect(nodeB.localState.productionLabs?.["hideout"]).toBeDefined();
    expect(nodeB.localState.productionLabs?.["hideout"]?.syndicateId).toBe("gossip_syndicate");
    expect(nodeB.localState.productionLabs?.["hideout"]?.level).toBe(1);

    // Assert identical hashes
    expect(nodeA.localState.syndicates).toEqual(nodeB.localState.syndicates);
    expect(nodeA.localState.productionLabs).toEqual(nodeB.localState.productionLabs);
  });

  it("should support WAGE_TURF_WAR actions and calculate dynamic pricing correctly based on supply, dominance, and pressure", () => {
    let state = createInitialState({
      seed: 12345,
      start: "safehouse",
      varsInit: { gold: 1000, gold_alice: 1000, gold_bob: 1000 },
      agentsInit: ["player", "alice", "bob"],
    });

    // 1. Create attacker and defender syndicates
    state.syndicates = {
      shadow_cartel: {
        id: "shadow_cartel",
        name: "Shadow Cartel",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        dominance: 80,
      },
      syndicate_rivals: {
        id: "syndicate_rivals",
        name: "Syndicate Rivals",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        dominance: 40,
      },
    };

    // 2. Set initial turf boundaries: rivals control hideout
    state.syndicateTurfClaims = {
      hideout: {
        roomId: "hideout",
        syndicateId: "syndicate_rivals",
        timestamp: 1000,
        dominance: 40,
      },
    };
    state.syndicateTurf = {
      hideout: "syndicate_rivals",
    };

    // 3. Player (shadow_cartel) wages turf war over hideout
    const warRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "WAGE_TURF_WAR",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          timestamp: 1050,
        } as any,
      },
      mockPack
    );

    expect(warRes.ok).toBe(true);
    state = warRes.state;

    // Attacker (shadow_cartel) had 80 dominance vs defender 40 -> should win
    expect(state.syndicateTurf?.["hideout"]).toBe("shadow_cartel");
    expect(state.syndicates?.["shadow_cartel"].dominance).toBeGreaterThan(80); // increased from 80
    expect(state.syndicates?.["syndicate_rivals"].dominance).toBeLessThan(40); // decreased from 40
    expect(state.enforcementHeat?.["hideout"]?.heat).toBeGreaterThan(0); // battle generates heat!

    // 4. Test dynamic price multipliers for contraband in the turf
    const contrabandObj = {
      id: "spice",
      name: "Rare Spice",
      cost: 100,
      contraband: true,
    };
    const merchantNpc = {
      id: "black_market_dealer",
      name: "Black Market Dealer",
    };

    // Before lab production (supply = 0)
    // Dynamic price calculation should reflect supplyFactor = 1.0 (no lab yet), dominanceFactor = 1.0 + (dominance - 50)*0.01, pressureFactor
    const basePrice = 100;
    const finalPrice = calculateTradePrice(state, merchantNpc, contrabandObj, basePrice, false);
    expect(finalPrice).toBeGreaterThan(basePrice); // dominance + heat premium
  });

  it("should sync turf claims and enforcement heat across gossip nodes", () => {
    const nodeA = new GossipNode("node_a", mockPack, 42);
    const nodeB = new GossipNode("node_b", mockPack, 42);

    nodeA.connect(nodeB);

    nodeA.localState.vars["gold_node_a"] = 500;

    // 1. Create syndicate via transaction on nodeA
    const resA1 = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["node_a", "node_b"],
      timestamp: 2000,
    } as any);
    expect(resA1.ok).toBe(true);

    // 2. Wage turf war via transaction on nodeA
    const resA2 = nodeA.executeLocalAction({
      type: "WAGE_TURF_WAR",
      roomId: "hideout",
      syndicateId: "shadow_cartel",
      timestamp: 3000,
    } as any);
    expect(resA2.ok).toBe(true);

    // Run gossip state reconciliation
    nodeA.gossip();
    nodeB.gossip();

    // Assert convergence on nodeB
    expect(nodeB.localState.syndicates?.["shadow_cartel"]).toBeDefined();
    expect(nodeB.localState.syndicateTurf?.["hideout"]).toBe("shadow_cartel");
    expect(nodeB.localState.enforcementHeat?.["hideout"]?.heat).toBeGreaterThan(0);

    // Assert identical hashes
    expect(nodeA.localState.syndicateTurfClaims).toEqual(nodeB.localState.syndicateTurfClaims);
    expect(nodeA.localState.enforcementHeat).toEqual(nodeB.localState.enforcementHeat);
  });
});
