import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Sovereign Bond Futures & Margin Liquidation Insurance (AF-143)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "futures_pack",
      title: "Futures Test Pack",
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
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support opening/closing long/short futures positions, voting on liquidation insurance, mark-to-market tick settlement, and automated paybacks/liquidations", () => {
    let state = createInitialState({
      seed: 1234,
      start: "market",
      varsInit: { gold: 50000 },
      agentsInit: ["player", "bob", "carol"],
    });

    // 1. Setup syndicates
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
        collateral: 8000,
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

    // 2. Open Long Futures Position Consensus Vote
    const openLongActionPlayer = {
      type: "OPEN_SOVEREIGN_BOND_FUTURES_POSITION",
      syndicateId: "alpha",
      bondId: "bond_1",
      side: "long",
      size: 1000,
      leverage: 5.0,
      marginCollateral: 2000,
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: openLongActionPlayer as any }, mockPack);
    if (!res.ok) console.log("REJECTION REASON:", res.rejectionReason);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify vote is recorded but consensus not achieved (requires 2 members of Alpha)
    expect(state.openSovereignBondFuturesVotes?.["alpha"]?.["player"]).toBeDefined();
    expect(state.sovereignBondFuturesPositions?.["fut_1"]).toBeUndefined();

    const openLongActionBob = {
      type: "OPEN_SOVEREIGN_BOND_FUTURES_POSITION",
      syndicateId: "alpha",
      bondId: "bond_1",
      side: "long",
      size: 1000,
      leverage: 5.0,
      marginCollateral: 2000,
      timestamp: 1002,
    };

    res = multiAgentStep(state, { agentId: "bob", action: openLongActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify consensus is reconciled and position is opened
    const futuresPos = state.sovereignBondFuturesPositions?.["fut_1"];
    expect(futuresPos).toBeDefined();
    expect(futuresPos?.side).toBe("long");
    expect(futuresPos?.size).toBe(1000);
    expect(futuresPos?.leverage).toBe(5.0);
    expect(futuresPos?.marginCollateral).toBe(2000);
    expect(futuresPos?.entryPrice).toBe(8.0);
    expect(futuresPos?.active).toBe(true);

    // Margin account collateral should be reduced by open marginCollateral
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(6000); // 8000 - 2000

    // 3. Mark-to-market tick settlement
    // Increase dynamic yield of bond_1 by changing borrowFeeRate to 12%
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 12.0;

    // Run tick
    let tickedState = tickEconomy(state, mockPack);

    // Profit calculation: (12 - 8) * 1000 * 5.0 = 4 * 1000 * 5 = 20000 gold!
    // Margin account collateral should increase by profit: 6000 + 20000 = 26000 gold
    expect(tickedState.marginAccounts?.["alpha"]?.collateral).toBe(26000);
    // Entry price should update to new yield
    expect(tickedState.sovereignBondFuturesPositions?.["fut_1"]?.entryPrice).toBe(12.0);

    // Let's test standard MTM loss
    // Decrease dynamic yield of bond_1 back to 9%
    tickedState.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 9.0;
    let tickedStateLoss = tickEconomy(tickedState, mockPack);
    // Loss calculation: (9 - 12) * 1000 * 5.0 = -3 * 5000 = -15000 gold
    // Collateral: 26000 - 15000 = 11000 gold
    expect(tickedStateLoss.marginAccounts?.["alpha"]?.collateral).toBe(11000);
    expect(tickedStateLoss.sovereignBondFuturesPositions?.["fut_1"]?.entryPrice).toBe(9.0);

    // 4. Vote on Margin Liquidation Insurance Pool Allocation
    const voteInsurancePlayer = {
      type: "VOTE_MARGIN_LIQUIDATION_INSURANCE",
      syndicateId: "alpha",
      allocatedGold: 3000,
      timestamp: 1003,
    };

    res = multiAgentStep(tickedStateLoss, { agentId: "player", action: voteInsurancePlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Vote recorded but no consensus
    expect(state.marginLiquidationInsuranceVotes?.["alpha"]?.["player"]).toBeDefined();
    expect(state.marginLiquidationInsurancePolicies?.["alpha"]).toBeUndefined();

    const voteInsuranceBob = {
      type: "VOTE_MARGIN_LIQUIDATION_INSURANCE",
      syndicateId: "alpha",
      allocatedGold: 3000,
      timestamp: 1004,
    };

    res = multiAgentStep(state, { agentId: "bob", action: voteInsuranceBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Verify insurance policy established and warChest reduced
    const policy = state.marginLiquidationInsurancePolicies?.["alpha"];
    expect(policy).toBeDefined();
    expect(policy?.allocatedGold).toBe(3000);
    expect(state.syndicates?.["alpha"]?.warChest).toBe(12000); // 15000 - 3000

    // 5. Automated liquidation insurance payback on margin call
    // Set dynamic yield extremely low to cause massive MTM loss on the long position
    // entryPrice = 9.0. Let's make yield = 3.0.
    // Loss: (3.0 - 9.0) * 1000 * 5 = -6 * 5000 = -30000 gold!
    // Wait, collateral is 11000. Loss of 30000 would push collateral to 0.
    // Let's make yield = 7.0 to have manageable loss first.
    // Loss: (7.0 - 9.0) * 1000 * 5 = -2 * 5000 = -10000 gold.
    // Collateral goes from 11000 to 1000.
    // Maintenance requirement: (1000 size * 7.0 entryPrice * 0.10) / 5 = 140 gold.
    // NetEquity = 1000 collateral. NetEquity (1000) > Maintenance (140) => no liquidation.

    // Let's make loss push NetEquity below Maintenance Requirement.
    // Let's set collateral directly to 100.
    // Maintenance requirement = 140. NetEquity = 100. Deficit = 40.
    // The insurance policy has 3000 gold allocated. It should cover the deficit of 40!
    state.marginAccounts!["alpha"].collateral = 100;
    state.sovereignBondLendingPools!["pool_1"].borrowFeeRate = 7.0;
    state.sovereignBondFuturesPositions!["fut_1"].entryPrice = 7.0;

    let preSweepState = tickEconomy(state, mockPack);

    // Verify payback happened:
    // Deficit: 140 required - 100 equity = 40.
    // Payback = 40. New collateral = 140. Remaining policy reserve = 2960.
    expect(preSweepState.marginLiquidationInsurancePolicies?.["alpha"]?.allocatedGold).toBe(2960);
    expect(preSweepState.marginAccounts?.["alpha"]?.collateral).toBe(140);
    // Since payback covered the deficit, the position was NOT liquidated
    expect(preSweepState.sovereignBondFuturesPositions?.["fut_1"]?.active).toBe(true);

    // 6. Complete margin call liquidation when deficit exceeds insurance
    // Clear the insurance policy allocation
    preSweepState.marginLiquidationInsurancePolicies!["alpha"].allocatedGold = 0;
    preSweepState.marginAccounts!["alpha"].collateral = 50; // Required is 140

    let sweepState = tickEconomy(preSweepState, mockPack);

    // Deficit of 90, insurance is 0, so margin liquidation triggers!
    // Collateral returned to warChest: 50
    // Alpha warChest: 12000 + 50 = 12050
    // Futures position deactivated
    expect(sweepState.sovereignBondFuturesPositions?.["fut_1"]?.active).toBe(false);
    expect(sweepState.marginAccounts?.["alpha"]?.collateral).toBe(0);
    expect(sweepState.syndicates?.["alpha"]?.warChest).toBe(12050);

    // 7. Test Close Position consensus vote
    // Let's create an active position manually to close it
    sweepState.sovereignBondFuturesPositions!["fut_2"] = {
      id: "fut_2",
      syndicateId: "alpha",
      bondId: "bond_1",
      side: "short",
      entryPrice: 7.0,
      size: 500,
      leverage: 2.0,
      marginCollateral: 1000,
      timestamp: 1005,
      active: true,
    };
    sweepState.marginAccounts!["alpha"].collateral = 5000;

    const closeActionPlayer = {
      type: "CLOSE_SOVEREIGN_BOND_FUTURES_POSITION",
      syndicateId: "alpha",
      positionId: "fut_2",
      timestamp: 1006,
    };

    res = multiAgentStep(sweepState, { agentId: "player", action: closeActionPlayer as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // No consensus yet
    expect(state.closeSovereignBondFuturesVotes?.["alpha"]?.["player"]).toBeDefined();
    expect(state.sovereignBondFuturesPositions?.["fut_2"]?.active).toBe(true);

    const closeActionBob = {
      type: "CLOSE_SOVEREIGN_BOND_FUTURES_POSITION",
      syndicateId: "alpha",
      positionId: "fut_2",
      timestamp: 1007,
    };

    res = multiAgentStep(state, { agentId: "bob", action: closeActionBob as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Position closed!
    // entryPrice = 7.0, current dynamic yield is 7.0 => profit = 0
    // Collateral returned: marginCollateral (1000) returned to main collateral: 5000 + 1000 = 6000
    expect(state.sovereignBondFuturesPositions?.["fut_2"]?.active).toBe(false);
    expect(state.marginAccounts?.["alpha"]?.collateral).toBe(6000);
  });
});
