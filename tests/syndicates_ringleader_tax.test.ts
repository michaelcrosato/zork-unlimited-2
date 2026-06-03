import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { GossipNode } from "../src/core/gossip.js";
import { tickSmugglingConvoys } from "../src/core/engine.js";

describe("Syndicate Black Market Contraband Smuggling Ringleaders & Global Cartel Taxes (AF-67)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "ringleader_tax_test_pack",
      title: "Ringleader & Tax Test Pack",
      start_room: "room_1",
      vars_init: {
        gold: 1000,
        gold_agent_a: 1000,
        gold_agent_b: 1000,
        gold_agent_c: 1000,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "room_1",
        name: "Room 1",
        description: "First room.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "EAST",
            to: "room_2",
          },
        ],
      },
      {
        id: "room_2",
        name: "Room 2",
        description: "Second room.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "WEST",
            to: "room_1",
          },
        ],
      },
    ],
    objects: [
      {
        id: "contraband_cargo",
        name: "Contraband Cargo",
        description: "Highly illegal smuggler goods.",
        contraband: true,
      },
    ],
    npcs: [],
    factions: [
      {
        id: "rangers",
        name: "Rangers",
        description: "The rangers of the forest.",
        initial_rep: 0,
      },
    ],
  });

  describe("APPOINT_RINGLEADER", () => {
    it("should handle validation and appoint a ringleader", () => {
      let state = createInitialState({
        seed: 42,
        start: "room_1",
        varsInit: { gold: 1000 },
        agentsInit: ["agent_a", "agent_b", "agent_c"],
      });

      state.syndicates = {
        syndicate_1: {
          id: "syndicate_1",
          name: "Syndicate 1",
          members: ["agent_a", "agent_b"],
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      // 1. Invalid Syndicate ID
      const res1 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "APPOINT_RINGLEADER",
          syndicateId: "non_existent",
          ringleaderId: "agent_b",
          timestamp: 150,
        },
      }, mockPack);
      expect(res1.ok).toBe(false);
      expect(res1.rejectionReason).toContain("does not exist");

      // 2. Caller not a member
      const res2 = multiAgentStep(state, {
        agentId: "agent_c",
        action: {
          type: "APPOINT_RINGLEADER",
          syndicateId: "syndicate_1",
          ringleaderId: "agent_b",
          timestamp: 150,
        },
      }, mockPack);
      expect(res2.ok).toBe(false);
      expect(res2.rejectionReason).toContain("not a member of syndicate");

      // 3. Proposed ringleader not a member
      const res3 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "APPOINT_RINGLEADER",
          syndicateId: "syndicate_1",
          ringleaderId: "agent_c",
          timestamp: 150,
        },
      }, mockPack);
      expect(res3.ok).toBe(false);
      expect(res3.rejectionReason).toContain("Proposed ringleader agent_c is not a member");

      // 4. Successful appointment
      const res4 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "APPOINT_RINGLEADER",
          syndicateId: "syndicate_1",
          ringleaderId: "agent_b",
          timestamp: 150,
        },
      }, mockPack);
      expect(res4.ok).toBe(true);
      expect(res4.state.syndicates?.["syndicate_1"]?.ringleader).toBe("agent_b");
      
      const narrationEvent = res4.events.find(e => (e.type as string) === "narration");
      expect((narrationEvent as any)?.text).toContain("agent_b has been appointed as the smuggling ringleader");

      const customEvent = res4.events.find(e => (e.type as string) === "ringleader_appointed");
      expect(customEvent).toBeDefined();
      expect((customEvent as any).ringleaderId).toBe("agent_b");
    });
  });

  describe("ORGANIZE_CONVOY & Ringleader Coordination Checks", () => {
    it("should restrict multi-convoy networks unless a ringleader has been appointed", () => {
      let state = createInitialState({
        seed: 42,
        start: "room_1",
        varsInit: {
          gold_agent_a: 1000,
        },
        agentsInit: ["agent_a", "agent_b"],
      });

      state.syndicates = {
        syndicate_1: {
          id: "syndicate_1",
          name: "Syndicate 1",
          members: ["agent_a", "agent_b"],
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      state.tradeRoutes = {
        route_1: {
          id: "route_1",
          factionId: "rangers",
          rooms: ["room_1", "room_2"],
          definedBy: "agent_a",
          taxShare: 10,
          timestamp: 100,
        },
      };

      // Give agent_a contraband cargo items to smuggled
      state.agents!["agent_a"].inventory = ["contraband_cargo", "contraband_cargo", "contraband_cargo"];

      // 1. Organize first active convoy - should succeed without a ringleader
      let res1 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "ORGANIZE_CONVOY",
          convoyId: "convoy_1",
          syndicateId: "syndicate_1",
          routeId: "route_1",
          cargo: 1,
          goldCost: 100,
          timestamp: 150,
        },
      }, mockPack);
      expect(res1.ok).toBe(true);
      state = res1.state;
      expect(state.smugglingConvoys?.["convoy_1"]?.status).toBe("en_route");

      // 2. Organize second active convoy - should fail because no ringleader is appointed
      let res2 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "ORGANIZE_CONVOY",
          convoyId: "convoy_2",
          syndicateId: "syndicate_1",
          routeId: "route_1",
          cargo: 1,
          goldCost: 100,
          timestamp: 160,
        },
      }, mockPack);
      expect(res2.ok).toBe(false);
      expect(res2.rejectionReason).toContain("only run multiple active convoys if a smuggling ringleader has been appointed");

      // 3. Appoint agent_b as ringleader
      let resAppoint = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "APPOINT_RINGLEADER",
          syndicateId: "syndicate_1",
          ringleaderId: "agent_b",
          timestamp: 170,
        },
      }, mockPack);
      expect(resAppoint.ok).toBe(true);
      state = resAppoint.state;

      // 4. Organize second active convoy again - should now succeed with the ringleader active
      let res3 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "ORGANIZE_CONVOY",
          convoyId: "convoy_2",
          syndicateId: "syndicate_1",
          routeId: "route_1",
          cargo: 1,
          goldCost: 100,
          timestamp: 180,
        },
      }, mockPack);
      expect(res3.ok).toBe(true);
      expect(res3.state.smugglingConvoys?.["convoy_2"]?.status).toBe("en_route");
    });
  });

  describe("VOTE_CARTEL_GLOBAL_TAX & Reconciliations", () => {
    it("should handle cartel global tax voting, validation, consensus, and tie-breaking", () => {
      let state = createInitialState({
        seed: 42,
        start: "room_1",
        agentsInit: ["agent_a", "agent_b", "agent_c"],
      });

      state.cartels = {
        cartel_1: {
          id: "cartel_1",
          name: "Cartel 1",
          members: ["agent_a", "agent_b"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      // 1. Non-member voting rejection
      const res1 = multiAgentStep(state, {
        agentId: "agent_c",
        action: {
          type: "VOTE_CARTEL_GLOBAL_TAX",
          cartelId: "cartel_1",
          taxRate: 15,
          timestamp: 150,
        },
      }, mockPack);
      expect(res1.ok).toBe(false);
      expect(res1.rejectionReason).toContain("is not a member of cartel");

      // 2. Member votes 15
      let res2 = multiAgentStep(state, {
        agentId: "agent_a",
        action: {
          type: "VOTE_CARTEL_GLOBAL_TAX",
          cartelId: "cartel_1",
          taxRate: 15,
          timestamp: 150,
        },
      }, mockPack);
      expect(res2.ok).toBe(true);
      state = res2.state;
      expect(state.cartelGlobalTaxVotes?.["cartel_1"]?.["agent_a"]?.rate).toBe(15);
      expect(state.cartelGlobalTaxPolicy?.["cartel_1"]).toBe(15); // Reconciled rate is 15 (only vote)

      // 3. Member B votes 25 (tie, descending rule selects 25)
      let res3 = multiAgentStep(state, {
        agentId: "agent_b",
        action: {
          type: "VOTE_CARTEL_GLOBAL_TAX",
          cartelId: "cartel_1",
          taxRate: 25,
          timestamp: 160,
        },
      }, mockPack);
      expect(res3.ok).toBe(true);
      state = res3.state;
      expect(state.cartelGlobalTaxVotes?.["cartel_1"]?.["agent_b"]?.rate).toBe(25);
      expect(state.cartelGlobalTaxPolicy?.["cartel_1"]).toBe(25); // 25 selected due to descending order tie-breaker

      // 4. Join cartel as agent_c and vote 15 (break the tie, 15 is now majority)
      if (state.cartels && state.cartels["cartel_1"]) {
        state.cartels["cartel_1"].members.push("agent_c");
      }
      let res4 = multiAgentStep(state, {
        agentId: "agent_c",
        action: {
          type: "VOTE_CARTEL_GLOBAL_TAX",
          cartelId: "cartel_1",
          taxRate: 15,
          timestamp: 170,
        },
      }, mockPack);
      expect(res4.ok).toBe(true);
      state = res4.state;
      expect(state.cartelGlobalTaxPolicy?.["cartel_1"]).toBe(15); // 15 becomes majority consensual rate (2 votes vs 1)
    });
  });

  describe("Gossip Convergence", () => {
    it("should correctly sync ringleader and cartel global taxes across mesh GossipNodes", () => {
      const nodeA = new GossipNode("agent_a", mockPack, 42);
      const nodeB = new GossipNode("agent_b", mockPack, 42);

      nodeA.connect(nodeB);

      // Node A defines the syndicate and cartel via actions
      nodeA.executeLocalAction({
        type: "CREATE_SYNDICATE",
        id: "syndicate_1",
        name: "Syndicate 1",
        members: ["agent_a", "agent_b"],
        timestamp: 100,
      } as any);

      nodeA.executeLocalAction({
        type: "DEFINE_MERCHANT_CARTEL",
        cartelId: "cartel_1",
        name: "Cartel 1",
        members: ["agent_a", "agent_b"],
        factionId: "rangers",
        priceMultiplier: 1.5,
        timestamp: 100,
      } as any);

      // Gossip Node A state to Node B so they share the defined syndicate and cartel
      nodeA.gossip();

      // Node A: Appoint ringleader
      nodeA.executeLocalAction({
        type: "APPOINT_RINGLEADER",
        syndicateId: "syndicate_1",
        ringleaderId: "agent_b",
        timestamp: 150,
      } as any);

      // Node B: Vote cartel tax
      const resB = nodeB.executeLocalAction({
        type: "VOTE_CARTEL_GLOBAL_TAX",
        cartelId: "cartel_1",
        taxRate: 40,
        timestamp: 160,
      } as any);

      expect(nodeA.localState.syndicates?.["syndicate_1"]?.ringleader).toBe("agent_b");
      expect(nodeB.localState.cartelGlobalTaxPolicy?.["cartel_1"]).toBe(40);

      // Gossip sync between Node A and Node B in both directions to fully converge
      nodeA.gossip();
      nodeB.gossip();
      nodeA.gossip();

      // Verify convergence of both fields
      expect(nodeB.localState.syndicates?.["syndicate_1"]?.ringleader).toBe("agent_b");
      expect(nodeA.localState.cartelGlobalTaxPolicy?.["cartel_1"]).toBe(40);
      expect(nodeA.localState.cartelGlobalTaxVotes?.["cartel_1"]?.["agent_b"]?.rate).toBe(40);
    });
  });

  describe("Dynamic Cartel Global Tax Crossing Tolls", () => {
    it("should dynamically add cartel global tax based on policy during smuggling convoy traverses", () => {
      let state = createInitialState({
        seed: 42,
        start: "room_1",
        varsInit: {
          gold_agent_a: 500,
        },
        agentsInit: ["agent_a"],
      });

      state.syndicates = {
        syndicate_1: {
          id: "syndicate_1",
          name: "Syndicate 1",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      state.tradeRoutes = {
        route_1: {
          id: "route_1",
          factionId: "rangers",
          rooms: ["room_1", "room_2"],
          definedBy: "agent_a",
          taxShare: 10,
          timestamp: 100,
        },
      };

      state.cartels = {
        cartel_1: {
          id: "cartel_1",
          name: "Cartel 1",
          members: ["agent_a"],
          factionId: "rangers",
          priceMultiplier: 1.5,
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      // Faction controls room_2
      state.territoryControl = {
        room_2: "rangers",
      };

      // No license: base tax 5 + 15 unlicensed = 20 toll per cargo
      // Convoy organized with cargo=2
      state.smugglingConvoys = {
        convoy_1: {
          id: "convoy_1",
          syndicateId: "syndicate_1",
          routeId: "route_1",
          currentRoomIndex: 0,
          cargo: 2,
          goldCost: 100,
          status: "en_route",
          definedBy: "agent_a",
          timestamp: 100,
        },
      };

      // Set Cartel Global Tax Policy rate to 10
      state.cartelGlobalTaxPolicy = {
        cartel_1: 10,
      };

      const events: any[] = [];
      const tickedState = tickSmugglingConvoys(state, events, mockPack);

      // Verify the toll details:
      // Base/unlicensed toll = 20 * 2 = 40 gold.
      // Cartel Global Tax toll = 10 * 2 = 20 gold.
      // Total Toll = 60 gold.
      // Remaining gold: 500 - 60 = 440 gold.
      // Wait, let's remember: Faction control room base rep is 0.
      // rep = 0 (< 10) => base tax is 10.
      // unlicensed => tax += 15 = 25.
      // base toll = 25 * 2 = 50.
      // cartel tax = 10 * 2 = 20.
      // Total toll = 70.
      // 500 - 70 = 430.
      expect(tickedState.vars?.["gold_agent_a"]).toBe(430);

      // Verify journal logs paid tolls
      const journalEntry = tickedState.journal?.find(j => j.includes("paid 70 gold in faction/cartel tolls"));
      expect(journalEntry).toBeDefined();
    });
  });
});
