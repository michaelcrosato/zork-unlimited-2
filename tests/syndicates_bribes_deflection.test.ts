import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Syndicate Bribery and Enforcer Raid Deflection (AF-46)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_bribes_test_pack",
      title: "Bribes and Deflection Test Pack",
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
    objects: [],
    npcs: [],
  });

  it("should validate and execute paying a syndicate bribe", () => {
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

    state.enforcementHeat = {
      hideout: {
        roomId: "hideout",
        heat: 50,
        timestamp: 1000,
      },
    };

    // 1. Rejected if not member
    const badMemberRes = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "BRIBE_SYNDICATE_ENFORCERS",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          amount: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badMemberRes.ok).toBe(false);

    // 2. Rejected if insufficient gold
    const badGoldRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BRIBE_SYNDICATE_ENFORCERS",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          amount: 600,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badGoldRes.ok).toBe(false);

    // 3. Successful bribe
    const bribeRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BRIBE_SYNDICATE_ENFORCERS",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          amount: 100,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(bribeRes.ok).toBe(true);
    state = bribeRes.state;

    // Check gold deduction
    expect(state.vars["gold"]).toBe(400);

    // Check enforcer heat reduction: amount / 5 = 20 reduction. 50 - 20 = 30.
    // Since tickProductionLabs is run at the end of multiAgentStep, the active bribe immediately decays the heat by 3, resulting in 27!
    expect(state.enforcementHeat?.["hideout"]?.heat).toBe(27);

    // Check active bribe
    const bribe = state.syndicateBribes?.["hideout"];
    expect(bribe).toBeDefined();
    expect(bribe?.active).toBe(true);
    expect(bribe?.amount).toBe(90); // 100 - 10 decayed
  });

  it("should decay bribes, increase heat decay rate, and halve production heat addition", () => {
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
        level: 4, // 4 units produced
        capacity: 50,
        storedContraband: 0,
        lastProducedStep: 0,
        cooldownSteps: 1,
        timestamp: 1000,
        defense: 100, // very high defense to not fail tests on raid checks
      },
    };

    // Set high initial heat
    state.enforcementHeat = {
      hideout: {
        roomId: "hideout",
        heat: 100,
        timestamp: 1000,
      },
    };

    // Register active bribe of 20
    state.syndicateBribes = {
      hideout: {
        roomId: "hideout",
        syndicateId: "shadow_cartel",
        amount: 20,
        timestamp: 1000,
        active: true,
      },
    };

    // We do one standard movement step. The step ticks.
    // Ticking:
    // 1. Bribe decays by 10. Amount: 20 -> 10. Active: true.
    // 2. Heat decays by 3 (active bribe). Heat: 100 -> 97.
    // 3. Lab produces: productionAmount = level = 4.
    // 4. Stored contraband: 0 -> 4.
    // 5. Heat increases by: activeBribe ? Math.floor(4) : 8.
    //    activeBribe is true, so heat increases by 4 instead of 8.
    //    New Heat: 97 + 4 = 101.
    const res1 = step(state, { type: "MOVE", direction: "NORTH" } as any, mockPack);
    expect(res1.ok).toBe(true);
    state = res1.state;

    expect(state.syndicateBribes?.["hideout"]?.amount).toBe(10);
    expect(state.syndicateBribes?.["hideout"]?.active).toBe(true);
    expect(state.enforcementHeat?.["hideout"]?.heat).toBe(101);

    // Let's do another step.
    // Ticking:
    // 1. Bribe decays by 10. Amount: 10 -> 0. Active: false.
    // 2. Heat decays by 1 (no longer active bribe, since it decayed to 0 and was deactivated!). Heat: 101 -> 100.
    // 3. Lab produces: productionAmount = level = 4. Stored: 4 -> 8.
    // 4. Heat increases by: activeBribe is false, so heat increases by 8.
    //    New Heat: 100 + 8 = 108.
    const res2 = step(state, { type: "MOVE", direction: "SOUTH" } as any, mockPack);
    expect(res2.ok).toBe(true);
    state = res2.state;

    expect(state.syndicateBribes?.["hideout"]?.amount).toBe(0);
    expect(state.syndicateBribes?.["hideout"]?.active).toBe(false);
    expect(state.enforcementHeat?.["hideout"]?.heat).toBe(108);
  });

  it("should validate, purchase, and successfully deflect enforcer raids using a deflection policy", () => {
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

    // 1. Rejected if no lab in the room
    const badDeflectionRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PURCHASE_DEFLECTION_POLICY",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          timestamp: 1005,
        } as any,
      },
      mockPack
    );
    expect(badDeflectionRes.ok).toBe(false);

    // Setup a lab in hideout
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
        cooldownSteps: 1,
        timestamp: 1000,
        defense: 0,
      },
    };

    // 2. Successful deflection policy purchase
    const deflectionRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PURCHASE_DEFLECTION_POLICY",
          roomId: "hideout",
          syndicateId: "shadow_cartel",
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(deflectionRes.ok).toBe(true);
    state = deflectionRes.state;

    expect(state.vars["gold"]).toBe(400); // 500 - 100 cost
    expect(state.deflectionPolicies?.["hideout"]?.active).toBe(true);

    // Let's test raid deflection!
    // Setup seed so that nextInt(seed, 1, 100) yields a raidRoll <= 20
    // PureRand uses mulberry32. We can seed the state with a seed that triggers a raid.
    // Let's try to find a seed, or simply execute steps until a raid is triggered.
    // Since step updates seed deterministically, we can loop a few steps until deflectionPolicies["hideout"].active becomes false!
    let raidDeflected = false;
    for (let i = 0; i < 20; i++) {
      const stepRes = step(state, { type: "MOVE", direction: i % 2 === 0 ? "NORTH" : "SOUTH" } as any, mockPack);
      expect(stepRes.ok).toBe(true);
      state = stepRes.state;

      // Check if deflection policy has been deactivated (consumed by deflection!)
      if (state.deflectionPolicies?.["hideout"]?.active === false) {
        raidDeflected = true;
        break;
      }
    }

    expect(raidDeflected).toBe(true);
    // Verify that the journal contains deflection narration
    expect(state.journal.some(log => log.includes("Lab raid deflected"))).toBe(true);
  });

  it("should synchronize enforcer bribes and deflection policies over P2P gossip mesh using LWW rules", () => {
    const nodeA = new GossipNode("node_a", mockPack, 42);
    const nodeB = new GossipNode("node_b", mockPack, 42);

    nodeA.connect(nodeB);

    // Initialize gold for nodes
    nodeA.localState.vars["gold_node_a"] = 1000;
    nodeB.localState.vars["gold_node_b"] = 1000;

    // node_a creates syndicate via transaction so that it is replayed during gossip
    const resA1 = nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["node_a", "node_b"],
      timestamp: 1000,
    } as any);
    expect(resA1.ok).toBe(true);

    // node_a builds lab via transaction so that it is replayed during gossip
    const resA2 = nodeA.executeLocalAction({
      type: "BUILD_LAB",
      roomId: "hideout",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1010,
    } as any);
    expect(resA2.ok).toBe(true);

    // Apply bribe and deflection on Node A via local actions
    const bribeRes = nodeA.executeLocalAction({
      type: "BRIBE_SYNDICATE_ENFORCERS",
      roomId: "hideout",
      syndicateId: "shadow_cartel",
      amount: 200,
      timestamp: 2000,
    } as any);
    expect(bribeRes.ok).toBe(true);

    const deflectionRes = nodeA.executeLocalAction({
      type: "PURCHASE_DEFLECTION_POLICY",
      roomId: "hideout",
      syndicateId: "shadow_cartel",
      timestamp: 2005,
    } as any);
    expect(deflectionRes.ok).toBe(true);

    // Node B has no bribes/deflections initially
    expect(nodeB.localState.syndicateBribes?.["hideout"]).toBeUndefined();
    expect(nodeB.localState.deflectionPolicies?.["hideout"]).toBeUndefined();

    // Gossip
    nodeA.gossip();
    nodeB.gossip();

    // Verify Node B converged successfully
    expect(nodeB.localState.syndicateBribes?.["hideout"]).toBeDefined();
    // Bribe starts at 200, decays by 10 on bribe transaction and another 10 on deflection policy purchase transaction
    expect(nodeB.localState.syndicateBribes?.["hideout"]?.amount).toBe(180);
    expect(nodeB.localState.deflectionPolicies?.["hideout"]).toBeDefined();
    expect(nodeB.localState.deflectionPolicies?.["hideout"]?.active).toBe(true);
  });
});
