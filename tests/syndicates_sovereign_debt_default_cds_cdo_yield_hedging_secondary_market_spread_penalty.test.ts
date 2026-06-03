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
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "spread_penalty_policy_1",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.5,
          spreadPenaltyThresholdPercent: 0.2,
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    const prop = state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1;
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("proposed");
    expect(prop!.spreadPenaltyMultiplier).toBe(2.5);
    expect(prop!.spreadPenaltyThresholdPercent).toBe(0.2);

    // Proposer charged proposal fee (base 200 * scalars)
    expect(state.syndicates?.alpha.warChest).toBeLessThan(20000);

    // 2. Alice votes YES to approve
    res = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "spread_penalty_policy_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1150,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1.status).toBe(
      "authorized"
    );
    expect(state.cdsCdoYieldHedgingOptionSpreadPenaltyPolicyProposals?.spread_penalty_policy_1.resolved).toBe(true);

    // Alpha pool has updated dynamic spread penalty policy properties
    const pool = state.sovereignDebtCDSCDOPools?.cdo_pool_1;
    expect(pool?.yieldHedgingOptionSpreadPenaltyMultiplier).toBe(2.5);
    expect(pool?.yieldHedgingOptionSpreadPenaltyThresholdPercent).toBe(0.2);
  });

  it("should apply dynamic spread penalty multiplier under default stress and block trading if widened spread exceeds maxSpread limit", () => {
    let state = setupState();

    // 1. Directly configure pool properties
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionSpreadPenaltyMultiplier = 3.0;
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.2;
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
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.2;
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

  it("should smoothly decay the spread penalty multiplier over 5 steps on default resolution", () => {
    let state = setupState();

    // 1. Directly configure pool properties
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionSpreadPenaltyMultiplier = 3.0;
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.2;
    pool.yieldHedgingOptionMinSpread = 10;
    pool.yieldHedgingOptionMaxSpread = 100;

    // 2. Set default alert resolved at step 10
    state.sovereignDebtDefaultAlerts = {
      alert_1: {
        proposalId: "alert_1",
        syndicateId: "alpha",
        targetSyndicateId: "beta",
        sovereignDebtAmount: 5000,
        status: "resolved",
        resolved: true,
        resolvedAtStep: 10,
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
        expiryStep: 100,
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
        bidPrice: 1150, // raw spread is 50
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // Step 10: elapsed = 0 -> multiplier should be 3.0, widened spread = 50 * 3.0 = 150
    state.step = 10;
    let stateAt10 = tickEconomy(state, mockPack);
    let spreadAt10 = stateAt10.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt10).toBeCloseTo(150);

    // Step 11: elapsed = 1 -> multiplier should be 2.6, widened spread = 50 * 2.6 = 130
    state.step = 11;
    let stateAt11 = tickEconomy(state, mockPack);
    let spreadAt11 = stateAt11.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt11).toBeCloseTo(130);

    // Step 12: elapsed = 2 -> multiplier should be 2.2, widened spread = 50 * 2.2 = 110
    state.step = 12;
    let stateAt12 = tickEconomy(state, mockPack);
    let spreadAt12 = stateAt12.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt12).toBeCloseTo(110);

    // Step 13: elapsed = 3 -> multiplier should be 1.8, widened spread = 50 * 1.8 = 90
    state.step = 13;
    let stateAt13 = tickEconomy(state, mockPack);
    let spreadAt13 = stateAt13.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt13).toBeCloseTo(90);

    // Step 14: elapsed = 4 -> multiplier should be 1.4, widened spread = 50 * 1.4 = 70
    state.step = 14;
    let stateAt14 = tickEconomy(state, mockPack);
    let spreadAt14 = stateAt14.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt14).toBeCloseTo(70);

    // Step 15: elapsed = 5 -> multiplier should be 1.0 (no penalty), widened spread = 50 * 1.0 = 50
    state.step = 15;
    let stateAt15 = tickEconomy(state, mockPack);
    let spreadAt15 = stateAt15.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadAt15).toBeCloseTo(50);
  });

  it("should scale the active spread penalty multiplier by local territory enforcer heat and regional weather volatility index", () => {
    let state = setupState();

    // 1. Configure pool properties
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    pool.yieldHedgingOptionSpreadPenaltyMultiplier = 2.0;
    pool.yieldHedgingOptionSpreadPenaltyThresholdPercent = 0.2;
    pool.yieldHedgingOptionMinSpread = 10;
    pool.yieldHedgingOptionMaxSpread = 1000;

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

    // Listing has askPrice 1200, bid has bidPrice 1150 -> raw spread is 50
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
        bidPrice: 1150,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // 4. Configure local territory enforcer heat volatility scales in the syndicate
    state.syndicates!.alpha.territoryEnforcerHeatVolatilityScales = {
      vault: 0.15, // scale factor for room 'vault'
    };

    // Set enforcer heat for room 'vault' (the current room, since state.current is 'vault')
    state.enforcementHeat = {
      vault: {
        roomId: "vault",
        heat: 4,
        timestamp: 1000,
      },
    };

    // Set environmental weather & wind (storm = 50, tempest = 30 -> regionalVol = 0.80)
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "tempest",
      lastUpdatedStep: 0,
    };

    // Let's compute expected effective spread penalty multiplier:
    // baseMultiplier = 2.0
    // localHeatFactor = 4 * 0.15 = 0.60
    // regionalVol = (50 + 30) / 100 = 0.80
    // expectedMultiplier = 2.0 * (1.0 + 0.60 + 0.80) = 2.0 * 2.4 = 4.8
    // expectedSpread = 50 * 4.8 = 240

    let finalState = tickEconomy(state, mockPack);

    const marketSpread = finalState.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1;
    expect(marketSpread).toBeDefined();
    expect(marketSpread!.spread).toBeCloseTo(240);
  });

  it("should apply faction standing-gated deflection discounts to spread penalties during defaults (AF-250)", () => {
    let state = setupState();

    // 1. Propose spread penalty policy with factionStandingDiscounts
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "spread_penalty_policy_discount",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.5,
          spreadPenaltyThresholdPercent: 0.2,
          factionStandingDiscounts: {
            faction_a: 0.25,
            faction_b: 0.4,
          },
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize proposal
    let voteRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          syndicateId: "alpha",
          proposalId: "spread_penalty_policy_discount",
          vote: true,
          timestamp: 1120,
        } as any,
      },
      mockPack
    );
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    // Verify Copied to Pool
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    expect(pool.yieldHedgingOptionSpreadPenaltyFactionStandingDiscounts).toEqual({
      faction_a: 0.25,
      faction_b: 0.4,
    });

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

    // Listing has askPrice 1200, bid has bidPrice 1150 -> raw spread is 50
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
        bidPrice: 1150,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // Case A: High standing with faction_a only (reputation = 60 >= 50)
    // baseMultiplier = 2.5, discount = 25% (0.25)
    // expected multiplier = 1.0 + (2.5 - 1.0) * (1.0 - 0.25) = 2.125
    // expected spread = 50 * 2.125 = 106.25
    const stateAInit = JSON.parse(JSON.stringify(state));
    stateAInit.factionRep = {
      faction_a: 60,
      faction_b: 20,
    };

    let stateA = tickEconomy(stateAInit, mockPack);
    let spreadA = stateA.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadA).toBeCloseTo(106.25);

    // Case B: High standing with BOTH faction_a and faction_b (reputation = 60, 70 >= 50)
    // baseMultiplier = 2.5, total discount = 0.25 + 0.40 = 0.65
    // expected multiplier = 1.0 + (2.5 - 1.0) * (1.0 - 0.65) = 1.525
    // expected spread = 50 * 1.525 = 76.25
    const stateBInit = JSON.parse(JSON.stringify(state));
    stateBInit.factionRep = {
      faction_a: 60,
      faction_b: 70,
    };

    let stateB = tickEconomy(stateBInit, mockPack);
    let spreadB = stateB.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadB).toBeCloseTo(76.25);

    // Case C: Allied to faction_a via alliances instead of reputation score
    // baseMultiplier = 2.5, discount = 25% (0.25)
    // expected multiplier = 1.0 + (2.5 - 1.0) * (1.0 - 0.25) = 2.125
    // expected spread = 50 * 2.125 = 106.25
    const stateCInit = JSON.parse(JSON.stringify(state));
    stateCInit.factionRep = {
      faction_a: 20,
      faction_b: 20,
    };
    stateCInit.alliances = {
      alpha: {
        faction_a: "allied",
      },
    };

    let stateC = tickEconomy(stateCInit, mockPack);
    let spreadC = stateC.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadC).toBeCloseTo(106.25);
  });

  it("should enforce dynamic spread penalty cap multipliers under extreme volatility default spikes (AF-251)", () => {
    let state = setupState();

    // 1. Propose spread penalty policy with a cap multiplier
    let res = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          proposalId: "spread_penalty_policy_cap",
          cdoId: "cdo_pool_1",
          syndicateId: "alpha",
          spreadPenaltyMultiplier: 2.0,
          spreadPenaltyCapMultiplier: 3.0,
          spreadPenaltyThresholdPercent: 0.2,
          factionStandingDiscounts: {
            faction_a: 0.2,
          },
          timestamp: 1100,
        } as any,
      },
      mockPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote to authorize proposal
    let voteRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_CDO_YIELD_HEDGING_SPREAD_PENALTY_POLICY",
          syndicateId: "alpha",
          proposalId: "spread_penalty_policy_cap",
          vote: true,
          timestamp: 1120,
        } as any,
      },
      mockPack
    );
    expect(voteRes.ok).toBe(true);
    state = voteRes.state;

    // Verify Copied to Pool
    const pool = state.sovereignDebtCDSCDOPools!.cdo_pool_1;
    expect(pool.yieldHedgingOptionSpreadPenaltyMultiplier).toBe(2.0);
    expect(pool.yieldHedgingOptionSpreadPenaltyCapMultiplier).toBe(3.0);

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

    // Listing has askPrice 1200, bid has bidPrice 1150 -> raw spread is 50
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
        bidPrice: 1150,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // 4. Configure local territory enforcer heat volatility scales in the syndicate
    state.syndicates!.alpha.territoryEnforcerHeatVolatilityScales = {
      vault: 0.2, // scale factor for room 'vault'
    };

    // Set enforcer heat for room 'vault' (the current room, since state.current is 'vault')
    state.enforcementHeat = {
      vault: {
        roomId: "vault",
        heat: 5, // adds 5 * 0.20 = 1.0 to volatility
        timestamp: 1000,
      },
    };

    // Set environmental weather & wind (storm = 50, tempest = 30 -> regionalVol = 0.80)
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "tempest",
      lastUpdatedStep: 0,
    };

    // Case A: High volatility without faction standing discounts
    // baseMultiplier = 2.0
    // heat multiplier component = 1.0 + 1.0 (heat) + 0.80 (weather) = 2.80
    // uncappedMultiplier = 2.0 * 2.80 = 5.60
    // cappedMultiplier = min(5.60, cap = 3.0) = 3.0
    // expected spread = 50 * 3.0 = 150
    const stateAInit = JSON.parse(JSON.stringify(state));
    stateAInit.factionRep = {
      faction_a: 10, // low reputation (< 50)
    };

    let stateA = tickEconomy(stateAInit, mockPack);
    let spreadA = stateA.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadA).toBeCloseTo(150);

    // Case B: High volatility with faction standing discount applied on top of capped multiplier
    // cappedMultiplier = 3.0
    // faction_a discount = 20%
    // expected effective multiplier = 1.0 + (3.0 - 1.0) * (1.0 - 0.20) = 2.60
    // expected spread = 50 * 2.60 = 130
    const stateBInit = JSON.parse(JSON.stringify(state));
    stateBInit.factionRep = {
      faction_a: 60, // high reputation (>= 50)
    };

    let stateB = tickEconomy(stateBInit, mockPack);
    let spreadB = stateB.cdsCdoYieldHedgingOptionMarketSpreads?.opt_1?.spread;
    expect(spreadB).toBeCloseTo(130);
  });
});
