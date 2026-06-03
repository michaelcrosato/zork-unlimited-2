import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";
import { step } from "../src/core/engine.js";

describe("Syndicate SWF Sovereignty Bond Secondary Trading Markets & Bid-Ask Auctions (AF-139)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "secondary_bond_pack",
      title: "Secondary Sovereignty Bond Test Pack",
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
        exits: [
          {
            direction: "east",
            to: "forest",
            conditions: [],
          }
        ],
      },
      {
        id: "forest",
        name: "Dark Forest",
        description: "An overgrown forest.",
        objects: [],
        npcs: [],
        exits: [],
        faction: "rangers",
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should support listing, bidding, automated market-maker bids, execution, yields transfer and tax discounts transfer", () => {
    let state = createInitialState({
      seed: 4321,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "alice", "bob", "carol", "dave"],
    });

    // 1. Establish three syndicates
    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "carol"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 2000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate",
        members: ["dave"],
        definedBy: "dave",
        timestamp: 1000,
        warChest: 3000,
      },
    };

    // Initialize margin accounts with SWF staked faction gold
    state.marginAccounts = {
      alpha: {
        syndicateId: "alpha",
        collateral: 2000,
        swfLiquidityBuffer: 2000,
        swfStakedFactions: { rangers: 2000 },
        timestamp: 1000,
      },
      beta: {
        syndicateId: "beta",
        collateral: 2000,
        swfLiquidityBuffer: 2000,
        swfStakedFactions: { rangers: 1000 },
        timestamp: 1000,
      },
    };

    state.territoryControl = { forest: "rangers" };
    state.taxPolicy = { rangers: 100 };
    state.factionReservePools = { rangers: 10000 };

    // 2. Propose & Fund Cooperative Sovereign Bond
    state.cooperativeSovereigntyBondProposals = {
      coop_bond_1: {
        id: "coop_bond_1",
        creatorSyndicateId: "alpha",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 20, // 20% dividend yield
        termEpochs: 4,
        remainingEpochs: 4,
        status: "Active",
        contributions: { alpha: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // 3. List bond portion for sale by alpha member (Player)
    // Seller lists a 1200 gold share of coop_bond_1 at askPrice of 800 gold
    const listAction = {
      type: "LIST_BOND_FOR_SALE",
      listingId: "listing_1",
      bondId: "coop_bond_1",
      syndicateId: "alpha",
      amount: 1200,
      askPrice: 800,
      timestamp: 1001,
    };

    let listRes = multiAgentStep(state, { agentId: "player", action: listAction as any }, mockPack);
    expect(listRes.ok).toBe(true);
    state = listRes.state;

    const listing = state.secondaryBondListings?.["listing_1"];
    expect(listing).toBeDefined();
    expect(listing?.status).toBe("Open");
    expect(listing?.amount).toBe(1200);
    expect(listing?.askPrice).toBe(800);

    // Assert that a syndicate cannot list more than their available contribution
    const badListAction = {
      type: "LIST_BOND_FOR_SALE",
      listingId: "listing_bad",
      bondId: "coop_bond_1",
      syndicateId: "alpha",
      amount: 1000, // already listed 1200 out of 2000, only 800 left!
      askPrice: 500,
      timestamp: 1002,
    };
    let badListRes = multiAgentStep(state, { agentId: "player", action: badListAction as any }, mockPack);
    expect(badListRes.ok).toBe(false);
    expect(badListRes.rejectionReason).toContain("insufficient");

    // 4. Place a bid from Beta members
    const bidActionBeta = {
      type: "PLACE_BOND_BID",
      listingId: "listing_1",
      syndicateId: "beta",
      bidAmount: 750, // Bid 750 gold (Ask is 800)
      timestamp: 1003,
    };

    // Alpha (seller) tries to bid on own listing - must fail
    const badBidActionAlpha = {
      type: "PLACE_BOND_BID",
      listingId: "listing_1",
      syndicateId: "alpha",
      bidAmount: 700,
      timestamp: 1004,
    };
    let badBidAlphaRes = multiAgentStep(state, { agentId: "player", action: badBidActionAlpha as any }, mockPack);
    expect(badBidAlphaRes.ok).toBe(false);
    expect(badBidAlphaRes.rejectionReason).toContain("seller");

    let bidBetaRes = multiAgentStep(state, { agentId: "bob", action: bidActionBeta as any }, mockPack);
    expect(bidBetaRes.ok).toBe(true);
    state = bidBetaRes.state;

    expect(state.secondaryBondListings?.["listing_1"]?.bids?.["beta"]?.bidAmount).toBe(750);

    // 5. Place a bid from Gamma members with insufficient funds
    const badBidActionGamma = {
      type: "PLACE_BOND_BID",
      listingId: "listing_1",
      syndicateId: "gamma",
      bidAmount: 3500, // Gamma only has 3000 warChest
      timestamp: 1005,
    };
    let badBidGammaRes = multiAgentStep(state, { agentId: "dave", action: badBidActionGamma as any }, mockPack);
    expect(badBidGammaRes.ok).toBe(false);
    expect(badBidGammaRes.rejectionReason).toContain("insufficient");

    // Place a valid bid from Gamma
    const bidActionGamma = {
      type: "PLACE_BOND_BID",
      listingId: "listing_1",
      syndicateId: "gamma",
      bidAmount: 850, // premium bid of 850 gold
      timestamp: 1006,
    };
    let bidGammaRes = multiAgentStep(state, { agentId: "dave", action: bidActionGamma as any }, mockPack);
    expect(bidGammaRes.ok).toBe(true);
    state = bidGammaRes.state;

    expect(state.secondaryBondListings?.["listing_1"]?.bids?.["gamma"]?.bidAmount).toBe(850);

    // 6. Tick Economy and test automated Mulberry32-seeded Market Maker bids
    // We tick economy manually to trigger the automated market-maker bids
    // Note: Alpha owns 100% of the bond during this tick, so Alpha receives the full 400 gold dividend!
    let tickRes = tickProductionLabs(state, []);
    state = tickRes;

    const mmBid = state.secondaryBondListings?.["listing_1"]?.bids?.["market_maker"];
    expect(mmBid).toBeDefined();
    expect(mmBid?.bidderSyndicateId).toBe("market_maker");
    expect(mmBid?.bidAmount).toBeGreaterThan(0);

    // 7. Execute sale: Alpha accepts Gamma's bid of 850 gold
    // Seller Alpha (Player) accepts bid from buyer Gamma
    const executeAction = {
      type: "EXECUTE_BOND_SALE",
      listingId: "listing_1",
      syndicateId: "alpha",
      buyerSyndicateId: "gamma",
      timestamp: 1008,
    };

    let executeRes = multiAgentStep(state, { agentId: "player", action: executeAction as any }, mockPack);
    expect(executeRes.ok).toBe(true);
    state = executeRes.state;

    // Check listing status
    expect(state.secondaryBondListings?.["listing_1"]?.status).toBe("Completed");

    // Check contribution ownership transfers
    // Originally, Alpha had 2000. Now Alpha sold 1200, so Alpha has 800 left, and Gamma has 1200!
    const updatedBond = state.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(updatedBond?.contributions["alpha"]).toBe(800);
    expect(updatedBond?.contributions["gamma"]).toBe(1200);

    // Check warChest updates
    // Alpha was 1000 + 400 (dividend from MM tick) = 1400. Now 1400 + 850 = 2250 gold.
    // Gamma was 3000, now 3000 - 850 = 2150 gold.
    expect(state.syndicates?.["alpha"].warChest).toBe(2250);
    expect(state.syndicates?.["gamma"].warChest).toBe(2150);

    // 8. Test dynamically updated Yield payouts
    // Faction rangers has 10000 reserves.
    // Coupon dividend: faceValue 2000 * 20% = 400 gold dividend.
    // Alpha share: 800 / 2000 = 40% -> 160 gold. Alpha warChest: 2250 + 160 = 2410 gold.
    // Gamma share: 1200 / 2000 = 60% -> 240 gold. Gamma warChest: 2150 + 240 = 2390 gold.
    let tickYieldState = tickProductionLabs(state, []);
    expect(tickYieldState.syndicates?.["alpha"].warChest).toBe(2410);
    expect(tickYieldState.syndicates?.["gamma"].warChest).toBe(2390);

    // 9. Test dynamically updated Tax Exemptions
    // Base tax is 100 gold.
    // player (Alpha) moves to forest. Alpha owns 40% of rangers bond.
    // Alpha discount: 40% -> travel tax should be 200 * 0.6 = 120 gold.
    // player gold: 5000 initially.
    let moveRes = step(state, { type: "MOVE", direction: "east" }, mockPack, "player");
    expect(moveRes.ok).toBe(true);
    expect(moveRes.state.vars.gold).toBe(4880); // 5000 - 120
  });

  it("should support executing a sale to the virtual market_maker", () => {
    let state = createInitialState({
      seed: 9876,
      start: "market",
      varsInit: { gold: 5000 },
      agentsInit: ["player"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.cooperativeSovereigntyBondProposals = {
      coop_bond_1: {
        id: "coop_bond_1",
        creatorSyndicateId: "alpha",
        factionId: "rangers",
        faceValue: 2000,
        interestRate: 20,
        termEpochs: 4,
        remainingEpochs: 4,
        status: "Active",
        contributions: { alpha: 2000 },
        resolved: true,
        timestamp: 1000,
      },
    };

    // List bond for sale
    const listAction = {
      type: "LIST_BOND_FOR_SALE",
      listingId: "listing_2",
      bondId: "coop_bond_1",
      syndicateId: "alpha",
      amount: 1000,
      askPrice: 500,
      timestamp: 1001,
    };
    let listRes = multiAgentStep(state, { agentId: "player", action: listAction as any }, mockPack);
    state = listRes.state;

    // Run tick to get a market_maker bid
    // Alpha receives 400 gold dividend here since it owns 100% of the active bond.
    let tickRes = tickProductionLabs(state, []);
    state = tickRes;

    const listings = state.secondaryBondListings || {};
    // Overwrite listing bid to ensure market_maker has bid at 450
    listings["listing_2"].bids = {
      market_maker: {
        bidderSyndicateId: "market_maker",
        bidAmount: 450,
        timestamp: 1002,
      }
    };

    // Execute bond sale to market_maker
    const executeAction = {
      type: "EXECUTE_BOND_SALE",
      listingId: "listing_2",
      syndicateId: "alpha",
      buyerSyndicateId: "market_maker",
      timestamp: 1003,
    };

    let executeRes = multiAgentStep(state, { agentId: "player", action: executeAction as any }, mockPack);
    expect(executeRes.ok).toBe(true);
    state = executeRes.state;

    // Check contribution ownership transfers
    // Alpha had 2000, sold 1000 to market_maker, so Alpha has 1000 and market_maker has 1000
    const bond = state.cooperativeSovereigntyBondProposals?.["coop_bond_1"];
    expect(bond?.contributions["alpha"]).toBe(1000);
    expect(bond?.contributions["market_maker"]).toBe(1000);

    // Alpha warChest should be 1000 + 400 (dividend) + 450 (sale) = 1850 gold
    expect(state.syndicates?.["alpha"].warChest).toBe(1850);
  });
});
