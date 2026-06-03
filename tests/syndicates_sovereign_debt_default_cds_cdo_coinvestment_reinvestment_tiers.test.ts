import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("CDS CDO Co-Investment Reinvestment Tiered Reward Boosters & Slashing (AF-240)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "reinvest_tiers_test_pack",
      title: "Reinvest Tiers Test Pack",
      start_room: "vault",
      vars_init: { gold: 100000 },
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

  const setupState = () => {
    let state = createInitialState({
      seed: 12345,
      start: "vault",
      varsInit: { gold: 100000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 20000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 20000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 5000,
        status: "active",
        cdoId: "cdo_pool_1",
        timestamp: 1000,
      },
    };

    state.sovereignDebtCDSCDOPools = {
      cdo_pool_1: {
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        cdsIds: ["cds_1"],
        totalNotional: 5000,
        fractionalizedVault: {
          balance: 1000, // Starts below reserve floor
          timestamp: 1000,
        },
        tranches: {
          senior: {
            trancheId: "senior",
            totalValue: 3000,
            marginCollateral: { alpha: 3000 },
            sharesOwned: { alpha: 3000 },
            autocallTriggerLevel: 200,
            autocallCoupon: 1000,
            autocallPaid: {},
            timestamp: 1000,
          },
          mezzanine: {
            trancheId: "mezzanine",
            totalValue: 1500,
            marginCollateral: { alpha: 1500 },
            sharesOwned: { alpha: 1500 },
            autocallTriggerLevel: 100,
            autocallCoupon: 500,
            autocallPaid: {},
            timestamp: 1000,
          },
          equity: {
            trancheId: "equity",
            totalValue: 500,
            marginCollateral: { alpha: 500 },
            sharesOwned: { alpha: 500 },
            autocallTriggerLevel: 50,
            autocallCoupon: 200,
            autocallPaid: {},
            timestamp: 1000,
          },
        },
        reserveFloor: 3000, // Floor is 3000, pool balance is 1000 initially
        timestamp: 1000,
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    return state;
  };

  it("should propose and authorize a reinvestment policy", () => {
    let state = setupState();

    // 1. Propose co-investment reinvestment policy
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_REINVESTMENT_POLICY",
          proposalId: "policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          tier1Threshold: 50,
          tier1Multiplier: 1.2,
          tier2Threshold: 80,
          tier2Multiplier: 1.5,
          slashingThreshold: 10,
          slashingPenalty: 0.2,
          timestamp: 1100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoCoinvestmentReinvestmentPolicyProposals?.policy_1).toBeDefined();
    expect(state.cdsCdoCoinvestmentReinvestmentPolicyProposals?.policy_1.status).toBe("proposed");

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_COINVESTMENT_REINVESTMENT_POLICY",
          proposalId: "policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoCoinvestmentReinvestmentPolicyProposals?.policy_1.status).toBe("authorized");

    // Pool policy settings should be updated
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.tier1ReinvestmentThreshold).toBe(50);
    expect(pool?.tier1Multiplier).toBe(1.2);
    expect(pool?.tier2ReinvestmentThreshold).toBe(80);
    expect(pool?.tier2Multiplier).toBe(1.5);
    expect(pool?.reinvestmentSlashingThreshold).toBe(10);
    expect(pool?.reinvestmentSlashingPenalty).toBe(0.2);
  });

  it("should apply tiered boosters on execution under high reinvestment share (>80% gets 1.5x)", () => {
    let state = setupState();

    // Set reinvestment policy directly to speed up test
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.tier1ReinvestmentThreshold = 50;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.tier1Multiplier = 1.2;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.tier2ReinvestmentThreshold = 80;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.tier2Multiplier = 1.5;

    // Active co-investment proposal approved, with 90% reinvestment share
    state.cdsCdoCoinvestmentProposals = {
      coinvest_1: {
        proposalId: "coinvest_1",
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        targetAmount: 3000,
        status: "approved",
        votes: {},
        contributions: {
          alpha: 2000,
          beta: 1000,
        },
        lockedContributions: {
          alpha: true,
          beta: true,
        },
        yieldCompensationShare: 40,
        yieldReinvestmentShare: 90, // Tier 2 (boost 1.5x)
        timestamp: 1000,
      },
    };

    // Inject gold into fractionalized vault to restore balance above floor (from 1000 to 3500)
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.fractionalizedVault.balance = 3500;

    // Tick economy to execute co-investment and check boost
    const finalState = tickEconomy(state, mockPack);

    // Proposal should be executed
    expect(finalState.cdsCdoCoinvestmentProposals?.coinvest_1.status).toBe("executed");

    // Proportional ratios:
    // alpha contribution = 2000 / 3000 = 2/3
    // beta contribution = 1000 / 3000 = 1/3
    // Boost multiplier: 1.5x (since 90 > 80)
    // Reputation boost base: 20 * ratio
    // alpha base rep boost = round(20 * 2/3) = 13. With 1.5x boost = round(13 * 1.5) = 20 rep boost.
    // beta base rep boost = round(20 * 1/3) = 7. With 1.5x boost = round(7 * 1.5) = 11 rep boost.
    // Final reputation: alpha: 100 + 20 = 120, beta: 100 + 11 = 111
    expect(finalState.factionRep?.alpha).toBe(120);
    expect(finalState.factionRep?.beta).toBe(111);

    // Waiver boost:
    // alpha waiver base = 2/3 = 0.6667. With 1.5x = 1.0 (capped)
    // beta waiver base = 1/3 = 0.3333. With 1.5x = 0.5
    expect(finalState.cdsCdoPartialFeeWaivers?.alpha).toBe(1.0);
    expect(finalState.cdsCdoPartialFeeWaivers?.beta).toBeCloseTo(0.5, 4);
  });

  it("should apply reputation slashing when reinvestment share drops below slashing threshold", () => {
    let state = setupState();

    state.sovereignDebtCDSCDOPools!.cdo_pool_1.reinvestmentSlashingThreshold = 10;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.reinvestmentSlashingPenalty = 0.2;

    state.cdsCdoCoinvestmentProposals = {
      coinvest_1: {
        proposalId: "coinvest_1",
        cdoId: "cdo_pool_1",
        creatorSyndicateId: "alpha",
        targetAmount: 3000,
        status: "executed",
        votes: {},
        contributions: {
          alpha: 2000,
          beta: 1000,
        },
        lockedContributions: {
          alpha: true,
          beta: true,
        },
        yieldCompensationShare: 40,
        yieldReinvestmentShare: 50, // Initially above threshold
        timestamp: 1000,
      },
    };

    // 1. Propose yield reinvestment drop to 5% (< 10%)
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_REINVESTMENT",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldReinvestmentShare: 5,
          timestamp: 1100,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Vote to approve
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "PROPOSE_CDO_COINVESTMENT_YIELD_REINVESTMENT",
          proposalId: "coinvest_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          yieldReinvestmentShare: 5,
          timestamp: 1150,
        },
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // When proposal is approved, reinvestment share is reduced to 5%.
    // This triggers a 0.2 (20%) reputation slash to locked syndicates alpha and beta!
    // alpha initial rep: 100. Slashed by 20% (20 points) -> 80
    // beta initial rep: 100. Slashed by 20% (20 points) -> 80
    expect(state.factionRep?.alpha).toBe(80);
    expect(state.factionRep?.beta).toBe(80);
  });
});
