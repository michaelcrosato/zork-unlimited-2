import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Cross-Tranche Hedging & Portfolio Stress Rebalancing (AF-234)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_cross_tranche_hedging_test_pack",
      title: "CDS CDO Cross-Tranche Hedging Test Pack",
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

  it("should propose, vote, and approve SET_CDS_CDO_CROSS_TRANCHE_HEDGING action", () => {
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
            sharesOwned: { alpha: 500 },
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 600,
            sharesOwned: { alpha: 300 },
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 200 },
            timestamp: 1000,
          },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // 1. Propose setting cross-tranche yield hedging allocation to 80% targeting the senior tranche
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "SET_CDS_CDO_CROSS_TRANCHE_HEDGING",
          proposalId: "prop_hedge_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          targetTrancheId: "senior",
          allocationPercent: 80,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let proposal = state.cdsCdoCrossTrancheHedging?.["prop_hedge_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");

    // 2. Alice votes to approve (majority of 2 members passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "SET_CDS_CDO_CROSS_TRANCHE_HEDGING",
          proposalId: "prop_hedge_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          targetTrancheId: "senior",
          allocationPercent: 80,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify cross-tranche hedging proposal is approved
    proposal = state.cdsCdoCrossTrancheHedging?.["prop_hedge_1"];
    expect(proposal?.status).toBe("approved");
    expect(proposal?.targetTrancheId).toBe("senior");
    expect(proposal?.allocationPercent).toBe(80);
  });

  it("should dynamically transfer equity yield payouts to deflect senior margin calls on tickEconomy when hedging is approved", () => {
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
        warChest: 1000,
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
            sharesOwned: { alpha: 500 }, // alpha owns 50% of senior
            timestamp: 1000,
            marginCollateral: { alpha: 20 }, // initial collateral: 20 gold
            leverageRatio: { alpha: 1.0 },
            deleveragingThreshold: { alpha: 0 },
            // Under 500 gold defaults (50% default ratio):
            // base margin req = 1000 * 0.5 * 1.0 = 500
            // alpha base req (50% shares) = 250
            // alpha maintenance threshold = 200
            // 20 gold collateral would trigger a margin call / liquidation!
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 600,
            sharesOwned: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 400,
            sharesOwned: { alpha: 200 }, // alpha owns 50% of equity
            timestamp: 1000,
            autocallTriggerLevel: 600, // triggers if defaults < 600
            autocallCoupon: 1000, // 1000 gold total payout, alpha's share = 500 gold
          },
        },
        fractionalizedVault: { balance: 0, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // Initialize defaults to 0 (so equity autocall trigger fires!)
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 0,
        status: "active",
        timestamp: 1000,
        cdoId: "cdo_pool_1",
      },
    };

    // We establish an active (approved) cross-tranche yield hedging allocation of 80% to the senior tranche
    state.cdsCdoCrossTrancheHedging = {
      prop_hedge_1: {
        proposalId: "prop_hedge_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        targetTrancheId: "senior",
        allocationPercent: 80,
        status: "approved",
        timestamp: 1000,
        votes: { player: { vote: true, timestamp: 1000 } },
      },
    };

    // Set defaults to 500 to invoke a margin requirement of 250 and maintenance threshold of 200
    state.sovereignDebtCDSContracts.cds_1.notionalValue = 500;
    state.sovereignDebtCDSContracts.cds_1.status = "settled"; // settled default

    // Now tick the economy.
    // 1. Pre-pass processes the equity tranche autocall payout:
    //    payout = 1000 * (200 / 400) = 500 gold.
    //    hedgedAmount (80%) = 400 gold transferred directly to senior marginCollateral.
    //    remainingAmount (20%) = 100 gold added to warChest.
    //    New senior marginCollateral = 20 + 400 = 420 gold.
    // 2. Regular tranche calculations process senior tranche margin:
    //    Required maintenance: 200 gold.
    //    Since 420 >= 200, no margin call or liquidation occurs!
    state = tickEconomy(state, mockPack);

    const pool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    const seniorTranche = pool?.tranches.senior;
    const equityTranche = pool?.tranches.equity;

    // Verify equity autocall was processed and paid
    expect(equityTranche?.autocallPaid?.["alpha"]).toBe(true);

    // Verify 80% was hedged (400 gold) and senior collateral is updated
    expect(seniorTranche?.marginCollateral?.["alpha"]).toBe(420);

    // Verify 20% (100 gold) went to syndicate's war chest
    expect(state.syndicates?.alpha.warChest).toBe(1100); // 1000 starting + 100 remaining payout

    // Verify no active margin call (successfully deflected!)
    expect(seniorTranche?.marginCallActive?.["alpha"]).toBe(false);
  });
});
