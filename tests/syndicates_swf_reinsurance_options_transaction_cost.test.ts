import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Order Book Transaction Cost Subsidies & Standing-Based Price Discounts (AF-154)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_transaction_cost_pack",
      title: "Reinsurance Transaction Cost Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support proposing and consensus voting on option transaction cost adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Vote 1: Player (syndicate alpha member) proposes/votes for policy
    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_TRANSACTION_COST",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      baseTransactionCost: 30,
      subsidyPerReputationPoint: 0.6,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should still be empty since consensus (majority > 1 member) is not reached
    expect(state.swfReinsuranceOptionTransactionCostPolicies?.["cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionTransactionCostVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2: Alice votes for same policy (majority reached: 2 out of 2)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Policy should be established and votes cleared
    const policy = state.swfReinsuranceOptionTransactionCostPolicies?.["cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.baseTransactionCost).toBe(30);
    expect(policy?.subsidyPerReputationPoint).toBe(0.6);
    expect(state.adjustSWFReinsuranceOptionTransactionCostVotes?.["alpha"]).toBeUndefined();

    // Verify journal log
    const log = state.journal.find(j => j.includes("[SWF Reinsurance Option Transaction Cost Policy Adjusted]"));
    expect(log).toBeDefined();
    expect(log).toContain("Base Cost: 30");
    expect(log).toContain("Subsidy per Rep: 0.6000");
  });

  it("should apply base transaction fee without standing (0 standing)", () => {
    let state = createInitialState({
      seed: 23456,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionTransactionCostPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseTransactionCost: 20,
        subsidyPerReputationPoint: 0.5,
        timestamp: 1000,
      },
    };

    // Alpha submits buy order: size 1000, limitPrice 300
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_1",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta submits sell order: size 1000, limitPrice 300
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_1",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Trigger match via tickEconomy
    state = tickEconomy(state, mockPack);

    // Default fee should be 20 gold since no custom policy exists.
    // Buyer (Alpha) pays option price (303 after market impact/volume scaling) + default fee (20) = 323 gold.
    // Seller (Beta) receives option price (303) - default fee (20) = 283 gold.
    expect(state.syndicates?.["alpha"]?.warChest).toBe(10000 - 323);
    expect(state.syndicates?.["beta"]?.warChest).toBe(10000 + 283);

    // Verify journal log contains fees
    const log = state.journal.find(j => j.includes("[SWF Reinsurance Option Trade Fees]"));
    expect(log).toBeDefined();
    expect(log).toContain("Buyer Fee: 20 gold");
    expect(log).toContain("Seller Fee: 20 gold");
  });

  it("should apply standing-based subsidies and price discounts when standing is positive", () => {
    let state = createInitialState({
      seed: 34567,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Setup positive standing
    state.factionRep = {
      rangers: 25,
    };

    // Established policy: baseTransactionCost = 20, subsidyPerReputationPoint = 0.5.
    // Subsidy = Math.round(25 * 0.5) = 13 gold.
    // Fee = 20 - 13 = 7 gold.
    // Price discount: Math.min(0.5, 25 * 0.002) = 0.05 (5% discount).
    // Base Price: 300 gold.
    // Final Price: 300 * 0.95 = 285 gold.
    // Buyer pays: 285 + 7 = 292 gold.
    // Seller receives: 285 - 7 = 278 gold.

    state.swfReinsuranceOptionTransactionCostPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseTransactionCost: 20,
        subsidyPerReputationPoint: 0.5,
        timestamp: 1000,
      },
    };

    // Alpha submits buy order: size 1000, limitPrice 300
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_2",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta submits sell order: size 1000, limitPrice 300
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_2",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Trigger match
    state = tickEconomy(state, mockPack);

    // Assert exact warChest values
    expect(state.syndicates?.["alpha"]?.warChest).toBe(10000 - 295);
    expect(state.syndicates?.["beta"]?.warChest).toBe(10000 + 281);

    // Verify journal logging
    const feeLog = state.journal.find(j => j.includes("[SWF Reinsurance Option Trade Fees]"));
    expect(feeLog).toBeDefined();
    expect(feeLog).toContain("Buyer Fee: 7 gold");
    expect(feeLog).toContain("Seller Fee: 7 gold");
    expect(feeLog).toContain("Base: 20 gold");
    expect(feeLog).toContain("Subsidy: 13 gold");

    const discountLog = state.journal.find(j => j.includes("[SWF Reinsurance Option Standing Discount]"));
    expect(discountLog).toBeDefined();
    expect(discountLog).toContain("Standing of 25 applied a 5.0% discount");
    expect(discountLog).toContain("Before: 303 gold, After: 288 gold");
  });

  it("should handle fully subsidized trades when reputation is extremely high (50 standing)", () => {
    let state = createInitialState({
      seed: 45678,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // Setup extremely high standing
    state.factionRep = {
      rangers: 50,
    };

    // Policy: base = 20, subsidy = 50 * 0.5 = 25 -> net fee = 0.
    // Price discount: Math.min(0.5, 50 * 0.002) = 0.10 (10% discount).
    // Base Price: 300 gold.
    // Final Price: 300 * 0.90 = 270 gold.
    // Buyer pays: 270 gold.
    // Seller receives: 270 gold.

    state.swfReinsuranceOptionTransactionCostPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseTransactionCost: 20,
        subsidyPerReputationPoint: 0.5,
        timestamp: 1000,
      },
    };

    // Alpha submits buy order: size 1000, limitPrice 300
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_3",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta submits sell order: size 1000, limitPrice 300
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_3",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Match
    state = tickEconomy(state, mockPack);

    expect(state.syndicates?.["alpha"]?.warChest).toBe(10000 - 273);
    expect(state.syndicates?.["beta"]?.warChest).toBe(10000 + 273);

    const feeLog = state.journal.find(j => j.includes("[SWF Reinsurance Option Trade Fees]"));
    expect(feeLog).toContain("Buyer Fee: 0 gold");
    expect(feeLog).toContain("Seller Fee: 0 gold");
  });

  it("should skip match if buyer has enough gold for the matching option price but not the transaction fee", () => {
    let state = createInitialState({
      seed: 56789,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 305, // Only 305 gold! Option premium is 300, fee is 20 -> net 320 needed.
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.12,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.20,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionTransactionCostPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseTransactionCost: 20,
        subsidyPerReputationPoint: 0.5,
        timestamp: 1000,
      },
    };

    // Alpha submits buy order: size 1000, limitPrice 300
    const buyAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "buy_4",
      syndicateId: "alpha",
      orderType: "buy",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1001,
    };
    let res = multiAgentStep(state, { agentId: "player", action: buyAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "alice", action: buyAction as any }, mockPack);
    state = res.state;

    // Beta submits sell order: size 1000, limitPrice 300
    const sellAction = {
      type: "SUBMIT_REINSURANCE_OPTION_LIMIT_ORDER",
      orderId: "sell_4",
      syndicateId: "beta",
      orderType: "sell",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      optionType: "call",
      strikePremiumRate: 0.03,
      size: 1000,
      limitPrice: 300,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "bob", action: sellAction as any }, mockPack);
    state = res.state;
    res = multiAgentStep(state, { agentId: "carol", action: sellAction as any }, mockPack);
    state = res.state;

    // Match - should be skipped due to insufficient gold for fee!
    state = tickEconomy(state, mockPack);

    // Alpha still has 305 gold, and orders remain open
    expect(state.syndicates?.["alpha"]?.warChest).toBe(305);
    expect(state.swfReinsuranceOptionLimitOrders?.["buy_4"]?.status).toBe("Open");
    expect(state.swfReinsuranceOptionLimitOrders?.["sell_4"]?.status).toBe("Open");
  });
});
