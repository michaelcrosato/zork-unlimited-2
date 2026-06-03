import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate SWF Sovereignty Bond Short Lending Pools & Arbitrage Routing (AF-141)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "lending_pool_pack",
      title: "Lending Pool Test Pack",
      start_room: "market",
      vars_init: { gold: 10000 },
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
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support establishing pools, depositing, withdrawing, borrowing, dynamic fees, pro-rata yields, cover, and liquidations", () => {
    let state = createInitialState({
      seed: 1234,
      start: "market",
      varsInit: { gold: 10000 },
      agentsInit: ["player", "bob", "carol", "dan"],
    });

    // 1. Establish four syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Pool Creator & Depositor)",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 3000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Depositor)",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate (Borrower)",
        members: ["carol"],
        definedBy: "carol",
        timestamp: 1000,
        warChest: 2000,
      },
      delta: {
        id: "delta",
        name: "Delta Syndicate (Short Buyer)",
        members: ["dan"],
        definedBy: "dan",
        timestamp: 1000,
        warChest: 5000,
      },
    };

    // Initialize margin accounts
    state.marginAccounts = {
      gamma: {
        syndicateId: "gamma",
        collateral: 3000,
        swfLiquidityBuffer: 3000,
        swfLeverageFactor: 1.2, // 1.2x leverage factor
        timestamp: 1000,
      },
    };

    // Establish Active Cooperative Sovereignty Bond
    // Total faceValue = 4000. Alpha has 3000 shares, Beta has 1000 shares.
    state.cooperativeSovereigntyBondProposals = {
      bond_1: {
        id: "bond_1",
        creatorSyndicateId: "alpha",
        factionId: "rangers",
        faceValue: 4000,
        interestRate: 10, // 10% dividend yield
        termEpochs: 10,
        remainingEpochs: 10,
        status: "Active",
        contributions: { alpha: 3000, beta: 1000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // 2. Establish a lending pool
    const establishAction = {
      type: "ESTABLISH_BOND_LENDING_POOL",
      poolId: "pool_1",
      creatorSyndicateId: "alpha",
      bondId: "bond_1",
      timestamp: 1001,
    };

    let res = multiAgentStep(state, { agentId: "player", action: establishAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const pool = state.sovereignBondLendingPools?.["pool_1"];
    expect(pool).toBeDefined();
    expect(pool?.creatorSyndicateId).toBe("alpha");
    expect(pool?.bondId).toBe("bond_1");
    expect(pool?.totalDeposited).toBe(0);
    expect(pool?.borrowFeeRate).toBe(5.0);

    // 3. Deposit into pool
    // Alpha deposits 1000 shares
    let depositAction = {
      type: "DEPOSIT_BOND_TO_POOL",
      poolId: "pool_1",
      syndicateId: "alpha",
      amount: 1000,
      timestamp: 1002,
    };
    res = multiAgentStep(state, { agentId: "player", action: depositAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Beta deposits 1000 shares
    depositAction = {
      type: "DEPOSIT_BOND_TO_POOL",
      poolId: "pool_1",
      syndicateId: "beta",
      amount: 1000,
      timestamp: 1003,
    };
    res = multiAgentStep(state, { agentId: "bob", action: depositAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    let updatedPool = state.sovereignBondLendingPools?.["pool_1"];
    expect(updatedPool?.deposits["alpha"]).toBe(1000);
    expect(updatedPool?.deposits["beta"]).toBe(1000);
    expect(updatedPool?.totalDeposited).toBe(2000);

    // Verify bond contributions are transferred
    const bond = state.cooperativeSovereigntyBondProposals?.["bond_1"];
    expect(bond?.contributions["alpha"]).toBe(2000); // 3000 - 1000 deposited
    expect(bond?.contributions["beta"]).toBeUndefined(); // 1000 - 1000 deposited (contribution key deleted because it reached 0)
    expect(bond?.contributions["pool_pool_1"]).toBe(2000);

    // Try to deposit more than available - should reject
    depositAction = {
      type: "DEPOSIT_BOND_TO_POOL",
      poolId: "pool_1",
      syndicateId: "beta",
      amount: 500,
      timestamp: 1004,
    };
    res = multiAgentStep(state, { agentId: "bob", action: depositAction as any }, mockPack);
    expect(res.ok).toBe(false);

    // 4. Withdraw from pool
    // Beta withdraws 200 shares
    const withdrawAction = {
      type: "WITHDRAW_BOND_FROM_POOL",
      poolId: "pool_1",
      syndicateId: "beta",
      amount: 200,
      timestamp: 1005,
    };
    res = multiAgentStep(state, { agentId: "bob", action: withdrawAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    updatedPool = state.sovereignBondLendingPools?.["pool_1"];
    expect(updatedPool?.deposits["beta"]).toBe(800);
    expect(updatedPool?.totalDeposited).toBe(1800);
    expect(state.cooperativeSovereigntyBondProposals?.["bond_1"]?.contributions["pool_pool_1"]).toBe(1800);
    expect(state.cooperativeSovereigntyBondProposals?.["bond_1"]?.contributions["beta"]).toBe(200);

    // 5. Borrow from pool
    // Gamma borrows 1000 shares from the pool, locking 500 gold collateral
    const borrowAction = {
      type: "BORROW_BOND_FROM_POOL",
      borrowId: "borrow_1",
      poolId: "pool_1",
      borrowerSyndicateId: "gamma",
      amount: 1000,
      collateralGold: 500,
      timestamp: 1006,
    };
    res = multiAgentStep(state, { agentId: "carol", action: borrowAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    const borrowPos = state.sovereignBondBorrowPositions?.["borrow_1"];
    expect(borrowPos).toBeDefined();
    expect(borrowPos?.status).toBe("Active"); // Automatically active from pool
    expect(borrowPos?.lendingPoolId).toBe("pool_1");
    expect(borrowPos?.lenderSyndicateId).toBe("pool_pool_1");
    expect(state.syndicates?.["gamma"].warChest).toBe(1500); // 2000 - 500 collateral

    updatedPool = state.sovereignBondLendingPools?.["pool_1"];
    expect(updatedPool?.totalBorrowed).toBe(1000);
    // Utilization U = 1000 / 1800 = 0.5555
    // Fee rate = 5 + 10 * U = 5 + 5.55 = 10.555...
    expect(updatedPool?.borrowFeeRate).toBeCloseTo(10.555, 2);

    // Try to withdraw more than unborrowed (1800 - 1000 = 800 unborrowed)
    // Alpha tries to withdraw 900 shares - should reject because only 800 are unborrowed
    const rejectWithdrawAction = {
      type: "WITHDRAW_BOND_FROM_POOL",
      poolId: "pool_1",
      syndicateId: "alpha",
      amount: 900,
      timestamp: 1007,
    };
    res = multiAgentStep(state, { agentId: "player", action: rejectWithdrawAction as any }, mockPack);
    expect(res.ok).toBe(false);

    // 6. Short Sell: Gamma short sells the borrowed 1000 shares to Delta for 800 gold
    const shortAction = {
      type: "SHORT_SELL_BOND",
      borrowId: "borrow_1",
      buyerSyndicateId: "delta",
      salePrice: 800,
      timestamp: 1008,
    };
    res = multiAgentStep(state, { agentId: "carol", action: shortAction as any }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("ShortSold");
    expect(state.syndicates?.["gamma"].warChest).toBe(2300); // 1500 + 800 sale proceeds
    expect(state.syndicates?.["delta"].warChest).toBe(4200); // 5000 - 800 price paid

    // Contributions check:
    // pool_pool_1 contribution was 1800. Short sold 1000 shares -> remaining pool_pool_1 contribution is 800.
    // delta contribution becomes 1000.
    const currentBond = state.cooperativeSovereigntyBondProposals?.["bond_1"];
    expect(currentBond?.contributions["pool_pool_1"]).toBe(800);
    expect(currentBond?.contributions["delta"]).toBe(1000);

    // 7. Periodic Ticking of Fees and Dividends
    // Pool dynamic fee rate is ~10.555%.
    // Base borrow fee: 1000 * 10.555% = 105.55
    // Scaled borrow fee: floor(105 * 1.2 (leverage) * (1 + 10/100)) = floor(126 * 1.1) = 138 gold.
    // Short sold dividend: 1000 * 10% = 100 gold.
    // Total owed: 138 (fee) + 100 (dividend) = 238 gold.
    // Deducted from gamma's warChest (2300 -> 2061), then swept 1000 for margin -> 1061.
    // Bond dividend (400 gold total): Alpha gets 200 (direct) + 44 (pool) = 244 gold.
    // Beta gets 20 (direct) + 36 (pool) = 56 gold.
    // Borrow fee + short sold dividend Gamma paid (239 gold): Alpha gets 132, Beta gets 107.
    // Alpha warChest: 3000 + 244 + 132 = 3376 gold.
    // Beta warChest: 3000 + 56 + 107 = 3163 gold.
    const stateForLiquidation = JSON.parse(JSON.stringify(state));
    const tickedState = tickProductionLabs(state, []);
    expect(tickedState.syndicates?.["gamma"].warChest).toBe(1061);
    expect(tickedState.syndicates?.["alpha"].warChest).toBe(3376);
    expect(tickedState.syndicates?.["beta"].warChest).toBe(3163);

    // Reputation rewards check:
    // Pool totalBorrowed is 1000. repReward = Math.max(1, floor(1000/200)) = 5 rep.
    // Alpha rep share: Math.round(5 * 10/18) = 3 rep.
    // Beta rep share: 5 - 3 = 2 rep.
    // Standing of rangers increased by 5. Alpha rep increased by 3. Beta rep increased by 2.
    expect(tickedState.factionRep?.["rangers"]).toBe(5);
    expect(tickedState.factionRep?.["alpha"]).toBe(3);
    expect(tickedState.factionRep?.["beta"]).toBe(2);

    // 8. Normal Cover
    // Gamma covers borrowing of 1000 shares back from Delta for 900 gold
    const coverAction = {
      type: "COVER_SHORT_POSITION",
      borrowId: "borrow_1",
      sellerSyndicateId: "delta",
      buybackPrice: 900,
      timestamp: 1009,
    };
    let coverRes = multiAgentStep(state, { agentId: "carol", action: coverAction as any }, mockPack);
    expect(coverRes.ok).toBe(true);
    const coveredState = coverRes.state;

    // Check pool borrowing state returned
    expect(coveredState.sovereignBondLendingPools?.["pool_1"]?.totalBorrowed).toBe(0);
    expect(coveredState.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("Covered");

    // Check contributions returned to pool
    expect(coveredState.cooperativeSovereigntyBondProposals?.["bond_1"]?.contributions["pool_pool_1"]).toBe(1800);
    expect(coveredState.cooperativeSovereigntyBondProposals?.["bond_1"]?.contributions["delta"]).toBeUndefined();

    // 9. Liquidation
    // Reset state to pre-tick but with low warChest for gamma to trigger liquidation
    stateForLiquidation.syndicates!["gamma"].warChest = 50; // insufficient warChest to cover 238 fee/dividend
    const liquidatedState = tickProductionLabs(stateForLiquidation, []);
    
    // Gamma is liquidated. Collateral of 500 gold + remaining warChest of 50 = 550 gold compensation.
    // Plus direct and pool dividends for this epoch:
    // Alpha gets 200 (direct) + 43 (pool) + 305 (liquidation) = 548 gold.
    // Beta gets 20 (direct) + 37 (pool) + 245 (liquidation) = 302 gold.
    // Alpha warChest: 3000 + 548 = 3548.
    // Beta warChest: 3000 + 302 = 3302.
    expect(liquidatedState.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("Liquidated");
    expect(liquidatedState.sovereignBondLendingPools?.["pool_1"]?.totalBorrowed).toBe(0);
    expect(liquidatedState.syndicates?.["gamma"].warChest).toBe(0);
    expect(liquidatedState.syndicates?.["alpha"].warChest).toBe(3548);
    expect(liquidatedState.syndicates?.["beta"].warChest).toBe(3302);
  });
});
