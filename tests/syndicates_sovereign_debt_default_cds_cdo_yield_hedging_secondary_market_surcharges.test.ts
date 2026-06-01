import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt CDO Tranche Co-Investment Yield-Hedging Option Secondary Market Dynamic Interest Surcharges (AF-252)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_secondary_surcharges_test_pack",
      title: "Yield Hedging Secondary Surcharges Test Pack",
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

  it("should propose and authorize dynamic interest rate surcharge policy parameters", () => {
    let state = setupState();

    // 1. Propose policy with surcharge parameters
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
        proposalId: "surcharge_policy_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        spreadPenaltyMultiplier: 2.0,
        spreadPenaltyThresholdPercent: 0.20,
        marketMakerSurchargeRate: 0.15, // 15% max surcharge rate
        marketMakerSurchargeThresholdPercent: 0.30, // 30% MM buffer threshold percent
        timestamp: 1100,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.surcharge_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.marketMakerSurchargeRate).toBe(0.15);
    expect(prop!.marketMakerSurchargeThresholdPercent).toBe(0.30);

    // 2. Vote to authorize
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
        proposalId: "surcharge_policy_1",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1150,
      } as any,
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeRate).toBe(0.15);
    expect(pool!.yieldHedgingOptionMarketMakerBufferThresholdPercent).toBe(0.30);
  });

  it("should scale and apply dynamic MM surcharge under liquidity stress during options trade", () => {
    let state = setupState();

    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    // Set surcharge rate to 10% (0.10) and threshold to 20% (0.20)
    pool.yieldHedgingOptionMarketMakerSurchargeRate = 0.10;
    pool.yieldHedgingOptionMarketMakerBufferThresholdPercent = 0.20;
    pool.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active option contract
    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha", // owned by alpha
        coverageAmount: 1000,
        premiumPaid: 100,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    // Create listing for the option from alpha (ask 500 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 500,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 500 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 500,
        status: "active",
        timestamp: 1000,
      },
    };

    // Dynamic Liquidity Floor is 1000. Threshold is 20%, so critical threshold is 1000 * 1.20 = 1200.
    // Set vault balance to 600, which is below 1200.
    // Deficit is (1200 - 600) / 1200 = 50% drop below critical threshold.
    // Base surcharge is 10%, so scaled surcharge is 10% * 50% = 5% (0.05).
    // Total fee deducted should be base fee (5%) + scaled surcharge (5%) = 10% of 500 gold = 50 gold.
    // standard fee = 500 * 0.05 = 25 gold. MM surcharge = 500 * 0.05 = 25 gold.
    // Seller alpha starts with 20000 gold.
    // Also receives 1700 gold total autocall coupon payouts during the economy tick.
    // After trade and coupon payouts:
    // bidder beta pays 500 gold (new warchest = 19500).
    // seller alpha receives 500 - 50 (total fee) = 450 gold from trade + 1700 gold from coupons = 2150 gold net (new warchest = 22150).
    // 25 gold standard fee goes to option fee dividends.
    // 25 gold MM surcharge goes back to vault balance (new vault balance = 600 + 25 = 625).
    pool.fractionalizedVault.balance = 600;

    const newState = tickEconomy(state, mockPack);

    // Assert bidder beta warchest reduced by 500
    expect(newState.syndicates!.beta.warChest).toBe(19500);

    // Assert seller alpha warchest increased by 2150 (receives 500 - 50 fee + 1700 coupons)
    expect(newState.syndicates!.alpha.warChest).toBe(22150);

    // Assert 25 gold surcharge was deposited back into vault balance (600 + 25 = 625)
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(625);

    // Assert trade was completed and option ownership transferred to beta
    expect(newState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(newState.cdsCdoYieldHedgingOptionListings?.listing_1.status).toBe("completed");
    expect(newState.cdsCdoYieldHedgingOptionBids?.bid_1.status).toBe("accepted");

    // Assert journal contains the dynamic MM surcharge info
    const log = newState.journal!.find(m => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(log).toBeDefined();
    expect(log).toContain("Dynamic MM Liquidity Surcharge");
    expect(log).toContain("25 gold deposited to vault");
    expect(log).toContain("surcharge rate: 5.00%");
  });

  it("should not apply MM surcharge when reserved liquidity is healthy (above threshold)", () => {
    let state = setupState();

    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionMarketMakerSurchargeRate = 0.10;
    pool.yieldHedgingOptionMarketMakerBufferThresholdPercent = 0.20;
    pool.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        coverageAmount: 1000,
        premiumPaid: 100,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 10,
        timestamp: 1000,
      },
    };

    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 500,
        status: "active",
        timestamp: 1000,
      },
    };

    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 500,
        status: "active",
        timestamp: 1000,
      },
    };

    // Set vault balance to 1300, which is healthy (1300 > 1200)
    // Surcharge should be 0.
    // Total fee deducted is only 5% base fee = 25 gold.
    // Seller alpha receives 500 - 25 = 475 gold from trade + 1700 coupons = 2175 gold net.
    // Vault balance should remain 1300.
    pool.fractionalizedVault.balance = 1300;

    const newState = tickEconomy(state, mockPack);

    expect(newState.syndicates!.beta.warChest).toBe(19500);
    expect(newState.syndicates!.alpha.warChest).toBe(22175);
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(1300);
  });
});
