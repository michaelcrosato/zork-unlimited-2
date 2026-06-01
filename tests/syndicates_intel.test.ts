import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate Black Market Informants & Intel Trading (AF-65)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "intel_test_pack",
      title: "Intel Trading Test Pack",
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

  it("should handle BUY_INTEL_REPORT validations, gold deduction, and strategic benefits", () => {
    let state = createInitialState({
      seed: 42,
      start: "front_room",
      varsInit: { gold: 50, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
    };

    // 1. Rejected if non-member attempts to buy
    const nonMemberCheck = multiAgentStep(
      state,
      {
        agentId: "agent_b",
        action: {
          type: "BUY_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_1",
          intelType: "wiretap_log",
          roomId: "front_room",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(nonMemberCheck.ok).toBe(false);
    expect(nonMemberCheck.rejectionReason).toContain("is not a member of syndicate");

    // 2. Rejected if agent has insufficient gold
    const poorAgentCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BUY_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_1",
          intelType: "wiretap_log",
          roomId: "front_room",
          cost: 1000,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(poorAgentCheck.ok).toBe(false);
    expect(poorAgentCheck.rejectionReason).toContain("Insufficient gold");

    // 3. Rejected if no black market merchant present (moving agent_a to safehouse_room with no NPC)
    state.agents = {
      agent_a: {
        id: "agent_a",
        current: "safehouse_room",
        inventory: [],
      },
    };

    const noMerchantCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BUY_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_1",
          intelType: "wiretap_log",
          roomId: "front_room",
          cost: 100,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(noMerchantCheck.ok).toBe(false);
    expect(noMerchantCheck.rejectionReason).toContain("Intel trading requires a black market presence");

    // Reset agent_a position back to front_room
    state.agents.agent_a.current = "front_room";

    // 4. Successful BUY_INTEL_REPORT (wiretap_log)
    const successWiretap = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BUY_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_wiretap",
          intelType: "wiretap_log",
          roomId: "front_room",
          cost: 150,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(successWiretap.ok).toBe(true);
    expect(successWiretap.state.vars.gold_agent_a).toBe(350); // 500 - 150
    const shadowSyndicate = successWiretap.state.syndicates?.syndicate_shadow;
    expect(shadowSyndicate).toBeDefined();
    expect(shadowSyndicate?.intelStock?.report_wiretap).toBeDefined();
    expect(shadowSyndicate?.intelStock?.report_wiretap.type).toBe("wiretap_log");
    expect(shadowSyndicate?.intelStock?.report_wiretap.value).toBe(225); // 150 * 1.5
    expect(shadowSyndicate?.intelTransactions?.length).toBe(1);
    expect(shadowSyndicate?.intelTransactions?.[0].type).toBe("buy");
    expect(shadowSyndicate?.intelTransactions?.[0].gold).toBe(150);

    // Verify wiretap_log strategic benefit: automatically places wiretap
    expect(successWiretap.state.wiretaps?.front_room).toBeDefined();
    expect(successWiretap.state.wiretaps?.front_room.syndicateId).toBe("syndicate_shadow");

    // 5. Successful BUY_INTEL_REPORT (raid_schedule)
    const successRaid = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "BUY_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_raid",
          intelType: "raid_schedule",
          roomId: "front_room",
          cost: 100,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(successRaid.ok).toBe(true);
    expect(successRaid.state.vars.gold_agent_a).toBe(400); // 500 - 100
    // Verify raid_schedule strategic benefit: schedules raid warning
    expect(successRaid.state.raidWarnings?.front_room).toBeDefined();
    expect(successRaid.state.raidWarnings?.front_room.active).toBe(true);
    expect(successRaid.state.raidWarnings?.front_room.scheduledStep).toBe(state.step + 5);
  });

  it("should handle SELL_INTEL_REPORT validations, gold addition, and strategic benefits", () => {
    let state = createInitialState({
      seed: 42,
      start: "front_room",
      varsInit: { gold: 50, gold_agent_a: 500 },
      agentsInit: ["agent_a"],
    });

    state.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        dominance: 50,
        intelStock: {
          report_wiretap: {
            id: "report_wiretap",
            type: "wiretap_log",
            roomId: "front_room",
            value: 200,
            timestamp: 1001,
          },
          report_raid: {
            id: "report_raid",
            type: "raid_schedule",
            roomId: "front_room",
            value: 300,
            timestamp: 1001,
          },
        },
      },
    };

    // Initialize heat
    state.enforcementHeat = {
      front_room: {
        roomId: "front_room",
        heat: 40,
        timestamp: 1000,
      },
    };

    // 1. Rejected if report not in stock
    const noReportCheck = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SELL_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "nonexistent_report",
          gold: 200,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(noReportCheck.ok).toBe(false);
    expect(noReportCheck.rejectionReason).toContain("does not exist in syndicate");

    // 2. Successful SELL_INTEL_REPORT (wiretap_log)
    const successWiretap = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SELL_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_wiretap",
          gold: 200,
          timestamp: 1002,
        } as any,
      },
      mockPack
    );
    expect(successWiretap.ok).toBe(true);
    expect(successWiretap.state.vars.gold_agent_a).toBe(700); // 500 + 200
    const shadowSyndicate = successWiretap.state.syndicates?.syndicate_shadow;
    expect(shadowSyndicate?.intelStock?.report_wiretap).toBeUndefined(); // removed from stock
    expect(shadowSyndicate?.intelTransactions?.length).toBe(1);
    expect(shadowSyndicate?.intelTransactions?.[0].type).toBe("sell");

    // Verify wiretap_log strategic benefits: dominance and npcRep boosts
    expect(shadowSyndicate?.dominance).toBe(55); // 50 + 5
    expect(successWiretap.state.npcRep?.merchant_timmy).toBe(10); // +10 npcRep

    // 3. Successful SELL_INTEL_REPORT (raid_schedule)
    const successRaid = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SELL_INTEL_REPORT",
          syndicateId: "syndicate_shadow",
          reportId: "report_raid",
          gold: 300,
          timestamp: 1003,
        } as any,
      },
      mockPack
    );
    expect(successRaid.ok).toBe(true);
    expect(successRaid.state.vars.gold_agent_a).toBe(800); // 500 + 300
    expect(successRaid.state.enforcementHeat?.front_room?.heat).toBe(19); // 40 - 20 - 1 (decay per step)
    expect(successRaid.state.deflectionPolicies?.front_room).toBeDefined();
    expect(successRaid.state.deflectionPolicies?.front_room.active).toBe(true);
  });

  it("should merge intelStock and intelTransactions correctly during gossip merges (LWW CRDT)", () => {
    let stateA = createInitialState({ seed: 42, start: "safehouse_room" });
    let stateB = createInitialState({ seed: 42, start: "safehouse_room" });

    stateA.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 1000,
        intelStock: {
          report_1: {
            id: "report_1",
            type: "wiretap_log",
            roomId: "front_room",
            value: 100,
            timestamp: 1000,
          },
        },
        intelTransactions: [
          {
            id: "tx_1",
            agentId: "agent_a",
            type: "buy",
            reportId: "report_1",
            gold: 100,
            timestamp: 1000,
          },
        ],
      },
    };

    stateB.syndicates = {
      syndicate_shadow: {
        id: "syndicate_shadow",
        name: "Shadow Syndicate",
        members: ["agent_a"],
        definedBy: "agent_a",
        timestamp: 2000, // Newer timestamp
        intelStock: {
          report_1: {
            id: "report_1",
            type: "wiretap_log",
            roomId: "front_room",
            value: 100,
            timestamp: 1000,
          },
          report_2: {
            id: "report_2",
            type: "transaction_map",
            roomId: "front_room",
            value: 150,
            timestamp: 2000,
          },
        },
        intelTransactions: [
          {
            id: "tx_1",
            agentId: "agent_a",
            type: "buy",
            reportId: "report_1",
            gold: 100,
            timestamp: 1000,
          },
          {
            id: "tx_2",
            agentId: "agent_a",
            type: "buy",
            reportId: "report_2",
            gold: 150,
            timestamp: 2000,
          },
        ],
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    const shadowSyndicate = merged.syndicates?.syndicate_shadow;
    expect(shadowSyndicate).toBeDefined();
    // B's newer timestamp should override A
    expect(shadowSyndicate?.timestamp).toBe(2000);
    expect(shadowSyndicate?.intelStock?.report_2).toBeDefined();
    expect(shadowSyndicate?.intelTransactions?.length).toBe(2);
  });
});
