import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { recalculateReinsuranceOptionOrderBookMetrics } from "../src/core/economy.js";

describe("Syndicate SWF Reinsurance Options Volatility Pools Dynamic Volatility Floor Auto-Adjustment under Liquidity Depletion (AF-192)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_options_volatility_floor_auto_adjust_pack",
      title: "Reinsurance Options Volatility Floor Auto-Adjust Test Pack",
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

  it("should dynamically boost volatility floor when cross-syndicate pool liquidity is depleted", () => {
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

    // Initialize average volatility index to 20%
    state.yieldVolatilityIndexes = {
      index_1: {
        bondId: "index_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };

    // Authorized volatility floor of 0.5 (Base min spread: 20 * 0.5 = 10 gold)
    state.swfReinsuranceOptionVolatilityFloorProposals = {
      floor_1: {
        proposalId: "floor_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        volatilityFloor: 0.5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    // Configure margin policy with dynamic boosting parameters
    state.swfReinsuranceOptionMarginPolicies = {
      policy_1: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.15,
        penaltyRate: 0.05,
        liquidityDepletionThreshold: 0.8, // Ratio (reserves/liabilities) below which boosting is active
        floorScalingFactor: 2.0, // multiplier = 1.0 + scalingFactor * (threshold - ratio)
        timestamp: 1000,
      },
    };

    // Case A: Pool reserves are not depleted (reserves/liabilities ratio >= 0.8)
    state.swfReinsuranceOptionCrossSyndicatePools = {
      pool_1: {
        id: "pool_1",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        syndicateContributions: { alpha: 4000 },
        totalBalance: 4000, // reserves = 4000
        liabilities: 5000, // liabilities = 5000, ratio = 0.8 (exactly at threshold)
        timestamp: 1000,
      },
    };

    // Set up low spread orders (base spread = 2 gold)
    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "buy",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 12,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
      order_2: {
        id: "order_2",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "sell",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 14,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
    };

    // Recalculate metrics -> Spread should be raised to exactly 10 gold (no boost)
    let afterStateA = recalculateReinsuranceOptionOrderBookMetrics(state);
    let depthA = afterStateA.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthA?.bidAskSpread).toBe(10);

    // Case B: Pool reserves are depleted (reserves = 2000, liabilities = 5000, ratio = 0.4)
    // ratio 0.4 < threshold 0.8 -> gap = 0.4.
    // multiplier = 1.0 + 2.0 * 0.4 = 1.8.
    // Boosted floor = 0.5 * 1.8 = 0.9.
    // Boosted min spread = 20 * 0.9 = 18 gold.
    state.swfReinsuranceOptionCrossSyndicatePools.pool_1.totalBalance = 2000;

    let afterStateB = recalculateReinsuranceOptionOrderBookMetrics(state);
    let depthB = afterStateB.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depthB?.bidAskSpread).toBe(18);

    // Verify journal contains auto-boost log messages
    const hasAutoBoostLog = afterStateB.journal?.some(
      (j) =>
        j.includes("[SWF Reinsurance Option Volatility Floor Auto-Boosted]") &&
        j.includes("Ratio: 0.4000 < Threshold: 0.8") &&
        j.includes("boosted volatility floor from 0.50 to 0.90")
    );
    expect(hasAutoBoostLog).toBe(true);

    const hasEnforceLog = afterStateB.journal?.some(
      (j) => j.includes("[SWF Reinsurance Option Volatility Floor Enforced]") && j.includes("floor parameter 0.90")
    );
    expect(hasEnforceLog).toBe(true);
  });

  it("should dynamically boost volatility floor when volatility insurance pool liquidity is depleted", () => {
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

    state.yieldVolatilityIndexes = {
      index_1: {
        bondId: "index_1",
        volatility: 20.0,
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionVolatilityFloorProposals = {
      floor_1: {
        proposalId: "floor_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        volatilityFloor: 0.5,
        status: "authorized",
        proposerId: "player",
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionMarginPolicies = {
      policy_1: {
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        liquidationThreshold: 0.15,
        penaltyRate: 0.05,
        liquidityDepletionThreshold: 0.8,
        floorScalingFactor: 2.0,
        timestamp: 1000,
      },
    };

    // Set up volatility insurance pool with depleted reserves
    state.swfReinsuranceOptionVolatilityInsurancePools = {
      cdo_1_senior: {
        id: "cdo_1_senior",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        balance: 2000, // reserves = 2000
        liabilities: 5000, // liabilities = 5000, ratio = 0.4
        timestamp: 1000,
      },
    };

    state.swfReinsuranceOptionLimitOrders = {
      order_1: {
        id: "order_1",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "buy",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 12,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
      order_2: {
        id: "order_2",
        syndicateId: "alpha",
        swfYieldCdoId: "cdo_1",
        trancheId: "senior",
        orderType: "sell",
        optionType: "call",
        strikePremiumRate: 0.05,
        limitPrice: 14,
        size: 5,
        status: "Open",
        timestamp: 1000,
      },
    };

    let afterState = recalculateReinsuranceOptionOrderBookMetrics(state);
    let depth = afterState.swfReinsuranceOptionOrderBookDepths?.["cdo_1_senior"];
    expect(depth?.bidAskSpread).toBe(18);

    const hasAutoBoostLog = afterState.journal?.some(
      (j) =>
        j.includes("[SWF Reinsurance Option Volatility Floor Auto-Boosted]") &&
        j.includes("Reserves: 2000, Liabilities: 5000, Ratio: 0.4000 < Threshold: 0.8")
    );
    expect(hasAutoBoostLog).toBe(true);
  });
});
