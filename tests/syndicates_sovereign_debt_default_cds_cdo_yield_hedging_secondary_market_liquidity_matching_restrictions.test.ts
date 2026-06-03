import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { multiAgentStep } from "../src/core/sync.js";

describe("Syndicate SWF Sovereign Debt Default CDO Yield-Hedging Option Secondary Market Liquidity-gated Bid-Ask Matching Restrictions (AF-246)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_liquidity_gate_test_pack",
      title: "Yield Hedging Liquidity Gate Test Pack",
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
        gold: 10000,
        gold_alice: 10000,
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
          balance: 1000, // BELOW the floor!
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
        dynamicLiquidityFloor: 2000, // Floor is 2000
        premiumPricingSpread: 0.1,
        automatedHedgeEnabled: true,
        dynamicMatchingEnabled: true,
        timestamp: 1000,
      },
    };

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
        askPrice: 2500,
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
        bidPrice: 2500,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    state.factionRep = {
      alpha: 100,
      beta: 100,
    };

    return state;
  };

  it("should prevent secondary market trades and dynamic mid-price matches when vault balance is below the dynamic liquidity floor under default stress", () => {
    let state = setupState();

    // Verify setup
    expect(state.sovereignDebtCDSCDOPools!.cdo_pool_1.fractionalizedVault.balance).toBe(1000);
    expect(state.sovereignDebtCDSCDOPools!.cdo_pool_1.dynamicLiquidityFloor).toBe(2000);

    // Tick economy - matching / trading should be blocked
    let finalState = tickEconomy(state, mockPack);

    // Assert that the option was NOT traded and listing/bid remain active
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("alpha");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("active");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("active");
  });

  it("should permit secondary market trades and dynamic mid-price matches when vault balance is restored above the dynamic liquidity floor", () => {
    let state = setupState();

    // Restore vault balance above floor (2000) to 2500
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.fractionalizedVault.balance = 2500;

    // Tick economy - matching / trading should be allowed and execute successfully
    let finalState = tickEconomy(state, mockPack);

    // Assert that the option WAS traded to beta and listing/bid are completed/accepted
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("completed");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("accepted");
  });
});
