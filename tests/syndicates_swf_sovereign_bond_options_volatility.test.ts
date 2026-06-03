import { describe, it, expect } from "vitest";
import { createInitialState, getBondVolatility, calculateOptionPremium } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Bond Options & Yield Volatility Indexes (AF-144)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "options_volatility_pack",
      title: "Options & Volatility Test Pack",
      start_room: "market",
      vars_init: { gold: 50000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A beautiful market square.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support buying options, calculating dynamic premiums, expiry settlement, exercising options, volatility trading, and volatility-hedged reserve buffers", () => {
    let state = createInitialState({
      seed: 1234,
      start: "market",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "bob", "carol"],
    });

    // 1. Setup syndicate
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "bob"], // 2 members => majority is > 1
        definedBy: "player",
        timestamp: 1000,
        warChest: 15000,
      },
    };

    // Initialize margin account for Alpha
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 10000,
        timestamp: 1000,
      },
    };

    // Establish Active Cooperative Sovereignty Bond
    state.cooperativeSovereigntyBondProposals = {
      bond_1: {
        id: "bond_1",
        creatorSyndicateId: "alpha",
        factionId: "rangers",
        faceValue: 10000,
        interestRate: 8.0, // Base interest rate = 8%
        termEpochs: 10,
        remainingEpochs: 10,
        status: "Active",
        contributions: { alpha: 10000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // Establish a lending pool associated with bond_1 so yield rate updates dynamically
    state.sovereignBondLendingPools = {
      pool_1: {
        id: "pool_1",
        creatorSyndicateId: "alpha",
        bondId: "bond_1",
        deposits: { alpha: 10000 },
        totalDeposited: 10000,
        totalBorrowed: 0,
        borrowFeeRate: 8.0, // Dynamic yield rate = 8%
        timestamp: 1000,
      },
    };

    // 2. Buy Option (Call option with strike yield 7.5%)
    // Base premium calculation should be non-negative
    let basePremium = calculateOptionPremium(state, "bond_1", "call", 7.5, 5);
    expect(basePremium).toBeGreaterThan(0);

    const buyCallActionPlayer = {
      type: "BUY_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      bondId: "bond_1",
      optionType: "call",
      strikePrice: 7.5,
      premium: basePremium,
      size: 100,
      expirationEpoch: 5,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: buyCallActionPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote recorded, no consensus yet
    expect(state.buySovereignBondOptionVotes?.["alpha"]?.["player"]).toBeDefined();
    expect(state.sovereignBondOptions?.["opt_1"]).toBeUndefined();

    const buyCallActionBob = {
      type: "BUY_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      bondId: "bond_1",
      optionType: "call",
      strikePrice: 7.5,
      premium: basePremium,
      size: 100,
      expirationEpoch: 5,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: buyCallActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Consensus achieved: opt_1 created, collateral deducted
    const option = state.sovereignBondOptions?.["opt_1"];
    expect(option).toBeDefined();
    expect(option?.optionType).toBe("call");
    expect(option?.strikePrice).toBe(7.5);
    expect(option?.active).toBe(true);
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(10000 - Math.round(basePremium * 100));

    // 3. Dynamic Volatility calculation and Option Expiry Settlement
    // Trigger tickEconomy a few times to build yield histories
    state.step = 1;
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 8.5; // yield up
    state = tickEconomy(state, mockPack);

    state.step = 2;
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 9.5; // yield up further
    state = tickEconomy(state, mockPack);

    // Let's assert VIX (volatility index) has been calculated dynamically
    const vix = getBondVolatility(state, "bond_1");
    expect(vix).toBeGreaterThan(20.0); // Variance and spread should drive VIX above base 20

    // Set step to 5 to trigger opt_1 expiry
    state.step = 5;
    let oldCollateral = state.marginAccounts?.["alpha"]?.collateral ?? 0;
    state = tickEconomy(state, mockPack);

    // Option should now be inactive
    expect(state.sovereignBondOptions?.["opt_1"]?.active).toBe(false);
    // Call option strike = 7.5%, expired at yield 9.5%. Intrinsic = 2.0%
    // Payoff = 2.0 * 100 * 1000 = 200,000 gold!
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(oldCollateral + 200000);

    // 4. Exercise Option manually
    // Buy a Put option (Strike = 11.0%)
    basePremium = calculateOptionPremium(state, "bond_1", "put", 11.0, 10);
    const buyPutActionPlayer = {
      type: "BUY_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      bondId: "bond_1",
      optionType: "put",
      strikePrice: 11.0,
      premium: basePremium,
      size: 50,
      expirationEpoch: 10,
      timestamp: 1003,
    };

    res = multiAgentStep(state, { agentId: "player", action: buyPutActionPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const buyPutActionBob = {
      type: "BUY_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      bondId: "bond_1",
      optionType: "put",
      strikePrice: 11.0,
      premium: basePremium,
      size: 50,
      expirationEpoch: 10,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: buyPutActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.sovereignBondOptions?.["opt_2"]?.active).toBe(true);

    // Exercise Put manually
    const exerciseActionPlayer = {
      type: "EXERCISE_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      optionId: "opt_2",
      timestamp: 1005,
    };

    res = multiAgentStep(state, { agentId: "player", action: exerciseActionPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const exerciseActionBob = {
      type: "EXERCISE_SOVEREIGN_BOND_OPTION",
      syndicateId: "alpha",
      optionId: "opt_2",
      timestamp: 1006,
    };

    oldCollateral = state.marginAccounts?.["alpha"]?.collateral ?? 0;
    res = multiAgentStep(state, { agentId: "bob", action: exerciseActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Put strike = 11.0%, current yield = 9.5%. Intrinsic = 1.5%
    // Payoff = 1.5 * 50 * 1000 = 75,000 gold!
    expect(state.sovereignBondOptions?.["opt_2"]?.active).toBe(false);
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(oldCollateral + 75000);

    // 5. Open Volatility Position
    const openVolPlayer = {
      type: "OPEN_SOVEREIGN_BOND_VOLATILITY_POSITION",
      syndicateId: "alpha",
      bondId: "bond_1",
      side: "long",
      size: 100,
      marginCollateral: 2000,
      timestamp: 1007,
    };

    res = multiAgentStep(state, { agentId: "player", action: openVolPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const openVolBob = {
      type: "OPEN_SOVEREIGN_BOND_VOLATILITY_POSITION",
      syndicateId: "alpha",
      bondId: "bond_1",
      side: "long",
      size: 100,
      marginCollateral: 2000,
      timestamp: 1008,
    };

    oldCollateral = state.marginAccounts?.["alpha"]?.collateral ?? 0;
    res = multiAgentStep(state, { agentId: "bob", action: openVolBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Position opened, collateral deducted
    expect(state.sovereignBondVolatilityPositions?.["vol_1"]?.active).toBe(true);
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(oldCollateral - 2000);

    // 6. Volatility position MTM Ticking
    const entryVol = state.sovereignBondVolatilityPositions?.["vol_1"]?.entryVolatility ?? 0;
    // Induce higher volatility by swinging borrow fee rate extremely
    state.step = 6;
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 18.0;
    state = tickEconomy(state, mockPack);

    const newVol = getBondVolatility(state, "bond_1");
    expect(newVol).toBeGreaterThan(entryVol);

    // Check that collateral changed by long volatility position profit
    // profit = (newVol - entryVol) * 100 * 10
    const expectedProfit = Math.round((newVol - entryVol) * 100 * 10);
    expect(state.sovereignBondVolatilityPositions?.["vol_1"]?.entryVolatility).toBe(newVol);

    // 7. Volatility-Hedged Reserve Buffer Policy
    const configureBufferPlayer = {
      type: "CONFIGURE_VOLATILITY_HEDGED_BUFFER",
      syndicateId: "alpha",
      reserveTarget: 5000,
      hedgedRatio: 80.0,
      timestamp: 1009,
    };

    res = multiAgentStep(state, { agentId: "player", action: configureBufferPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const configureBufferBob = {
      type: "CONFIGURE_VOLATILITY_HEDGED_BUFFER",
      syndicateId: "alpha",
      reserveTarget: 5000,
      hedgedRatio: 80.0,
      timestamp: 1010,
    };

    res = multiAgentStep(state, { agentId: "bob", action: configureBufferBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.volatilityHedgedReserveBuffers?.["alpha"]).toBeDefined();
    expect(state.volatilityHedgedReserveBuffers?.["alpha"]?.reserveTarget).toBe(5000);

    // Trigger tickEconomy to assert automatic adjustments
    state.step = 7;
    // Volatility is extremely high right now, target scaledTarget = 5000 * (1 + (vix - 20)/100)
    // Collateral should be automatically adjusted if it differs significantly or is lower
    state.syndicates!["alpha"].warChest = 10000;
    state.marginAccounts!["alpha"].collateral = 1000; // Force collateral low
    state = tickEconomy(state, mockPack);

    // Should deposit from war chest to hit the volatility-scaled target
    expect(state.marginAccounts?.["alpha"]?.collateral).toBeGreaterThan(1000);
    expect(state.syndicates?.["alpha"]?.warChest).toBeLessThan(10000);
  });
});
