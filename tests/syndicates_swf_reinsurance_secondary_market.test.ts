import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickProductionLabs } from "../src/core/engine.js";

describe("Syndicate SWF Yield CDO CDS Tranche Reinsurance Secondary Trading Market & Bid-Ask Auctions (AF-146)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_reinsurance_secondary_pack",
      title: "Reinsurance Secondary Market Test Pack",
      start_room: "clearing",
      vars_init: { gold: 5000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: [],
        exits: [],
      },
    ],
    objects: [],
    npcs: [],
  });

  it("should support listing, bidding, automated market-maker bids, execution consensus, and ownership transfer", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
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

    // 2. Setup active reinsurance policy for Alpha protecting senior tranche of a CDO
    state.swfYieldCDOTrancheReinsurancePolicies = {
      reins_policy_1: {
        id: "reins_policy_1",
        syndicateId: "alpha",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "senior",
        coverageAmount: 1000,
        premiumRate: 0.05,
        timestamp: 1000,
        active: true,
      },
    };

    // 3. Propose / Vote to list reinsurance policy for sale by Alpha members
    const listAction = {
      type: "LIST_REINSURANCE_FOR_SALE",
      listingId: "listing_1",
      policyId: "reins_policy_1",
      syndicateId: "alpha",
      askPrice: 800,
      timestamp: 1001,
    };

    // First vote: player (1 out of 2, PENDING majority)
    let listRes = multiAgentStep(state, { agentId: "player", action: listAction as any }, mockPack);
    expect(listRes.ok).toBe(true);
    state = listRes.state;

    let listing = state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"];
    expect(listing).toBeUndefined(); // Pending consensus

    // Second vote: alice (2 out of 2, REACHES majority)
    listRes = multiAgentStep(state, { agentId: "alice", action: listAction as any }, mockPack);
    expect(listRes.ok).toBe(true);
    state = listRes.state;

    listing = state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"];
    expect(listing).toBeDefined();
    expect(listing?.status).toBe("Open");
    expect(listing?.askPrice).toBe(800);
    expect(listing?.policyId).toBe("reins_policy_1");

    // 4. Place a bid from Beta members (requires majority of bob & carol)
    const bidActionBeta = {
      type: "PLACE_REINSURANCE_BID",
      listingId: "listing_1",
      syndicateId: "beta",
      bidAmount: 750,
      timestamp: 1002,
    };

    // First vote: bob (PENDING majority)
    let bidBetaRes = multiAgentStep(state, { agentId: "bob", action: bidActionBeta as any }, mockPack);
    expect(bidBetaRes.ok).toBe(true);
    state = bidBetaRes.state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"]?.bids?.["beta"]).toBeUndefined();

    // Second vote: carol (REACHES majority)
    bidBetaRes = multiAgentStep(state, { agentId: "carol", action: bidActionBeta as any }, mockPack);
    expect(bidBetaRes.ok).toBe(true);
    state = bidBetaRes.state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"]?.bids?.["beta"]?.bidAmount).toBe(750);

    // 5. Place a bid from Gamma (requires majority of dave - reached immediately)
    const bidActionGamma = {
      type: "PLACE_REINSURANCE_BID",
      listingId: "listing_1",
      syndicateId: "gamma",
      bidAmount: 850,
      timestamp: 1003,
    };

    let bidGammaRes = multiAgentStep(state, { agentId: "dave", action: bidActionGamma as any }, mockPack);
    expect(bidGammaRes.ok).toBe(true);
    state = bidGammaRes.state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"]?.bids?.["gamma"]?.bidAmount).toBe(850);

    // 6. Seller Alpha tries to bid on own listing - must fail
    const badBidActionAlpha = {
      type: "PLACE_REINSURANCE_BID",
      listingId: "listing_1",
      syndicateId: "alpha",
      bidAmount: 600,
      timestamp: 1004,
    };
    let badBidAlphaRes = multiAgentStep(state, { agentId: "player", action: badBidActionAlpha as any }, mockPack);
    expect(badBidAlphaRes.ok).toBe(false);
    expect(badBidAlphaRes.rejectionReason).toContain("seller");

    // 7. Tick economy to generate automated Mulberry32 Market Maker bid
    let tickRes = tickProductionLabs(state, []);
    state = tickRes;

    const mmBid = state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"]?.bids?.["market_maker"];
    expect(mmBid).toBeDefined();
    expect(mmBid?.bidderSyndicateId).toBe("market_maker");
    expect(mmBid?.bidAmount).toBeGreaterThan(0);

    // 8. Execute sale consensus: Alpha accepts Gamma's bid of 850
    const executeAction = {
      type: "EXECUTE_REINSURANCE_SALE",
      listingId: "listing_1",
      syndicateId: "alpha",
      buyerSyndicateId: "gamma",
      timestamp: 1005,
    };

    // First vote: player (PENDING majority)
    let executeRes = multiAgentStep(state, { agentId: "player", action: executeAction as any }, mockPack);
    expect(executeRes.ok).toBe(true);
    state = executeRes.state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"]?.status).toBe("Open");

    // Second vote: alice (REACHES majority)
    executeRes = multiAgentStep(state, { agentId: "alice", action: executeAction as any }, mockPack);
    expect(executeRes.ok).toBe(true);
    state = executeRes.state;

    // Verify sale completion
    const updatedListing = state.swfYieldCDOTrancheReinsuranceListings?.["listing_1"];
    expect(updatedListing?.status).toBe("Completed");

    // Verify ownership transfer of reinsurance policy to Gamma!
    const policy = state.swfYieldCDOTrancheReinsurancePolicies?.["reins_policy_1"];
    expect(policy?.syndicateId).toBe("gamma");

    // Verify warChest updates: Alpha +850, Gamma -850
    // Alpha originally 1000, now 1850
    // Gamma originally 3000, now 2150
    expect(state.syndicates?.["alpha"]?.warChest).toBe(1850);
    expect(state.syndicates?.["gamma"]?.warChest).toBe(2150);
  });

  it("should support cancelling an open reinsurance listing via consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 5000 },
      agentsInit: ["player", "alice"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 1000,
      },
    };

    state.swfYieldCDOTrancheReinsurancePolicies = {
      reins_policy_2: {
        id: "reins_policy_2",
        syndicateId: "alpha",
        swfYieldCdoId: "swf_cdo_1",
        trancheId: "mezzanine",
        coverageAmount: 500,
        premiumRate: 0.1,
        timestamp: 1000,
        active: true,
      },
    };

    // List policy
    const listAction = {
      type: "LIST_REINSURANCE_FOR_SALE",
      listingId: "listing_2",
      policyId: "reins_policy_2",
      syndicateId: "alpha",
      askPrice: 400,
      timestamp: 1001,
    };

    state = multiAgentStep(state, { agentId: "player", action: listAction as any }, mockPack).state;
    state = multiAgentStep(state, { agentId: "alice", action: listAction as any }, mockPack).state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_2"]?.status).toBe("Open");

    // Propose / Vote to Cancel listing
    const cancelAction = {
      type: "CANCEL_REINSURANCE_LISTING",
      listingId: "listing_2",
      syndicateId: "alpha",
      timestamp: 1002,
    };

    // First vote: player (PENDING)
    let cancelRes = multiAgentStep(state, { agentId: "player", action: cancelAction as any }, mockPack);
    expect(cancelRes.ok).toBe(true);
    state = cancelRes.state;
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_2"]?.status).toBe("Open");

    // Second vote: alice (REACHES majority)
    cancelRes = multiAgentStep(state, { agentId: "alice", action: cancelAction as any }, mockPack);
    expect(cancelRes.ok).toBe(true);
    state = cancelRes.state;

    // Verify cancellation
    expect(state.swfYieldCDOTrancheReinsuranceListings?.["listing_2"]?.status).toBe("Cancelled");
  });
});
