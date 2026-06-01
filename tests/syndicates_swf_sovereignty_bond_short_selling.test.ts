import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate SWF Sovereignty Bond Borrowing & Short Selling Markets (AF-140)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "short_selling_pack",
      title: "Short Selling Test Pack",
      start_room: "market",
      vars_init: { gold: 5000 },
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

  it("should support proposing, lending, short selling, dividend/borrow fee ticks, margin sweeps, cover, and liquidation", () => {
    let state = createInitialState({
      seed: 5678,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "bob", "carol"],
    });

    // 1. Establish three syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Borrower)",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1500, // starts with 1500 gold
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Lender)",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 2000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate (Buyer)",
        members: ["carol"],
        definedBy: "carol",
        timestamp: 1000,
        warChest: 3000,
      },
    };

    // Initialize margin accounts with SWF staked faction gold and leverage factors
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 2000,
        swfLiquidityBuffer: 2000,
        swfLeverageFactor: 1.5, // 1.5x leverage factor
        timestamp: 1000,
      },
    };

    // 2. Establish Active Cooperative Sovereignty Bond owned by Beta
    state.cooperativeSovereigntyBondProposals = {
      bond_1: {
        id: "bond_1",
        creatorSyndicateId: "beta",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 10, // 10% dividend yield
        termEpochs: 10,
        remainingEpochs: 10,
        status: "Active",
        contributions: { beta: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // 3. Propose Borrow: Alpha proposes to borrow 1000 shares of bond_1 from Beta, locking 500 gold collateral
    const proposeAction = {
      type: "PROPOSE_BOND_BORROW",
      borrowId: "borrow_1",
      borrowerSyndicateId: "alpha",
      lenderSyndicateId: "beta",
      bondId: "bond_1",
      amount: 1000,
      collateralGold: 500,
      borrowFeeRate: 5, // 5% fee rate
      timestamp: 1001,
    };

    let proposeRes = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(proposeRes.ok).toBe(true);
    state = proposeRes.state;

    const borrowPos = state.sovereignBondBorrowPositions?.["borrow_1"];
    expect(borrowPos).toBeDefined();
    expect(borrowPos?.status).toBe("Proposed");
    expect(borrowPos?.amount).toBe(1000);
    expect(borrowPos?.collateralGold).toBe(500);
    expect(state.syndicates?.["alpha"].warChest).toBe(1000); // 1500 - 500 collateral

    // Try proposing with same ID - must fail
    let proposeDupRes = multiAgentStep(state, { agentId: "player", action: proposeAction as any }, mockPack);
    expect(proposeDupRes.ok).toBe(false);

    // 4. Approve Borrow: Beta approves lending the 1000 shares
    const approveAction = {
      type: "APPROVE_BOND_LEND",
      borrowId: "borrow_1",
      timestamp: 1002,
    };

    let approveRes = multiAgentStep(state, { agentId: "bob", action: approveAction as any }, mockPack);
    expect(approveRes.ok).toBe(true);
    state = approveRes.state;

    expect(state.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("Active");

    // 5. Short Sell: Alpha short sells the borrowed 1000 shares to Gamma for 800 gold
    const shortAction = {
      type: "SHORT_SELL_BOND",
      borrowId: "borrow_1",
      buyerSyndicateId: "gamma",
      salePrice: 800,
      timestamp: 1003,
    };

    let shortRes = multiAgentStep(state, { agentId: "player", action: shortAction as any }, mockPack);
    expect(shortRes.ok).toBe(true);
    state = shortRes.state;

    expect(state.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("ShortSold");
    expect(state.syndicates?.["alpha"].warChest).toBe(1800); // 1000 + 800 sale proceeds
    expect(state.syndicates?.["gamma"].warChest).toBe(2200); // 3000 - 800 price paid

    // Bond contribution of Beta is reduced from 2000 to 1000, and Gamma has 1000!
    const bond = state.cooperativeSovereigntyBondProposals?.["bond_1"];
    expect(bond?.contributions["beta"]).toBe(1000);
    expect(bond?.contributions["gamma"]).toBe(1000);

    // 6. Test Periodic Ticking of Fees and Dividends
    // Interest rate = 10%. Borrow fee rate = 5%.
    // Base borrow fee: 1000 * 5% = 50.
    // Scaled borrow fee: floor(50 * 1.5 (leverage) * (1 + 10/100)) = floor(75 * 1.1) = 82 gold.
    // Short sold dividend: 1000 * 10% = 100 gold.
    // Total owed: 82 (fee) + 100 (dividend) = 182 gold.
    // Paid from alpha's warChest (1800 -> 1618), then swept 1000 to cover margin -> 618.
    let tickedState = tickProductionLabs(state, []);
    expect(tickedState.syndicates?.["alpha"].warChest).toBe(618);
    expect(tickedState.syndicates?.["beta"].warChest).toBe(2282);
    expect(tickedState.sovereignBondBorrowPositions?.["borrow_1"]?.accumulatedBorrowFees).toBe(82);
    expect(tickedState.sovereignBondBorrowPositions?.["borrow_1"]?.collateralGold).toBe(1500);

    // 7. Test Margin call sweep on price changes
    // Establish a completed secondary listing with a high price to simulate a price rise.
    // 1000 shares sold for 1500 gold -> pricePerShare = 1.5 gold.
    // Liability: 1000 * 1.5 = 1500 gold.
    // Maintenance margin (1.2x): 1500 * 1.2 = 1800 gold.
    // Target margin (1.5x): 1500 * 1.5 = 2250 gold.
    // Current collateral is 1500 gold, which is < 1800 maintenance margin.
    // Sweep shortfall: 2250 - 1500 = 750 gold.
    // Swept from alpha's warChest (618 - 182 fee/dividend = 436).
    // Swept: min(750, 436) = 436 gold.
    // Alpha warChest: 436 - 436 = 0 gold.
    // Alpha collateralGold: 1500 + 436 = 1936 gold.
    tickedState.secondaryBondListings = {
      listing_1: {
        id: "listing_1",
        bondId: "bond_1",
        sellerSyndicateId: "gamma",
        amount: 1000,
        askPrice: 1500,
        status: "Completed",
        timestamp: 1004,
        bids: {
          alpha: {
            bidderSyndicateId: "alpha",
            bidAmount: 1500,
            timestamp: 1004,
          }
        }
      }
    };

    let sweptState = tickProductionLabs(tickedState, []);
    expect(sweptState.syndicates?.["alpha"].warChest).toBe(0);
    expect(sweptState.sovereignBondBorrowPositions?.["borrow_1"]?.collateralGold).toBe(1936);

    // 8. Test forced liquidation on margin call failure
    // Artificially rise price to 3.0 gold per share.
    // Liability: 1000 * 3.0 = 3000 gold.
    // Maintenance margin (1.2x): 3600 gold.
    // Target margin (1.5x): 4500 gold.
    // Collateral is 1936, which is < 3600.
    // Sweep shortfall: 4500 - 1936 = 2564 gold.
    // But Alpha's warChest is 0 gold. So it will trigger a forced liquidation!
    // Collateral is confiscated and paid to Beta (lender).
    // Lender Beta warChest: 2182 + 182 (ticked fee/dividend) + 1936 (liquidation proceeds) = 4300 gold.
    // Alpha warChest remains 0. Position status becomes "Liquidated".
    sweptState.secondaryBondListings = {
      listing_2: {
        id: "listing_2",
        bondId: "bond_1",
        sellerSyndicateId: "gamma",
        amount: 1000,
        askPrice: 3000,
        status: "Completed",
        timestamp: 1005,
        bids: {
          alpha: {
            bidderSyndicateId: "alpha",
            bidAmount: 3000,
            timestamp: 1005,
          }
        }
      }
    };

    let liquidatedState = tickProductionLabs(sweptState, []);
    expect(liquidatedState.sovereignBondBorrowPositions?.["borrow_1"]?.status).toBe("Liquidated");
    expect(liquidatedState.syndicates?.["alpha"].warChest).toBe(0);
    expect(liquidatedState.syndicates?.["beta"].warChest).toBe(4600);

    // 9. Test Covering a short position normally
    // Reset state for a clean cover test
    let coverState = createInitialState({
      seed: 8888,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "bob", "carol"],
    });

    coverState.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1500,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 2000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate",
        members: ["carol"],
        definedBy: "carol",
        timestamp: 1000,
        warChest: 3000,
      },
    };

    coverState.cooperativeSovereigntyBondProposals = {
      bond_1: {
        id: "bond_1",
        creatorSyndicateId: "beta",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 10,
        termEpochs: 10,
        remainingEpochs: 10,
        status: "Active",
        contributions: { beta: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // Propose & Approve borrow
    let res = multiAgentStep(coverState, { agentId: "player", action: {
      type: "PROPOSE_BOND_BORROW",
      borrowId: "borrow_clean",
      borrowerSyndicateId: "alpha",
      lenderSyndicateId: "beta",
      bondId: "bond_1",
      amount: 1000,
      collateralGold: 500,
      borrowFeeRate: 5,
      timestamp: 1001,
    } as any }, mockPack);
    coverState = res.state;

    res = multiAgentStep(coverState, { agentId: "bob", action: {
      type: "APPROVE_BOND_LEND",
      borrowId: "borrow_clean",
      timestamp: 1002,
    } as any }, mockPack);
    coverState = res.state;

    // Short sell to Gamma
    res = multiAgentStep(coverState, { agentId: "player", action: {
      type: "SHORT_SELL_BOND",
      borrowId: "borrow_clean",
      buyerSyndicateId: "gamma",
      salePrice: 800,
      timestamp: 1003,
    } as any }, mockPack);
    coverState = res.state;

    // Cover: Alpha buys back 1000 shares of bond_1 from Gamma (who now owns it) for 900 gold
    const coverAction = {
      type: "COVER_SHORT_POSITION",
      borrowId: "borrow_clean",
      sellerSyndicateId: "gamma",
      buybackPrice: 900,
      timestamp: 1004,
    };

    let coverRes = multiAgentStep(coverState, { agentId: "player", action: coverAction as any }, mockPack);
    expect(coverRes.ok).toBe(true);
    coverState = coverRes.state;

    const finalPos = coverState.sovereignBondBorrowPositions?.["borrow_clean"];
    expect(finalPos?.status).toBe("Covered");

    // Alpha warChest: originally 1500 - 500 (collateral) = 1000.
    // Short sold for +800 = 1800.
    // Covered buyback for -900 = 900.
    // Collateral of 500 returned = 1400 gold!
    expect(coverState.syndicates?.["alpha"].warChest).toBe(1400);

    // Gamma warChest: originally 3000 - 800 (short buy) = 2200.
    // Buyback sell for +900 = 3100 gold!
    expect(coverState.syndicates?.["gamma"].warChest).toBe(3100);

    // Bond contribution of Beta is fully restored to 2000!
    const finalBond = coverState.cooperativeSovereigntyBondProposals?.["bond_1"];
    expect(finalBond?.contributions["beta"]).toBe(2000);
    expect(finalBond?.contributions["gamma"]).toBeUndefined();
  });
});
