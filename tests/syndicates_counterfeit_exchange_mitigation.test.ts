import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { multiAgentStep } from "../src/core/sync.js";
import { reconstructState } from "../src/core/gossip.js";
import { getCounterfeitExchangeRate, tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Smuggler Syndicate Cartel Counterfeit Currency, Dynamic Black-Market Exchange Rates, and Audit Mitigation (AF-82)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "counterfeit_exchange_mitigation_test_pack",
      title: "Counterfeit and Audit Mitigation Test Pack",
      start_room: "market",
      vars_init: { gold: 1000, hp: 20, max_hp: 20 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A busy trading hub.",
        objects: [],
        npcs: ["merchant_timmy"],
        exits: [
          {
            direction: "NORTH",
            to: "alley",
          },
        ],
      },
      {
        id: "alley",
        name: "Dark Alley",
        description: "A dark back alley.",
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
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "Simple shield.",
        cost: 100,
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "merchant_timmy",
        name: "Timmy the Merchant",
        description: "A friendly local merchant.",
        hp: 30,
        max_hp: 30,
        attack: 1,
        defense: 1,
        gold: 1000,
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

  it("should validate and execute MINT_COUNTERFEIT_GOLD action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player", "player2"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Rejects if syndicateId is missing or invalid
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MINT_COUNTERFEIT_GOLD",
          syndicateId: "",
          agentId: "player",
          amount: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Syndicate ID is required");

    // 2. Rejects if agent is not a member of the syndicate
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MINT_COUNTERFEIT_GOLD",
          syndicateId: "synd_shadows",
          agentId: "player2",
          amount: 200,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Agent player cannot mint on behalf of player2");

    // 3. Rejects if amount is not positive integer
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MINT_COUNTERFEIT_GOLD",
          syndicateId: "synd_shadows",
          agentId: "player",
          amount: -50,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("must be a positive integer");

    // 4. Rejects if insufficient real gold to cover cost (amount * 0.3 = 200 * 0.3 = 60 real gold needed, has 500 which is enough. Let's ask for amount=2000 so cost=600)
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MINT_COUNTERFEIT_GOLD",
          syndicateId: "synd_shadows",
          agentId: "player",
          amount: 2000, // cost = 600 real gold
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Insufficient real gold");

    // 5. Succeeds if all validations pass
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "MINT_COUNTERFEIT_GOLD",
          syndicateId: "synd_shadows",
          agentId: "player",
          amount: 1000, // cost = 300 real gold
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(200); // 500 - 300
    expect(res.state.vars["counterfeit_gold"]).toBe(1000);
    expect(res.state.journal).toContain(
      "[Syndicate] Agent player minted 1000 counterfeit gold at a cost of 300 real gold."
    );
  });

  it("should validate and execute TRADE_EXCHANGE_RATE action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Rejects if rate is negative or zero
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRADE_EXCHANGE_RATE",
          syndicateId: "synd_shadows",
          baseRate: -0.5,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("must be positive");

    // 2. Succeeds if valid and registers baseRate correctly
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRADE_EXCHANGE_RATE",
          syndicateId: "synd_shadows",
          baseRate: 0.8,
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.tradeExchangeRates?.["synd_shadows"]?.baseRate).toBe(0.8);
  });

  it("should calculate exchange rate and integrate with BUY and SELL transactions", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500, counterfeit_gold: 500 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 80,
      },
    };

    // Set base exchange rate
    state.tradeExchangeRates = {
      synd_shadows: {
        syndicateId: "synd_shadows",
        baseRate: 0.8,
        timestamp: 1,
      },
    };

    // Low heat room: 20
    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 20,
        timestamp: 1,
      },
    };

    // Calculate dynamic exchange rate:
    // baseRate = 0.8
    // heatFactor = 1 - 20 / 200 = 0.9
    // dominanceFactor = 1 + 80 / 200 = 1.4
    // rate = 0.8 * 0.9 * 1.4 = 1.008
    const rate = getCounterfeitExchangeRate(state, "synd_shadows", "market");
    expect(rate).toBeCloseTo(1.008, 3);

    // Setup Timmy's merchant inventory
    state.merchantInventories = {
      merchant_timmy: ["wooden_shield"],
    };

    // 1. BUY action with counterfeit gold
    // Item cost is 100 gold
    // Counterfeit cost = Math.ceil(100 / 1.008) = 100 counterfeit gold
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "BUY",
          npc: "merchant_timmy",
          item: "wooden_shield",
          useCounterfeit: true,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.vars["counterfeit_gold"]).toBe(400); // 500 - 100
    expect(res.state.vars["gold"]).toBe(500); // unchanged
    expect(res.state.inventory).toContain("wooden_shield");

    // 2. SELL action with counterfeit gold
    // Give item back to player first
    res.state.inventory = ["wooden_shield"];
    res = multiAgentStep(
      res.state,
      {
        agentId: "player",
        action: {
          type: "SELL",
          npc: "merchant_timmy",
          item: "wooden_shield",
          useCounterfeit: true,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    const lastTrade = res.state.tradeHistory?.[res.state.tradeHistory.length - 1];
    const tradePayout = lastTrade?.gold ?? 98;
    expect(res.state.vars["counterfeit_gold"]).toBe(400 + tradePayout);
    expect(res.state.vars["gold"]).toBe(500); // unchanged
  });

  it("should validate and execute ESTABLISH_AUDIT_MITIGATION action", () => {
    let state = createInitialState({
      seed: 42,
      start: "market",
      agentsInit: ["player"],
      varsInit: { gold: 500 },
    });

    state.syndicates = {
      synd_shadows: {
        id: "synd_shadows",
        name: "Shadow Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1,
        dominance: 50,
      },
    };

    // 1. Rejects if gold is insufficient (requires 150)
    state.vars["gold"] = 100;
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_AUDIT_MITIGATION",
          roomId: "market",
          syndicateId: "synd_shadows",
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(false);
    expect(res.rejectionReason).toContain("Insufficient gold");

    // 2. Succeeds and increments level
    state.vars["gold"] = 500;
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ESTABLISH_AUDIT_MITIGATION",
          roomId: "market",
          syndicateId: "synd_shadows",
          timestamp: 10,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    expect(res.state.vars["gold"]).toBe(350); // 500 - 150
    expect(res.state.auditMitigations?.["market"]?.mitigationLevel).toBe(1);
    expect(res.state.auditMitigations?.["market"]?.active).toBe(true);
  });

  it("should reduce failed audit confiscation rates significantly under established audit mitigation policy", () => {
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
      },
    };

    // Setup front business with an active audit
    state.frontBusinesses = {
      merchant_timmy: {
        id: "front_merchant_timmy",
        merchantId: "merchant_timmy",
        roomId: "market",
        syndicateId: "shadow_cartel",
        level: 1,
        dirtyGold: 100,
        cleanGold: 50,
        launderingCapacity: 500,
        launderingRate: 50,
        timestamp: 1000,
        activeAudit: true, // Under active audit
      },
    };

    state.enforcementHeat = {
      market: {
        roomId: "market",
        heat: 40,
        timestamp: 1000,
      },
    };

    // No guards, defense score is 0. Audit will fail.
    // 1. Without audit mitigation:
    // Confiscated dirty = 100. Confiscated clean = 100 * 0.75 = 75.
    // Remaining clean = 25. Remaining dirty = 0.

    // 2. With Level 2 Audit Mitigation established in room "market":
    // Level 2 mitigation = 2 * 25% = 50% discount.
    // Confiscated dirty = Math.floor(100 * (1 - 0.5)) = 50. Remaining dirty = 100 - 50 = 50?
    // Wait, after laundering: dirty is 50.
    // Confiscated dirty = Math.floor(50 * 0.5) = 25. Remaining dirty = 50 - 25 = 25.
    // Confiscation factor = (1 - 0) * (1 - 0.5) = 0.5.
    // Confiscated clean = Math.floor(100 * 0.5 * 0.75) = 37.
    // Remaining clean = 100 - 37 = 63.
    state.auditMitigations = {
      market: {
        roomId: "market",
        syndicateId: "shadow_cartel",
        mitigationLevel: 2,
        timestamp: 1000,
        active: true,
      },
    };

    state.step = 5;

    // Run tickEconomy to resolve audit
    const tickedState = tickEconomy(state, mockPack);

    const front = tickedState.frontBusinesses?.["merchant_timmy"];
    expect(front?.activeAudit).toBe(false);

    // Verify all dirty gold was NOT fully confiscated (25 remains because of mitigation!)
    expect(front?.dirtyGold).toBe(25);

    // Verify clean gold was partially preserved (63 remains instead of 25!)
    expect(front?.cleanGold).toBe(63);
  });

  it("should merge tradeExchangeRates and auditMitigations state correctly using mergeMonotonicStateFields based on LWW LWW", () => {
    let stateA = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: {},
      agentsInit: ["player"],
    });

    let stateB = createInitialState({
      seed: 12345,
      start: "market",
      varsInit: {},
      agentsInit: ["player"],
    });

    stateA.tradeExchangeRates = {
      synd_shadows: {
        syndicateId: "synd_shadows",
        baseRate: 0.8,
        timestamp: 2000, // Newer
      },
    };

    stateB.tradeExchangeRates = {
      synd_shadows: {
        syndicateId: "synd_shadows",
        baseRate: 0.5,
        timestamp: 1000, // Older
      },
    };

    stateA.auditMitigations = {
      market: {
        roomId: "market",
        syndicateId: "synd_shadows",
        mitigationLevel: 2,
        timestamp: 1000, // Older
        active: true,
      },
    };

    stateB.auditMitigations = {
      market: {
        roomId: "market",
        syndicateId: "synd_shadows",
        mitigationLevel: 4,
        timestamp: 3000, // Newer
        active: true,
      },
    };

    // Merge A and B
    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.tradeExchangeRates?.["synd_shadows"]?.baseRate).toBe(0.8);
    expect(merged.tradeExchangeRates?.["synd_shadows"]?.timestamp).toBe(2000);

    expect(merged.auditMitigations?.["market"]?.mitigationLevel).toBe(4);
    expect(merged.auditMitigations?.["market"]?.timestamp).toBe(3000);
  });
});
