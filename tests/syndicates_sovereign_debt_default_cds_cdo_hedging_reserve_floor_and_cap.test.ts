import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDS CDO Tranche Cross-Tranche Hedging Reserve Floor & Governance Cap (AF-235)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "cds_cdo_hedging_reserve_floor_cap_test_pack",
      title: "CDS CDO Hedging Reserve Floor and Cap Test Pack",
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

  it("should propose, vote, and approve SET_CDS_CDO_HEDGING_RESERVE_FLOOR_AND_CAP action", () => {
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
        fractionalizedVault: { balance: 100, timestamp: 1000 },
        timestamp: 1000,
      },
    };

    // 1. Propose setting reserve floor of 500 and governance cap of 30%
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "SET_CDS_CDO_HEDGING_RESERVE_FLOOR_AND_CAP",
          proposalId: "prop_floor_cap_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          reserveFloor: 500,
          governanceCap: 30,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    let proposal = state.cdsCdoHedgingReserveFloorAndCapProposals?.["prop_floor_cap_1"];
    expect(proposal).toBeDefined();
    expect(proposal?.status).toBe("proposed");

    // 2. Alice votes to approve (majority of 2 members passed!)
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "SET_CDS_CDO_HEDGING_RESERVE_FLOOR_AND_CAP",
          proposalId: "prop_floor_cap_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          reserveFloor: 500,
          governanceCap: 30,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Verify proposal is approved
    proposal = state.cdsCdoHedgingReserveFloorAndCapProposals?.["prop_floor_cap_1"];
    expect(proposal?.status).toBe("approved");

    // Verify CDO pool updated
    const pool = state.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool?.reserveFloor).toBe(500);
    expect(pool?.governanceCap).toBe(30);
  });

  it("should clamp cross-tranche yield hedging allocation on tickEconomy when reserves drop below floor", () => {
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
            sharesOwned: { alpha: 500 },
            timestamp: 1000,
            marginCollateral: { alpha: 0 },
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
            sharesOwned: { alpha: 200 },
            timestamp: 1000,
            autocallTriggerLevel: 600,
            autocallCoupon: 1000, // payout: 500 gold for alpha
          },
        },
        fractionalizedVault: { balance: 200, timestamp: 1000 }, // Balance is 200
        reserveFloor: 500, // Reserve floor is 500 (balance 200 < floor 500 -> CLAMP!)
        governanceCap: 30, // Governance cap is 30%
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 0,
        status: "settled",
        timestamp: 1000,
      },
    };

    // Setup approved cross-tranche hedging of 80% to senior tranche
    state.cdsCdoCrossTrancheHedging = {
      prop_hedge_1: {
        proposalId: "prop_hedge_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        targetTrancheId: "senior",
        allocationPercent: 80,
        status: "approved",
        timestamp: 1000,
      },
    };

    // 1. Tick economy to apply yield and check if clamping to 30% happens!
    // Payout = 500. Expected allocation should be clamped to 30%.
    // Hedged amount = 500 * 30% = 150 gold.
    // Remaining (to warChest) = 500 - 150 = 350 gold.
    // Syndicate warChest should go from 1000 to 1000 + 350 = 1350 gold.
    // Senior tranche collateral should go from 0 to 150 gold.
    const tickedState = tickEconomy(state, mockPack);

    const pool = tickedState.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool?.tranches.senior.marginCollateral?.alpha).toBe(150);

    const synd = tickedState.syndicates?.["alpha"];
    expect(synd?.warChest).toBe(1350);

    // Verify journal contains clamping alert
    expect(tickedState.journal).toContain(
      `[CDS CDO Cross-Tranche Hedging Clamped] Syndicate alpha cross-tranche yield hedging allocation clamped from 80% to governance cap of 30% due to CDO cdo_pool_1 fractionalized vault balance (200) dropping below reserve floor (500).`
    );
  });

  it("should NOT clamp cross-tranche yield hedging allocation on tickEconomy when reserves are above or equal to floor", () => {
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
            sharesOwned: { alpha: 500 },
            timestamp: 1000,
            marginCollateral: { alpha: 0 },
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
            sharesOwned: { alpha: 200 },
            timestamp: 1000,
            autocallTriggerLevel: 600,
            autocallCoupon: 1000, // payout: 500 gold for alpha
          },
        },
        fractionalizedVault: { balance: 600, timestamp: 1000 }, // Balance is 600
        reserveFloor: 500, // Reserve floor is 500 (balance 600 >= floor 500 -> NO CLAMP!)
        governanceCap: 30,
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "system",
        notionalValue: 0,
        status: "settled",
        timestamp: 1000,
      },
    };

    // Setup approved cross-tranche hedging of 80% to senior tranche
    state.cdsCdoCrossTrancheHedging = {
      prop_hedge_1: {
        proposalId: "prop_hedge_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        targetTrancheId: "senior",
        allocationPercent: 80,
        status: "approved",
        timestamp: 1000,
      },
    };

    // 1. Tick economy to apply yield without clamping.
    // Payout = 500. Allocation = 80%.
    // Hedged amount = 500 * 80% = 400 gold.
    // Remaining (to warChest) = 500 - 400 = 100 gold.
    // Syndicate warChest should go from 1000 to 1000 + 100 = 1100 gold.
    // Senior tranche collateral should go from 0 to 400 gold.
    const tickedState = tickEconomy(state, mockPack);

    const pool = tickedState.sovereignDebtCDSCDOPools?.["cdo_pool_1"];
    expect(pool?.tranches.senior.marginCollateral?.alpha).toBe(400);

    const synd = tickedState.syndicates?.["alpha"];
    expect(synd?.warChest).toBe(1100);

    // Verify journal does NOT contain clamping alert
    const clampingLog = tickedState.journal?.some((log) => log.includes("clamped"));
    expect(clampingLog).toBe(false);
  });
});
