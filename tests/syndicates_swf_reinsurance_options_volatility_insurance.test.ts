import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { matchSWFReinsuranceOptionLimitOrders, tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Insurance Pools & Spread Stabilization (AF-172)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_insurance_pack",
      title: "Reinsurance Options Volatility Insurance Test Pack",
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

  it("should support voting on volatility insurance policies, deflect a fraction of trading volume to the pool upon matching, and stabilize option bid-ask spreads", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
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
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
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
        totalValue: 10000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.05,
            totalShares: 1000,
            ownership: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            yieldRate: 0.10,
            totalShares: 500,
            ownership: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            yieldRate: 0.18,
            totalShares: 200,
            ownership: {},
            timestamp: 1000,
          },
        },
        timestamp: 1000,
      },
    };

    // 1. Propose & vote on Volatility Insurance Policy
    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_INSURANCE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      deflectionRate: 0.10, // 10% premium deflection to pool
      stabilizationThreshold: 50, // stabilize if spread > 50 gold
      drawdownMultiplier: 0.2, // 0.2 gold from pool per 1 gold spread reduction
      timestamp: 1001,
    };

    // First vote by player
    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Second vote by alice (majority reached)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policyKey = "cdo_1_senior";
    const policy = state.swfReinsuranceOptionVolatilityInsurancePolicies?.[policyKey];
    expect(policy).toBeDefined();
    expect(policy?.deflectionRate).toBe(0.10);
    expect(policy?.stabilizationThreshold).toBe(50);
    expect(policy?.drawdownMultiplier).toBe(0.2);

    // 2. Secondary market trade matching: Beta buys senior option from Alpha
    state.swfReinsuranceOptionLimitOrders = {
      order_buy: {
        id: "order_buy",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 200, // total price of buy order
        size: 10,
        timestamp: 1002,
        status: "Open",
        orderType: "buy",
      },
      order_sell: {
        id: "order_sell",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 200, // total price of sell order
        size: 10,
        timestamp: 1003,
        status: "Open",
        orderType: "sell",
      },
    };

    // Make sure buyer has enough in warChest
    if (state.syndicates) {
      state.syndicates["beta"].warChest = 5000;
      state.syndicates["alpha"].warChest = 5000;
    }

    // Execute matching
    let matchedState = matchSWFReinsuranceOptionLimitOrders(state);
    
    // Check that matched buy order is filled
    expect(matchedState.swfReinsuranceOptionLimitOrders?.["order_buy"]?.status).toBe("Filled");
    expect(matchedState.swfReinsuranceOptionLimitOrders?.["order_sell"]?.status).toBe("Filled");

    // 10% of 200 gold execution price = 20 gold deflected to the Volatility Insurance Pool
    const pool = matchedState.swfReinsuranceOptionVolatilityInsurancePools?.[policyKey];
    expect(pool).toBeDefined();
    expect(pool?.balance).toBe(20);

    // Alpha (seller) should receive 200 - 20 (deflected) = 180 gold (assuming zero transaction fee since policy is undefined)
    expect(matchedState.syndicates?.["alpha"]?.warChest).toBe(5000 + 180);
    // Beta (buyer) should pay 200 gold
    expect(matchedState.syndicates?.["beta"]?.warChest).toBe(5000 - 200);

    // Verify deflection logged in journal
    expect(matchedState.journal?.some(j => j.includes("[SWF Reinsurance Option Volatility Insurance Deflection]") && j.includes("Deflected 20 gold"))).toBe(true);

    // 3. Volatility spread stabilization check
    // Place orders with a wide bid-ask spread
    matchedState.swfReinsuranceOptionLimitOrders = {
      order_buy_2: {
        id: "order_buy_2",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 100, // buy price = 100 gold
        size: 1,
        timestamp: 1004,
        status: "Open",
        orderType: "buy",
      },
      order_sell_2: {
        id: "order_sell_2",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 200, // sell price = 200 gold
        size: 1,
        timestamp: 1005,
        status: "Open",
        orderType: "sell",
      },
    };

    // Calculate spread before economy tick / stabilization
    // highestBuy = 100, lowestSell = 200 -> spread = 100 gold
    // policy stabilizationThreshold = 50. excess spread = 50 gold.
    // pool.balance = 20. drawdownMultiplier = 0.2.
    // spreadReduction = Math.min(50, Math.floor(20 / 0.2)) = 50 gold.
    // drawdown = 50 * 0.2 = 10 gold per call.
    // In both metrics recalculations during tickEconomy, the pool balance is drawn down by 10.
    // So the final spread is narrowed to exactly 50 gold and pool balance becomes 0.

    let stabilizedState = tickEconomy(matchedState, mockPack);

    // Assert pool balance drawn down to 0
    expect(stabilizedState.swfReinsuranceOptionVolatilityInsurancePools?.[policyKey]?.balance).toBe(0);
    // Assert bid-ask spread reduced to 50
    expect(stabilizedState.swfReinsuranceOptionOrderBookDepths?.[policyKey]?.bidAskSpread).toBe(50);
    // Assert journal contains stabilization log
    expect(stabilizedState.journal?.some(j => j.includes("[SWF Reinsurance Option Spread Stabilization]") && j.includes("Narrowed bid-ask spread by 50 gold"))).toBe(true);
  });
});
