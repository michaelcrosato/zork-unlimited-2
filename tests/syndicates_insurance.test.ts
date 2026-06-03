import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { tickSmugglingConvoys } from "../src/core/engine.js";
import { GossipNode } from "../src/core/gossip.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { calculateConvoyInsurancePremium } from "../src/core/economy.js";


describe("Crime Syndicate Contraband Insurance Claims & Dynamic Loss Compensation Policies (AF-59)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_insurance_test_pack",
      title: "Syndicate Insurance Test Pack",
      start_room: "market",
      vars_init: { gold: 2000, gold_nodeA: 1000, gold_nodeB: 1000, hp: 20, max_hp: 20 },
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
    ],
    npcs: [],
  });

  (mockPack as any).start = "market";

  it("should successfully purchase a convoy insurance policy", () => {
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

    // Purchase Convoy Insurance
    const action = {
      type: "PURCHASE_CONVOY_INSURANCE" as const,
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1020,
    };

    const result = multiAgentStep(state, { agentId: "player", action }, mockPack);
    expect(result.ok).toBe(true);

    const newState = result.state;
    // Check gold deduction
    expect(newState.vars["gold"]).toBe(850); // 1000 - 150
    // Check insurance registration
    const policy = newState.convoyInsurance?.["convoy_1"];
    expect(policy).toBeDefined();
    expect(policy?.active).toBe(true);
    expect(policy?.coverageAmount).toBe(300); // 2 cargo * 150 = 300
    expect(policy?.definedBy).toBe("player");
  });

  it("should reject insurance purchase with invalid arguments or states", () => {
    let state = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: { gold: 100 }, // Insufficient gold (cost is 150)
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
      completed_convoy: {
        id: "completed_convoy",
        syndicateId: "shadow_cartel",
        routeId: "route_1",
        currentRoomIndex: 2,
        cargo: 2,
        goldCost: 100,
        status: "completed",
        definedBy: "player",
        timestamp: 1010,
      },
    };

    // 1. Test Insufficient Gold
    const actionInsGold = {
      type: "PURCHASE_CONVOY_INSURANCE" as const,
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1020,
    };
    const res1 = multiAgentStep(state, { agentId: "player", action: actionInsGold }, mockPack);
    expect(res1.ok).toBe(false);
    expect(res1.rejectionReason).toContain("Insufficient gold");

    // 2. Test Non-existent Convoy
    state.vars["gold"] = 1000;
    const actionInvalidConvoy = {
      type: "PURCHASE_CONVOY_INSURANCE" as const,
      convoyId: "non_existent_convoy",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1020,
    };
    const res2 = multiAgentStep(state, { agentId: "player", action: actionInvalidConvoy }, mockPack);
    expect(res2.ok).toBe(false);
    expect(res2.rejectionReason).toContain("does not exist");

    // 3. Test Convoy not en_route
    const actionCompletedConvoy = {
      type: "PURCHASE_CONVOY_INSURANCE" as const,
      convoyId: "completed_convoy",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1020,
    };
    const res3 = multiAgentStep(state, { agentId: "player", action: actionCompletedConvoy }, mockPack);
    expect(res3.ok).toBe(false);
    expect(res3.rejectionReason).toContain("is not en_route");
  });

  it("should trigger claim processing when convoy is ambushed and destroyed, distributing payout to members", () => {
    let state = createInitialState({
      seed: 555, // Seed that triggers ambush roll
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

    state.enforcementHeat = {
      border: {
        roomId: "border",
        heat: 30, // Guaranteed ambush risk increase
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

    // Add active insurance
    state.convoyInsurance = {
      convoy_1: {
        convoyId: "convoy_1",
        syndicateId: "shadow_cartel",
        cost: 150,
        coverageAmount: 300,
        active: true,
        definedBy: "player",
        timestamp: 1020,
      },
    };

    // Tick smuggling convoys: Convoy moves from market to border, gets ambushed and destroyed, triggering the insurance claim!
    const events: any[] = [];
    let stateAfterTick = tickSmugglingConvoys(state, events, mockPack);

    // Verify convoy is ambushed/destroyed
    expect(stateAfterTick.smugglingConvoys?.["convoy_1"]?.status).toBe("ambushed");

    // Verify insurance is deactivated
    expect(stateAfterTick.convoyInsurance?.["convoy_1"]?.active).toBe(false);

    // Verify dynamic payout distribution (2 cargo * 150 = 300 gold distributed to members)
    expect(stateAfterTick.vars["gold"]).toBe(400); // 100 initial + 300 payout
    expect(stateAfterTick.vars["totalConvoyInsurancePayouts"]).toBe(300);

    // Verify insurance claim journal entries and events
    expect(stateAfterTick.journal.some((j) => j.includes("Insurance claim processed for convoy convoy_1"))).toBe(true);
    const insuranceEvent = events.find((e) => e.type === "smuggling_convoy_insurance_claimed");
    expect(insuranceEvent).toBeDefined();
    expect((insuranceEvent as any).payoutGold).toBe(300);
  });

  it("should synchronize convoy insurance states across GossipNodes and converge perfectly", () => {
    const nodeA = new GossipNode("nodeA", mockPack, 1111);
    const nodeB = new GossipNode("nodeB", mockPack, 2222);

    nodeA.connect(nodeB);

    // Node A creates syndicate
    nodeA.executeLocalAction({
      type: "CREATE_SYNDICATE",
      id: "shadow_cartel",
      name: "Shadow Cartel",
      members: ["nodeA", "nodeB"],
      timestamp: 1000,
    } as any);

    // Node A defines trade route
    nodeA.executeLocalAction({
      type: "DEFINE_TRADE_ROUTE",
      routeId: "route_1",
      factionId: "rangers",
      rooms: ["market", "border", "hideout"],
      taxShare: 10,
      timestamp: 1005,
    } as any);

    // Populate gold and take spice to organize convoy
    nodeA.localState.vars["gold_nodeA"] = 1000;
    nodeA.executeLocalAction({ type: "TAKE", item: "spice" });

    // Organize convoy
    nodeA.executeLocalAction({
      type: "ORGANIZE_CONVOY",
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      routeId: "route_1",
      cargo: 1,
      goldCost: 100,
      timestamp: 1010,
    } as any);

    // Node A purchases insurance
    const purchaseRes = nodeA.executeLocalAction({
      type: "PURCHASE_CONVOY_INSURANCE",
      convoyId: "convoy_1",
      syndicateId: "shadow_cartel",
      cost: 150,
      timestamp: 1020,
    } as any);
    expect(purchaseRes.ok).toBe(true);

    // Verify Node B is initially unaware of the insurance
    expect(nodeB.localState.convoyInsurance?.["convoy_1"]).toBeUndefined();

    // Gossip Node A to Node B
    nodeA.gossip();

    // Verify Node B has converged and replicates the insurance policy perfectly!
    // Verify Node B has converged and replicates the insurance policy perfectly!
    const insuranceOnB = nodeB.localState.convoyInsurance?.["convoy_1"];
    expect(insuranceOnB).toBeDefined();
    expect(insuranceOnB?.active).toBe(true);
    expect(insuranceOnB?.coverageAmount).toBe(150); // 1 cargo * 150 = 150
    expect(insuranceOnB?.cost).toBe(150);
  });

  describe("Dynamic Underwriting Premium Calculations (AF-60)", () => {
    it("should scale premium dynamically based on route enforcement heat", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 2000 },
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

      // Base premium with zero heat:
      // cargo: 2 => base premium: 100.
      const initialPremium = calculateConvoyInsurancePremium(state, "convoy_1");
      expect(initialPremium).toBe(100);

      // Now add enforcement heat along the route (border room)
      state.enforcementHeat = {
        border: {
          roomId: "border",
          heat: 20, // 20 heat adds 20 * 1.5% = 30% risk
          timestamp: 1000,
        },
      };

      const highHeatPremium = calculateConvoyInsurancePremium(state, "convoy_1");
      // 100 * 1.3 = 130
      expect(highHeatPremium).toBe(130);
    });

    it("should scale premium dynamically based on faction control and reputation", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 2000 },
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

      // Setup room faction control
      state.territoryControl = {
        border: "rangers",
      };

      // Case 1: Friendly faction reputation (10 rep reduces penalty by -5)
      state.factionRep = {
        rangers: 10, // reduces risk multiplier from 1.0 to 1.0 - (10 * 0.5 * 0.02) = 0.9
      };

      const friendlyPremium = calculateConvoyInsurancePremium(state, "convoy_1");
      expect(friendlyPremium).toBe(90); // 100 * 0.9

      // Case 2: Hostile faction reputation (-15 rep increases penalty by 15 * 0.02 = 0.3)
      state.factionRep = {
        rangers: -15, // increases risk multiplier to 1.0 + (15 * 0.02) = 1.3
      };

      const hostilePremium = calculateConvoyInsurancePremium(state, "convoy_1");
      expect(hostilePremium).toBe(130); // 100 * 1.3
    });

    it("should scale premium dynamically based on historical syndicate loss rates", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 2000 },
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

      // We have dynamic historical convoys
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
        // Finished convoys:
        past_convoy_1: {
          id: "past_convoy_1",
          syndicateId: "shadow_cartel",
          routeId: "route_1",
          currentRoomIndex: 2,
          cargo: 2,
          goldCost: 100,
          status: "completed",
          definedBy: "player",
          timestamp: 900,
        },
        past_convoy_2: {
          id: "past_convoy_2",
          syndicateId: "shadow_cartel",
          routeId: "route_1",
          currentRoomIndex: 1,
          cargo: 2,
          goldCost: 100,
          status: "ambushed", // 1 completed, 1 ambushed => 50% loss rate
          definedBy: "player",
          timestamp: 910,
        },
      };

      const premiumWithHistory = calculateConvoyInsurancePremium(state, "convoy_1");
      // base premium: 100
      // route risk multiplier: 1.0 (no heat, no faction rep)
      // loss rate: 50% => lossRateMultiplier = 1.0 + 0.5 * 1.0 = 1.5
      // total = Math.round(100 * 1.0 * 1.5) = 150
      expect(premiumWithHistory).toBe(150);
    });

    it("should reject purchase transactions when the cost paid is less than the dynamically calculated premium", () => {
      let state = createInitialState({
        seed: 12345,
        start: "market",
        varsInit: { gold: 2000 },
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

      state.enforcementHeat = {
        border: {
          roomId: "border",
          heat: 40, // 40 heat adds 40 * 1.5% = 60% risk. Expected premium is 100 * 1.6 = 160.
          timestamp: 1000,
        },
      };

      // Try to purchase with 150 gold (which is less than calculated 160 premium)
      const actionLowBribe = {
        type: "PURCHASE_CONVOY_INSURANCE" as const,
        convoyId: "convoy_1",
        syndicateId: "shadow_cartel",
        cost: 150,
        timestamp: 1020,
      };

      const resultLow = multiAgentStep(state, { agentId: "player", action: actionLowBribe }, mockPack);
      expect(resultLow.ok).toBe(false);
      expect(resultLow.rejectionReason).toContain("Insufficient insurance premium paid");

      // Try to purchase with 160 gold (exact match) or higher
      const actionMatch = {
        type: "PURCHASE_CONVOY_INSURANCE" as const,
        convoyId: "convoy_1",
        syndicateId: "shadow_cartel",
        cost: 160,
        timestamp: 1020,
      };

      const resultMatch = multiAgentStep(state, { agentId: "player", action: actionMatch }, mockPack);
      expect(resultMatch.ok).toBe(true);
      expect(resultMatch.state.vars["gold"]).toBe(1840); // 2000 - 160
    });
  });
});

