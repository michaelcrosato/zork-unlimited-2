import { describe, it, expect } from "vitest";
import { createInitialState, calculateRiskDiversificationCoefficient } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, matchSWFReinsuranceOptionLimitOrders } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Dynamic Cross-Hedging Multi-Asset Portfolio Rebalancing & Risk-Adjusted Fee Scaling (AF-162)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_multi_asset_cross_hedging_pack",
      title: "Reinsurance Options Multi-Asset Cross Hedging Test Pack",
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

  it("should calculate correct risk diversification coefficient", () => {
    // Test empty
    expect(calculateRiskDiversificationCoefficient([])).toBe(1.0);

    // Test zero weight
    expect(
      calculateRiskDiversificationCoefficient([
        { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.8, hedgeWeight: 0 },
      ])
    ).toBe(1.0);

    // Test single asset with 0.8 correlation
    // D = 1 - (0.5 * 0.8)/0.5 = 1 - 0.8 = 0.2
    expect(
      calculateRiskDiversificationCoefficient([
        { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.8, hedgeWeight: 0.5 },
      ])
    ).toBeCloseTo(0.2, 4);

    // Test multiple assets with high diversification (low correlation)
    // Asset 1: correlation 0.9, weight 0.5
    // Asset 2: correlation 0.1, weight 0.5
    // Total weight = 1.0
    // Weighted correlation sum = 0.5 * 0.9 + 0.5 * 0.1 = 0.45 + 0.05 = 0.5
    // D = 1 - 0.5 / 1.0 = 0.5
    expect(
      calculateRiskDiversificationCoefficient([
        { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.9, hedgeWeight: 0.5 },
        { correlatedAssetId: "cdo_3", correlatedTrancheId: "mezzanine", correlationCoefficient: 0.1, hedgeWeight: 0.5 },
      ])
    ).toBeCloseTo(0.5, 4);
  });

  it("should vote and reach consensus on Multi-Asset Cross Hedging Portfolio", () => {
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
      cdo_2: {
        id: "cdo_2",
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
      cdo_3: {
        id: "cdo_3",
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
      type: "ADJUST_SWF_REINSURANCE_OPTION_MULTI_ASSET_CROSS_HEDGING_PORTFOLIO",
      syndicateId: "alpha",
      swfYieldCdoId: "cdo_1",
      trancheId: "senior",
      assets: [
        { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.9, hedgeWeight: 0.5 },
        { correlatedAssetId: "cdo_3", correlatedTrancheId: "mezzanine", correlationCoefficient: 0.1, hedgeWeight: 0.5 },
      ],
      timestamp: 1000,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios?.["alpha_cdo_1_senior"]).toBeUndefined();
    expect(state.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes?.["alpha"]?.["player"]).toBeDefined();

    res = multiAgentStep(state, { agentId: "alice", action: voteAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const portfolio = state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios?.["alpha_cdo_1_senior"];
    expect(portfolio).toBeDefined();
    expect(portfolio?.assets.length).toBe(2);
    expect(portfolio?.riskDiversificationCoefficient).toBeCloseTo(0.5, 4);
    expect(state.adjustSWFReinsuranceOptionMultiAssetCrossHedgingVotes?.["alpha"]).toBeUndefined();
  });

  it("should scale transaction fees dynamically based on portfolio risk-diversification coefficient", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 30000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 50000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["alice"],
        definedBy: "alice",
        timestamp: 1000,
        warChest: 50000,
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

    // Setup transaction cost policy (base fee: 200)
    state.swfReinsuranceOptionTransactionCostPolicies = {
      cdo_1_senior: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        baseTransactionCost: 200,
        subsidyPerReputationPoint: 0,
        timestamp: 1000,
      },
    };

    // Multi-asset cross hedging portfolio for Alpha with high diversification (D = 0.8)
    // 0.8 diversification gives a fee reduction of 0.8 * 50% = 40%
    // Expected fee for Alpha: 200 * (1 - 0.4) = 120 gold
    state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        assets: [
          { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.2, hedgeWeight: 1.0 },
        ],
        riskDiversificationCoefficient: 0.8, // Explicitly set D
        timestamp: 1000,
      },
    };

    // Create buy and sell limit orders
    state.swfReinsuranceOptionLimitOrders = {
      order_buy: {
        id: "order_buy",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.05,
        size: 10,
        limitPrice: 1000,
        orderType: "buy",
        status: "Open",
        timestamp: 1000,
      },
      order_sell: {
        id: "order_sell",
        syndicateId: "beta",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        optionType: "call",
        strikePremiumRate: 0.05,
        size: 10,
        limitPrice: 1000,
        orderType: "sell",
        status: "Open",
        timestamp: 1000,
      },
    };

    const newState = matchSWFReinsuranceOptionLimitOrders(state);

    // Check Alpha's warChest.
    // Starting: 50000. Option Price: 1000. Alpha Fee: 120 (due to 40% discount on 200).
    // Expected Alpha warChest: 50000 - 1000 - 120 = 48880.
    // Starting Beta: 50000. Option Revenue: +1000. Beta Fee: 200 (no diversification).
    // Expected Beta warChest: 50000 + 1000 - 200 = 50800.
    expect(newState.syndicates?.["alpha"]?.warChest).toBe(48880);
    expect(newState.syndicates?.["beta"]?.warChest).toBe(50800);
  });

  it("should auto-rebalance multiple correlated assets during tickEconomy", () => {
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
        warChest: 100000,
      },
    };

    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 10000,
        timestamp: 1000,
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
      cdo_3: {
        id: "cdo_3",
        creatorSyndicateId: "alpha",
        assets: [],
        totalValue: 5000,
        tranches: {
          senior: {
            trancheId: "senior",
            yieldRate: 0.08,
            totalShares: 1000,
            ownership: { alpha: 50 },
            timestamp: 1000,
          },
          mezzanine: { trancheId: "mezzanine", yieldRate: 0.12, totalShares: 500, ownership: {}, timestamp: 1000 },
          equity: { trancheId: "equity", yieldRate: 0.2, totalShares: 200, ownership: {}, timestamp: 1000 },
        },
        timestamp: 1000,
      },
    };

    // Active options contract written by alpha
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

    // Multi-asset cross hedging portfolio:
    // Correlation 0.8, weight 0.5 with cdo_2 senior
    // Correlation -0.5, weight 0.4 with cdo_3 senior
    state.swfReinsuranceOptionMultiAssetCrossHedgingPortfolios = {
      alpha_cdo_1_senior: {
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        assets: [
          { correlatedAssetId: "cdo_2", correlatedTrancheId: "senior", correlationCoefficient: 0.8, hedgeWeight: 0.5 },
          { correlatedAssetId: "cdo_3", correlatedTrancheId: "senior", correlationCoefficient: -0.5, hedgeWeight: 0.4 },
        ],
        riskDiversificationCoefficient: 0.6,
        timestamp: 1000,
      },
    };

    const newState = tickEconomy(state, mockPack);

    const cdo2Tranche = newState.swfYieldCDOs?.["cdo_2"]?.tranches?.["senior"];
    const cdo3Tranche = newState.swfYieldCDOs?.["cdo_3"]?.tranches?.["senior"];

    // Should have purchased cdo_2 shares (original 10 to target ~190)
    expect(cdo2Tranche?.ownership?.["alpha"]).toBeGreaterThan(10);
    // Should have sold/maintained cdo_3 shares (original 50 to target 0/negative so sold surplus down to 0)
    expect(cdo3Tranche?.ownership?.["alpha"]).toBeLessThan(50);
  });
});
