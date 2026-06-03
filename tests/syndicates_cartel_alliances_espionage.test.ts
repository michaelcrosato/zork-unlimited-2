import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";
import { calculateTradePrice } from "../src/core/economy.js";

describe("Syndicate Cartel Alliances & Espionage sharing (AF-69)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "syndicate_alliance_test_pack",
      title: "Syndicate Alliance Test Pack",
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
        description: "A busy trading hub.",
        faction: "rangers",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "NORTH",
            to: "safehouse_room",
          },
        ],
      },
      {
        id: "safehouse_room",
        name: "Syndicate Safehouse Room",
        description: "A secure sanctuary.",
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
    objects: [
      {
        id: "contraband_spice",
        name: "Spice",
        description: "A pinch of illegal spice.",
        cost: 100,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [],
  });

  it("should successfully vote on and establish syndicate alliances using tie-breaking consensus", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 100 },
      agentsInit: ["agent_a", "agent_b", "agent_c"],
    });

    state.syndicates = {
      syndicate_a: {
        id: "syndicate_a",
        name: "Syndicate A",
        members: ["agent_a", "agent_b", "agent_c"],
        definedBy: "agent_a",
        timestamp: 1000,
      },
      syndicate_b: {
        id: "syndicate_b",
        name: "Syndicate B",
        members: ["agent_d"],
        definedBy: "agent_d",
        timestamp: 1000,
      },
    };

    // Test rejection validations:
    // 1. Same syndicate
    const resSame = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_a",
          targetState: "allied",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resSame.ok).toBe(false);
    expect(resSame.rejectionReason).toContain("Cannot form alliance with the same syndicate");

    // 2. Non-existent syndicate
    const resInvalid = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_xyz",
          targetState: "allied",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resInvalid.ok).toBe(false);
    expect(resInvalid.rejectionReason).toContain("does not exist");

    // 3. Agent is not a member of syndicate A
    const resNonMember = multiAgentStep(
      state,
      {
        agentId: "agent_d",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_b",
          targetState: "allied",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resNonMember.ok).toBe(false);
    expect(resNonMember.rejectionReason).toContain("is not a member of syndicate");

    // 4. Valid alliance proposal
    const resA = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_b",
          targetState: "allied",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resA.ok).toBe(true);
    expect(resA.state.syndicateAlliances?.["syndicate_a"]?.["syndicate_b"]).toBe("allied");
    expect(resA.state.syndicateAlliances?.["syndicate_b"]?.["syndicate_a"]).toBe("allied");

    // 5. Test tie-breaking deterministic consensus:
    // agent_a votes "allied", agent_b votes "hostile", agent_c votes "neutral"
    let tieState = resA.state;
    const resB = multiAgentStep(
      tieState,
      {
        agentId: "agent_b",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_b",
          targetState: "hostile",
          timestamp: 2100,
        },
      },
      mockPack
    );
    expect(resB.ok).toBe(true);

    const resC = multiAgentStep(
      resB.state,
      {
        agentId: "agent_c",
        action: {
          type: "PROPOSE_SYNDICATE_ALLIANCE",
          syndicateIdA: "syndicate_a",
          syndicateIdB: "syndicate_b",
          targetState: "neutral",
          timestamp: 2200,
        },
      },
      mockPack
    );
    expect(resC.ok).toBe(true);

    // Three votes: allied, hostile, neutral. All have count = 1.
    // The consensus priority is "allied" > "hostile" > "neutral"
    // So the consensus state should remain "allied"
    expect(resC.state.syndicateAlliances?.["syndicate_a"]?.["syndicate_b"]).toBe("allied");
  });

  it("should permit trading and scale pricing correctly at safehouse black markets controlled by allied syndicates", () => {
    let state = createInitialState({
      seed: 42,
      start: "safehouse_room",
      varsInit: { gold: 100, gold_agent_b: 100 },
      agentsInit: ["player", "agent_b"],
    });

    state.syndicates = {
      syndicate_a: {
        id: "syndicate_a",
        name: "Syndicate A",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
      },
      syndicate_b: {
        id: "syndicate_b",
        name: "Syndicate B",
        members: ["agent_b"],
        definedBy: "agent_b",
        timestamp: 1000,
      },
    };

    // Establish alliance between syndicate_a and syndicate_b
    state.syndicateAlliances = {
      syndicate_a: { syndicate_b: "allied" },
      syndicate_b: { syndicate_a: "allied" },
    };

    // Set up safehouse owned by syndicate_a in safehouse_room
    state.safehouses = {
      safehouse_room: {
        id: "safehouse_safehouse_room",
        roomId: "safehouse_room",
        ownerId: "player",
        syndicateId: "syndicate_a",
        level: 1,
        stashCapacity: 10,
        stashItems: [],
        timestamp: 1500,
      },
    };

    const itemObj = {
      id: "contraband_spice",
      name: "Spice",
      cost: 100,
      contraband: true,
    };

    // 1. Owning member (player) price:
    // Base cost: 100
    // Contraband multiplier for selling: 1.2
    // Owner member premium multiplier: 1.2
    // Final price = 100 * 1.2 * 1.2 = 144
    const ownerPrice = calculateTradePrice(
      state,
      { id: "player" },
      itemObj,
      100,
      false, // isBuy = false (selling)
      "player",
      mockPack
    );
    expect(ownerPrice).toBe(144);

    // 2. Allied syndicate member (agent_b) price:
    // Base cost: 100
    // Contraband multiplier for selling: 1.2
    // Allied member premium multiplier: 1.1 (scaled benefit)
    // Final price = 100 * 1.2 * 1.1 = 132
    const alliedPrice = calculateTradePrice(
      state,
      { id: "agent_b" },
      itemObj,
      100,
      false, // isBuy = false (selling)
      "agent_b",
      mockPack
    );
    expect(alliedPrice).toBe(132);

    // 3. Unauthorized non-member trader
    // If agent_c (not in any syndicate) tries to trade at the safehouse, it should be rejected at engine level
    let stateUnauthorized = { ...state };
    stateUnauthorized.inventory = ["contraband_spice"];
    stateUnauthorized.agents = {
      agent_c: {
        id: "agent_c",
        current: "safehouse_room",
        inventory: ["contraband_spice"],
      },
    };

    const resUnauth = multiAgentStep(
      stateUnauthorized,
      {
        agentId: "agent_c",
        action: {
          type: "SELL_BLACK_MARKET",
          itemId: "contraband_spice",
          roomId: "safehouse_room",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resUnauth.ok).toBe(false);
    expect(resUnauth.rejectionReason).toContain("Unauthorized to trade at this safehouse");

    // 4. Authorized allied member trading successfully
    let stateAuthorized = { ...state };
    stateAuthorized.vars["gold_agent_b"] = 100;
    stateAuthorized.agents = {
      agent_b: {
        id: "agent_b",
        current: "safehouse_room",
        inventory: ["contraband_spice"],
      },
    };
    stateAuthorized.inventory = ["contraband_spice"]; // Agent's inventory is merged with state inventory in multiagent step local state

    const resAuth = multiAgentStep(
      stateAuthorized,
      {
        agentId: "agent_b",
        action: {
          type: "SELL_BLACK_MARKET",
          itemId: "contraband_spice",
          roomId: "safehouse_room",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resAuth.ok).toBe(true);
    // Gold distributed to agent_b should include the 132 payout
    expect(resAuth.state.vars["gold_agent_b"]).toBe(100 + 132);
  });

  it("should share espionage and wiretap logs successfully across allied syndicates", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      varsInit: { gold: 100 },
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
          report_1: {
            id: "report_1",
            type: "wiretap_log",
            roomId: "market",
            value: 150,
            timestamp: 1200,
          },
          report_2: {
            id: "report_2",
            type: "transaction_map",
            roomId: "safehouse_room",
            value: 200,
            timestamp: 1300,
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

    // Set up active wiretap in room 'market' owned by syndicate_a
    state.wiretaps = {
      market: {
        roomId: "market",
        syndicateId: "syndicate_a",
        cost: 50,
        timestamp: 1100,
        status: "active",
      },
    };

    // 1. Share should fail when not allied
    const resFailAlliance = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SHARE_ESPIONAGE_DATA",
          syndicateId: "syndicate_a",
          targetSyndicateId: "syndicate_b",
          roomId: "market",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resFailAlliance.ok).toBe(false);
    expect(resFailAlliance.rejectionReason).toContain("are not allied");

    // Establish alliance
    state.syndicateAlliances = {
      syndicate_a: { syndicate_b: "allied" },
      syndicate_b: { syndicate_a: "allied" },
    };

    // 2. Share should fail if room doesn't have an active espionage/wiretap network owned by syndicate_a
    const resFailNoWiretap = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SHARE_ESPIONAGE_DATA",
          syndicateId: "syndicate_a",
          targetSyndicateId: "syndicate_b",
          roomId: "safehouse_room", // no wiretap owned by A in safehouse_room
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resFailNoWiretap.ok).toBe(false);
    expect(resFailNoWiretap.rejectionReason).toContain("does not have an active espionage network or wiretap");

    // 3. Share should succeed when allied and wiretap present
    const resSuccess = multiAgentStep(
      state,
      {
        agentId: "agent_a",
        action: {
          type: "SHARE_ESPIONAGE_DATA",
          syndicateId: "syndicate_a",
          targetSyndicateId: "syndicate_b",
          roomId: "market",
          timestamp: 2000,
        },
      },
      mockPack
    );
    expect(resSuccess.ok).toBe(true);

    // Syndicate B's intelStock should now have report_1 (roomId 'market') copied!
    const stockB = resSuccess.state.syndicates?.["syndicate_b"]?.intelStock;
    expect(stockB).toBeDefined();
    expect(stockB?.["report_1"]).toBeDefined();
    expect(stockB?.["report_1"]?.value).toBe(150);

    // It should NOT have copied report_2 since report_2 was for 'safehouse_room'
    expect(stockB?.["report_2"]).toBeUndefined();

    // It should also have generated a default shared report for 'market'
    expect(stockB?.["shared_intel_market_2000"]).toBeDefined();
    expect(stockB?.["shared_intel_market_2000"]?.type).toBe("wiretap_log");
  });
});
