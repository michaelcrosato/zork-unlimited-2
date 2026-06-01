import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF CDO Yield-Hedging Option Secondary Market Spread Penalty (AF-247)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_spread_penalty_test_pack",
      title: "Yield Hedging Spread Penalty Test Pack",
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
      varsInit: {
        gold: 1000,
        gold_alice: 1000,
      },
      agentsInit: ["player", "alice", "bob"],
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
        members: ["bob"],
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
          balance: 1000, // Within 20% of dynamicLiquidityFloor (1000 <= 1000 * 1.20)
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
        reserveFloor: 3000,
        dynamicLiquidityFloor: 1000,
        timestamp: 1000,
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    return state;
  };

  it("should propose and authorize dynamic spread penalty policy proposals via voting consensus", () => {
    let state = setupState();

    // 1. Propose spread penalty policy
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
        proposalId: "spread_penalty_policy_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        spreadPenaltyMultiplier: 2.5,
        spreadPenaltyThresholdPercent: 0.20,
        timestamp: 1100,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("proposed");
    expect(prop!.spreadPenaltyMultiplier).toBe(2.5);
    expect(prop!.spreadPenaltyThresholdPercent).toBe(0.20);

    // Proposer charged proposal fee (base 200 * scalars)
    expect(state.syndicates?.alpha.warChest).toBeLessThan(20000);

    // 2. Alice votes YES to approve
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
        proposalId: "spread_penalty_policy_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1150,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1.status).toBe("authorized");
    expect(state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1.resolved).toBe(true);

    // Alpha pool has updated dynamic spread penalty policy properties
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionSpreadPenaltyMultiplier).toBe(2.5);
    expect(pool?.yieldHedgingOptionSpreadPenaltyThresholdPercent).toBe(0.20);
  });

  it("should apply dynamic spread penalty multiplier under default stress and block trading if widened spread exceeds maxSpread limit", () => {
    let state = setupState();

    // 1. Directly configure pool properties
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionSpreadPenaltyMultiplier = 3.0;
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.20;
    pool.yieldHedgingOptionMinSpread = 10;
    pool.yieldHedgingOptionMaxSpread = 100; // max spread limit is 100

    // 2. Set default alert active
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "authorized",
        resolved: false,
        proposerId: "bob",
        timestamp: 1000,
      },
    };

    // 3. Set up active option contract owned by alpha
    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        premiumPaid: 200,
        coverageAmount: 2000,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    // Listing has askPrice 1200
    state.cdsCdoYieldHedgingOptionListings = {
      opt_1: {
        listingId: "opt_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // Bid has bidPrice 1150 (raw spread is 1200 - 1150 = 50)
    // 50 is less than maxSpread 100.
    // Under stress, vault balance is 1000, floor is 1000, which is <= 1000 * 1.20 (within 20%).
    // Widened spread = 50 * 3.0 = 150.
    // 150 exceeds maxSpread 100.
    // So matching/trading should be blocked!
    state.cdsCdoYieldHedgingOptionBids = {
      bid_opt_1: {
        bidId: "bid_opt_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1150,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    let finalState = tickEconomy(state, mockPack);

    // Verify spread penalty was applied: spread in market spreads is 150 (50 * 3)
    const marketSpread = finalState.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1;
    expect(marketSpread).toBeDefined();
    expect(marketSpread!.spread).toBe(150);

    // Verify option trade was blocked because widened spread (150) exceeded maxSpread (100)
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("alpha");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("active");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("active");
  });

  it("should permit trading when vault balance is above 20% of dynamic floor (spread penalty multiplier is not active)", () => {
    let state = setupState();

    // 1. Directly configure pool properties
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionSpreadPenaltyMultiplier = 3.0;
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.20;
    pool.yieldHedgingOptionMinSpread = 10;
    pool.yieldHedgingOptionMaxSpread = 100;

    // Vault balance is 1300, which is > 1000 * 1.20 (not within 20% of dynamic floor 1000)
    pool.fractionalizedVault.balance = 1300;

    // 2. Set default alert active
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "authorized",
        resolved: false,
        proposerId: "bob",
        timestamp: 1000,
      },
    };

    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        premiumPaid: 200,
        coverageAmount: 2000,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    state.cdsCdoYieldHedgingOptionListings = {
      opt_1: {
        listingId: "opt_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    state.cdsCdoYieldHedgingOptionBids = {
      bid_opt_1: {
        bidId: "bid_opt_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    let finalState = tickEconomy(state, mockPack);

    // Verify spread penalty was NOT applied: spread in market spreads remains 0
    const marketSpread = finalState.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1;
    expect(marketSpread).toBeDefined();
    expect(marketSpread!.spread).toBe(0);

    // Verify option trade completed successfully because raw spread (0) is within maxSpread (100)
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("completed");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("accepted");
  });
});
