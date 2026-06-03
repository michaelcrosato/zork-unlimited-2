import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";
import { mergeMonotonicStateFields } from "../src/core/gossip.js";

describe("Syndicate SWF Sovereign Debt Default CDS Secondary Market & Arbitrage (AF-229)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_default_cds_secondary_pack",
      title: "Sovereign Debt Default CDS Secondary Market Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: ["merchant_1"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "merchant_1",
        name: "Defaulted Merchant",
        description: "A defaulted merchant.",
        faction: "beta",
        min_rep: 0,
        dialogue: {
          root: "root_node",
          nodes: [
            {
              id: "root_node",
              npc_text: "Welcome",
              topics: [],
            },
          ],
        },
      },
    ],
  });

  it("should propose and active listing, propose and active bid, and perform automatic bid matching during tickEconomy", () => {
    let state = createInitialState({
      seed: 54321,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob", "carol", "dan", "eva"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate (Seller)",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate (Target)",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma Syndicate (Bidder)",
        members: ["dan", "eva"],
        definedBy: "dan",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    // 1. Manually add an active CDS contract to state, where Alpha is the buyer
    state.sovereignDebtCDSContracts = {
      cds_1: {
        cdsId: "cds_1",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };
    state.sovereignDebtCDSPortfolios = {
      alpha: {
        syndicateId: "alpha",
        purchasedCDSIds: ["cds_1"],
        writtenCDSIds: [],
      },
    };

    // 2. Alpha member proposes listing
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "LIST_CDS_FOR_SALE",
          cdsId: "cds_1",
          sellerSyndicateId: "alpha",
          askPrice: 150,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Listing should be proposed (needs alice's vote to reach >50% majority of alpha's 2 members)
    expect(state.cdsListings?.["cds_1"]).toBeDefined();
    expect(state.cdsListings?.["cds_1"]?.status).toBe("proposed");

    // 3. Alice votes to list
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "LIST_CDS_FOR_SALE",
          cdsId: "cds_1",
          sellerSyndicateId: "alpha",
          askPrice: 150,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Listing should now be active
    expect(state.cdsListings?.["cds_1"]?.status).toBe("active");

    // 4. Gamma member dan proposes bid on cds_1
    stepRes = multiAgentStep(
      state,
      {
        agentId: "dan",
        action: {
          type: "BID_ON_CDS_CONTRACT",
          cdsId: "cds_1",
          bidderSyndicateId: "gamma",
          bidPrice: 150,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Bid should be proposed (needs eva's vote for majority)
    expect(state.cdsBids?.["cds_1_gamma"]).toBeDefined();
    expect(state.cdsBids?.["cds_1_gamma"]?.status).toBe("proposed");

    // 5. Eva votes to bid
    stepRes = multiAgentStep(
      state,
      {
        agentId: "eva",
        action: {
          type: "BID_ON_CDS_CONTRACT",
          cdsId: "cds_1",
          bidderSyndicateId: "gamma",
          bidPrice: 150,
          timestamp: 1004,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Bid should now be active
    expect(state.cdsBids?.["cds_1_gamma"]?.status).toBe("active");

    // Check warChests before economy tick: Alpha = 5000, Gamma = 4000
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5000);
    expect(state.syndicates?.["gamma"]?.warChest).toBe(4000);

    // 6. Run economy tick to match the bid and ask
    state = tickEconomy(state, mockPack);

    // Trade should be matched:
    // Alpha's listing completed, Gamma's bid accepted
    expect(state.cdsListings?.["cds_1"]?.status).toBe("completed");
    expect(state.cdsBids?.["cds_1_gamma"]?.status).toBe("accepted");

    // Buyer syndicate of cds_1 should now be Gamma!
    expect(state.sovereignDebtCDSContracts?.["cds_1"]?.buyerSyndicateId).toBe("gamma");

    // WarChests: Alpha - 50 premium + 150 = 5100, Gamma - 150 = 3850
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5100);
    expect(state.syndicates?.["gamma"]?.warChest).toBe(3850);

    // Portfolios updated: cds_1 in gamma, not alpha
    expect(state.sovereignDebtCDSPortfolios?.["alpha"]?.purchasedCDSIds).not.toContain("cds_1");
    expect(state.sovereignDebtCDSPortfolios?.["gamma"]?.purchasedCDSIds).toContain("cds_1");

    // Verify market spread telemetry
    expect(state.cdsMarketSpreads?.["cds_1"]).toBeDefined();
    expect(state.cdsMarketSpreads?.["cds_1"]?.lowestAsk).toBe(150);
    expect(state.cdsMarketSpreads?.["cds_1"]?.highestBid).toBe(150);
    expect(state.cdsMarketSpreads?.["cds_1"]?.spread).toBe(0);
    expect(state.cdsMarketSpreads?.["cds_1"]?.fairValue).toBeGreaterThan(0);
  });

  it("should support manual transfer of CDS ownership via TRANSFER_CDS_OWNERSHIP action consensus", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "dan"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      gamma: {
        id: "gamma",
        name: "Gamma",
        members: ["dan"],
        definedBy: "dan",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    state.sovereignDebtCDSContracts = {
      cds_2: {
        cdsId: "cds_2",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };
    state.sovereignDebtCDSPortfolios = {
      alpha: {
        syndicateId: "alpha",
        purchasedCDSIds: ["cds_2"],
        writtenCDSIds: [],
      },
    };

    // 1. Propose transfer of cds_2 from alpha to gamma for 200 gold
    let stepRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "TRANSFER_CDS_OWNERSHIP",
          cdsId: "cds_2",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "gamma",
          price: 200,
          timestamp: 1001,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    expect(state.cdsTransfers?.["cds_2_alpha_gamma"]).toBeDefined();
    expect(state.cdsTransfers?.["cds_2_alpha_gamma"]?.status).toBe("proposed");

    // 2. Alice (Alpha member) votes to sign
    stepRes = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "TRANSFER_CDS_OWNERSHIP",
          cdsId: "cds_2",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "gamma",
          price: 200,
          timestamp: 1002,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Seller side passed, but needs buyer (Gamma member dan) vote
    expect(state.cdsTransfers?.["cds_2_alpha_gamma"]?.status).toBe("proposed");

    // 3. Dan (Gamma member, buyer) votes to sign
    stepRes = multiAgentStep(
      state,
      {
        agentId: "dan",
        action: {
          type: "TRANSFER_CDS_OWNERSHIP",
          cdsId: "cds_2",
          sellerSyndicateId: "alpha",
          buyerSyndicateId: "gamma",
          price: 200,
          timestamp: 1003,
        },
      },
      mockPack
    );
    expect(stepRes.ok).toBe(true);
    state = stepRes.state;

    // Both passed! Transfer completed immediately in reconciliation
    expect(state.cdsTransfers?.["cds_2_alpha_gamma"]?.status).toBe("completed");
    expect(state.sovereignDebtCDSContracts?.["cds_2"]?.buyerSyndicateId).toBe("gamma");
    expect(state.syndicates?.["alpha"]?.warChest).toBe(5200);
    expect(state.syndicates?.["gamma"]?.warChest).toBe(3800);
  });

  it("should trigger automated arbitrage bots to place bids on undervalued CDS contracts", () => {
    let state = createInitialState({
      seed: 77777,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player", "alice", "bob"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 5000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 3000,
      },
      delta: {
        id: "delta",
        name: "Delta Syndicate (Arbitrage Bot)",
        members: ["eva"],
        definedBy: "eva",
        timestamp: 1000,
        warChest: 4000,
      },
    };

    // Make beta extremely risky (high outstanding deflection fees) so fairValue scales high
    state.outstandingDeflectionFees = {
      beta: 900,
    };

    state.sovereignDebtCDSContracts = {
      cds_3: {
        cdsId: "cds_3",
        buyerSyndicateId: "alpha",
        writerSyndicateId: "system",
        targetSyndicateId: "beta",
        notionalValue: 1000,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // List cds_3 for cheap (askPrice = 50 gold)
    state.cdsListings = {
      cds_3: {
        cdsId: "cds_3",
        sellerSyndicateId: "alpha",
        askPrice: 50,
        status: "active",
        timestamp: 1000,
        votes: {},
      },
    };

    // Economy tick should trigger the arbitrage bot of Delta to bid 50, and automatically match it!
    state = tickEconomy(state, mockPack);

    // Delta should have bought the contract at askPrice 50
    expect(state.cdsListings?.["cds_3"]?.status).toBe("completed");
    expect(state.sovereignDebtCDSContracts?.["cds_3"]?.buyerSyndicateId).toBe("delta");
    expect(state.syndicates?.["delta"]?.warChest).toBe(3950); // paid 50
    expect(state.syndicates?.["alpha"]?.warChest).toBe(4910); // received 50, paid 140 premium
  });

  it("should converge convergedState when P2P Gossip occurs and mergeMonotonicStateFields is called", () => {
    let stateA = createInitialState({
      seed: 111,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });
    let stateB = createInitialState({
      seed: 222,
      start: "clearing",
      varsInit: { gold: 20000 },
      agentsInit: ["player"],
    });

    stateA.cdsListings = {
      cds_1: {
        cdsId: "cds_1",
        sellerSyndicateId: "alpha",
        askPrice: 100,
        status: "active",
        timestamp: 1005,
      },
    };

    stateB.cdsListings = {
      cds_1: {
        cdsId: "cds_1",
        sellerSyndicateId: "alpha",
        askPrice: 150,
        status: "active",
        timestamp: 1010, // higher timestamp wins
      },
    };

    const merged = mergeMonotonicStateFields(stateA, stateB);
    expect(merged.cdsListings?.["cds_1"]?.askPrice).toBe(150);
  });
});
