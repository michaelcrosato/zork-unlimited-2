import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { matchSWFReinsuranceOptionLimitOrders, tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Stress-Test-Aware Volatility Insurance Allocation (AF-173)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_stress_insurance_pack",
      title: "Reinsurance Options Stress Insurance Test Pack",
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
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support voting on stress-test-aware volatility insurance, scale deflection rate dynamically under stress, and reallocate excess premiums", () => {
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
            yieldRate: 0.1,
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

    // 1. Propose & vote on Volatility Insurance Policy with Stress-Test parameters
    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_VOLATILITY_INSURANCE",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      deflectionRate: 0.1, // 10% base premium deflection
      stabilizationThreshold: 50,
      drawdownMultiplier: 0.2,
      stressVolatilityThreshold: 20.0, // active if volatility > 20
      stressDeflectionMultiplier: 2.0, // scale by 2.0x
      reallocationThreshold: 30, // reallocate excess above 30 gold
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
    expect(policy?.deflectionRate).toBe(0.1);
    expect(policy?.stressVolatilityThreshold).toBe(20.0);
    expect(policy?.stressDeflectionMultiplier).toBe(2.0);
    expect(policy?.reallocationThreshold).toBe(30);

    // 2. Set up Limit Orders for trade matching
    state.swfReinsuranceOptionLimitOrders = {
      order_buy: {
        id: "order_buy",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 200,
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
        limitPrice: 200,
        size: 10,
        timestamp: 1003,
        status: "Open",
        orderType: "sell",
      },
    };

    if (state.syndicates) {
      state.syndicates["beta"].warChest = 5000;
      state.syndicates["alpha"].warChest = 5000;
    }

    // A. Verify deflection without stress policy
    let matchedState = matchSWFReinsuranceOptionLimitOrders(state);
    let pool = matchedState.swfReinsuranceOptionVolatilityInsurancePools?.[policyKey];
    expect(pool?.balance).toBe(20); // 10% of 200 = 20 gold

    // B. Verify deflection WITH stress policy and high volatility
    state.swfReinsuranceOptionStressTestPolicies = {
      [policyKey]: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        simulatedVolatilityShock: 30.0, // greater than 20
        simulatedLiquidityShock: 0,
        reserveMultiplier: 1.5,
        timestamp: 1004,
      },
    };

    // Re-initialize the limit orders and warChests so they are clean and not mutated by the previous match
    state.swfReinsuranceOptionLimitOrders = {
      order_buy: {
        id: "order_buy",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        limitPrice: 200,
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
        limitPrice: 200,
        size: 10,
        timestamp: 1003,
        status: "Open",
        orderType: "sell",
      },
    };
    if (state.syndicates) {
      state.syndicates["beta"].warChest = 5000;
      state.syndicates["alpha"].warChest = 5000;
    }
    state.swfReinsuranceOptionVolatilityInsurancePools = {};

    let matchedStateStress = matchSWFReinsuranceOptionLimitOrders(state);
    let poolStress = matchedStateStress.swfReinsuranceOptionVolatilityInsurancePools?.[policyKey];
    // Under stress: deflection rate is scaled by 2.0 (stressDeflectionMultiplier) and 1.5 (reserveMultiplier)
    // scaled deflectionRate = 0.10 * 2.0 * 1.5 = 0.30 (30%)
    // 30% of 200 gold = 60 gold deflected to the pool
    expect(poolStress?.balance).toBe(60);

    // 3. Verify periodic rebalancing ticks routing excess premiums
    // Set pool balance to 50 (which exceeds reallocationThreshold = 30)
    matchedStateStress.swfReinsuranceOptionVolatilityInsurancePools![policyKey] = {
      id: `pool_${policyKey}`,
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      balance: 50,
      timestamp: matchedStateStress.step,
    };

    // Set up active multi-fund reinsurance pool for alpha syndicate
    matchedStateStress.swfMultiFundReinsurancePools = {
      pool_1: {
        id: "pool_1",
        syndicateIds: ["alpha"],
        capitalAllocated: { alpha: 1000 },
        totalReserve: 1000,
        volatilityHedgeRatio: 0.5,
        targetYieldRate: 0.08,
        historicalVolatility: 15.0,
        timestamp: matchedStateStress.step,
        active: true,
      },
    };

    let finalState = tickEconomy(matchedStateStress, mockPack);

    // Excess = 50 - 30 = 20 gold.
    // 20 gold should be routed to pool_1.
    // pool_1 totalReserve should become 1000 + 20 = 1020 gold.
    // Volatility Insurance Pool balance should become 30 gold.
    expect(finalState.swfReinsuranceOptionVolatilityInsurancePools?.[policyKey]?.balance).toBe(30);
    expect(finalState.swfMultiFundReinsurancePools?.["pool_1"]?.totalReserve).toBe(2350);

    // Assert premium reallocation is in the journal
    expect(
      finalState.journal?.some(
        (j) =>
          j.includes("[SWF Volatility Insurance Premium Reallocation]") &&
          j.includes("Routed excess premium of 20 gold")
      )
    ).toBe(true);
  });
});
