import { describe, it, expect } from "vitest";
import { createInitialState, getSyndicateFactionLoyaltyRank } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, getCDSCDOYieldHedgingPremium } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDO Yield-Hedging Option Secondary Market Spread Controls & waivers (AF-245)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_spread_test_pack",
      title: "Yield Hedging Spread Test Pack",
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
          balance: 1000,
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
        timestamp: 1000,
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    return state;
  };

  it("should propose and authorize dynamic spread policy proposals via voting consensus", () => {
    let state = setupState();

    // 1. Propose spread policy
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_POLICY",
        proposalId: "spread_policy_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        minSpread: 50,
        maxSpread: 200,
        timestamp: 1100,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSpreadPolicyProposals?.spread_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("proposed");
    expect(prop!.minSpread).toBe(50);
    expect(prop!.maxSpread).toBe(200);

    // Alpha warChest has been charged proposal fee: base 200 * 0.5 (reserve and alliance scalars) = 100
    expect(state.syndicates?.alpha.warChest).toBe(19900);

    // 2. Alice votes YES to approve
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SPREAD_POLICY",
        proposalId: "spread_policy_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1150,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionSpreadPolicyProposals?.spread_policy_1.status).toBe("authorized");
    expect(state.cdsCdoYieldHedgingOptionSpreadPolicyProposals?.spread_policy_1.resolved).toBe(true);

    // Alpha pool has updated dynamic spread policy properties
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionMinSpread).toBe(50);
    expect(pool?.yieldHedgingOptionMaxSpread).toBe(200);
  });

  it("should enforce dynamic spread controls and block matching/arbitrage when spread is outside min/max limits", () => {
    let state = setupState();

    // Directly set spread limits on pool
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionMinSpread = 50;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionMaxSpread = 200;

    state.sovereignDebtCDSCDOPools!.cdo_pool_1.premiumPricingSpread = 0.1;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.automatedHedgeEnabled = true;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.dynamicMatchingEnabled = true;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.dynamicLiquidityFloor = 200;

    // Add active option contract owned by Alpha
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

    // -------------------------------------------------------------
    // Scenario A: Spread is too narrow (e.g., Ask = 600, Bid = 580, Spread = 20 < minSpread 50)
    // -------------------------------------------------------------
    // 1. Player (Alpha) proposes listing askPrice = 600
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "LIST_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 600,
        timestamp: 1200,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "LIST_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 600,
        timestamp: 1210,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Bob (Beta) proposes active bidPrice = 580
    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "BID_ON_CDO_YIELD_HEDGING_OPTION",
        bidId: "bid_opt_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 580,
        timestamp: 1220,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Tick economy - matching / arbitrage should be BLOCKED because spread 20 is below minSpread 50
    let finalState = tickEconomy(state, mockPack);

    // Option should STILL be owned by Alpha, listings/bids active
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("alpha");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("active");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("active");

    // -------------------------------------------------------------
    // Scenario B: Spread is valid (e.g. Ask = 700, Bid = 600, Spread = 100, which is between [50, 200])
    // -------------------------------------------------------------
    // Change ask to 700 and bid to 600
    state.cdsCdoYieldHedgingOptionListings!.opt_1.askPrice = 700;
    state.cdsCdoYieldHedgingOptionBids!.bid_opt_1.bidPrice = 600;

    // Tick economy - matching should still be blocked since Bid (600) < Ask (700) (not crossed yet)
    // but arbitrage bot might trade if ask < fair value. Let's make Bid cross the Ask!
    state.cdsCdoYieldHedgingOptionBids!.bid_opt_1.bidPrice = 750; // crossed!
    // Pre-match spread before cross was 700 - 600 = 100 (valid!)
    finalState = tickEconomy(state, mockPack);

    // Option should be traded to Beta!
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("completed");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("accepted");
  });

  it("should fully waive transaction fees for Platinum-tier allied members on option transfers", () => {
    let state = setupState();

    // 1. Establish Faction Loyalty Rank "Platinum" for Alpha syndicate in alpha faction
    state.factionLoyaltyRanks = {
      "alpha-alpha": {
        syndicateId: "alpha",
        factionId: "alpha",
        rank: "Platinum",
        timestamp: 1000,
      },
    };

    // 2. Setup CDO pool where alpha is creator, allied to alpha
    // Let's set fee to 10%
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.yieldHedgingOptionSecondaryFeePercent = 0.10;

    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha", // Alpha owns option, alpha is creator of CDO (so allied/creator)
        premiumPaid: 200,
        coverageAmount: 2000,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    // 3. Propose and execute transfer from Alpha to Beta for 1000 gold
    // Seller Alpha is Platinum allied. So fee should be WAIVED (0 fee instead of 100).
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 1000,
        timestamp: 1200,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 1000,
        timestamp: 1210,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 1000,
        timestamp: 1220,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check ownership transferred
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");

    // Alpha (Seller) should have received full 1000 gold with 0 fee deduction!
    // War chest should be 20000 + 1000 = 21000
    expect(state.syndicates?.alpha.warChest).toBe(21000);
  });
});
