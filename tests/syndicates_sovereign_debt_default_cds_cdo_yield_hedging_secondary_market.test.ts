import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy, getCDSCDOYieldHedgingPremium } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Debt Default CDO Tranche Yield-Hedging Option Secondary Market (AF-242)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "yield_hedging_secondary_test_pack",
      title: "Yield Hedging Secondary Test Pack",
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

  it("should propose and authorize dynamic matching policy parameters", () => {
    let state = setupState();

    // 1. Propose policy with dynamic matching and liquidity floor
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "PROPOSE_CDO_YIELD_HEDGING_POLICY",
        proposalId: "policy_secondary",
        cdoId: "cdo_pool_1",
        syndicateId: "alpha",
        premiumPricingSpread: 0.1,
        automatedHedgeEnabled: true,
        dynamicMatchingEnabled: true,
        dynamicLiquidityFloor: 500,
        timestamp: 1100,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Vote to authorize
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "VOTE_CDO_YIELD_HEDGING_POLICY",
        proposalId: "policy_secondary",
        syndicateId: "alpha",
        vote: true,
        timestamp: 1150,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.dynamicMatchingEnabled).toBe(true);
    expect(pool?.dynamicLiquidityFloor).toBe(500);
  });

  it("should support listing, bidding, and dynamic bid-ask matching for option secondary trading", () => {
    let state = setupState();

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

    // 1. Propose listing option
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

    expect(state.cdsCdoYieldHedgingOptionListings?.opt_1).toBeDefined();
    expect(state.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("proposed");

    // Alice votes to activate listing
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
    expect(state.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("active");

    // 2. Propose bid on option from Beta Syndicate (only bob is in Beta, so it should activate immediately)
    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "BID_ON_CDO_YIELD_HEDGING_OPTION",
        bidId: "bid_opt_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 800,
        timestamp: 1220,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("active");

    // 3. Tick economy to match the bid and ask
    // Since dynamicMatchingEnabled is true, match should execute at mid-price: (600 + 800) / 2 = 700 gold
    const finalState = tickEconomy(state, mockPack);

    // Option should be traded to Beta
    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("completed");
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("accepted");

    // Check war chests:
    // Alpha gained 700: 20000 (starting) + 700 (trade price) + 1700 (tranche coupon payouts) = 22400
    expect(finalState.syndicates?.alpha.warChest).toBe(22400);
    // Beta spent 700: 20000 (starting) - 700 (trade price) = 19300
    expect(finalState.syndicates?.beta.warChest).toBe(19300);
  });

  it("should enforce dynamic liquidity floors and block fire-sales during active default alerts", () => {
    let state = setupState();

    state.sovereignDebtCDSCDOPools!.cdo_pool_1.premiumPricingSpread = 0.1;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.automatedHedgeEnabled = true;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.dynamicMatchingEnabled = false;
    state.sovereignDebtCDSCDOPools!.cdo_pool_1.dynamicLiquidityFloor = 500;

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

    // Add active default alert
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "authorized",
        resolved: false,
        proposerId: "bob",
        timestamp: 1100,
      },
    };

    // 1. Propose low-price listing (400 ask price - below 500 floor)
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "LIST_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        askPrice: 400,
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
        askPrice: 400,
        timestamp: 1210,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Propose low-price bid (450 bid price - below 500 floor but matches ask)
    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "BID_ON_CDO_YIELD_HEDGING_OPTION",
        bidId: "bid_opt_1",
        optionId: "opt_1",
        bidderSyndicateId: "beta",
        bidPrice: 450,
        timestamp: 1220,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Tick economy
    // Since prices are below 500 floor under active alert, match should NOT occur
    const finalState = tickEconomy(state, mockPack);

    expect(finalState.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("alpha"); // ownership not changed
    expect(finalState.cdsCdoYieldHedgingOptionListings?.opt_1.status).toBe("active"); // listing still active, not completed
    expect(finalState.cdsCdoYieldHedgingOptionBids?.bid_opt_1.status).toBe("active"); // bid still active, not accepted
  });

  it("should support manual transfer of Option ownership", () => {
    let state = setupState();

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

    // Propose transfer from Alpha to Beta for 800 gold
    let res = multiAgentStep(state, {
      agentId: "player",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 800,
        timestamp: 1200,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionTransfers?.opt_1_alpha_beta).toBeDefined();
    expect(state.cdsCdoYieldHedgingOptionTransfers?.opt_1_alpha_beta.status).toBe("proposed");

    // Alice votes (majority of seller syndicate alpha)
    res = multiAgentStep(state, {
      agentId: "alice",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 800,
        timestamp: 1210,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Bob votes (majority of buyer syndicate beta - since bob is sole member)
    res = multiAgentStep(state, {
      agentId: "bob",
      action: {
        type: "TRANSFER_CDO_YIELD_HEDGING_OPTION",
        optionId: "opt_1",
        sellerSyndicateId: "alpha",
        buyerSyndicateId: "beta",
        price: 800,
        timestamp: 1220,
      },
    }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Ownership transferred immediately after both sides approved
    expect(state.cdsCdoYieldHedgingOptionContracts?.opt_1.syndicateId).toBe("beta");
    expect(state.cdsCdoYieldHedgingOptionTransfers?.opt_1_alpha_beta.status).toBe("completed");
  });
});
