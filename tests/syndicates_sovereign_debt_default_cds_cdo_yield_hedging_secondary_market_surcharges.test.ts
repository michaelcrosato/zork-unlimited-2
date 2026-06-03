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
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.15, // 15% max surcharge rate
          marketMakerSurchargeThresholdPercent: 0.3, // 30% MM buffer threshold percent
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.surcharge_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.marketMakerSurchargeRate).toBe(0.15);
    expect(prop!.marketMakerSurchargeThresholdPercent).toBe(0.3);

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeRate).toBe(0.15);
    expect(pool!.yieldHedgingOptionMarketMakerBufferThresholdPercent).toBe(0.3);
  });

  it("should scale and apply dynamic MM surcharge under liquidity stress during options trade", () => {
    let state = setupState();

    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    // Set surcharge rate to 10% (0.10) and threshold to 20% (0.20)
    pool.yieldHedgingOptionMarketMakerSurchargeRate = 0.1;
    pool.yieldHedgingOptionMarketMakerBufferThresholdPercent = 0.2;
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
    const log = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(log).toBeDefined();
    expect(log).toContain("Dynamic MM Liquidity Surcharge");
    expect(log).toContain("25 gold deposited to vault");
    expect(log).toContain("surcharge rate: 5.00%");
  });

  it("should not apply MM surcharge when reserved liquidity is healthy (above threshold)", () => {
    let state = setupState();

    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionMarketMakerSurchargeRate = 0.1;
    pool.yieldHedgingOptionMarketMakerBufferThresholdPercent = 0.2;
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

  it("should support proposing, voting and auto-compounding dynamic MM interest surcharges into tranche margin collateral", () => {
    let state = setupState();

    // 1. Propose policy with surcharge and auto-compounding parameters
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_compounding",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 0.2, // 20% MM buffer threshold percent
          marketMakerSurchargeAutoCompound: true,
          marketMakerSurchargeCompoundTrancheId: "senior",
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify fields on proposal
    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.surcharge_policy_compounding;
    expect(prop).toBeDefined();
    expect(prop!.marketMakerSurchargeAutoCompound).toBe(true);
    expect(prop!.marketMakerSurchargeCompoundTrancheId).toBe("senior");

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_compounding",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeRate).toBe(0.1);
    expect(pool!.yieldHedgingOptionMarketMakerBufferThresholdPercent).toBe(0.2);
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeAutoCompound).toBe(true);
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeCompoundTrancheId).toBe("senior");
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

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
    // MM surcharge = 500 * 0.05 = 25 gold.
    // Seller alpha starts with 20000 gold.
    // After trade and coupon payouts:
    // bidder beta pays 500 gold (new warchest = 19500).
    // seller alpha receives 500 - 50 (total fee) = 450 gold from trade + 1700 gold from coupons = 2150 gold net (new warchest = 22150).
    // 25 gold standard fee goes to option fee dividends.
    // 25 gold MM surcharge goes back to senior tranche margin collateral (new senior margin collateral for alpha = 3000 + 25 = 3025).
    // Vault balance remains at 600.
    pool!.fractionalizedVault.balance = 600;

    const newState = tickEconomy(state, mockPack);

    // Assert bidder beta warchest reduced by 500
    expect(newState.syndicates!.beta.warChest).toBe(19500);

    // Assert seller alpha warchest increased by 2025 (receives 500 - 50 fee + 1700 coupons - 125 proposal/vote fees)
    expect(newState.syndicates!.alpha.warChest).toBe(22025);

    // Assert vault balance remains at 600 (not increased by surcharge)
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(600);

    // Assert senior tranche margin collateral for alpha increased by 25 gold (3000 + 25 = 3025)
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.tranches.senior.marginCollateral?.alpha).toBe(3025);

    // Assert journal contains compounding info
    const log = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(log).toBeDefined();
    expect(log).toContain("Dynamic MM Liquidity Surcharge");
    expect(log).toContain("25 gold compounded into senior tranche margin collateral");
    expect(log).toContain("surcharge rate: 5.00%");
  });

  it("should propose, vote, and apply faction standing-gated discounts to reduce dynamic MM surcharges when NOT auto-compounded during defaults (AF-254)", () => {
    let state = setupState();

    // 1. Propose policy with surcharge faction standing discounts
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_standing_discount",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 1.0, // 100% MM buffer threshold percent (<= 1.0)
          marketMakerSurchargeAutoCompound: false,
          marketMakerSurchargeFactionStandingDiscounts: { rangers: 0.3 }, // 30% discount for rangers faction
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify fields on proposal
    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.surcharge_policy_standing_discount;
    expect(prop).toBeDefined();
    expect(prop!.marketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.3 });

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_standing_discount",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.3 });
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active default alert for target syndicate (beta)
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        alertId: "alert_1",
        targetSyndicateId: "beta",
        status: "authorized",
        resolved: false,
        timestamp: 1200,
      } as any,
    };

    // Set seller standing with rangers to 80 (>= 50 means allied)
    state.factionRep = {
      ...state.factionRep,
      rangers: 80,
    };

    // Setup active option contract
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

    // Create listing for the option from alpha (ask 1200 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 1200 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Dynamic Liquidity Floor is 1000. Threshold is 100%, so critical threshold is 2000.
    // Set vault balance to 1500 (below 2000, but >= floor so trading is allowed).
    // Deficit is 25% drop below critical threshold.
    // Base surcharge is 10%, so scaled surcharge is 10% * 25% = 2.5% (0.025).
    // Raw surcharge is 1200 * 0.025 = 30 gold.
    // Scaled down by 30% (cappedMMDiscount = 0.30): 30 * (1 - 0.30) = 21 gold.
    // standard fee = 1200 * 0.05 = 60 gold.
    // Proposer alpha pays 125 gold proposal/vote fees.
    // alpha net warChest: 20000 + 1200 - 60 (standard fee) - 21 (surcharge) - 125 + 5000 (CDS payout) = 25994 gold.
    // beta pays 1200 gold.
    // Vault balance receives 21 gold: 1500 + 21 = 1521 gold.
    pool!.fractionalizedVault.balance = 1500;

    const newState = tickEconomy(state, mockPack);

    expect(newState.syndicates!.beta.warChest).toBe(19800);
    expect(newState.syndicates!.alpha.warChest).toBe(25994); // receives 1200 - 60 fee - 21 surcharge + 5000 CDS payout - 125 proposal/vote fees
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(1521);

    // Assert journal contains discounted surcharge info
    const log = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(log).toBeDefined();
    expect(log).toContain("Dynamic MM Liquidity Surcharge");
    expect(log).toContain("21 gold deposited to vault [Discounted: 30%]");
  });

  it("should propose, vote, and apply faction standing-gated boosts to compounding yield allocations when auto-compounding IS enabled during defaults (AF-254)", () => {
    let state = setupState();

    // 1. Propose policy with surcharge faction standing discounts and auto-compounding
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_standing_boost",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 1.0, // 100% MM buffer threshold percent (<= 1.0)
          marketMakerSurchargeAutoCompound: true,
          marketMakerSurchargeCompoundTrancheId: "senior",
          marketMakerSurchargeFactionStandingDiscounts: { rangers: 0.4 }, // 40% boost for rangers faction
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify fields on proposal
    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.surcharge_policy_standing_boost;
    expect(prop).toBeDefined();
    expect(prop!.marketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.4 });

    // 2. Vote to authorize
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_standing_boost",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.4 });
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active default alert for target syndicate (beta)
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        alertId: "alert_1",
        targetSyndicateId: "beta",
        status: "authorized",
        resolved: false,
        timestamp: 1200,
      } as any,
    };

    // Set seller standing with rangers to 80 (>= 50 means allied)
    state.factionRep = {
      ...state.factionRep,
      rangers: 80,
    };

    // Setup active option contract
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

    // Create listing for the option from alpha (ask 1200 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 1200 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Dynamic Liquidity Floor is 1000. Threshold is 100%, so critical threshold is 2000.
    // Set vault balance to 1500 (below 2000, but >= floor so trading is allowed).
    // Deficit is 25% drop.
    // Base surcharge is 10%, so scaled surcharge is 10% * 25% = 2.5% (0.025).
    // Raw surcharge paid by seller: 1200 * 0.025 = 30 gold.
    // Compounded allocation boosted by 40% (cappedMMDiscount = 0.40): 30 * 1.40 = 42 gold.
    // alpha net warChest: 20000 + 1200 - 60 (standard fee) - 30 (surcharge) - 125 + 5000 (CDS payout) = 25985 gold.
    // Senior tranche margin collateral for alpha increases from 3000 by 42 gold to 3042 gold.
    // Vault balance remains at 1500 gold.
    pool!.fractionalizedVault.balance = 1500;

    const newState = tickEconomy(state, mockPack);

    expect(newState.syndicates!.beta.warChest).toBe(19800);
    expect(newState.syndicates!.alpha.warChest).toBe(25985); // receives 1200 - 60 fee - 30 surcharge + 5000 CDS payout - 125 proposal/vote fees
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(1500);
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.tranches.senior.marginCollateral?.alpha).toBe(3042);

    // Assert journal contains boosted surcharge info
    const log = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(log).toBeDefined();
    expect(log).toContain("Dynamic MM Liquidity Surcharge");
    expect(log).toContain("30 gold paid, 42 gold compounded into senior tranche margin collateral [Boosted: 40%]");
  });

  it("should propose, vote, and apply surcharge panic override to suspend standing-gated discounts during defaults (AF-255)", () => {
    let state = setupState();

    // 1. Propose spread penalty policy with surcharge faction standing discounts
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 1.0, // 100% MM buffer threshold percent
          marketMakerSurchargeAutoCompound: false,
          marketMakerSurchargeFactionStandingDiscounts: { rangers: 0.3 }, // 30% discount for rangers
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize spread penalty policy
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.3 });
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active default alert for target syndicate (beta)
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        alertId: "alert_1",
        targetSyndicateId: "beta",
        status: "authorized",
        resolved: false,
        timestamp: 1200,
      } as any,
    };

    // Set seller standing with rangers to 80 (allied)
    state.factionRep = {
      ...state.factionRep,
      rangers: 80,
    };

    // Setup active option contract
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

    // Create listing for the option from alpha (ask 1200 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 1200 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Set vault balance to 1500 (25% drop below 2000 critical threshold).
    // Base surcharge is 10%, so scaled surcharge is 10% * 25% = 2.5% (0.025).
    // Raw surcharge is 1200 * 0.025 = 30 gold.
    pool!.fractionalizedVault.balance = 1500;

    // 2. Propose surcharge panic override to suspend the standing-gated discount
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          panicOverrideActive: true,
          cooldownDuration: 5,
          timestamp: 1250,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote on panic override
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1260,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Assert proposal is authorized with cooldownEndStep set
    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("authorized");
    expect(prop!.cooldownEndStep).toBe(state.step - 1 + 5);

    // 3. Tick economy to run options trade during authorized panic override
    const newState = tickEconomy(state, mockPack);

    // Alpha warChest receives 1200 - 60 fee - 30 full surcharge (no discount!) - 125 policy proposal/vote fees + 5000 CDS payout = 25985 gold.
    expect(newState.syndicates!.beta.warChest).toBe(19800);
    expect(newState.syndicates!.alpha.warChest).toBe(25985);
    // Vault balance receives full 30 surcharge gold: 1500 + 30 = 1530 gold.
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(1530);

    // Assert journal contains non-discounted surcharge log
    const tradeLog = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(tradeLog).toBeDefined();
    expect(tradeLog).toContain("Dynamic MM Liquidity Surcharge");
    expect(tradeLog).not.toContain("Discounted");
  });

  it("should propose, vote, and apply surcharge panic override extension to extend authorized override duration (AF-256)", () => {
    let state = setupState();

    // 1. Propose spread penalty policy with surcharge faction standing discounts
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_ext_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 1.0, // 100% MM buffer threshold percent
          marketMakerSurchargeAutoCompound: false,
          marketMakerSurchargeFactionStandingDiscounts: { rangers: 0.3 }, // 30% discount for rangers
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize spread penalty policy
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_ext_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.3 });
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active default alert for target syndicate (beta)
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        alertId: "alert_1",
        targetSyndicateId: "beta",
        status: "authorized",
        resolved: false,
        timestamp: 1200,
      } as any,
    };

    // Set seller standing with rangers to 80 (allied)
    state.factionRep = {
      ...state.factionRep,
      rangers: 80,
    };

    // Setup active option contract
    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        coverageAmount: 1000,
        premiumPaid: 100,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 30,
        timestamp: 1000,
      },
    };

    // Create listing for the option from alpha (ask 1200 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 1200 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Set vault balance to 1500 (25% drop below 2000 critical threshold).
    // Base surcharge is 10%, so scaled surcharge is 10% * 25% = 2.5% (0.025).
    // Raw surcharge is 1200 * 0.025 = 30 gold.
    pool!.fractionalizedVault.balance = 1500;

    // 2. Propose surcharge panic override to suspend the standing-gated discount
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          panicOverrideActive: true,
          cooldownDuration: 5,
          timestamp: 1250,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote on panic override
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1260,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Assert proposal is authorized with cooldownEndStep set
    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("authorized");
    const initialCooldownEnd = prop!.cooldownEndStep;
    expect(initialCooldownEnd).toBe(state.step - 1 + 5);

    // 3. Propose panic override extension
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION",
          proposalId: "surcharge_panic_override_ext_test",
          targetProposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          extensionDuration: 10,
          timestamp: 1270,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote on panic override extension
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION",
          proposalId: "surcharge_panic_override_ext_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1280,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Assert target proposal's cooldown has been extended
    const updatedProp = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(updatedProp!.cooldownEndStep).toBe(initialCooldownEnd! + 10);

    // 4. Tick economy inside extended override period to check discount remains suspended
    const newState = tickEconomy(state, mockPack);

    // Alpha warChest receives 1200 - 60 fee - 30 full surcharge (no discount!) - 125 proposal/vote fees + 5000 CDS payout = 25985 gold.
    expect(newState.syndicates!.beta.warChest).toBe(19800);
    expect(newState.syndicates!.alpha.warChest).toBe(25985);
    // Vault balance receives full 30 surcharge gold: 1500 + 30 = 1530 gold.
    expect(newState.sovereignDebtCDSCDOPools?.cdo_pool_1.fractionalizedVault.balance).toBe(1530);

    const tradeLog = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(tradeLog).toBeDefined();
    expect(tradeLog).toContain("Dynamic MM Liquidity Surcharge");
    expect(tradeLog).not.toContain("Discounted");

    // 5. Verify cooldown expiration works. Move state.step past the extended cooldown end step.
    newState.step = updatedProp!.cooldownEndStep! + 1;

    // Reset option status to "active" and seller syndicate to "alpha"
    newState.cdsCdoYieldHedgingOptionContracts!.opt_1 = {
      ...newState.cdsCdoYieldHedgingOptionContracts!.opt_1,
      status: "active",
      syndicateId: "alpha",
    };

    // Re-create listing & bid for a second trade post-expiration
    newState.cdsCdoYieldHedgingOptionListings = {
      listing_2: {
        listingId: "listing_2",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1500,
      },
    };
    newState.cdsCdoYieldHedgingOptionBids = {
      bid_2: {
        bidId: "bid_2",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1500,
      },
    };
    newState.journal = [];

    const postExpiryState = tickEconomy(newState, mockPack);
    // After expiration, standing-gated discount is active again (30% discount on 30 gold surcharge = 9 gold discount, so 21 gold surcharge).
    const postExpiryTradeLog = postExpiryState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(postExpiryTradeLog).toBeDefined();
    expect(postExpiryTradeLog).toContain("Discounted");
  });

  it("should propose, vote, and cancel surcharge panic override extension to terminate authorized override duration early (AF-257)", () => {
    let state = setupState();

    // 1. Propose spread penalty policy with surcharge faction standing discounts
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_cancel_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyThresholdPercent: 0.2,
          marketMakerSurchargeRate: 0.1, // 10% max surcharge rate
          marketMakerSurchargeThresholdPercent: 1.0, // 100% MM buffer threshold percent
          marketMakerSurchargeAutoCompound: false,
          marketMakerSurchargeFactionStandingDiscounts: { rangers: 0.3 }, // 30% discount for rangers
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize spread penalty policy
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "surcharge_policy_panic_override_cancel_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool!.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts).toEqual({ rangers: 0.3 });
    pool!.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee

    // Setup active default alert for target syndicate (beta)
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        alertId: "alert_1",
        targetSyndicateId: "beta",
        status: "authorized",
        resolved: false,
        timestamp: 1200,
      } as any,
    };

    // Set seller standing with rangers to 80 (allied)
    state.factionRep = {
      ...state.factionRep,
      rangers: 80,
    };

    // Setup active option contract
    state.cdsCdoYieldHedgingOptionContracts = {
      opt_1: {
        optionId: "opt_1",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        coverageAmount: 1000,
        premiumPaid: 100,
        strikeRate: 0.05,
        status: "active",
        expiryStep: state.step + 30,
        timestamp: 1000,
      },
    };

    // Create listing for the option from alpha (ask 1200 gold)
    state.cdsCdoYieldHedgingOptionListings = {
      listing_1: {
        listingId: "listing_1",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    // Create matching bid from beta (bid 1200 gold)
    state.cdsCdoYieldHedgingOptionBids = {
      bid_1: {
        bidId: "bid_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 1200,
        status: "active",
        timestamp: 1000,
      },
    };

    pool!.fractionalizedVault.balance = 1500;

    // 2. Propose surcharge panic override to suspend the standing-gated discount
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          panicOverrideActive: true,
          cooldownDuration: 5,
          timestamp: 1250,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote on panic override
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1260,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Assert proposal is authorized
    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("authorized");

    // 3. Propose override extension cancellation
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
          proposalId: "cancel_prop_1",
          targetProposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          timestamp: 1270,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Proposing cancellation automatically registers proposer vote = true.
    // Vote on override extension cancellation by other syndicate member (Alice) to authorize it.
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
          proposalId: "cancel_prop_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1280,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Assert target proposal's override is now terminated/inactive
    const updatedProp = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(updatedProp!.cooldownEndStep).toBeUndefined();
    expect(updatedProp!.panicOverrideActive).toBe(false);

    // 4. Tick economy - standing-gated discount should be active (since override is cancelled early!)
    const newState = tickEconomy(state, mockPack);

    const tradeLog = newState.journal!.find((m) => m.includes("[CDO Yield-Hedging Option Traded]"));
    expect(tradeLog).toBeDefined();
    expect(tradeLog).toContain("Discounted");
  });

  it("should propose, authorize and process surcharge panic override extension cancellation grace period and linear decay (AF-258)", () => {
    let state = setupState();

    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionMarketMakerSurchargeRate = 0.1;
    pool.yieldHedgingOptionMarketMakerBufferThresholdPercent = 0.2;
    pool.yieldHedgingOptionSecondaryFeePercent = 0.05; // 5% base secondary fee
    pool.yieldHedgingOptionMarketMakerSurchargeFactionStandingDiscounts = { alpha_faction: 0.1 };

    state.factionRep = {
      alpha: 100,
    };

    // Setup active option contract
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

    // Setup listings and bids for trading
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

    // Alpha syndicate has member "player" (repreputation with alpha_faction is allied/above threshold)
    // Put pool into critical liquidity stress
    pool.fractionalizedVault.balance = 600;

    // 1. Propose and authorize a surcharge panic override proposal
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          panicOverrideActive: true,
          cooldownDuration: 10,
          timestamp: 1200,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE",
          proposalId: "surcharge_panic_override_test",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1250,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify panic override is active and freeze discount adjustments
    const prop = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(prop).toBeDefined();
    expect(prop!.panicOverrideActive).toBe(true);

    // 2. Propose a cancellation proposal
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
          proposalId: "cancel_prop_1",
          targetProposalId: "surcharge_panic_override_test",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          timestamp: 1270,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Propose a grace period proposal targeting the cancellation proposal with graceDuration = 5 steps
    res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
          proposalId: "grace_prop_1",
          targetProposalId: "cancel_prop_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          graceDuration: 5,
          timestamp: 1280,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize the grace proposal
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION_GRACE",
          proposalId: "grace_prop_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1290,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify remainingGraceSteps and graceDuration are registered on the cancellation proposal
    const cancelProp =
      state.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals?.cancel_prop_1;
    expect(cancelProp!.remainingGraceSteps).toBe(5);
    expect(cancelProp!.graceDuration).toBe(5);

    // Vote to authorize the cancellation proposal itself
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SURCHARGE_PANIC_OVERRIDE_EXTENSION_CANCELLATION",
          proposalId: "cancel_prop_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1300,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Since cancellation is authorized but has a grace period of 5, the override is NOT instantly deactivated.
    // Instead, target override's cooldownEndStep is updated to step + 5
    const overrideProp = state.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(overrideProp!.panicOverrideActive).toBe(true);
    expect(overrideProp!.cooldownEndStep).toBe(10);

    // 4. Verify linear decay of the override restrictions during economy ticks!
    // Since grace has 5 remaining steps, restriction decays:
    // overrideMultiplier = 1 - (remainingGraceSteps / graceDuration) = 1 - (5 / 5) = 0.
    // At this first step, discount is scaled by 0, so discount applied is 0% of alpha_faction discount.
    // Let's tick the economy once.
    let tickedState = tickEconomy(state, mockPack);
    // At the end of tickEconomy, remainingGraceSteps was decremented from 5 to 4.
    // Next tick will use remainingGraceSteps = 4, so overrideMultiplier = 1 - (4 / 5) = 0.20 (20% discount applied).
    const updatedCancel =
      tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals?.cancel_prop_1;
    expect(updatedCancel!.remainingGraceSteps).toBe(4);

    const updatedOverride =
      tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(updatedOverride!.cooldownEndStep).toBe(tickedState.step + 4);

    // After 4 more ticks, remaining grace steps will reach 0 and the override will terminate.
    for (let i = 0; i < 4; i++) {
      tickedState = tickEconomy(tickedState, mockPack);
    }
    const finalCancel =
      tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideExtensionCancellationProposals?.cancel_prop_1;
    expect(finalCancel!.remainingGraceSteps).toBe(0);

    const finalOverride =
      tickedState.cdsCdoYieldHedgingOptionSurchargePanicOverrideProposals?.surcharge_panic_override_test;
    expect(finalOverride!.panicOverrideActive).toBe(false);
    expect(finalOverride!.cooldownEndStep).toBeUndefined();
  });
});
