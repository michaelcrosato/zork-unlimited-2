import { describe, it, expect } from "vitest";
import { createInitialState, cloneStateWithoutHistory } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Leverage Arbitrage & Dynamic Liquidity Buffer Auto-Drawdown (AF-233)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_leverage_test_pack",
      title: "CDS CDO Leverage Test Pack",
      start_room: "vault",
      vars_init: { gold: 50000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "vault",
        name: "Security Vault",
        description: "A heavily guarded vault room.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should propose, vote, and execute ADJUST_CDS_CDO_TRANCHE_LEVERAGE adjusting leverage and thresholds", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
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

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 2000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 1000 },
            timestamp: 1000,
            marginRequirement: 200,
            maintenanceThreshold: 100,
            marginCollateral: { alpha: 50 },
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 600,
            sharesOwned: { alpha: 600 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 400 },
            timestamp: 1000,
          },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // 1. Propose setting leverage to 2.5 and deleveraging threshold to 50 gold
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_LEVERAGE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          leverageRatio: 2.5,
          deleveragingThreshold: 50,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let adjustment = state.cdsCdoTrancheLeverageAdjustments?.["cdo_pool_1_senior_alpha_2.5_50"];
    expect(adjustment).toBeDefined();
    expect(adjustment?.status).toBe("proposed");

    // Alice votes to approve the leverage adjustment (majority of 2 members passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_LEVERAGE",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          leverageRatio: 2.5,
          deleveragingThreshold: 50,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify leverage adjustment executed
    adjustment = state.cdsCdoTrancheLeverageAdjustments?.["cdo_pool_1_senior_alpha_2.5_50"];
    expect(adjustment?.status).toBe("approved");

    const tranche = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior;
    expect(tranche?.leverageRatio?.["alpha"]).toBe(2.5);
    expect(tranche?.deleveragingThreshold?.["alpha"]).toBe(50);
  });

  it("should calculate dynamic liquidity cushion, perform automated full drawdown sweeps, and update liquidity buffer on tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 2000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 500 }, // Alpha owns 50%
            timestamp: 1000,
            marginCollateral: { alpha: 50 },
            leverageRatio: { alpha: 2.0 }, // Leverage multiplier = 2
            deleveragingThreshold: { alpha: 100 },
          },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: {}, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 400, sharesOwned: {}, timestamp: 1000 },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // Default status: total settled default = 500 notional (50% default ratio)
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 500,
        status: "settled",
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // 50% default ratio on senior:
    // Base margin requirement = 1000 * 0.5 * 1.0 = 500
    // Alpha base requirement (50% shares) = 250
    // Alpha base maintenance threshold = 250 * 0.8 = 200
    // Leveraged requirements:
    // effectiveMarginReq = 250 * 2.0 = 500
    // effectiveMaintenanceThreshold = 200 * 2.0 = 400
    // Initial cushion = 50 (collateral) - 400 = -350. This is below the deleveraging threshold of 100!
    // Since warChest has 2000 gold, a full sweep drawdown should be executed:
    // drawdown needed = 500 - 50 = 450 gold.
    // After drawdown, collateral = 500. Cushion = 500 - 400 = 100.
    state = tickEconomy(state, mockPack);

    const tranche = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior;
    expect(tranche?.marginCollateral?.["alpha"]).toBe(500);
    expect(state.syndicates?.alpha.warChest).toBe(1550); // 2000 - 450
    expect(tranche?.liquidityBuffer?.["alpha"]).toBe(100); // 500 - 400
    expect(tranche?.marginCallActive?.["alpha"]).toBe(false);
  });

  it("should execute partial sweep drawdown and auto-deleveraging (leverage reduction) to clear margin calls under capital constraint", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 100, // Small warchest (not enough to cover effective margin requirement)
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 500 }, // Alpha owns 50%
            timestamp: 1000,
            marginCollateral: { alpha: 50 },
            leverageRatio: { alpha: 3.0 }, // High leverage
            deleveragingThreshold: { alpha: 50 },
          },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: {}, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 400, sharesOwned: {}, timestamp: 1000 },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 500,
        status: "settled",
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // 50% default ratio on senior:
    // Base margin requirement = 1000 * 0.5 * 1.0 = 500
    // Alpha base requirement (50% shares) = 250
    // Alpha base maintenance threshold = 250 * 0.8 = 200
    // Leveraged requirements (leverage = 3.0):
    // effectiveMarginReq = 250 * 3.0 = 750
    // effectiveMaintenanceThreshold = 200 * 3.0 = 600
    // Drawdown needed = 750 - 50 = 700 gold.
    // Faction warChest only has 100 gold. We execute partial sweep drawdown of 100 gold.
    // New collateral = 150 gold.
    // Since 150 gold is < 600 (effective maintenance threshold), we trigger auto-deleveraging!
    // newLeverageRatio = 150 / 200 = 0.75 -> capped at 1.0!
    // So new leverage = 1.0.
    // New effective maintenance threshold = 200 * 1.0 = 200.
    // Since updatedCollateral (150) is still < 200, we are below maintenance threshold even at 1.0 leverage.
    // Thus, we trigger margin call!
    state = tickEconomy(state, mockPack);

    const tranche = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior;
    expect(tranche?.marginCollateral?.["alpha"]).toBe(150);
    expect(state.syndicates?.alpha.warChest).toBe(0);
    expect(tranche?.leverageRatio?.["alpha"]).toBe(1.0); // Reduced to 1.0!
    expect(tranche?.marginCallActive?.["alpha"]).toBe(true); // Still below 200, so margin call active!
  });

  it("should successfully avoid a margin call when auto-deleveraging to a safe ratio", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 150, // Enough to cover a lower leverage requirement
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 1000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 500 }, // Alpha owns 50%
            timestamp: 1000,
            marginCollateral: { alpha: 100 },
            leverageRatio: { alpha: 3.0 }, // High leverage
            deleveragingThreshold: { alpha: 50 },
          },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: {}, timestamp: 1000 },
          equity: { trancheId: "equity", totalValue: 400, sharesOwned: {}, timestamp: 1000 },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 500,
        status: "settled",
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // 50% default ratio on senior:
    // Base margin requirement = 1000 * 0.5 * 1.0 = 500
    // Alpha base requirement (50% shares) = 250
    // Alpha base maintenance threshold = 250 * 0.8 = 200
    // Leveraged requirements (leverage = 3.0):
    // effectiveMarginReq = 750
    // effectiveMaintenanceThreshold = 600
    // Drawdown needed = 650. warChest has 150.
    // Partial drawdown executed: new collateral = 250.
    // Still below 600, so auto-deleveraging triggers:
    // newLeverageRatio = 250 / 200 = 1.25. (Greater than 1.0!)
    // New effective maintenance threshold = 200 * 1.25 = 250.
    // Since updatedCollateral (250) is now EQUAL to new maintenance threshold (250), margin call is avoided!
    state = tickEconomy(state, mockPack);

    const tranche = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior;
    expect(tranche?.marginCollateral?.["alpha"]).toBe(250);
    expect(state.syndicates?.alpha.warChest).toBe(0);
    expect(tranche?.leverageRatio?.["alpha"]).toBe(1.25); // Successfully set to 1.25!
    expect(tranche?.marginCallActive?.["alpha"]).toBe(false); // AVOIDED margin call!
  });

  it("should verify Gossip merge/convergence of leverage adjustments", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    const stateA = cloneStateWithoutHistory(state);
    const stateB = cloneStateWithoutHistory(state);

    stateB.cdsCdoTrancheLeverageAdjustments = {
      lev_1: {
        adjustmentId: "lev_1",
        cdoId: "cdo_pool_1",
        trancheId: "senior",
        syndicateId: "alpha",
        leverageRatio: 2.0,
        deleveragingThreshold: 100,
        status: "proposed",
        timestamp: 1005,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.cdsCdoTrancheLeverageAdjustments?.["lev_1"]).toBeDefined();
    expect(merged.cdsCdoTrancheLeverageAdjustments?.["lev_1"]?.leverageRatio).toBe(2.0);
  });
});
