import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate Black Market Informant Sabotage & Undercover Enforcer Defection (AF-66)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "intel_sabotage_test_pack",
      title: "Intel Sabotage & Flip Test Pack",
      start_room: "safehouse_room",
      vars_init: { gold: 1000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure safehouse room.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "front_room",
          },
        ],
      },
      {
        id: "front_room",
        name: "Front Business Room",
        description: "A room with active trade operations.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [
          {
            direction: "SOUTH",
            to: "safehouse_room",
          },
        ],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Merchant Timmy",
        description: "A local trader.",
        gold: 200,
        restock_interval: 10,
        possible_items: [],
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Hello!",
              topics: [],
            },
          ],
        },
      },
    ],
  });

  describe("SABOTAGE_NETWORK", () => {
    it("should handle SABOTAGE_NETWORK validations", () => {
      let state = createInitialState({
        seed: 42,
        start: "front_room",
        varsInit: { gold: 1000 },
        agentsInit: ["agent_a", "agent_b"],
      });

      state.syndicates = {
        syndicate_a: {
          id: "syndicate_a",
          name: "Syndicate A",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 1000,
          intelStock: {
            report_x: {
              id: "report_x",
              type: "wiretap_log",
              roomId: "front_room",
              value: 100,
              timestamp: 1000,
            },
          },
        },
        syndicate_b: {
          id: "syndicate_b",
          name: "Syndicate B",
          members: ["agent_b"],
          definedBy: "agent_b",
          timestamp: 1000,
        },
      };

      // Set up a rival espionage network in front_room
      state.espionageNetworks = {
        front_room: {
          roomId: "front_room",
          syndicateId: "syndicate_b",
          cost: 100,
          timestamp: 1000,
          status: "active",
        },
      };

      // 1. Rejected if non-member attempts to sabotage
      const nonMemberCheck = multiAgentStep(
        state,
        {
          agentId: "agent_b", // Agent B is not a member of Syndicate A
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_b",
            roomId: "front_room",
            targetType: "espionage_network",
            reportId: "report_x",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(nonMemberCheck.ok).toBe(false);
      expect(nonMemberCheck.rejectionReason).toContain("is not a member of syndicate");

      // 2. Rejected if own syndicate is target
      const ownTargetCheck = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_a",
            roomId: "front_room",
            targetType: "espionage_network",
            reportId: "report_x",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(ownTargetCheck.ok).toBe(false);
      expect(ownTargetCheck.rejectionReason).toContain("cannot sabotage your own syndicate");

      // 3. Rejected if reportId does not exist in stock
      const missingReportCheck = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_b",
            roomId: "front_room",
            targetType: "espionage_network",
            reportId: "report_missing",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(missingReportCheck.ok).toBe(false);
      expect(missingReportCheck.rejectionReason).toContain("does not exist in syndicate");

      // 4. Rejected if no black market / safehouse / front presence
      // (Let's temporarily move agent_a to safehouse_room and remove npcs/safehouses/blackMarkets from safehouse_room to simulate no presence)
      state.agents = {
        agent_a: {
          id: "agent_a",
          current: "safehouse_room",
          inventory: [],
        },
      };
      const noPresenceCheck = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_b",
            roomId: "front_room",
            targetType: "espionage_network",
            reportId: "report_x",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(noPresenceCheck.ok).toBe(false);
      expect(noPresenceCheck.rejectionReason).toContain("requires a black market presence");
    });

    it("should successfully sabotage a rival espionage network and wiretap", () => {
      let state = createInitialState({
        seed: 42,
        start: "front_room",
        varsInit: { gold: 1000 },
        agentsInit: ["agent_a"],
      });

      state.syndicates = {
        syndicate_a: {
          id: "syndicate_a",
          name: "Syndicate A",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 1000,
          intelStock: {
            report_x: {
              id: "report_x",
              type: "wiretap_log",
              roomId: "front_room",
              value: 100,
              timestamp: 1000,
            },
          },
        },
        syndicate_b: {
          id: "syndicate_b",
          name: "Syndicate B",
          members: ["agent_b"],
          definedBy: "agent_b",
          timestamp: 1000,
        },
      };

      state.espionageNetworks = {
        front_room: {
          roomId: "front_room",
          syndicateId: "syndicate_b",
          cost: 100,
          timestamp: 1000,
          status: "active",
        },
      };

      // Perform sabotage on Espionage Network
      const res = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_b",
            roomId: "front_room",
            targetType: "espionage_network",
            reportId: "report_x",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.espionageNetworks?.["front_room"]?.status).toBe("sabotaged");
      expect(res.state.syndicates?.["syndicate_a"]?.intelStock?.["report_x"]).toBeUndefined();
      expect(res.state.journal[res.state.journal.length - 1]).toContain(
        "sabotaged rival syndicate syndicate_b espionage_network"
      );

      // Verify that economy passive tax tick ignores this sabotaged network
      // First, set up territory control: "front_room" controlled by "rangers", rep = 20 (leads to 2 tax gold)
      res.state.territoryControl = { front_room: "rangers" };
      res.state.factionRep = { rangers: 20 };
      res.state.step = 5; // economy tax tick triggers at step > 0 && step % 5 === 0

      // Let's run tickEconomy on this state
      const stateWithTaxTick = tickEconomy(res.state, mockPack);
      // Flipped player gold should increase by 2 (full tax generated since espionage didn't intercept, from initial 1000 gold)
      expect(stateWithTaxTick.vars["gold"]).toBe(1002);
      // syndicate_b members (e.g. agent_b) should NOT receive any intercepted gold (gold_agent_b should remain undefined/0)
      expect(stateWithTaxTick.vars["gold_agent_b"]).toBeUndefined();
    });

    it("should successfully sabotage a rival wiretap", () => {
      let state = createInitialState({
        seed: 42,
        start: "front_room",
        varsInit: { gold: 1000 },
        agentsInit: ["agent_a"],
      });

      state.syndicates = {
        syndicate_a: {
          id: "syndicate_a",
          name: "Syndicate A",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 1000,
          intelStock: {
            report_y: {
              id: "report_y",
              type: "wiretap_log",
              roomId: "front_room",
              value: 100,
              timestamp: 1000,
            },
          },
        },
        syndicate_b: {
          id: "syndicate_b",
          name: "Syndicate B",
          members: ["agent_b"],
          definedBy: "agent_b",
          timestamp: 1000,
        },
      };

      state.wiretaps = {
        front_room: {
          roomId: "front_room",
          syndicateId: "syndicate_b",
          cost: 100,
          timestamp: 1000,
          status: "active",
        },
      };

      // Perform sabotage on Wiretap
      const res = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "SABOTAGE_NETWORK",
            syndicateId: "syndicate_a",
            targetSyndicateId: "syndicate_b",
            roomId: "front_room",
            targetType: "wiretap",
            reportId: "report_y",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.wiretaps?.["front_room"]?.status).toBe("sabotaged");
      expect(res.state.syndicates?.["syndicate_a"]?.intelStock?.["report_y"]).toBeUndefined();
    });
  });

  describe("FLIP_UNDERCOVER_AGENT", () => {
    it("should handle FLIP_UNDERCOVER_AGENT validations and successfully flip the agent", () => {
      let state = createInitialState({
        seed: 42,
        start: "front_room",
        varsInit: { gold: 1000 },
        agentsInit: ["agent_a"],
      });

      state.syndicates = {
        syndicate_shadow: {
          id: "syndicate_shadow",
          name: "Shadow Syndicate",
          members: ["agent_a"],
          definedBy: "agent_a",
          timestamp: 1000,
          intelTransactions: [], // Empty!
        },
      };

      state.undercoverAgents = {
        mole_1: {
          id: "mole_1",
          syndicateId: "syndicate_shadow",
          name: "Agent Mulder",
          intelAccumulated: 20,
          status: "active",
          timestamp: 1000,
        },
      };

      // 1. Rejected if syndicate has no intel transactions
      const noTxCheck = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "FLIP_UNDERCOVER_AGENT",
            syndicateId: "syndicate_shadow",
            agentId: "mole_1",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(noTxCheck.ok).toBe(false);
      expect(noTxCheck.rejectionReason).toContain("must have at least one intel transaction record");

      // Now add an intel transaction to make the check pass
      state.syndicates.syndicate_shadow.intelTransactions = [
        {
          id: "tx_1",
          agentId: "agent_a",
          type: "buy",
          reportId: "report_x",
          gold: 100,
          timestamp: 1000,
        },
      ];

      // 2. Rejected if undercover agent does not exist
      const missingAgentCheck = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "FLIP_UNDERCOVER_AGENT",
            syndicateId: "syndicate_shadow",
            agentId: "mole_missing",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );
      expect(missingAgentCheck.ok).toBe(false);
      expect(missingAgentCheck.rejectionReason).toContain("does not exist");

      // 3. Successful flip
      const res = multiAgentStep(
        state,
        {
          agentId: "agent_a",
          action: {
            type: "FLIP_UNDERCOVER_AGENT",
            syndicateId: "syndicate_shadow",
            agentId: "mole_1",
            timestamp: 1001,
          } as any,
        },
        mockPack
      );

      expect(res.ok).toBe(true);
      expect(res.state.undercoverAgents?.["mole_1"]?.status).toBe("rooted_out");
      expect(res.state.informants?.["mole_1"]?.status).toBe("active");
      expect(res.state.informants?.["mole_1"]?.syndicateId).toBe("syndicate_shadow");
      expect(res.state.journal[res.state.journal.length - 1]).toContain("was flipped to a syndicate informant");
    });
  });

  describe("Mesh Gossip Sync Integration", () => {
    it("should reconcile sabotaged networks and flipped agents correctly via mergeMonotonicStateFields", () => {
      let stateA = createInitialState({ seed: 1, start: "front_room" });
      let stateB = createInitialState({ seed: 1, start: "front_room" });

      stateA.espionageNetworks = {
        front_room: {
          roomId: "front_room",
          syndicateId: "syndicate_b",
          cost: 100,
          timestamp: 1000,
          status: "active",
        },
      };

      // Sabotaged in stateB with higher timestamp
      stateB.espionageNetworks = {
        front_room: {
          roomId: "front_room",
          syndicateId: "syndicate_b",
          cost: 100,
          timestamp: 1002,
          status: "sabotaged",
        },
      };

      stateA.undercoverAgents = {
        mole_1: {
          id: "mole_1",
          syndicateId: "syndicate_a",
          name: "Agent Mulder",
          intelAccumulated: 20,
          status: "active",
          timestamp: 1000,
        },
      };

      // Flipped in stateB with higher timestamp
      stateB.undercoverAgents = {
        mole_1: {
          id: "mole_1",
          syndicateId: "syndicate_a",
          name: "Agent Mulder",
          intelAccumulated: 20,
          status: "rooted_out",
          timestamp: 1002,
        },
      };
      stateB.informants = {
        mole_1: {
          id: "mole_1",
          name: "Agent Mulder",
          syndicateId: "syndicate_a",
          status: "active",
          timestamp: 1002,
        },
      };

      // Merge B into A
      const merged = mergeMonotonicStateFields(stateA, stateB);

      expect(merged.espionageNetworks?.["front_room"]?.status).toBe("sabotaged");
      expect(merged.undercoverAgents?.["mole_1"]?.status).toBe("rooted_out");
      expect(merged.informants?.["mole_1"]?.status).toBe("active");
    });
  });
});
