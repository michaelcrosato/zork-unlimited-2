import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate SWF Sovereign Bond Arbitrage Routing & Liquidity Injection (AF-142)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "arbitrage_pack",
      title: "Arbitrage Test Pack",
      start_room: "market",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "market",
        name: "Market Square",
        description: "A bustling market square.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support setting SWF bond arbitrage policy by majority vote consensus, automated rebalancing, fresh deployment, faction-backed injection, and manual triggering", () => {
    let state = createInitialState({
      seed: 1234,
      start: "market",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "bob", "carol", "dan"],
    });

    // 1. Establish syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "bob"], // 2 members
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["carol"],
        definedBy: "carol",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    // Initialize margin account for Alpha
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 5000,
        swfLiquidityBuffer: 5000,
        swfLeverageFactor: 1.0,
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
        interestRate: 10,
        termEpochs: 10,
        remainingEpochs: 10,
        status: "Active",
        contributions: { alpha: 8000, beta: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // Establish two lending pools for bond_1
    state.sovereignBondLendingPools = {
      pool_1: {
        id: "pool_1",
        creatorSyndicateId: "alpha",
        bondId: "bond_1",
        deposits: { alpha: 3000 },
        totalDeposited: 3000,
        totalBorrowed: 0,
        borrowFeeRate: 5.0,
        timestamp: 1000,
      },
      pool_2: {
        id: "pool_2",
        creatorSyndicateId: "beta",
        bondId: "bond_1",
        deposits: { alpha: 2000, beta: 2000 },
        totalDeposited: 4000,
        totalBorrowed: 0,
        borrowFeeRate: 5.0,
        timestamp: 1000,
      },
    };

    // Update contributions to reflect pool deposits
    state.cooperativeSovereigntyBondProposals["bond_1"].contributions = {
      alpha: 3000, // 8000 original - 3000 in pool_1 - 2000 in pool_2
      beta: 0, // 2000 original - 2000 in pool_2 (key deleted when reaches 0)
      pool_pool_1: 3000,
      pool_pool_2: 4000,
    };

    // 2. Test Voting on SWF Sovereign Bond Arbitrage Policy
    // Player votes to enable policy with target pools pool_1 and pool_2
    const voteActionPlayer = {
      type: "SET_SWF_BOND_ARBITRAGE_POLICY",
      syndicateId: "alpha",
      enabled: true,
      targetPoolIds: ["pool_1", "pool_2"],
      maxCapitalAllocated: 1000,
      minYieldSpread: 2.0,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: voteActionPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify vote is recorded but not reconciled (since Alpha needs > 1/2 of 2 members, meaning 2 votes)
    expect(state.swfSovereignBondArbitragePolicyVotes?.["alpha"]?.["player"]).toBeDefined();
    expect(state.marginAccounts?.["alpha"]?.swfBondArbitrageEnabled).toBeUndefined();

    // Bob votes the same way to reach consensus
    const voteActionBob = {
      type: "SET_SWF_BOND_ARBITRAGE_POLICY",
      syndicateId: "alpha",
      enabled: true,
      targetPoolIds: ["pool_1", "pool_2"],
      maxCapitalAllocated: 1000,
      minYieldSpread: 2.0,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify consensus is reconciled into Margin Account
    const alphaMA = state.marginAccounts?.["alpha"];
    expect(alphaMA?.swfBondArbitrageEnabled).toBe(true);
    expect(alphaMA?.swfBondArbitrageTargetPools).toEqual(["pool_1", "pool_2"]);
    expect(alphaMA?.swfBondArbitrageMaxCapital).toBe(1000);
    expect(alphaMA?.swfBondArbitrageMinYieldSpread).toBe(2.0);

    // 3. Test Automated Reallocation & Capital Routing on Ticks
    // Let's create a borrow position on pool_1 to push utilization up and increase its dynamic yield rate
    // Pool 1 totalDeposited = 3000. Let's borrow 2000 shares.
    state.sovereignBondBorrowPositions = {
      borrow_1: {
        id: "borrow_1",
        borrowerSyndicateId: "beta",
        lenderSyndicateId: "pool_pool_1",
        bondId: "bond_1",
        amount: 2000,
        collateralGold: 1000,
        borrowFeeRate: 5.0,
        status: "Active",
        timestamp: 1003,
        accumulatedBorrowFees: 0,
        lendingPoolId: "pool_1",
      },
    };
    state.sovereignBondLendingPools!["pool_1"].totalBorrowed = 2000;
    // Utilization U = 2000 / 3000 = 0.6666 => dynamic borrowFeeRate = 5 + 10 * U = 11.666%
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 11.666;

    // Pool 2: totalDeposited = 4000, totalBorrowed = 0. U = 0 => borrowFeeRate = 5%
    // Spread = 11.666 - 5.0 = 6.666%, which is >= minYieldSpread (2.0%)
    // Trigger tick to run automated arbitrage routing
    let tickedState = tickProductionLabs(state, []);

    // Verify capital was reallocated from pool_2 (yield: 5%) to pool_1 (yield: 11.66%)
    // Alpha had 2000 in pool_2, 3000 in pool_1.
    // Max capital allocated per tick = 1000.
    // Pool 2 unborrowed = 4000. So we can withdraw full 1000.
    // New Alpha deposits: pool_1: 4000 (+1000), pool_2: 1000 (-1000).
    const tickedPool1 = tickedState.sovereignBondLendingPools?.["pool_1"];
    const tickedPool2 = tickedState.sovereignBondLendingPools?.["pool_2"];
    expect(tickedPool1?.deposits["alpha"]).toBe(5000);
    expect(tickedPool2?.deposits["alpha"]).toBe(1000);
    expect(tickedPool1?.totalDeposited).toBe(5000);
    expect(tickedPool2?.totalDeposited).toBe(3000);

    // Dynamic fee rates should be updated
    // Pool 1 new U = 2000 / 4000 = 0.5 => fee rate = 5 + 10 * 0.5 = 10%
    // Pool 2 new U = 0 / 3000 = 0 => fee rate = 5%
    expect(tickedPool1?.borrowFeeRate).toBe(9.0);
    expect(tickedPool2?.borrowFeeRate).toBe(5.0);

    // Verify bond contributions were correctly adjusted
    const tickedBond = tickedState.cooperativeSovereigntyBondProposals?.["bond_1"];
    expect(tickedBond?.contributions["pool_pool_1"]).toBe(5000);
    expect(tickedBond?.contributions["pool_pool_2"]).toBe(3000);

    // 4. Test Automated Fresh Capital Deployment
    // Alpha has 3000 direct bond contributions. Automated arbitrage should deploy up to maxCapitalAllocated (1000) fresh capital into best pool (pool_1)
    // Let's assert that tickedState also deployed 1000 fresh bond shares from alpha's direct contributions to pool_1!
    // Alpha direct contributions: 3000 -> 2000 (-1000)
    // pool_1 totalDeposited: 4000 -> 5000 (+1000)
    // Alpha deposits in pool_1: 4000 -> 5000 (+1000)
    expect(tickedBond?.contributions["alpha"]).toBe(2000);
    expect(tickedPool1?.deposits["alpha"]).toBe(5000);
    expect(tickedPool1?.totalDeposited).toBe(5000);
    expect(tickedBond?.contributions["pool_pool_1"]).toBe(5000);

    // 5. Test Faction-Backed Liquidity Injection on High Utilization
    // Let's reset state and make utilization of pool_1 > 80%
    // pool_1 totalDeposited = 3000. Let's borrow 2600 shares.
    // U = 2600 / 3000 = 86.66% (> 80%)
    state.marginAccounts!["alpha"].swfBondArbitrageEnabled = false;
    state.sovereignBondLendingPools!["pool_1"].totalDeposited = 3000;
    state.sovereignBondLendingPools!["pool_1"].deposits = { alpha: 3000 };
    state.sovereignBondLendingPools!["pool_1"].totalBorrowed = 2600;
    state.sovereignBondLendingPools!["pool_2"].totalDeposited = 4000;
    state.sovereignBondLendingPools!["pool_2"].deposits = { alpha: 2000, beta: 2000 };
    state.cooperativeSovereigntyBondProposals!["bond_1"].contributions = {
      alpha: 3000,
      pool_pool_1: 3000,
      pool_pool_2: 4000,
    };
    state.sovereignBondBorrowPositions["borrow_1"].amount = 2600;
    // Faction Reserve of rangers = 10000
    state.factionReservePools = { rangers: 10000 };

    let injectionState = tickProductionLabs(state, []);

    // Verify faction injected liquidity to bring utilization back down to 70%
    // targetU = 0.70 => targetDeposited = 2600 / 0.70 = 3714.28 => injectionAmount = 3715 - 3000 = 715 shares.
    // pool_1 totalDeposited should be 3715, deposits["rangers"] = 715.
    const injectedPool1 = injectionState.sovereignBondLendingPools?.["pool_1"];
    expect(injectedPool1?.deposits["rangers"]).toBe(715);
    expect(injectedPool1?.totalDeposited).toBe(3715);
    expect(injectionState.factionReservePools?.["rangers"]).toBe(8643); // 10000 - 1000 (dividend) - 357 (injection) = 8643 gold

    // Dynamic fee rate of pool_1 should be updated based on new utilization:
    // U = 2600 / 3715 = 0.69986 => fee rate = 5 + 10 * 0.69986 = 11.9986%
    expect(injectedPool1?.borrowFeeRate).toBeCloseTo(11.9986, 3);

    // 6. Test Manual Arbitrage Trigger Action (TRIGGER_SWF_BOND_ARBITRAGE)
    // Let's use the manual trigger action to execute reallocation immediately
    // Set pool_1 borrowFeeRate to 12.0% manually to exceed minYieldSpread
    state.marginAccounts!["alpha"].swfBondArbitrageEnabled = true;
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 12.0;
    state.sovereignBondLendingPools!["pool_2"].borrowFeeRate = 5.0;

    const triggerAction = {
      type: "TRIGGER_SWF_BOND_ARBITRAGE",
      syndicateId: "alpha",
      timestamp: 1004,
    };

    let triggerRes = multiAgentStep(state, { agentId: "player", action: triggerAction as any }, mockPack);
    expect(triggerRes.ok).toBe(true);
    const triggeredState = triggerRes.state;

    // Verify reallocation occurred immediately
    const triggeredPool1 = triggeredState.sovereignBondLendingPools?.["pool_1"];
    const triggeredPool2 = triggeredState.sovereignBondLendingPools?.["pool_2"];
    expect(triggeredPool1?.deposits["alpha"]).toBe(5000);
    expect(triggeredPool2?.deposits["alpha"]).toBe(1000);
  });
});
