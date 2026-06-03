import { describe, it, expect } from "vitest";
import { createInitialState, cloneStateWithoutHistory } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default Credit Default Swap (CDS) CDO Tranche Dynamic Margin Maintenance & Autocallable Yield Triggers (AF-232)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_margin_test_pack",
      title: "CDS CDO Margin Test Pack",
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

  it("should propose, vote, and execute ADJUST_CDS_CDO_TRANCHE_MARGIN deposits/withdrawals, enforcing maintenance thresholds", () => {
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

    // 1. Propose depositing 100 gold margin
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_MARGIN",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          amount: 100,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let adjustment = state.cdsCdoTrancheMarginAdjustments?.["cdo_pool_1_senior_alpha_100"];
    expect(adjustment).toBeDefined();
    expect(adjustment?.status).toBe("proposed");

    // Alice votes to approve the deposit (majority of 2 members passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_MARGIN",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          amount: 100,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify deposit executed
    adjustment = state.cdsCdoTrancheMarginAdjustments?.["cdo_pool_1_senior_alpha_100"];
    expect(adjustment?.status).toBe("approved");
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCollateral?.["alpha"]).toBe(150); // 50 + 100
    expect(state.syndicates?.alpha.warChest).toBe(9900); // 10000 - 100

    // 2. Propose withdrawing 120 gold margin (Breaches maintenance threshold of 100!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_MARGIN",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          amount: -120,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Alice votes to approve the withdrawal
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "ADJUST_CDS_CDO_TRANCHE_MARGIN",
          cdoId: "cdo_pool_1",
          trancheId: "senior",
          syndicateId: "alpha",
          amount: -120,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify withdrawal was rejected due to maintenance threshold breach (150 - 120 = 30 < 100)
    adjustment = state.cdsCdoTrancheMarginAdjustments?.["cdo_pool_1_senior_alpha_-120"];
    expect(adjustment?.status).toBe("rejected");
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCollateral?.["alpha"]).toBe(150); // Unchanged
    expect(state.syndicates?.alpha.warChest).toBe(9900); // Unchanged
  });

  it("should propose, vote, and trigger Autocall payouts when defaults remain below target limits", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 2000,
        tranches: {
          senior: { trancheId: "senior", totalValue: 1000, sharesOwned: { alpha: 1000 }, timestamp: 1000 },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: { alpha: 600 }, timestamp: 1000 },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 300 }, // Alpha owns 75%
            timestamp: 1000,
            autocallTriggerLevel: 500,
            autocallCoupon: 1000,
          },
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
        notionalValue: 300,
        status: "settled", // Defaulted but below autocallTriggerLevel of 500
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // Propose autocall trigger
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRIGGER_CDO_AUTOCALL",
          cdoId: "cdo_pool_1",
          trancheId: "equity",
          syndicateId: "alpha",
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let trigger = state.cdsCdoAutocallTriggers?.["cdo_pool_1_equity_alpha"];
    expect(trigger).toBeDefined();
    expect(trigger?.status).toBe("proposed");

    // Alice votes to trigger autocall
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "TRIGGER_CDO_AUTOCALL",
          cdoId: "cdo_pool_1",
          trancheId: "equity",
          syndicateId: "alpha",
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify payout received (1000 * 75% = 750 gold!)
    trigger = state.cdsCdoAutocallTriggers?.["cdo_pool_1_equity_alpha"];
    expect(trigger?.status).toBe("approved");
    expect(state.syndicates?.alpha.warChest).toBe(5750); // 5000 + 750
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.equity.autocallPaid?.["alpha"]).toBe(true);
  });

  it("should automatically run margin requirement calculations, initiate drawdowns, handle liquidations, and auto-payout autocalls on tickEconomy", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (With Gold)",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Broke)",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 0,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1", "cds_2"],
        totalNotional: 2000,
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 1000,
            sharesOwned: { alpha: 500, beta: 500 }, // Alpha owns 50%, Beta owns 50%
            timestamp: 1000,
            marginCollateral: { alpha: 0, beta: 0 },
            marginCallActive: {},
          },
          mezzanine: { trancheId: "mezzanine", totalValue: 600, sharesOwned: { alpha: 600 }, timestamp: 1000 },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 400 },
            timestamp: 1000,
            autocallTriggerLevel: 1000,
            autocallCoupon: 200,
            autocallPaid: {},
          },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // Under normal conditions (0 defaults), equity tranche automatically triggers autocall payouts!
    state = tickEconomy(state, mockPack);

    // Verify equity autocall automatic payout (200 gold) to Alpha
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.equity.autocallPaid?.["alpha"]).toBe(true);
    expect(state.syndicates?.alpha.warChest).toBe(1200); // 1000 + 200

    // Now introduce defaults: total settled default = 1000 notional (50% default ratio)
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 1000,
        status: "settled",
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // Under 50% default ratio:
    // Senior total margin requirement = 1000 * 0.5 * 1.0 = 500 gold
    // Alpha requirement = 250 gold. Beta requirement = 250 gold.
    // Maintenance threshold = 250 * 0.8 = 200 gold.
    // Since current collateral is 0, both are below maintenance threshold.
    // Alpha has 1200 gold in warChest. Alpha will be auto-drawn down by 250 gold!
    // Beta has 0 gold. Beta will trigger a Margin Call!
    state = tickEconomy(state, mockPack);

    // Verify Alpha's automated drawdown (Alpha pays 250 for senior since Mezzanine/Equity are not margin-tracked in this test)
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCollateral?.["alpha"]).toBe(250);
    expect(state.syndicates?.alpha.warChest).toBe(950); // 1200 - 250
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCallActive?.["alpha"]).toBe(false);

    // Verify Beta's margin call activation
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCallActive?.["beta"]).toBe(true);
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.sharesOwned["beta"]).toBe(500); // Shares unchanged yet

    // Next economy tick: Beta is still broke. Beta fails margin call and triggers automated liquidation of 20% shares!
    state = tickEconomy(state, mockPack);

    // Verify Beta's automated liquidation (500 * 20% = 100 shares liquidated)
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.sharesOwned["beta"]).toBe(400); // 500 - 100
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.totalValue).toBe(900); // 1000 - 100
    expect(state.sovereignDebtCDSCDOPools?.["cdo_pool_1"]?.tranches.senior.marginCallActive?.["beta"]).toBe(false); // Reset
  });

  it("should verify Gossip merge/convergence of new margin adjustments and autocall triggers", () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 50000 },
      agentsInit: ["player"],
    });

    const stateA = cloneStateWithoutHistory(state);
    const stateB = cloneStateWithoutHistory(state);

    // Add a proposed margin adjustment in B
    stateB.cdsCdoTrancheMarginAdjustments = {
      adj_1: {
        adjustmentId: "adj_1",
        cdoId: "cdo_pool_1",
        trancheId: "senior",
        syndicateId: "alpha",
        amount: 200,
        status: "proposed",
        timestamp: 1005,
      },
    };

    // Add a proposed autocall trigger in A
    stateA.cdsCdoAutocallTriggers = {
      trig_1: {
        triggerId: "trig_1",
        cdoId: "cdo_pool_1",
        trancheId: "equity",
        syndicateId: "alpha",
        status: "proposed",
        timestamp: 1006,
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.cdsCdoTrancheMarginAdjustments?.["adj_1"]).toBeDefined();
    expect(merged.cdsCdoAutocallTriggers?.["trig_1"]).toBeDefined();
  });
});
