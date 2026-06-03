import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Portfolio Stress-Test-Aware Delta-Cross Hedging & Capital Safeguard Allocations (AF-163)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_stress_delta_cross_hedging_pack",
      title: "Reinsurance Options Stress Delta Cross Hedging Test Pack",
      start_room: "clearing",
      vars_init: { gold: 50000 },
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

  it("should vote and reach consensus on SWF Reinsurance Option Stress-Test-Aware Delta-Cross Hedging Policy", () => {
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
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    const voteAction = {
      type: "ADJUST_SWF_REINSURANCE_OPTION_STRESS_TEST_DELTA_CROSS_HEDGING",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      stressVolatilityThreshold: 35.0,
      stressHedgeWeightMultiplier: 1.5,
      safeguardCapitalReserveLimit: 2000,
      timestamp: 1000,
    };

    // Vote 1 (Pending)
    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionStressTestDeltaCrossHedgingPolicies?.["alpha_cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionStressTestDeltaCrossHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    // Vote 2 (Consensus reached)
    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const policy = state.swfReinsuranceOptionStressTestDeltaCrossHedgingPolicies?.["alpha_cdo_1_senior"];
    expect(policy).toBeDefined();
    expect(policy?.stressVolatilityThreshold).toBe(35.0);
    expect(policy?.stressHedgeWeightMultiplier).toBe(1.5);
    expect(policy?.safeguardCapitalReserveLimit).toBe(2000);
    expect(state.adjustSWFReinsuranceOptionStressTestDeltaCrossHedgingVotes?.["alpha"]).toBeUndefined(); // cleaned up
  });

  it("should apply hedge weight multiplier and lock safeguard capital under high volatility stress", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100000, // Afford the cross-hedge transactions
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
      cdo_2: {
        id: "cdo_2",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: { alpha: 10 },
            timestamp: 1000,
          },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 5000,
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionsContracts = {
      opt_1: {
        id: "opt_1",
        syndicateId: "beta",
        writerSyndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.02,
        size: 500,
        timestamp: 1000,
        active: true,
      },
    };

    // Multi-asset cross hedging portfolio: correlated with CDO 2 senior (weight = 0.5, correlation = 0.8)
    state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        assets: [
          { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.8, hedgeWeight: 0.5 },
        ],
        riskDiversificationCoefficient: 0.6,
        timestamp: 1000,
      },
    };

    // Stress Delta-Cross hedging policy
    state.swfReinsuranceOptionStressTestDeltaCrossHedgingPolicies = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        stressVolatilityThreshold: 30.0,
        stressHedgeWeightMultiplier: 2.0, // Double the hedge weight under stress
        safeguardCapitalReserveLimit: 1500,
        timestamp: 1000,
      },
    };

    // 1. SCENARIO A: Volatility (25.0%) is below threshold (30.0%)
    // Volatility Index:
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 25.0, timestamp: 1000 },
    };

    let tickedState = tickEconomy(state, mockPack);

    // Safeguard reserve should remain uncreated or unlocked (lockedGold should be 0)
    const safeguardA = tickedState.swfSafeguardCapitalReserves?.["alpha_cdo_1_senior"];
    expect(safeguardA === undefined || safeguardA.lockedGold === 0).toBe(true);

    // Under standard weight (0.5), spot delta is ~0.70578, opt size is 500, correlation is 0.8
    // Target holding = Math.floor(0.70578 * 500 * 0.8 * 0.5 * 1.0) = 141 shares
    const holdingA = tickedState.swfYieldCDOs?.["cdo_2"]?.tranches?.["senior"]?.ownership?.["alpha"] ?? 0;
    expect(holdingA).toBeCloseTo(141, 10);

    // 2. SCENARIO B: Volatility (35.0%) is above threshold (30.0%)
    // Let's reset and set volatility index above threshold
    state.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 35.0, timestamp: 1000 },
    };

    tickedState = tickEconomy(state, mockPack);

    // Safeguard reserve should have locked 1500 gold from syndicate war chest (warChest starting at 100000)
    const safeguardB = tickedState.swfSafeguardCapitalReserves?.["alpha_cdo_1_senior"];
    expect(safeguardB).toBeDefined();
    expect(safeguardB?.lockedGold).toBe(1500);

    // Dynamic multiplier is 2.0. So target weight is 0.5 * 2.0 = 1.0. Delta rises under 35% volatility to 0.7525.
    // Target holding = Math.floor(0.7525 * 500 * 0.8 * 0.5 * 2.0) = 301 shares
    const holdingB = tickedState.swfYieldCDOs?.["cdo_2"]?.tranches?.["senior"]?.ownership?.["alpha"] ?? 0;
    expect(holdingB).toBeCloseTo(301, 10);

    // Verify journal logging
    expect(tickedState.journal?.some((j) => j.includes("[Capital Safeguard Lock]"))).toBe(true);

    // 3. SCENARIO C: Volatility subsides back below threshold (35.0% -> 25.0%)
    // Let's pass tickedState back into economy tick with lower volatility
    tickedState.yieldVolatilityIndexes = {
      bond_1: { bondId: "bond_1", volatility: 25.0, timestamp: 1001 },
    };
    const finalWarChest = tickedState.syndicates?.["alpha"]?.warChest ?? 0;

    const revertedState = tickEconomy(tickedState, mockPack);

    // Safeguard reserve should have unlocked and returned all 1500 gold to war chest
    const safeguardC = revertedState.swfSafeguardCapitalReserves?.["alpha_cdo_1_senior"];
    expect(safeguardC?.lockedGold).toBe(0);
    expect(revertedState.syndicates?.["alpha"]?.warChest).toBeGreaterThan(finalWarChest + 1000); // 1500 returned (minus any small trade adjustments)
    expect(revertedState.journal?.some((j) => j.includes("[Capital Safeguard Unlock]"))).toBe(true);
  });

  it("should preemptively bail out syndicate from margin call liquidations using safeguard reserve locked gold", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100, // Very low war chest
      },
    };

    state.swfYieldCDOs = {
      cdo_1: {
        id: "cdo_1",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: { trancheId: "senior", yieldRate: 0.08, totalShares: 1000, ownership: {}, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Margin account has very low collateral to force margin deficit
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 10, // Deficit!
        leveragedCDSIds: ["cds_1"], // Account for the written CDS
        timestamp: 1000,
      },
    };

    // Active CDS to generate high maintenance requirement (Notional: 20000 -> 20% maintenance = 4000)
    state.creditDefaultSwaps = {
      cds_1: {
        id: "cds_1",
        buyerSyndicateId: "beta",
        writerSyndicateId: "alpha",
        cdoId: "cdo_1",
        trancheId: "senior",
        notionalValue: 20000,
        premiumRate: 0.05,
        active: true,
        timestamp: 1000,
      },
    };

    // Pre-populate safeguard capital reserve with locked gold (10000 gold)
    state.swfSafeguardCapitalReserves = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        lockedGold: 10000,
        timestamp: 1000,
      },
    };

    const tickedState = tickEconomy(state, mockPack);

    // Safeguard reserve should have shifted funds to collateral to prevent margin call
    // Maintenance requirement is 4000. Collateral starting at 10. Deficit = 3990.
    // 3990 shifted from safeguard locked gold (10000 -> 6010 remaining)
    expect(tickedState.swfSafeguardCapitalReserves?.["alpha_cdo_1_senior"]?.lockedGold).toBe(6010);
    expect(tickedState.marginAccounts?.["alpha"]?.collateral).toBe(4000); // 10 + 3990
    expect(tickedState.journal?.some((j) => j.includes("[Capital Safeguard Margin Deficit Payback]"))).toBe(true);

    // Syndicate CDS remains active because bailout prevented liquidation
    expect(tickedState.creditDefaultSwaps?.["cds_1"]?.active).toBe(true);
  });
});
